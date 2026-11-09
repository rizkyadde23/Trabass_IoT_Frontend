import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin, ShieldAlert } from "lucide-react";
import {
  DEFAULT_GEOFENCE,
  formatCoordinate,
  formatDistance,
  formatRelativeTime,
  formatSpeed,
  getBikeCoordinates,
  getBikeDistanceFromStation,
  isImuAnomaly,
} from "../../utils/fleetTelemetry";

const getNotificationLabel = (bike) => {
  if (bike.imu_alert_notified === true) return "WA terkirim";
  if (bike.imu_alert_notified === false) return "WA gagal — fallback SMS";
  if (bike.imu_alert_at) return "Menunggu status WA";
  return "Notifikasi backend diproses";
};

const AnomalyAlertBanner = ({
  bikes = [],
  geofence = DEFAULT_GEOFENCE,
  onSelectBike,
  showMapLink = true,
  className = "",
}) => {
  const anomalies = bikes.filter(isImuAnomaly);

  if (anomalies.length === 0) return null;

  const latest = [...anomalies].sort((first, second) => {
    const firstTime = new Date(
      first.imu_alert_at || first.last_reported_at || 0,
    ).getTime();
    const secondTime = new Date(
      second.imu_alert_at || second.last_reported_at || 0,
    ).getTime();

    return secondTime - firstTime;
  })[0];

  const coords = getBikeCoordinates(latest);
  const distanceM = getBikeDistanceFromStation(latest, geofence);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <ShieldAlert size={22} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold">
              Gerakan anomali terdeteksi pada {anomalies.length} sepeda
              terkunci
            </p>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-rose-700">
              MPU6050 mendeteksi gerakan saat sepeda berstatus locked. Backend
              mengaktifkan alarm dan memproses notifikasi WA ke admin.
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {anomalies.slice(0, 5).map((bike) => (
                <span
                  key={bike.bike_id}
                  className="rounded-full border border-rose-200 bg-white/70 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-700"
                >
                  {bike.bike_id}
                </span>
              ))}
              {anomalies.length > 5 && (
                <span className="rounded-full border border-rose-200 bg-white/70 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                  +{anomalies.length - 5} lain
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-rose-700">
              <span>
                Terakhir:{" "}
                <strong className="font-semibold">{latest.bike_id}</strong>
                {" · "}
                {formatRelativeTime(
                  latest.imu_alert_at || latest.last_reported_at,
                )}
              </span>
              <span>Kecepatan: {formatSpeed(latest.speed)}</span>
              {coords && (
                <span>
                  Koordinat: {formatCoordinate(coords.lat, coords.lng)}
                </span>
              )}
              {distanceM !== null && (
                <span>{formatDistance(distanceM)} dari pangkalan</span>
              )}
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {getNotificationLabel(latest)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {onSelectBike && (
            <button
              type="button"
              onClick={() => onSelectBike(latest.bike_id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
            >
              <MapPin size={14} />
              Lihat {latest.bike_id}
            </button>
          )}

          {showMapLink && (
            <Link
              to="/admin/map"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-rose-700"
            >
              Buka peta penuh
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnomalyAlertBanner;
