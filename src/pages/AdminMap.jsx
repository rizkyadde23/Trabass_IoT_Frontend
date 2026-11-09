import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Map,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import useAdminBikes from "../hooks/useAdminBikes";
import {
  formatDistance,
  formatTime,
  summarizeImu,
} from "../utils/fleetTelemetry";
import FleetMap from "../components/admin/FleetMap";
import ImuMonitorPanel from "../components/admin/ImuMonitorPanel";
import AnomalyAlertBanner from "../components/admin/AnomalyAlertBanner";

const AdminMap = () => {
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

  const [selectedBikeId, setSelectedBikeId] = useState(null);
  const [focusNonce, setFocusNonce] = useState(0);

  const handleSelectBike = (bikeId) => {
    setSelectedBikeId(bikeId);
    setFocusNonce((current) => current + 1);
  };

  const imuSummary = summarizeImu(bikes);
  const refreshSeconds = Math.round(refreshInterval / 1000);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:text-brand-700"
          >
            <ArrowLeft size={13} />
            Kembali ke dashboard
          </Link>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            <Map size={26} className="text-brand-600" />
            Peta Armada
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Posisi GPS NEO-6M, radius geofence{" "}
            {formatDistance(geofence.radiusM)}, dan status gerak MPU6050
            seluruh armada.
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
            <span>{error ? "Gagal sinkron" : "Tersinkron"}</span>
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
        showMapLink={false}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Live Fleet Map
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Klik marker untuk melihat data sensor dan lokasi terakhir.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                {bikes.length} unit
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                <Activity size={11} />
                {imuSummary.monitored} live
              </span>
              {imuSummary.anomaly > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">
                  <ShieldAlert size={11} />
                  {imuSummary.anomaly} anomali
                </span>
              )}
            </div>
          </div>

          <FleetMap
            bikes={bikes}
            geofence={geofence}
            selectedBikeId={selectedBikeId}
            focusNonce={focusNonce}
            onSelectBike={handleSelectBike}
            heightClass="h-[480px] sm:h-[560px] xl:h-[calc(100vh-19rem)] xl:min-h-[520px]"
          />

          <div className="flex flex-col gap-1 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              GET /api/admin/bikes • polling {refreshSeconds}s •{" "}
              {initialLoading ? "memuat awal..." : "data live"}
            </span>
            <span>
              Geofence {formatDistance(geofence.radiusM)} dari pangkalan
            </span>
          </div>
        </div>

        <ImuMonitorPanel
          bikes={bikes}
          geofence={geofence}
          selectedBikeId={selectedBikeId}
          onSelectBike={handleSelectBike}
          className="xl:sticky xl:top-20"
        />
      </div>
    </div>
  );
};

export default AdminMap;
