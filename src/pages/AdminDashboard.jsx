import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bike,
  KeyRound,
  Lock,
  Map,
  RefreshCw,
  ShieldAlert,
  Unlock,
  Wrench,
} from "lucide-react";
import { getAdminBikes, getApiErrorMessage } from "../services/api";
import { computeFleetStats, getBikeStatusMeta } from "../utils/fleetStats";
import StatCard from "../components/admin/StatCard";

const REFRESH_INTERVAL_MS = 15000;

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

const formatCoordinate = (latitude, longitude) => {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return "—";
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "—";

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

const AdminDashboard = () => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadBikes = useCallback(async ({ silent = false } = {}) => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await getAdminBikes();
      const list = response?.data?.bikes;

      if (!Array.isArray(list)) {
        throw new Error("Format respons data armada tidak valid.");
      }

      if (!mountedRef.current) return;

      setBikes(list);
      setLastUpdated(
        response?.data?.generated_at || new Date().toISOString(),
      );
      setError("");
    } catch (loadError) {
      if (!mountedRef.current) return;

      setError(
        getApiErrorMessage(
          loadError,
          "Gagal memuat data armada dari backend.",
        ),
      );
    } finally {
      inFlightRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadBikes();

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadBikes({ silent: true });
      }
    }, REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadBikes({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [loadBikes]);

  const stats = computeFleetStats(bikes);
  const isLoadingFirstBatch = loading && bikes.length === 0;

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
            Pantau kondisi seluruh sepeda, status kunci, dan indikasi
            pelanggaran keamanan dari satu tempat.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
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
            onClick={() => void loadBikes({ silent: true })}
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
            onClick={() => void loadBikes()}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Sepeda"
          value={stats.total}
          helper="Seluruh unit yang terdaftar di sistem."
          icon={Bike}
          tone="brand"
          loading={isLoadingFirstBatch}
        />
        <StatCard
          title="Sepeda Disewa"
          value={stats.rented}
          helper="Termasuk sesi yang melewati batas waktu."
          icon={KeyRound}
          tone="blue"
          loading={isLoadingFirstBatch}
        />
        <StatCard
          title="Pelanggaran Geofence"
          value={stats.geofence}
          helper="Sepeda keluar dari radius aman pangkalan."
          icon={ShieldAlert}
          tone="amber"
          loading={isLoadingFirstBatch}
        />
        <StatCard
          title="Rusak / Tamper"
          value={stats.damaged}
          helper="Unit perawatan dan indikasi tamper MPU6050."
          icon={Wrench}
          tone="red"
          loading={isLoadingFirstBatch}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Daftar Armada
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Status terbaru dari database dan telemetri Redis.
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {stats.total} unit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">ID Sepeda</th>
                  <th className="px-4 py-3">Nama Unit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Kunci</th>
                  <th className="px-4 py-3">Koordinat Terakhir</th>
                  <th className="px-4 py-3">Update</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoadingFirstBatch ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      {Array.from({ length: 6 }).map((__, cellIndex) => (
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
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Bike
                        size={34}
                        className="mx-auto mb-3 text-slate-300"
                      />
                      <p className="text-sm font-semibold text-slate-700">
                        Belum ada data armada
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Pastikan backend, database, dan koneksi API berjalan
                        normal.
                      </p>
                    </td>
                  </tr>
                ) : (
                  bikes.map((bike) => {
                    const statusMeta = getBikeStatusMeta(bike.status);

                    return (
                      <tr
                        key={bike.bike_id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {bike.bike_id}
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10px] text-slate-400">
            Sumber: GET /api/admin/bikes • pembaruan otomatis tiap 15 detik
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

          <div className="flex min-h-[230px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Map size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Peta Armada Real-time
            </h3>
            <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-slate-500">
              Integrasi Leaflet.js, marker armada, dan radius geofence 500 m
              akan ditambahkan pada langkah 3.2.2.
            </p>
            <span className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Segera Hadir
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
