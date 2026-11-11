import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  BatteryLow,
  Bike,
  ChevronRight,
  ExternalLink,
  KeyRound,
  Lock,
  Map,
  RefreshCw,
  ShieldAlert,
  Unlock,
  Wrench,
} from "lucide-react";
import { computeFleetStats, getBikeStatusMeta } from "../utils/fleetStats";
import {
  formatCoordinate,
  formatDistance,
  formatRelativeTime,
  formatSpeed,
  getImuState,
  isImuAnomaly,
} from "../utils/fleetTelemetry";
import useAdminBikes from "../hooks/useAdminBikes";
import useAdminIncidents from "../hooks/useAdminIncidents";
import useBikeCommands from "../hooks/useBikeCommands";
import StatCard from "../components/admin/StatCard";
import FleetMap from "../components/admin/FleetMap";
import BatteryGauge from "../components/admin/BatteryGauge";
import ImuMonitorPanel from "../components/admin/ImuMonitorPanel";
import AnomalyAlertBanner from "../components/admin/AnomalyAlertBanner";
import IncidentFeed from "../components/admin/IncidentFeed";

const formatTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const IMU_BADGE_TONES = {
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
};

const IMU_DOT_TONES = {
  danger: "bg-rose-500",
  info: "bg-sky-500",
  success: "bg-emerald-500",
  neutral: "bg-slate-400",
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  const {
    bikes,
    geofence,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
    refreshInterval,
    initialLoading,
  } = useAdminBikes();

  const { commandStates, sendCommand, clearFeedback } = useBikeCommands({
    onSuccess: () => {
      void refresh({ silent: true });
    },
  });

  const {
    incidents,
    activeCount: incidentActiveCount,
    newCount: incidentNewCount,
    loading: incidentsLoading,
    error: incidentsError,
    refresh: refreshIncidents,
    markSeen: markIncidentsSeen,
  } = useAdminIncidents({ limit: 8 });

  const [selectedBikeId, setSelectedBikeId] = useState(null);
  const [focusNonce, setFocusNonce] = useState(0);

  const handleSelectBike = (bikeId) => {
    setSelectedBikeId(bikeId);
    setFocusNonce((current) => current + 1);
  };

  const handleOpenBikeDetail = (bikeId) => {
    navigate(`/admin/bikes/${encodeURIComponent(bikeId)}`);
  };

  const stats = computeFleetStats(bikes);
  const anomalies = bikes.filter(isImuAnomaly);
  const lowBatteryCount = bikes.filter(
    (bike) => bike.battery_low === true,
  ).length;
  const refreshSeconds = Math.round(refreshInterval / 1000);

  const distribution = [
    {
      label: "Siap / Dipesan",
      count: stats.ready,
      bar: "bg-emerald-500",
      dot: "bg-emerald-500",
    },
    {
      label: "Disewa",
      count: stats.rented,
      bar: "bg-blue-500",
      dot: "bg-blue-500",
    },
    {
      label: "Perawatan",
      count: stats.maintenance,
      bar: "bg-slate-400",
      dot: "bg-slate-400",
    },
    {
      label: "Peringatan",
      count: stats.alert,
      bar: "bg-red-500",
      dot: "bg-red-500",
    },
  ];

  const knownTotal = distribution.reduce(
    (total, item) => total + item.count,
    0,
  );
  const otherTotal = Math.max(stats.total - knownTotal, 0);

  const segments =
    otherTotal > 0
      ? [
          ...distribution,
          {
            label: "Lainnya",
            count: otherTotal,
            bar: "bg-slate-300",
            dot: "bg-slate-300",
          },
        ]
      : distribution;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600">
            Dashboard Admin
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Monitoring Armada
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Pantau posisi GPS NEO-6M, status kunci, baterai, dan gerakan
            MPU6050 dari satu peta interaktif.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live • {refreshSeconds}s
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                error ? "bg-red-500" : "bg-emerald-500"
              }`}
            />
            <span>{error ? "Gagal sinkron" : "Data tersinkron"}</span>
            <span className="text-slate-300">•</span>
            <span>
              {lastUpdated
                ? `Diperbarui ${formatTime(lastUpdated)}`
                : "Memuat data..."}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void refresh({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            <span>{refreshing ? "Memperbarui..." : "Perbarui Data"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">Data armada gagal diperbarui</p>
            <p className="mt-1 text-xs leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <AnomalyAlertBanner
        bikes={bikes}
        geofence={geofence}
        onSelectBike={handleSelectBike}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Sepeda"
          value={stats.total}
          helper="Seluruh unit yang terdaftar di sistem."
          icon={Bike}
          tone="brand"
          loading={initialLoading}
        />
        <StatCard
          title="Sepeda Disewa"
          value={stats.rented}
          helper="Termasuk sesi yang melewati batas waktu."
          icon={KeyRound}
          tone="blue"
          loading={initialLoading}
        />
        <StatCard
          title="Pelanggaran Geofence"
          value={stats.geofence}
          helper="Sepeda keluar dari radius aman pangkalan."
          icon={ShieldAlert}
          tone="amber"
          loading={initialLoading}
        />
        <StatCard
          title="Rusak / Tamper"
          value={stats.damaged}
          helper="Unit perawatan dan indikasi tamper MPU6050."
          icon={Wrench}
          tone="red"
          loading={initialLoading}
        />
        <StatCard
          title="Baterai Rendah"
          value={lowBatteryCount}
          helper="Unit di bawah ambang baterai perception layer."
          icon={BatteryLow}
          tone={lowBatteryCount > 0 ? "red" : "brand"}
          loading={initialLoading}
        />
      </div>

      <div
        id="peta-armada"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Map size={16} className="text-brand-600" />
              Peta Armada Real-time
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Marker GPS dinamis • radius geofence{" "}
              {formatDistance(geofence.radiusM)} • sensor gerak MPU6050
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              {bikes.length} unit
            </span>
            {anomalies.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">
                <Activity size={11} />
                {anomalies.length} anomali
              </span>
            )}
            <Link
              to="/admin/map"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Peta penuh
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        <FleetMap
          bikes={bikes}
          geofence={geofence}
          selectedBikeId={selectedBikeId}
          focusNonce={focusNonce}
          onSelectBike={handleSelectBike}
          onSendCommand={sendCommand}
          commandStates={commandStates}
          onClearFeedback={clearFeedback}
        />

        <div className="flex flex-col gap-1 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Sumber: GET /api/admin/bikes • pembaruan otomatis tiap{" "}
            {refreshSeconds} detik
          </span>
          <span>
            {anomalies.length > 0
              ? "Gerakan saat locked terdeteksi — cek panel IMU."
              : "Tidak ada anomali MPU6050 saat ini."}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Daftar Armada
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Status terbaru dari database, Redis, dan sensor MPU6050.
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {stats.total} unit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">ID Sepeda</th>
                  <th className="px-4 py-3">Nama Unit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Kunci</th>
                  <th className="px-4 py-3">IMU</th>
                  <th className="px-4 py-3">Baterai</th>
                  <th className="px-4 py-3">Koordinat Terakhir</th>
                  <th className="px-4 py-3">Update</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {initialLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      {Array.from({ length: 8 }).map((__, cellIndex) => (
                        <td
                          key={`skeleton-cell-${cellIndex}`}
                          className="px-4 py-4"
                        >
                          <div className="h-3.5 w-full max-w-[120px] animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : bikes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <Bike
                        size={34}
                        className="mx-auto mb-3 text-slate-300"
                      />
                      <p className="text-sm font-semibold text-slate-700">
                        Belum ada data armada
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Tambahkan sepeda pertama lewat menu Kelola Armada.
                      </p>
                    </td>
                  </tr>
                ) : (
                  bikes.map((bike) => {
                    const statusMeta = getBikeStatusMeta(bike.status);
                    const imuState = getImuState(bike);
                    const anomaly = isImuAnomaly(bike);

                    return (
                      <tr
                        key={bike.bike_id}
                        onClick={() => handleOpenBikeDetail(bike.bike_id)}
                        title={`Buka detail monitoring ${bike.bike_id}`}
                        className={`cursor-pointer transition-colors ${
                          anomaly
                            ? "bg-rose-50/70 hover:bg-rose-50"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1 font-mono text-xs font-bold text-slate-800">
                            {bike.bike_id}
                            <ChevronRight
                              size={14}
                              className="text-slate-300 transition-colors"
                            />
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="block max-w-[220px] truncate text-xs font-semibold text-slate-700">
                            {bike.name || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`}
                            />
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                              bike.lock_state
                                ? "text-slate-600"
                                : "text-amber-600"
                            }`}
                          >
                            {bike.lock_state ? (
                              <Lock size={14} />
                            ) : (
                              <Unlock size={14} />
                            )}
                            {bike.lock_state ? "Terkunci" : "Terbuka"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                                IMU_BADGE_TONES[imuState.tone] ||
                                IMU_BADGE_TONES.neutral
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  IMU_DOT_TONES[imuState.tone] ||
                                  IMU_DOT_TONES.neutral
                                }`}
                              />
                              {imuState.label}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {bike.has_live_location
                                ? `${bike.mpu_motion ? "Gerak" : "Diam"} • ${formatSpeed(bike.speed)}`
                                : "Belum ada data live"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <BatteryGauge percent={bike.battery_percent} />
                          {bike.battery_low === true && (
                            <span className="mt-1 inline-flex rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                              Rendah
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[11px] text-slate-600">
                            {formatCoordinate(
                              bike.last_latitude,
                              bike.last_longitude,
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span
                              title={
                                bike.has_live_location
                                  ? "Lokasi live dari Redis"
                                  : "Koordinat terakhir dari database"
                              }
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                bike.has_live_location
                                  ? "bg-emerald-500"
                                  : "bg-slate-300"
                              }`}
                            />
                            <span className="whitespace-nowrap">
                              {formatDateTime(bike.last_reported_at)}
                            </span>
                          </div>
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            {formatRelativeTime(bike.last_reported_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10px] text-slate-400">
            Sumber: GET /api/admin/bikes • pembaruan otomatis tiap{" "}
            {refreshSeconds} detik
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Distribusi Status
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Komposisi kondisi seluruh armada.
                </p>
              </div>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                {stats.total} unit
              </span>
            </div>

            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              {stats.total === 0 ? (
                <div className="h-full w-full bg-slate-200" />
              ) : (
                segments
                  .filter((segment) => segment.count > 0)
                  .map((segment) => (
                    <div
                      key={segment.label}
                      title={`${segment.label}: ${segment.count} unit`}
                      style={{
                        width: `${(segment.count / stats.total) * 100}%`,
                      }}
                      className={segment.bar}
                    />
                  ))
              )}
            </div>

            <div className="mt-4 space-y-2.5">
              {segments.map((segment) => {
                const percentage =
                  stats.total > 0
                    ? Math.round((segment.count / stats.total) * 100)
                    : 0;

                return (
                  <div
                    key={segment.label}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="flex items-center gap-2 text-slate-600">
                      <span
                        className={`h-2 w-2 rounded-full ${segment.dot}`}
                      />
                      {segment.label}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {segment.count}{" "}
                      <span className="font-normal text-slate-400">
                        ({percentage}%)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <ImuMonitorPanel
            bikes={bikes}
            geofence={geofence}
            selectedBikeId={selectedBikeId}
            onSelectBike={handleSelectBike}
          />

          <IncidentFeed
            incidents={incidents}
            activeCount={incidentActiveCount}
            newCount={incidentNewCount}
            loading={incidentsLoading}
            error={incidentsError}
            onRefresh={refreshIncidents}
            onSelectBike={handleSelectBike}
            onMarkSeen={markIncidentsSeen}
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
