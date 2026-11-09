import React from "react";
import {
  Activity,
  ChevronRight,
  Lock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import {
  DEFAULT_GEOFENCE,
  formatDistance,
  formatRelativeTime,
  formatSpeed,
  getBikeCoordinates,
  getBikeDistanceFromStation,
  getImuState,
  isImuAnomaly,
  isTelemetryStale,
  summarizeImu,
} from "../../utils/fleetTelemetry";

const TONE_STYLES = {
  danger: {
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    icon: "bg-rose-100 text-rose-600",
    row: "border-rose-100 bg-rose-50/60",
  },
  info: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    icon: "bg-sky-100 text-sky-600",
    row: "border-slate-100 bg-white",
  },
  success: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: "bg-emerald-100 text-emerald-600",
    row: "border-slate-100 bg-white",
  },
  neutral: {
    badge: "border-slate-200 bg-slate-100 text-slate-600",
    icon: "bg-slate-100 text-slate-500",
    row: "border-slate-100 bg-white",
  },
};

const SORT_ORDER = {
  anomaly: 0,
  sensing: 1,
  "no-data": 2,
  "locked-safe": 3,
  unlocked: 4,
};

const COUNTERS = [
  {
    key: "anomaly",
    label: "Anomali",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    key: "sensing",
    label: "Sensing",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    key: "lockedSafe",
    label: "Aman",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
];

const ImuMonitorPanel = ({
  bikes = [],
  geofence = DEFAULT_GEOFENCE,
  selectedBikeId = null,
  onSelectBike,
  className = "",
}) => {
  const summary = summarizeImu(bikes);
  const sortedBikes = [...bikes].sort((first, second) => {
    const firstKey = getImuState(first).key;
    const secondKey = getImuState(second).key;

    const orderDiff =
      (SORT_ORDER[firstKey] ?? 99) - (SORT_ORDER[secondKey] ?? 99);

    if (orderDiff !== 0) return orderDiff;

    return String(first.bike_id).localeCompare(String(second.bike_id));
  });

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Activity size={16} className="text-brand-600" />
              Monitoring IMU MPU6050
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Gerakan saat locked = anomali. Saat unlocked, sensor hanya
              melakukan sensing.
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {summary.monitored}/{summary.total} live
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {COUNTERS.map((counter) => (
            <div
              key={counter.key}
              className={`rounded-xl border px-2.5 py-2 ${counter.className}`}
            >
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                {counter.label}
              </p>
              <p className="mt-0.5 text-lg font-bold leading-none">
                {summary[counter.key]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-h-[430px] divide-y divide-slate-100 overflow-y-auto">
        {sortedBikes.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
            <Activity size={28} className="mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">
              Belum ada data sensor
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Panel akan terisi setelah telemetri MPU6050 masuk.
            </p>
          </div>
        ) : (
          sortedBikes.map((bike) => {
            const state = getImuState(bike);
            const tone = TONE_STYLES[state.tone] || TONE_STYLES.neutral;
            const anomaly = isImuAnomaly(bike);
            const coords = getBikeCoordinates(bike);
            const distanceM = getBikeDistanceFromStation(bike, geofence);
            const selected = bike.bike_id === selectedBikeId;
            const stale =
              !bike.has_live_location || isTelemetryStale(bike.last_reported_at);

            return (
              <div
                key={bike.bike_id}
                className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                  selected ? "bg-brand-50/70" : tone.row
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}
                >
                  {anomaly ? (
                    <ShieldAlert size={16} />
                  ) : bike.lock_state ? (
                    <Lock size={15} />
                  ) : (
                    <Unlock size={15} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-bold text-slate-800">
                        {bike.bike_id}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {bike.name || "Tanpa nama unit"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${tone.badge}`}
                    >
                      {state.key === "locked-safe" && (
                        <ShieldCheck size={10} />
                      )}
                      {state.label}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                    <span className="font-medium text-slate-600">
                      {bike.lock_state ? "Locked" : "Unlocked"}
                    </span>
                    <span
                      className={
                        anomaly ? "font-bold text-rose-600" : "font-medium"
                      }
                    >
                      Gerak: {bike.mpu_motion ? "Ya" : "Tidak"}
                    </span>
                    <span>{formatSpeed(bike.speed)}</span>
                    {distanceM !== null && (
                      <span>{formatDistance(distanceM)} ke pangkalan</span>
                    )}
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] ${
                        stale ? "font-semibold text-amber-600" : "text-slate-400"
                      }`}
                    >
                      {formatRelativeTime(bike.last_reported_at)}
                      {stale ? " · data lama" : ""}
                    </span>

                    {onSelectBike && coords && (
                      <button
                        type="button"
                        onClick={() => onSelectBike(bike.bike_id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                      >
                        <MapPin size={10} />
                        Lihat
                        <ChevronRight size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[10px] leading-relaxed text-slate-400">
        Unlocked: sensing saja. Locked + gerakan: alarm, WA, dan peringatan
        dashboard.
      </div>
    </div>
  );
};

export default ImuMonitorPanel;
