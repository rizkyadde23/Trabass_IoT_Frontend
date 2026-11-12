import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAdminBikeDetail,
  getAdminBikeTelemetry,
  getApiErrorMessage,
} from "../services/api";
import {
  DEFAULT_GEOFENCE,
  normalizeGeofence,
} from "../utils/fleetTelemetry";

const FALLBACK_REFRESH_MS = 5000;
const MIN_REFRESH_MS = 2000;

const resolveRefreshInterval = (override) => {
  const candidates = [override, import.meta.env.VITE_ADMIN_REFRESH_MS];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= MIN_REFRESH_MS) {
      return parsed;
    }
  }

  return FALLBACK_REFRESH_MS;
};

/**
 * Sumber data untuk halaman detail monitoring per sepeda (/admin/bikes/:bikeId).
 * Menggabungkan polling detail live (Redis + MySQL) dan riwayat telemetri
 * perception layer dalam satu siklus agar keduanya tetap sinkron.
 */
export const useAdminBikeDetail = ({
  bikeId,
  telemetryLimit = 50,
  intervalMs,
} = {}) => {
  const refreshInterval = resolveRefreshInterval(intervalMs);

  const [bike, setBike] = useState(null);
  const [activeRental, setActiveRental] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [geofence, setGeofence] = useState(DEFAULT_GEOFENCE);
  const [telemetry, setTelemetry] = useState([]);
  const [telemetryTotal, setTelemetryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // State di-reset saat admin berpindah dari satu sepeda ke sepeda lain
  // agar skeleton loading dan pesan error tidak bocor antar sepeda.
  useEffect(() => {
    setBike(null);
    setActiveRental(null);
    setPendingPayment(null);
    setGeofence(DEFAULT_GEOFENCE);
    setTelemetry([]);
    setTelemetryTotal(0);
    setLoading(true);
    setRefreshing(false);
    setError("");
    setNotFound(false);
    setLastUpdated(null);
  }, [bikeId]);

  const loadDetail = useCallback(
    async ({ silent = false } = {}) => {
      if (!bikeId || inFlightRef.current) return;

      inFlightRef.current = true;

      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const [detailPayload, telemetryPayload] = await Promise.all([
          getAdminBikeDetail(bikeId),
          getAdminBikeTelemetry(bikeId, { limit: telemetryLimit }),
        ]);

        const detail = detailPayload?.data;

        if (!detail?.bike) {
          throw new Error("Format respons detail sepeda tidak valid.");
        }

        if (!mountedRef.current) return;

        setBike(detail.bike);
        setActiveRental(detail.active_rental || null);
        setPendingPayment(detail.pending_payment || null);
        setGeofence(normalizeGeofence(detail.geofence));
        setTelemetry(telemetryPayload?.data?.logs || []);
        setTelemetryTotal(telemetryPayload?.data?.total || 0);
        setLastUpdated(new Date().toISOString());
        setError("");
        setNotFound(false);
      } catch (loadError) {
        if (!mountedRef.current) return;

        const isNotFound =
          loadError?.response?.status === 404 ||
          String(loadError?.response?.data?.message || "").includes(
            "tidak ditemukan",
          ) ||
          String(loadError?.message || "").includes("tidak valid");

        if (isNotFound) {
          setNotFound(true);
          setError("");
        } else {
          setError(
            getApiErrorMessage(
              loadError,
              "Gagal memuat detail sepeda dari backend.",
            ),
          );
        }
      } finally {
        inFlightRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [bikeId, telemetryLimit],
  );

  useEffect(() => {
    if (!bikeId) return;

    void loadDetail();

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadDetail({ silent: true });
      }
    }, refreshInterval);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadDetail({ silent: true });
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
  }, [bikeId, loadDetail, refreshInterval]);

  return {
    bike,
    activeRental,
    pendingPayment,
    geofence,
    telemetry,
    telemetryTotal,
    loading,
    refreshing,
    error,
    notFound,
    lastUpdated,
    refresh: loadDetail,
    refreshInterval,
    initialLoading: loading && bike === null,
  };
};

export default useAdminBikeDetail;
