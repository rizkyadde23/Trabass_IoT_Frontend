import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  X,
  Clock,
  CreditCard,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ReceiptText,
} from "lucide-react";
import {
  extendRentTransaction,
  confirmRentPayment,
  getPaymentConfig,
  getApiErrorMessage,
} from "../services/api";
import { openSnapPayment } from "../services/midtransService";
import { useRental } from "../context/RentalContext";

const EXTEND_OPTIONS = [15, 30, 60];
const DEFAULT_EXTENSION_RATE = 1000;

const formatRupiah = (value) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const ModalExtend = ({
  isOpen,
  onClose,
  bikeId,
  userId,
  onSuccessExtend,
}) => {
  const {
    activeRental,
    updateRentalFromBackend,
    refreshActiveRental,
  } = useRental();

  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingExtension, setPendingExtension] = useState(null);

  const finalizeRef = useRef(false);
  const callbacksRef = useRef({ onClose, onSuccessExtend });

  useEffect(() => {
    callbacksRef.current = { onClose, onSuccessExtend };
  }, [onClose, onSuccessExtend]);

  const rate = pricing?.extension_price_per_minute ?? DEFAULT_EXTENSION_RATE;

  const packages = useMemo(
    () =>
      EXTEND_OPTIONS.map((minutes) => ({
        minutes,
        label: `+${minutes} Menit`,
        price: minutes * rate,
        isPopular: minutes === 30,
      })),
    [rate],
  );

  const selectedPackage =
    packages.find((pkg) => pkg.minutes === selectedMinutes) ?? packages[1];

  const loadPricing = useCallback(async () => {
    setPricingLoading(true);
    setPricingError("");

    try {
      const response = await getPaymentConfig();
      setPricing(response.data);
    } catch (error) {
      setPricingError(
        getApiErrorMessage(
          error,
          "Gagal memuat tarif perpanjangan dari backend.",
        ),
      );
    } finally {
      setPricingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage("");
    setStatusMessage("");
    finalizeRef.current = false;

    if (!pricing && !pricingLoading) {
      void loadPricing();
    }
  }, [isOpen, pricing, pricingLoading, loadPricing]);

  const finalizeExtension = useCallback(
    async (extensionState, addedMinutes) => {
      if (finalizeRef.current) return;
      finalizeRef.current = true;

      setStatusMessage("Perpanjangan berhasil. Menyinkronkan sesi...");

      let parentState = null;
      try {
        parentState = await refreshActiveRental();
      } catch (error) {
        console.warn("[EXTEND REFRESH ERROR]", error.message);
      }

      if (!parentState && activeRental) {
        // Fallback jika polling parent gagal: gunakan end_time dari backend
        // (extensionState.active_end_time) dan tambahkan durasi secara lokal.
        const fallbackEndTime =
          extensionState?.active_end_time ||
          (() => {
            const currentEnd = new Date(
              activeRental.active_end_time ||
                activeRental.end_time ||
                Date.now(),
            );
            const base =
              currentEnd.getTime() > Date.now() ? currentEnd : new Date();
            return new Date(
              base.getTime() + Number(addedMinutes) * 60 * 1000,
            ).toISOString();
          })();

        updateRentalFromBackend({
          ...activeRental,
          midtrans_order_id: activeRental.order_id,
          rental_status: "ACTIVE",
          duration_minutes:
            Number(activeRental.duration_minutes || 0) +
            Number(addedMinutes || 0),
          end_time: fallbackEndTime,
          active_end_time: fallbackEndTime,
        });
      }

      setPendingExtension(null);
      callbacksRef.current.onSuccessExtend?.(
        addedMinutes,
        parentState || extensionState,
      );
      callbacksRef.current.onClose?.();
    },
    [activeRental, refreshActiveRental, updateRentalFromBackend],
  );

  const verifyExtension = useCallback(
    async (orderId, addedMinutes, { showSpinner = false } = {}) => {
      if (!orderId || finalizeRef.current) {
        return { settled: false, ignored: true };
      }

      if (showSpinner) setVerifying(true);

      try {
        const result = await confirmRentPayment({ order_id: orderId });
        const state = result?.data;

        if (
          result?.status === "success" &&
          state?.payment_status === "SETTLED"
        ) {
          if (
            ["EXTENSION_REJECTED", "PAID_CONFLICT", "CANCELLED"].includes(
              state.rental_status,
            )
          ) {
            setPendingExtension(null);
            setErrorMessage(
              "Pembayaran perpanjangan diterima, tetapi perpanjangan tidak dapat diterapkan. Silakan hubungi admin.",
            );
            return { settled: false, failed: true, state };
          }

          await finalizeExtension(state, addedMinutes);
          return { settled: true, state };
        }

        if (result?.status === "pending") {
          setStatusMessage(
            "Pembayaran perpanjangan masih diproses. Sistem akan mengecek otomatis.",
          );
          return { settled: false, pending: true, state };
        }

        setStatusMessage(
          "Pembayaran diterima. Menunggu perpanjangan diaktifkan...",
        );
        return { settled: false, pending: true, state };
      } catch (error) {
        const httpStatus = error.response?.status;
        const message = getApiErrorMessage(
          error,
          "Gagal memverifikasi pembayaran perpanjangan.",
        );

        if (httpStatus === 404 || httpStatus === 409) {
          setPendingExtension(null);
          setErrorMessage(message);
          return { settled: false, failed: true };
        }

        setStatusMessage(
          "Pembayaran belum terkonfirmasi. Sistem akan mencoba lagi...",
        );
        return { settled: false, pending: true, error: message };
      } finally {
        if (showSpinner) setVerifying(false);
      }
    },
    [finalizeExtension],
  );

  // Polling otomatis untuk perpanjangan yang masih pending.
  useEffect(() => {
    if (
      !isOpen ||
      !pendingExtension?.order_id ||
      finalizeRef.current
    ) {
      return;
    }

    let cancelled = false;
    let timeoutId = null;

    const tick = async () => {
      if (cancelled || finalizeRef.current) return;

      if (
        pendingExtension.expires_at &&
        Date.now() >= pendingExtension.expires_at
      ) {
        setPendingExtension(null);
        setErrorMessage(
          "Batas waktu pembayaran perpanjangan habis. Silakan buat transaksi baru.",
        );
        return;
      }

      const result = await verifyExtension(
        pendingExtension.order_id,
        pendingExtension.added_minutes,
      );

      if (cancelled || result.settled || result.failed) return;

      timeoutId = setTimeout(tick, 10000);
    };

    timeoutId = setTimeout(tick, 8000);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    isOpen,
    pendingExtension?.order_id,
    pendingExtension?.expires_at,
    pendingExtension?.added_minutes,
    verifyExtension,
  ]);

  const buildSnapCallbacks = (orderId, addedMinutes) => ({
    onSuccess: (result) => {
      const confirmedOrderId = result?.order_id || orderId;
      setStatusMessage(
        "Pembayaran berhasil. Memverifikasi perpanjangan...",
      );
      void verifyExtension(confirmedOrderId, addedMinutes, {
        showSpinner: true,
      });
    },
    onPending: (result) => {
      const pendingId = result?.order_id || orderId;
      setStatusMessage(
        "Pembayaran perpanjangan menunggu penyelesaian. Sistem akan mengecek otomatis.",
      );
      void verifyExtension(pendingId, addedMinutes);
    },
    onError: () => {
      setErrorMessage(
        "Pembayaran perpanjangan gagal atau dibatalkan. Silakan coba lagi.",
      );
      void verifyExtension(orderId, addedMinutes);
    },
    onClose: () => {
      setStatusMessage(
        "Popup pembayaran ditutup. Jika sudah membayar, cek status beberapa saat lagi.",
      );
      void verifyExtension(orderId, addedMinutes);
    },
  });

  const handleProcessExtend = async () => {
    if (loading || verifying || !pricing) return;

    setLoading(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await extendRentTransaction({
        bike_id: bikeId,
        user_id: userId,
        duration_minutes: selectedPackage.minutes,
      });

      const data = response.data;
      const pending = {
        order_id: data.order_id,
        snap_token: data.snap_token,
        redirect_url: data.redirect_url,
        added_minutes: selectedPackage.minutes,
        amount: data.amount,
        expires_at:
          Date.now() +
          Number(data.expires_in_minutes || 15) * 60 * 1000,
      };

      setPendingExtension(pending);
      setStatusMessage("Menyiapkan popup pembayaran perpanjangan...");

      await openSnapPayment(
        data.snap_token,
        buildSnapCallbacks(
          data.order_id,
          selectedPackage.minutes,
        ),
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "Gagal membuat transaksi perpanjangan.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySnap = async () => {
    if (!pendingExtension?.snap_token || loading || verifying) return;

    setErrorMessage("");
    setStatusMessage("Membuka kembali popup pembayaran...");

    try {
      await openSnapPayment(
        pendingExtension.snap_token,
        buildSnapCallbacks(
          pendingExtension.order_id,
          pendingExtension.added_minutes,
        ),
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Gagal membuka popup pembayaran."),
      );
    }
  };

  const handleCheckStatus = async () => {
    if (!pendingExtension?.order_id || verifying) return;
    setErrorMessage("");
    setStatusMessage("Memeriksa status pembayaran perpanjangan...");
    await verifyExtension(
      pendingExtension.order_id,
      pendingExtension.added_minutes,
      { showSpinner: true },
    );
  };

  const handleStartNewExtension = () => {
    setPendingExtension(null);
    setErrorMessage("");
    setStatusMessage("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all"
        >
          <X size={18} />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Perpanjang Sewa
            </h3>
            <p className="text-xs text-slate-500">
              ID Sepeda:{" "}
              <span className="font-semibold text-brand-600">{bikeId}</span>
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-700 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div className="mb-4 p-3 bg-brand-50 border border-brand-500/20 rounded-xl flex items-start space-x-2 text-brand-700 text-xs">
            {verifying ? (
              <RefreshCw size={16} className="shrink-0 mt-0.5 animate-spin" />
            ) : (
              <ReceiptText size={16} className="shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMessage}</span>
          </div>
        )}

        {pendingExtension ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Nomor Order</span>
                <span className="font-mono text-slate-800 break-all text-right">
                  {pendingExtension.order_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tambahan Durasi</span>
                <span className="font-semibold text-slate-800">
                  +{pendingExtension.added_minutes} Menit
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Tagihan</span>
                <span className="font-bold text-brand-600">
                  {formatRupiah(pendingExtension.amount)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleCheckStatus}
                disabled={verifying}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] text-sm"
              >
                <RefreshCw
                  size={18}
                  className={verifying ? "animate-spin" : ""}
                />
                <span>
                  {verifying ? "Memeriksa Status..." : "Cek Status Pembayaran"}
                </span>
              </button>

              <button
                onClick={handleRetrySnap}
                disabled={verifying}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] text-sm"
              >
                <CreditCard size={18} />
                <span>Buka Kembali Pembayaran</span>
              </button>

              <button
                onClick={handleStartNewExtension}
                disabled={verifying}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs transition-all active:scale-[0.98]"
              >
                Buat Perpanjangan Baru
              </button>
            </div>
          </div>
        ) : (
          <>
            {pricingLoading && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-center space-x-2 mb-4">
                <RefreshCw size={14} className="animate-spin" />
                <span>Memuat tarif perpanjangan...</span>
              </div>
            )}

            {!pricingLoading && pricingError && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 space-y-2 mb-4">
                <p className="leading-relaxed">{pricingError}</p>
                <button
                  onClick={loadPricing}
                  className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg font-semibold"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {!pricingLoading && !pricingError && (
              <div className="space-y-2.5 my-4">
                {packages.map((pkg) => {
                  const isSelected =
                    selectedPackage.minutes === pkg.minutes;
                  return (
                    <div
                      key={pkg.minutes}
                      onClick={() => setSelectedMinutes(pkg.minutes)}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-brand-50/50 border-brand-500 shadow-sm ring-2 ring-brand-500/20"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="text-sm font-bold text-slate-800">
                          {pkg.label}
                        </span>
                        {pkg.isPopular && (
                          <span className="bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center space-x-0.5">
                            <Sparkles size={8} />
                            <span>Populer</span>
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-extrabold text-brand-600">
                        {formatRupiah(pkg.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleProcessExtend}
              disabled={
                loading || verifying || pricingLoading || !pricing
              }
              className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/20 transition-all active:scale-[0.98] mt-2"
            >
              {loading || verifying ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <CreditCard size={18} />
              )}
              <span>
                {loading
                  ? "Memproses..."
                  : verifying
                    ? "Memverifikasi..."
                    : `Bayar Perpanjangan ${formatRupiah(selectedPackage.price)}`}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalExtend;
