import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, Bike, ArrowRight, ShieldCheck } from "lucide-react";
import { useRental } from "../context/RentalContext";

const Home = () => {
  const [manualBikeId, setManualBikeId] = useState("");
  const navigate = useNavigate();
  const { user } = useRental();

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualBikeId.trim()) return;
    const formattedId = manualBikeId.trim().toUpperCase();
    navigate(`/checkout?bike_id=${formattedId}`);
  };

  return (
    <div className="flex flex-col min-h-screen p-5 bg-slate-50 justify-between">
      <div>
        {/* Header User Profile */}
        <div className="flex items-center justify-between my-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-brand-500 text-white rounded-2xl shadow-md">
              <Bike size={26} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800">
                TRABASS RENTAL
              </h1>
              <p className="text-xs text-slate-500">
                Halo,{" "}
                <span className="font-semibold text-slate-700">
                  {user.name}
                </span>
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full border border-brand-500/20 flex items-center space-x-1">
            <ShieldCheck size={12} />
            <span>Sistem Aktif</span>
          </span>
        </div>

        {/* Card Hero Scan QR */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center my-5">
          <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 mb-4 shadow-inner">
            <QrCode size={38} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            Mulai Sewa Sepeda
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Pindai QR Code yang tertera pada stang sepeda untuk membuka kunci
            secara otomatis.
          </p>

          <button
            onClick={() => navigate("/scan")}
            className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/20 transition-all active:scale-[0.98]"
          >
            <QrCode size={20} />
            <span>Scan QR Code</span>
          </button>
        </div>

        {/* Manual Input Fallback */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-xs font-semibold text-slate-600 mb-3">
            Atau Masukkan ID Sepeda Manual
          </h3>
          <form onSubmit={handleManualSubmit} className="flex space-x-2">
            <input
              type="text"
              placeholder="Contoh: BK-001"
              value={manualBikeId}
              onChange={(e) => setManualBikeId(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-100 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
            />
            <button
              type="submit"
              className="p-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-all active:scale-95 flex items-center justify-center"
            >
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center py-4">
        <p className="text-[11px] text-slate-400">
          © 2026 Tracking Bicycle Alert & Security System
        </p>
      </div>
    </div>
  );
};

export default Home;
