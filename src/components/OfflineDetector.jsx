import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

const OfflineDetector = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs font-bold py-2 px-4 flex items-center justify-center space-x-2 shadow-md">
      <WifiOff size={16} />
      <span>Koneksi terputus. Mode offline aktif.</span>
    </div>
  );
};

export default OfflineDetector;
