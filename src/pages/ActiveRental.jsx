import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bike,
  Unlock,
  Lock,
  PlusCircle,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { useRental } from "../context/RentalContext";
import { finishRentSession } from "../services/api";
import CountdownTimer from "../components/CountdownTimer";
import ModalExtend from "../components/ModalExtend";

const ActiveRental = () => {
  const navigate = useNavigate();
  const { activeRental, user, updateRentalSession, clearRentalSession } =
    useRental();

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
          onClick={() => navigate("/")}
          className="py-3 px-6 bg-brand-600 text-white font-semibold rounded-xl shadow-md text-sm"
        >
          Kembali ke Home
        </button>
      </div>
    );
  }

  const handleTimeExpired = () => {
    setIsExpired(true);
  };

  const handleSuccessExtend = (addedMinutes) => {
    updateRentalSession(addedMinutes);
    setIsExpired(false);
  };

  // Handler saat konfirmasi pengembalian sepeda disetujui
  const handleConfirmFinish = async () => {
    setFinishing(true);
    setErrorMessage("");

    try {
      await finishRentSession({
        bike_id: activeRental.bike_id,
        user_id: user.user_id,
      });

      // Bersihkan sesi sewa di context & localStorage
      clearRentalSession();
      setShowFinishModal(false);
      navigate("/");
    } catch (error) {
      console.error("[FINISH ERROR]", error);
      const msg =
        error.response?.data?.message || "Gagal mengakhiri sesi. Coba lagi.";
      setErrorMessage(msg);
      setFinishing(false);
    }
  };

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
              <h1 className="text-sm font-bold text-slate-800">Sewa Aktif</h1>
              <p className="text-xs text-slate-500">
                ID Sepeda:{" "}
                <span className="font-bold text-brand-600">
                  {activeRental.bike_id}
                </span>
              </p>
            </div>
          </div>

          {/* Status Kunci Sepeda */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 border ${
              isExpired
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-emerald-50 text-emerald-600 border-emerald-200"
            }`}
          >
            {isExpired ? <Lock size={12} /> : <Unlock size={12} />}
            <span>{isExpired ? "LOCKED" : "UNLOCKED"}</span>
          </span>
        </div>

        {/* Card Timer Utama */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 my-4 flex flex-col items-center">
          <CountdownTimer
            endTime={activeRental.end_time}
            totalDurationMinutes={activeRental.duration_minutes}
            onExpire={handleTimeExpired}
          />
        </div>

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
            <span className="font-mono text-slate-700">
              {activeRental.order_id}
            </span>
          </div>

          <div className="flex justify-between text-xs text-slate-600">
            <span>Total Durasi</span>
            <span className="font-semibold text-slate-800">
              {activeRental.duration_minutes} Menit
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
            Sistem keamanan geofencing & sensor gerak aktif memantau keberadaan
            sepeda.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="py-4 space-y-2.5">
        <button
          onClick={() => setShowExtendModal(true)}
          className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/20 transition-all active:scale-[0.98]"
        >
          <PlusCircle size={20} />
          <span>Perpanjang Waktu Sewa (Extend)</span>
        </button>

        {/* TOMBOL AKHIRI SESI (Tersedia dari awal sesi) */}
        <button
          onClick={() => setShowFinishModal(true)}
          className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] text-sm"
        >
          <LogOut size={18} />
          <span>Akhiri Sesi & Kembalikan Sepeda</span>
        </button>
      </div>

      {/* Modal Extend */}
      <ModalExtend
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        bikeId={activeRental.bike_id}
        userId={user.user_id}
        onSuccessExtend={handleSuccessExtend}
      />

      {/* MODAL KONFIRMASI AKHIRI SESI */}
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
              dikonfirmasi, sepeda akan **terkunci otomatis** dan sesi sewa akan
              selesai.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700 text-xs w-full text-left">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
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
