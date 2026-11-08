import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

const CountdownTimer = ({
  endTime,
  totalDurationMinutes,
  onExpire,
  onWarning,
}) => {
  const [timeLeft, setTimeLeft] = useState({
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
  });
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(endTime).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, totalSeconds: 0 });
        if (onExpire) onExpire();
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ minutes, seconds, totalSeconds });

      // Indikator Warning jika sisa waktu <= 5 menit (300 detik)
      if (totalSeconds <= 300 && !isWarning) {
        setIsWarning(true);
        if (onWarning) onWarning(minutes);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  // Hitung persentase progress bar
  const totalSecondsInitial = totalDurationMinutes * 60;
  const progressPercent = Math.min(
    100,
    Math.max(0, (timeLeft.totalSeconds / totalSecondsInitial) * 100),
  );

  const formatNumber = (num) => String(num).padStart(2, "0");

  return (
    <div className="w-full flex flex-col items-center">
      {/* Visual Circle / Badge Status Waktu */}
      <div
        className={`w-44 h-44 rounded-full flex flex-col items-center justify-center border-4 shadow-xl transition-all duration-500 ${
          isWarning
            ? "bg-amber-50 border-amber-500 text-amber-600 animate-pulse"
            : "bg-white border-brand-500 text-brand-600"
        }`}
      >
        <Clock size={28} className="mb-1" />
        <span className="text-3xl font-extrabold tracking-tight font-mono">
          {formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
        </span>
        <span className="text-[11px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">
          {timeLeft.totalSeconds > 0 ? "Sisa Waktu" : "Waktu Habis"}
        </span>
      </div>

      {/* Warning Text jika <= 5 menit */}
      {isWarning && timeLeft.totalSeconds > 0 && (
        <div className="mt-4 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold flex items-center space-x-1.5 animate-bounce">
          <AlertTriangle size={14} />
          <span>Sisa waktu kurang dari 5 menit!</span>
        </div>
      )}

      {/* Progress Bar Horizontal */}
      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-6 shadow-inner">
        <div
          className={`h-full transition-all duration-1000 ${
            isWarning ? "bg-amber-500" : "bg-brand-500"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

export default CountdownTimer;
