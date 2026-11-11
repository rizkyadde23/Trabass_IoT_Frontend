import React from "react";

/**
 * Widget baterai dari perception layer (persen 0-100).
 * - Hijau  : > 50%
 * - Kuning : 21-50%
 * - Merah  : <= 20% (batas BATTERY_LOW_THRESHOLD_PERCENT backend)
 * - "N/A"  : ESP32 belum mengirim data baterai.
 */
const BatteryGauge = ({ percent, className = "" }) => {
  const value =
    percent === null || percent === undefined || !Number.isFinite(Number(percent))
      ? null
      : Math.min(100, Math.max(0, Number(percent)));

  if (value === null) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 ${className}`}
        title="ESP32 belum mengirim data baterai"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        N/A
      </span>
    );
  }

  const tone =
    value > 50
      ? { bar: "bg-emerald-500", text: "text-emerald-600", dot: "bg-emerald-500" }
      : value > 20
        ? { bar: "bg-amber-500", text: "text-amber-600", dot: "bg-amber-500" }
        : { bar: "bg-red-500", text: "text-red-600", dot: "bg-red-500" };

  return (
    <span className={`flex flex-col gap-1 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone.text}`}
        title={`Baterai ${value}%`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
        {Math.round(value)}%
      </span>
      <span className="h-1.5 w-full max-w-[80px] overflow-hidden rounded-full bg-slate-100">
        <span
          className={`block h-full rounded-full ${tone.bar}`}
          style={{ width: `${value}%` }}
        />
      </span>
    </span>
  );
};

export default BatteryGauge;
