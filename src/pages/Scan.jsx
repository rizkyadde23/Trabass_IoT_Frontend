import React from "react";
import { useNavigate } from "react-router-dom";
import QRScanner from "../components/QRScanner";
import { ArrowLeft } from "lucide-react";

const Scan = () => {
  const navigate = useNavigate();

  const handleScanSuccess = (decodedText) => {
    let bikeId = decodedText.trim();
    // Parsing jika QR berisi format URL (contoh: https://sehatyuk.app/rent?bike_id=BK-001)
    if (bikeId.includes("bike_id=")) {
      const urlParams = new URLSearchParams(bikeId.split("?")[1]);
      bikeId = urlParams.get("bike_id") || bikeId;
    }
    bikeId = bikeId.toUpperCase();
    navigate(`/checkout?bike_id=${bikeId}`);
  };

  return (
    <div className="flex flex-col min-h-screen p-5 bg-slate-900 text-white justify-between">
      {/* Header Navigation */}
      <div className="flex items-center space-x-4 my-2">
        <button
          onClick={() => navigate("/")}
          className="p-2.5 bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold">Pindai QR Code Sepeda</h1>
      </div>

      {/* Area Scanner */}
      <div className="flex-1 flex flex-col items-center justify-center my-6">
        <p className="text-xs text-slate-400 mb-6 text-center max-w-xs leading-relaxed">
          Posisikan QR Code di dalam bingkai di bawah ini untuk memulai
          transaksi sewa.
        </p>
        <div className="w-full max-w-xs">
          <QRScanner onScanSuccess={handleScanSuccess} />
        </div>
      </div>

      {/* Footer Tips */}
      <div className="text-center py-4 bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
        <p className="text-[11px] text-slate-400">
          Pastikan pencahayaan cukup dan posisi stiker QR tidak tertutup.
        </p>
      </div>
    </div>
  );
};

export default Scan;
