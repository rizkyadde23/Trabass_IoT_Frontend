import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScanSuccess, onScanError }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        if (onScanSuccess) onScanSuccess(decodedText);
      },
      (errorMessage) => {
        if (onScanError) onScanError(errorMessage);
      }
    );

    return () => {
      scanner.clear().catch((err) => console.error("Gagal membersihkan scanner instance", err));
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div 
        id="qr-reader" 
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-lg border border-slate-700 bg-slate-800 text-white"
      ></div>
    </div>
  );
};

export default QRScanner;