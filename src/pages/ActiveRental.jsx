import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bike,
  Unlock,
  Lock,
  PlusCircle,
  ShieldCheck,
  MapPin,
  AlertCircle,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useRental } from "../context/RentalContext";
import { useAuth } from "../context/AuthContext";
import { finishRentSession, getApiErrorMessage } from "../services/api";
import CountdownTimer from "../components/CountdownTimer";
import ModalExtend from "../components/ModalExtend";
import { SessionLoading } from "../components/ProtectedRoute";

const ACTIVE_STATUSES = ["ACTIVE", "WARNING_SENT"];
const FINISHED_STATUSES = ["COMPLETED", "CANCELLED", "EXPIRED"];
const CONFLICT_STATUSES = ["PAID_CONFLICT", "EXTENSION_REJECTED"];

const formatRupiah = (value) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const ActiveRental = () => {
  const navigate = useNavigate();
  const {
    activeRental,
    clearRentalSession,
    refreshActiveRental,
    isRentalHydrating,
  } = useRental();
  const { user } = useAuth();

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigatingHomeRef = useRef(false);

  const rentalStatus = activeRental?.rental_status ?? null;
  const isActive = ACTIVE_STATUSES.includes(rentalStatus);
  const isOverdue = rentalStatus === "OVERDUE";
  const isConflict = CONFLICT_STATUSES.includes(rentalStatus);
  const isLocked =
    isOverdue ||
    isConflict ||
    FINISHED_STATUSES.includes(rentalStatus);
  const pendingAutoLock = isTimeExpired && isActive;
  const canExtend = isActive && !isTimeExpired;
  const canFinish = isActive || isOverdue;

  const endTime = activeRental?.active_end_time || activeRental?.end_time;

  useEffect(() => {
    setIsTimeExpired(false);
  }, [activeRental?.active_end_time, activeRental?.order_id]);

  // Sinkronisasi status sesi dengan backend secara berkala.
  useEffect(() => {
    if (!activeRental?.order_id) return;

    let cancelled = false;

    const sync = async (showSpinner = false) => {
      if (cancelled) return;
      if (showSpinner) setSyncing(true);

      try {
        const state = await refreshActiveRental();
        if (cancelled) return;

        setSyncError("");

        if (state && FINISHED_STATUSES.includes(state.rental_status)) {
          if (!navigatingHomeRef.current) {
            navigatingHomeRef.current = true;
            clearRentalSession();
            navigate("/register", { replace: true });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setSyncError(
            getApiErrorMessage(
              error,
              "Tidak dapat menyinkronkan status sesi dengan backend.",
            ),
          );
        }
      } finally {
        if (!cancelled && showSpinner) setSyncing(false);
      }
    };

    void sync(true);
    const intervalId = setInterval(() => void sync(false), 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sync(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [
    activeRental?.order_id,
    refreshActiveRental,
    clearRentalSession,
    navigate,
  ]);

  useEffect(() => {
    if (showExtendModal && !canExtend) {
      setShowExtendModal(false);
    }
  }, [showExtendModal, canExtend]);

  const handleTimeExpired = useCallback(() => {
    setIsTimeExpired(true);
  }, []);

  const handleCloseExtend = useCallback(() => {
    setShowExtendModal(false);
  }, []);

  const handleSuccessExtend = useCallback(() => {
    setIsTimeExpired(false);
    setShowExtendModal(false);
  }, []);

  const handleConfirmFinish = async () => {
    if (!activeRental || finishing) return;

    setFinishing(true);
    setErrorMessage("");

    try {
      await finishRentSession({
        bike_id: activeRental.bike_id,
      });

      clearRentalSession();
      setShowFinishModal(false);
      navigate("/register");
    } catch (error) {
      const httpStatus = error.response?.status;

      if (httpStatus === 404) {
        clearRentalSession();
        setShowFinishModal(false);
        navigate("/register");
        return;
      }

      setErrorMessage(
        getApiErrorMessage(
          error,
          "Gagal mengakhiri sesi. Coba lagi.",
        ),
      );
      setFinishing(false);
    }
  };

  // Tunggu hidrasi dari backend sebelum menyatakan tidak ada sesi aktif.
  if (isRentalHydrating && !activeRental) {
    return <SessionLoading message="Memulihkan sesi sewa..." />;
  }

  if (!activeRental) {
    return (
      <div className="flex flex-col min-h-screen p-6 bg-slate-50 items-center justify-center text-center">
        <Bike size={48} className="text-slate-300 mb-4" />
        <h2 className="text-base font-bold text-slate-800 mb-1">
          Tidak Ada Sesi Sewa Aktif
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Silakan pindai QR Code sepeda untuk memulai sewa baru.
        </p>
        <button
          onClick={() => navigate("/register")}
          className="py-3 px-6 bg-brand-600 text-white font-semibold rounded-xl shadow-md text-sm"
        >
          Mulai Sewa Baru
        </button>
      </div>
    );
  }

  const badgeTone = isLocked
    ? "bg-red-50 text-red-600 border-red-200"
    : pendingAutoLock
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : rentalStatus === "WARNING_SENT"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-emerald-50 text-emerald-600 border-emerald-200";

  const badgeLabel = isLocked
    ? "LOCKED"
    : pendingAutoLock
      ? "MENUNGGU KUNCI"
      : rentalStatus === "WARNING_SENT"
        ? "SEGERA BERAKHIR"
        : "UNLOCKED";

  return (
    <div className="flex flex-col min-h-screen p-5 bg-slate-50 justify-between relative">
      <div>
        {/* Header Dashboard */}
        <div className="flex items-center justify-between my-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand-500 text-white rounded-2xl shadow-md">
              <Bike size={24} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">
                Sewa Aktif
              </h1>
              <p className="text-xs text-slate-500">
                ID Sepeda:{" "}
                <span className="font-bold text-brand-600">
                  {activeRental.bike_id}
                </span>
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 border ${badgeTone}`}
          >
            {isLocked || pendingAutoLock ? (
              <Lock size={12} />
            ) : (
              <Unlock size={12} />
            )}
            <span>{badgeLabel}</span>
          </span>
        </div>

        {/* Status sinkronisasi */}
        {(syncing || syncError) && (
          <div
            className={`my-2 p-3 rounded-2xl flex items-start space-x-2 text-xs ${
              syncError
                ? "bg-amber-50 border border-amber-200 text-amber-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {syncError ? (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            ) : (
              <RefreshCw size={16} className="shrink-0 mt-0.5 animate-spin" />
            )}
            <span className="leading-relaxed">
              {syncError || "Menyinkronkan status sesi dengan backend..."}
            </span>
          </div>
        )}

        {/* Card Timer Utama */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 my-4 flex flex-col items-center">
          <CountdownTimer
            endTime={endTime}
            totalDurationMinutes={activeRental.duration_minutes}
            onExpire={handleTimeExpired}
          />

          {pendingAutoLock && (
            <p className="mt-4 text-[11px] text-amber-700 text-center leading-relaxed">
              Waktu sewa habis. Sistem backend sedang mengunci sepeda secara
              otomatis.
            </p>
          )}
        </div>

        {/* Konflik pembayaran / perpanjangan */}
        {isConflict && (
          <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-700">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold mb-1">Sesi perlu tindak lanjut admin</p>
              <p>
                Pembayaran diterima, tetapi sesi tidak dapat diaktifkan
                otomatis. Silakan hubungi admin/pengelola pangkalan.
              </p>
            </div>
          </div>
        )}

        {/* Informasi Detail Sewa */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Detail Sesi Berkendara
          </h2>

          <div className="flex justify-between text-xs text-slate-600">
            <span>Penyewa</span>
            <span className="font-semibold text-slate-800">{user.name}</span>
          </div>

          <div className="flex justify-between text-xs text-slate-600">
            <span>Nomor Order</span>
            <span className="font-mono text-slate-700 break-all text-right">
              {activeRental.order_id}
            </span>
          </div>

          <div className="flex justify-between text-xs text-slate-600">
            <span>Status Sesi</span>
            <span className="font-semibold text-slate-800">
              {activeRental.rental_status || "-"}
            </span>
          </div>

          <div className="flex justify-between text-xs text-slate-600">
            <span>Total Durasi</span>
            <span className="font-semibold text-slate-800">
              {activeRental.duration_minutes} Menit
            </span>
          </div>

          <div className="flex justify-between text-xs text-slate-600">
            <span>Total Biaya</span>
            <span className="font-semibold text-brand-600">
              {formatRupiah(activeRental.amount)}
            </span>
          </div>

          <div className="flex justify-between text-xs text-slate-600">
            <span>Pangkalan Pengembalian</span>
            <span className="font-semibold text-brand-600 flex items-center space-x-1">
              <MapPin size={12} />
              <span>Pangkalan UPN Central</span>
            </span>
          </div>
        </div>

        {/* Security Alert Note */}
        <div className="my-4 p-3.5 bg-slate-100 rounded-2xl flex items-center space-x-3 text-slate-500 text-xs">
          <ShieldCheck size={20} className="shrink-0 text-brand-600" />
          <p className="leading-relaxed">
            Sistem keamanan geofencing & sensor gerak aktif memantau
            keberadaan sepeda.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="py-4 space-y-2.5">
        <button
          onClick={() => setShowExtendModal(true)}
          disabled={!canExtend}
          className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/20 transition-all active:scale-[0.98]"
        >
          <PlusCircle size={20} />
          <span>
            {canExtend
              ? "Perpanjang Waktu Sewa (Extend)"
              : "Perpanjangan Tidak Tersedia"}
          </span>
        </button>

        <button
          onClick={() => setShowFinishModal(true)}
          disabled={!canFinish || finishing}
          className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-semibold rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] text-sm"
        >
          <LogOut size={18} />
          <span>Akhiri Sesi & Kembalikan Sepeda</span>
        </button>
      </div>

      {/* Modal Extend */}
      <ModalExtend
        isOpen={showExtendModal}
        onClose={handleCloseExtend}
        bikeId={activeRental.bike_id}
        onSuccessExtend={handleSuccessExtend}
      />

      {/* Modal Konfirmasi Akhiri Sesi */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
              <Lock size={28} />
            </div>

            <h3 className="text-base font-bold text-slate-800 mb-2">
              Kembalikan Sepeda Sekarang?
            </h3>

            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Pastikan sepeda sudah terparkir rapi di pangkalan. Setelah
              dikonfirmasi, sepeda akan{" "}
              <span className="font-bold text-slate-700">
                terkunci otomatis
              </span>{" "}
              dan sesi sewa akan selesai.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-700 text-xs w-full text-left">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <div className="w-full space-y-2.5">
              <button
                onClick={handleConfirmFinish}
                disabled={finishing}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98]"
              >
                {finishing
                  ? "Mengunci Sepeda..."
                  : "Ya, Kembalikan & Kunci Sepeda"}
              </button>

              <button
                onClick={() => setShowFinishModal(false)}
                disabled={finishing}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all active:scale-[0.98]"
              >
                Batal / Lanjutkan Berkendara
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveRental;
