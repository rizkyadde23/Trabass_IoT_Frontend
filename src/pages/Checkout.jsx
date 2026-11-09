import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  CreditCard,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ReceiptText,
} from "lucide-react";
import {
  createRentTransaction,
  confirmRentPayment,
  getPaymentConfig,
  getApiErrorMessage,
} from "../services/api";
import { openSnapPayment } from "../services/midtransService";
import { useRental } from "../context/RentalContext";

const DURATION_OPTIONS = [
  {
    minutes: 15,
    label: "15 Menit",
    desc: "Cocok untuk perjalanan singkat",
  },
  {
    minutes: 30,
    label: "30 Menit",
    desc: "Pilihan umum untuk keliling kampus",
    isPopular: true,
  },
  {
    minutes: 60,
    label: "60 Menit",
    desc: "Untuk durasi yang lebih santai",
  },
];

const DEFAULT_RATE = 1000;

const formatRupiah = (value) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const ACTIVE_STATUSES = ["ACTIVE", "WARNING_SENT"];

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    user,
    setRentalFromBackend,
    pendingOrder,
    setPendingOrder,
    clearPendingOrder,
  } = useRental();

  const bikeId =
    (searchParams.get("bike_id") || "").trim().toUpperCase() || "BK-001";

  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const activatingRef = useRef(false);

  const rate = pricing?.initial_price_per_minute ?? DEFAULT_RATE;

  const packages = useMemo(
    () =>
      DURATION_OPTIONS.map((option) => ({
        ...option,
        price: option.minutes * rate,
      })),
    [rate],
  );

  const selectedPackage =
    packages.find((pkg) => pkg.minutes === selectedMinutes) ?? packages[1];

  const hasPendingForThisBike =
    pendingOrder?.bike_id === bikeId && Boolean(pendingOrder?.order_id);

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
          "Gagal memuat tarif sewa dari backend. Pastikan backend berjalan.",
        ),
      );
    } finally {
      setPricingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPricing();
  }, [loadPricing]);

  const activateRental = useCallback(
    (state, orderId) => {
      if (activatingRef.current) return;

      activatingRef.current = true;
      setRentalFromBackend({
        ...state,
        midtrans_order_id: state?.midtrans_order_id || orderId,
      });
      clearPendingOrder();
      setStatusMessage(
        "Pembayaran terkonfirmasi. Kunci sepeda sedang dibuka...",
      );
      navigate("/active", { replace: true });
    },
    [clearPendingOrder, navigate, setRentalFromBackend],
  );

  const verifyPayment = useCallback(
    async (orderId, { showSpinner = false } = {}) => {
      if (!orderId || activatingRef.current) {
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
          if (ACTIVE_STATUSES.includes(state.rental_status)) {
            activateRental(state, orderId);
            return { settled: true, state };
          }

          clearPendingOrder();
          setErrorMessage(
            "Pembayaran sudah diterima, tetapi sesi tidak dapat diaktifkan. Silakan hubungi admin.",
          );
          return { settled: false, failed: true, state };
        }

        if (result?.status === "pending") {
          setStatusMessage(
            "Pembayaran masih diproses. Sistem akan mengecek status secara otomatis.",
          );
          return { settled: false, pending: true, state };
        }

        setStatusMessage(
          "Pembayaran diterima. Menunggu sesi sewa diaktifkan...",
        );
        return { settled: false, pending: true, state };
      } catch (error) {
        const httpStatus = error.response?.status;
        const message = getApiErrorMessage(
          error,
          "Gagal memverifikasi pembayaran.",
        );

        if (httpStatus === 404 || httpStatus === 409) {
          clearPendingOrder();
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
    [activateRental, clearPendingOrder],
  );

  // Polling otomatis selama masih ada pembayaran tertunda.
  useEffect(() => {
    if (!hasPendingForThisBike || activatingRef.current) return;

    let cancelled = false;
    let timeoutId = null;

    const tick = async () => {
      if (cancelled || activatingRef.current) return;

      if (pendingOrder.expires_at && Date.now() >= pendingOrder.expires_at) {
        clearPendingOrder();
        setErrorMessage(
          "Batas waktu pembayaran habis. Silakan buat transaksi baru.",
        );
        return;
      }

      const result = await verifyPayment(pendingOrder.order_id);
      if (cancelled || result.settled || result.failed) return;

      timeoutId = setTimeout(tick, 10000);
    };

    timeoutId = setTimeout(tick, 8000);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    hasPendingForThisBike,
    pendingOrder?.order_id,
    pendingOrder?.expires_at,
    verifyPayment,
    clearPendingOrder,
  ]);

  const buildSnapCallbacks = (orderId) => ({
    onSuccess: (result) => {
      const confirmedOrderId = result?.order_id || orderId;
      setStatusMessage("Pembayaran berhasil. Memverifikasi ke backend...");
      void verifyPayment(confirmedOrderId, { showSpinner: true });
    },
    onPending: (result) => {
      const pendingId = result?.order_id || orderId;
      setStatusMessage(
        "Pembayaran masih menunggu penyelesaian. Ikuti instruksi pembayaran, lalu sistem akan mengecek otomatis.",
      );
      void verifyPayment(pendingId);
    },
    onError: () => {
      setErrorMessage(
        "Pembayaran gagal atau dibatalkan. Silakan coba lagi atau gunakan metode lain.",
      );
      void verifyPayment(orderId);
    },
    onClose: () => {
      setStatusMessage(
        "Popup pembayaran ditutup. Jika sudah membayar, cek status beberapa saat lagi.",
      );
      void verifyPayment(orderId);
    },
  });

  const handlePayNow = async () => {
    if (loading || verifying || !pricing) return;

    setLoading(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await createRentTransaction({
        bike_id: bikeId,
        user_id: user.user_id,
        duration_minutes: selectedPackage.minutes,
      });

      const data = response.data;
      const pending = {
        order_id: data.order_id,
        snap_token: data.snap_token,
        redirect_url: data.redirect_url,
        bike_id: bikeId,
        duration_minutes: selectedPackage.minutes,
        amount: data.amount,
        expires_at:
          Date.now() +
          Number(data.expires_in_minutes || 15) * 60 * 1000,
      };

      setPendingOrder(pending);
      setStatusMessage("Menyiapkan popup pembayaran Midtrans...");

      await openSnapPayment(
        data.snap_token,
        buildSnapCallbacks(data.order_id),
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Gagal membuat transaksi pembayaran."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySnap = async () => {
    if (!pendingOrder?.snap_token || loading || verifying) return;

    setErrorMessage("");
    setStatusMessage("Membuka kembali popup pembayaran...");

    try {
      await openSnapPayment(
        pendingOrder.snap_token,
        buildSnapCallbacks(pendingOrder.order_id),
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Gagal membuka popup pembayaran."),
      );
    }
  };

  const handleCheckStatus = async () => {
    if (!pendingOrder?.order_id || verifying) return;
    setErrorMessage("");
    setStatusMessage("Memeriksa status pembayaran ke backend...");
    await verifyPayment(pendingOrder.order_id, { showSpinner: true });
  };

  const handleStartNewTransaction = () => {
    clearPendingOrder();
    setErrorMessage("");
    setStatusMessage("");
  };

  return (
    <div className="flex flex-col min-h-screen p-5 bg-slate-50 justify-between">
      <div>
        {/* Header Navigation */}
        <div className="flex items-center space-x-3 my-2">
          <button
            onClick={() => navigate("/")}
            className="p-2.5 bg-white rounded-xl text-slate-600 hover:text-slate-900 shadow-sm border border-slate-200 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-800">
              Checkout Sewa
            </h1>
            <p className="text-xs text-slate-500">
              ID Sepeda:{" "}
              <span className="font-semibold text-brand-600">{bikeId}</span>
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="my-3 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-700">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Status pembayaran */}
        {statusMessage && (
          <div className="my-3 p-3.5 bg-brand-50 border border-brand-500/20 rounded-2xl flex items-start space-x-2.5 text-brand-700">
            {verifying ? (
              <RefreshCw size={18} className="shrink-0 mt-0.5 animate-spin" />
            ) : (
              <ReceiptText size={18} className="shrink-0 mt-0.5" />
            )}
            <p className="text-xs leading-relaxed">{statusMessage}</p>
          </div>
        )}

        {hasPendingForThisBike ? (
          <div className="my-5 bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <ReceiptText size={22} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Menunggu Pembayaran
                </h2>
                <p className="text-xs text-slate-500">
                  Selesaikan pembayaran untuk mengaktifkan sesi sewa.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Nomor Order</span>
                <span className="font-mono text-slate-800 break-all text-right">
                  {pendingOrder.order_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ID Sepeda</span>
                <span className="font-semibold text-slate-800">
                  {pendingOrder.bike_id || bikeId}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Durasi</span>
                <span className="font-semibold text-slate-800">
                  {pendingOrder.duration_minutes} Menit
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Tagihan</span>
                <span className="font-bold text-brand-600">
                  {formatRupiah(pendingOrder.amount)}
                </span>
              </div>
              {pendingOrder.expires_at && (
                <div className="flex justify-between">
                  <span>Berlaku Sampai</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(pendingOrder.expires_at).toLocaleTimeString(
                      "id-ID",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
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
                onClick={handleStartNewTransaction}
                disabled={verifying}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs transition-all active:scale-[0.98]"
              >
                Buat Transaksi Baru
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Transaksi lama akan otomatis dibatalkan oleh backend saat kamu
              membuat transaksi baru untuk sepeda yang sama.
            </p>
          </div>
        ) : (
          <>
            {/* Pemilihan Paket Durasi */}
            <div className="my-5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Pilih Paket Durasi
              </h2>

              {pricingLoading && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center space-x-2">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Memuat tarif sewa dari backend...</span>
                </div>
              )}

              {!pricingLoading && pricingError && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-700 space-y-3">
                  <p className="leading-relaxed">{pricingError}</p>
                  <button
                    onClick={loadPricing}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg font-semibold"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {!pricingLoading && !pricingError && (
                <>
                  <div className="space-y-3">
                    {packages.map((pkg) => {
                      const isSelected =
                        selectedPackage.minutes === pkg.minutes;
                      return (
                        <div
                          key={pkg.minutes}
                          onClick={() => setSelectedMinutes(pkg.minutes)}
                          className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-white border-brand-500 shadow-md ring-2 ring-brand-500/20"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {pkg.isPopular && (
                            <span className="absolute -top-2.5 right-4 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-sm">
                              <Sparkles size={10} />
                              <span>Populer</span>
                            </span>
                          )}

                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2.5 rounded-xl ${
                                isSelected
                                  ? "bg-brand-50 text-brand-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <Clock size={20} />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-800">
                                {pkg.label}
                              </h3>
                              <p className="text-xs text-slate-500">
                                {pkg.desc}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-brand-600">
                              {formatRupiah(pkg.price)}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              @ {formatRupiah(rate)}/menit
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
                    Tarif dihitung otomatis oleh backend. Minimal{" "}
                    {pricing?.min_rental_minutes ?? 15} menit.
                  </p>
                </>
              )}
            </div>

            {/* Rincian Pembayaran */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 my-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Rincian Pembayaran
              </h2>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Penyewa</span>
                <span className="font-semibold text-slate-800">
                  {user.name}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Durasi Sewa</span>
                <span className="font-semibold text-slate-800">
                  {selectedPackage.label}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-800">
                  Total Tagihan
                </span>
                <span className="text-base font-extrabold text-brand-600">
                  {formatRupiah(selectedPackage.price)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Button */}
      {!hasPendingForThisBike && (
        <div className="py-4">
          <button
            onClick={handlePayNow}
            disabled={loading || verifying || pricingLoading || !pricing}
            className="w-full py-4 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/20 transition-all active:scale-[0.98]"
          >
            {loading || verifying ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <CreditCard size={20} />
            )}
            <span>
              {loading
                ? "Memproses Transaksi..."
                : verifying
                  ? "Memverifikasi Pembayaran..."
                  : `Bayar ${formatRupiah(selectedPackage.price)}`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Checkout;
