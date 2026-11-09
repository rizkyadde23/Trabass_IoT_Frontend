import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminCommandLogs, getApiErrorMessage } from "../services/api";

const FALLBACK_REFRESH_MS = 10000;
const MIN_REFRESH_MS = 2000;
const DEFAULT_LIMIT = 20;

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

const mergeLogs = (current, incoming) => {
  const byId = new Map();

  current.forEach((log) => byId.set(log.command_id, log));
  incoming.forEach((log) => byId.set(log.command_id, log));

  return Array.from(byId.values()).sort(
    (first, second) => second.command_id - first.command_id,
  );
};

/**
 * Mengambil audit perintah admin. Polling hanya berjalan saat tab
 * Riwayat Perintah aktif agar tidak membebani dashboard.
 */
export const useAdminCommandLogs = ({
  intervalMs,
  limit = DEFAULT_LIMIT,
  bikeId = "",
  action = "ALL",
  status = "ALL",
  enabled = true,
} = {}) => {
  const refreshInterval = resolveRefreshInterval(intervalMs);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
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

  const loadLogs = useCallback(
    async ({ silent = false, reset = false } = {}) => {
      if (!enabled || inFlightRef.current) return;

      inFlightRef.current = true;

      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const payload = await getAdminCommandLogs({
          bikeId,
          action,
          status,
          limit,
        });

        const list = payload?.data?.commands;

        if (!Array.isArray(list)) {
          throw new Error("Format respons riwayat perintah tidak valid.");
        }

        if (!mountedRef.current) return;

        setLogs((current) =>
          reset ? list : mergeLogs(current, list),
        );
        setHasMore(list.length >= limit);
        setLastUpdated(
          payload?.data?.generated_at || new Date().toISOString(),
        );
        setError("");
      } catch (loadError) {
        if (!mountedRef.current) return;

        setError(
          getApiErrorMessage(
            loadError,
            "Gagal memuat riwayat perintah admin.",
          ),
        );
      } finally {
        inFlightRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled, bikeId, action, status, limit],
  );

  const loadMore = useCallback(async () => {
    if (!enabled || inFlightRef.current || loadingMore || logs.length === 0) {
      return;
    }

    const oldest = logs[logs.length - 1];

    if (!oldest?.command_id) return;

    inFlightRef.current = true;
    setLoadingMore(true);

    try {
      const payload = await getAdminCommandLogs({
        bikeId,
        action,
        status,
        beforeId: oldest.command_id,
        limit,
      });

      const list = payload?.data?.commands;

      if (!Array.isArray(list)) {
        throw new Error("Format respons riwayat perintah tidak valid.");
      }

      if (!mountedRef.current) return;

      setLogs((current) => mergeLogs(current, list));
      setHasMore(list.length >= limit);
      setError("");
    } catch (loadError) {
      if (!mountedRef.current) return;

      setError(
        getApiErrorMessage(loadError, "Gagal memuat riwayat sebelumnya."),
      );
    } finally {
      inFlightRef.current = false;

      if (mountedRef.current) setLoadingMore(false);
    }
  }, [enabled, loadingMore, logs, bikeId, action, status, limit]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    setLogs([]);
    setHasMore(false);
    void loadLogs({ reset: true });

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadLogs({ silent: true });
      }
    }, refreshInterval);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadLogs({ silent: true });
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
  }, [enabled, loadLogs, refreshInterval]);

  return {
    logs,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    lastUpdated,
    refresh: loadLogs,
    loadMore,
    initialLoading: loading && logs.length === 0,
  };
};

export default useAdminCommandLogs;
