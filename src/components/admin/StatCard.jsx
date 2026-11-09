import React from "react";

const TONES = {
  brand: {
    icon: "bg-brand-50 text-brand-600",
    value: "text-slate-900",
  },
  blue: {
    icon: "bg-blue-50 text-blue-600",
    value: "text-slate-900",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    value: "text-slate-900",
  },
  red: {
    icon: "bg-red-50 text-red-600",
    value: "text-slate-900",
  },
};

const StatCard = ({
  title,
  value,
  helper,
  icon: Icon,
  tone = "brand",
  loading = false,
}) => {
  const palette = TONES[tone] || TONES.brand;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {title}
          </p>

          {loading ? (
            <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p
              className={`mt-2 text-3xl font-bold tracking-tight ${palette.value}`}
            >
              {value}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${palette.icon}`}
        >
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        {helper}
      </p>
    </div>
  );
};

export default StatCard;
