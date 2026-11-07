import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  CreditCard,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { createRentTransaction } from "../services/api";
import { useRental } from "../context/RentalContext";

const DURATION_PACKAGES = [
  {
    minutes: 15,
    price: 5000,
    label: "15 Menit",
    desc: "Cocok untuk perjalanan singkat",
  },
  {
    minutes: 30,
    price: 10000,
    label: "30 Menit",
    desc: "Paling populer untuk keliling kampus",
    isPopular: true,
  },
  {
    minutes: 60,
    price: 18000,
    label: "60 Menit",
    desc: "Hemat untuk durasi santai",
  },
];

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, startRentalSession } = useRental();

  const bikeId = searchParams.get("bike_id") || "BK-001";
  const [selectedPackage, setSelectedPackage] = useState(DURATION_PACKAGES[1]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePayNow = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage("");

    try {
      // Backend akan otomatis membatalkan transaksi lama & mengembalikan Snap Token baru
      const response = await createRentTransaction({
        bike_id: bikeId,
        user_id: user.user_id,
        duration_minutes: selectedPackage.minutes,
        amount: selectedPackage.price,
      });

      const { snap_token, order_id } = response.data;

      if (!window.snap) {
        throw new Error("Midtrans Snap SDK belum dimuat.");
      }

      window.snap.pay(snap_token, {
        onSuccess: (result) => {
          console.log("[MIDTRANS SUCCESS]", result);
          startRentalSession({
            order_id: order_id,
            bike_id: bikeId,
            duration_minutes: selectedPackage.minutes,
          });
          navigate("/active");
        },
        onPending: (result) => {
          console.log("[MIDTRANS PENDING]", result);
          setErrorMessage("Pembayaran belum diselesaikan.");
          setLoading(false);
        },
        onError: (result) => {
          console.error("[MIDTRANS ERROR]", result);
          setErrorMessage("Pembayaran gagal.");
          setLoading(false);
        },
        onClose: () => {
          console.log("[MIDTRANS POPUP CLOSED]");
          setLoading(false);
        },
      });
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Gagal memulai transaksi.";
      setErrorMessage(msg);
      setLoading(false);
    }
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

        {/* Pemilihan Paket Durasi */}
        <div className="my-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Pilih Paket Durasi
          </h2>
          <div className="space-y-3">
            {DURATION_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.minutes === pkg.minutes;
              return (
                <div
                  key={pkg.minutes}
                  onClick={() => setSelectedPackage(pkg)}
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
                      className={`p-2.5 rounded-xl ${isSelected ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-500"}`}
                    >
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {pkg.label}
                      </h3>
                      <p className="text-xs text-slate-500">{pkg.desc}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-600">
                      Rp {pkg.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rincian Pembayaran */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 my-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Rincian Pembayaran
          </h2>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Penyewa</span>
            <span className="font-semibold text-slate-800">{user.name}</span>
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
              Rp {selectedPackage.price.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="py-4">
        <button
          onClick={handlePayNow}
          disabled={loading}
          className="w-full py-4 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/20 transition-all active:scale-[0.98]"
        >
          <CreditCard size={20} />
          <span>
            {loading
              ? "Memproses Transaksi..."
              : `Bayar Rp ${selectedPackage.price.toLocaleString("id-ID")}`}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Checkout;
