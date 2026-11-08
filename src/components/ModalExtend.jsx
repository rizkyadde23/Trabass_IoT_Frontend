import React, { useState } from "react";
import { X, Clock, CreditCard, Sparkles, AlertCircle } from "lucide-react";
import { extendRentTransaction } from "../services/api";

const EXTEND_PACKAGES = [
  { minutes: 15, price: 5000, label: "+15 Menit" },
  { minutes: 30, price: 10000, label: "+30 Menit", isPopular: true },
  { minutes: 60, price: 18000, label: "+60 Menit" },
];

const ModalExtend = ({
  isOpen,
  onClose,
  rentalId,
  bikeId,
  userId,
  onSuccessExtend,
}) => {
  const [selectedPackage, setSelectedPackage] = useState(EXTEND_PACKAGES[1]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleProcessExtend = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      // Kirim bike_id & user_id menggantikan rental_id
      const response = await extendRentTransaction({
        bike_id: bikeId,
        user_id: userId,
        duration_minutes: selectedPackage.minutes,
        amount: selectedPackage.price,
      });

      const { snap_token } = response.data;

      if (!window.snap) {
        throw new Error("Midtrans Snap SDK belum dimuat.");
      }

      window.snap.pay(snap_token, {
        onSuccess: (result) => {
          console.log("[EXTEND SUCCESS]", result);
          if (onSuccessExtend) onSuccessExtend(selectedPackage.minutes);
          onClose();
        },
        onPending: () => {
          setErrorMessage("Pembayaran perpanjangan masih tertunda.");
          setLoading(false);
        },
        onError: () => {
          setErrorMessage("Pembayaran perpanjangan gagal.");
          setLoading(false);
        },
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Gagal memproses perpanjangan.";
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 relative">
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
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700 text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-2.5 my-4">
          {EXTEND_PACKAGES.map((pkg) => {
            const isSelected = selectedPackage.minutes === pkg.minutes;
            return (
              <div
                key={pkg.minutes}
                onClick={() => setSelectedPackage(pkg)}
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
                  Rp {pkg.price.toLocaleString("id-ID")}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleProcessExtend}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/20 transition-all active:scale-[0.98] mt-2"
        >
          <CreditCard size={18} />
          <span>
            {loading
              ? "Memproses..."
              : `Bayar Perpanjangan Rp ${selectedPackage.price.toLocaleString("id-ID")}`}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ModalExtend;
