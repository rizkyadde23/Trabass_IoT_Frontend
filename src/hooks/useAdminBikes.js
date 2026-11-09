import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminBikes, getApiErrorMessage } from "../services/api";
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
 * Sumber data tunggal untuk dashboard ringkas dan halaman peta penuh.
 * Polling dipertahankan agar data Redis terbaru tetap masuk tanpa reload.
 */
export const useAdminBikes = ({ intervalMs } = {}) => {
  const refreshInterval = resolveRefreshInterval(intervalMs);

  const [bikes, setBikes] = useState([]);
  const [geofence, setGeofence] = useState(DEFAULT_GEOFENCE);
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

    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const payload = await getAdminBikes();
      const list = payload?.data?.bikes;

      if (!Array.isArray(list)) {
        throw new Error("Format respons data armada tidak valid.");
      }

      if (!mountedRef.current) return;

      setBikes(list);
      setGeofence(normalizeGeofence(payload?.data?.geofence));
      setLastUpdated(
        payload?.data?.generated_at || new Date().toISOString(),
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
    }, refreshInterval);

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
  }, [loadBikes, refreshInterval]);

  return {
    bikes,
    geofence,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh: loadBikes,
    refreshInterval,
    initialLoading: loading && bikes.length === 0,
  };
};

export default useAdminBikes;
