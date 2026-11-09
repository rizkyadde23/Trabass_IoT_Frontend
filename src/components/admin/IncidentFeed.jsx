import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Radio,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { formatRelativeTime } from "../../utils/fleetTelemetry";

const TYPE_META = {
  TAMPER: {
    label: "Guncangan MPU6050",
    icon: Activity,
    iconClass: "bg-rose-100 text-rose-600",
    borderClass: "border-rose-100",
  },
  GEOFENCE: {
    label: "Pelanggaran Geofence",
    icon: MapPin,
    iconClass: "bg-amber-100 text-amber-600",
    borderClass: "border-amber-100",
  },
};

const getTypeMeta = (type) =>
  TYPE_META[String(type || "").toUpperCase()] || {
    label: "Insiden Keamanan",
    icon: ShieldAlert,
    iconClass: "bg-slate-100 text-slate-600",
    borderClass: "border-slate-100",
  };

const IncidentRow = ({ incident, onSelectBike, onMarkSeen }) => {
  const meta = getTypeMeta(incident.incident_type);
  const Icon = meta.icon;
  const isActive = incident.status === "ACTIVE";

  return (
    <button
      type="button"
      onClick={() => {
        onMarkSeen?.();
        onSelectBike?.(incident.bike_id);
      }}
      className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 ${meta.borderClass}`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.iconClass}`}
      >
        <Icon size={16} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[11px] font-bold text-slate-800">
            {incident.bike_id}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {meta.label}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              isActive
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? "animate-pulse bg-rose-500" : "bg-emerald-500"
              }`}
            />
            {isActive ? "Aktif" : "Selesai"}
          </span>
        </span>

        <span className="mt-1 block truncate text-[11px] font-semibold text-slate-700">
          {incident.bike_name || "Unit tanpa nama"}
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
          {incident.message}
        </span>

        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
          <span>
            {isActive
              ? `Aktif ${formatRelativeTime(incident.detected_at)}`
              : `Selesai ${formatRelativeTime(incident.resolved_at)}`}
          </span>
          {incident.distance_m !== null &&
            incident.distance_m !== undefined && (
              <span>• {Math.round(incident.distance_m)} m dari pangkalan</span>
            )}
          {incident.speed !== null && incident.speed !== undefined && (
            <span>• {Number(incident.speed).toFixed(1)} km/j</span>
          )}
        </span>
      </span>

      <ChevronRight
        size={15}
        className="mt-1 shrink-0 text-slate-300"
        aria-hidden="true"
      />
    </button>
  );
};

const IncidentFeed = ({
  incidents = [],
  activeCount = 0,
  newCount = 0,
  loading = false,
  error = "",
  onRefresh,
  onSelectBike,
  onMarkSeen,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  compact = false,
  className = "",
}) => {
  const visibleIncidents = compact ? incidents.slice(0, 6) : incidents;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Radio size={16} className="text-brand-600" />
            Incident Feed
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Riwayat guncangan MPU6050 dan pelanggaran geofence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">
              <ShieldAlert size={11} />
              {activeCount} aktif
            </span>
          )}

          {newCount > 0 && (
            <button
              type="button"
              onClick={onMarkSeen}
              className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700"
            >
              {newCount} baru
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={() => void onRefresh({ silent: true })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          )}

          {compact && (
            <Link
              to="/admin/incidents"
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Lihat semua
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-[10px] text-amber-800">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`incident-skeleton-${index}`} className="space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : visibleIncidents.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <CheckCircle2 size={30} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-sm font-semibold text-slate-700">
            Belum ada insiden keamanan
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Feed akan terisi otomatis saat tamper atau pelanggaran geofence
            terdeteksi.
          </p>
        </div>
      ) : (
        <div>
          {visibleIncidents.map((incident) => (
            <IncidentRow
              key={incident.incident_id}
              incident={incident}
              onSelectBike={onSelectBike}
              onMarkSeen={onMarkSeen}
            />
          ))}
        </div>
      )}

      {!compact && hasMore && (
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={() => void onLoadMore?.()}
            disabled={loadingMore}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {loadingMore ? "Memuat..." : "Muat lebih banyak"}
          </button>
        </div>
      )}
    </div>
  );
};

export default IncidentFeed;
