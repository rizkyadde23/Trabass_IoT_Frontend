import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminIncidents, getApiErrorMessage } from "../services/api";

const FALLBACK_REFRESH_MS = 5000;
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

const mergeIncidents = (current, incoming) => {
  const byId = new Map();

  current.forEach((incident) => byId.set(incident.incident_id, incident));
  incoming.forEach((incident) => byId.set(incident.incident_id, incident));

  return Array.from(byId.values()).sort(
    (first, second) => second.incident_id - first.incident_id,
  );
};

/**
 * Polling feed insiden. Data terbaru digabung berdasarkan incident_id
 * sehingga status RESOLVED ikut ter-update tanpa menduplikasi baris.
 */
export const useAdminIncidents = ({
  intervalMs,
  limit = DEFAULT_LIMIT,
  status = "ALL",
  type = "ALL",
  bikeId = "",
  enabled = true,
} = {}) => {
  const refreshInterval = resolveRefreshInterval(intervalMs);

  const [incidents, setIncidents] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const seenIdsRef = useRef(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadIncidents = useCallback(
    async ({ silent = false, reset = false } = {}) => {
      if (!enabled || inFlightRef.current) return;

      inFlightRef.current = true;

      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const payload = await getAdminIncidents({
          status,
          type,
          bikeId,
          limit,
        });

        const list = payload?.data?.incidents;

        if (!Array.isArray(list)) {
          throw new Error("Format respons data insiden tidak valid.");
        }

        if (!mountedRef.current) return;

        const newItems = list.filter(
          (incident) => !seenIdsRef.current.has(incident.incident_id),
        );

        list.forEach((incident) => {
          seenIdsRef.current.add(incident.incident_id);
        });

        if (initializedRef.current && newItems.length > 0) {
          setNewCount((current) => current + newItems.length);
        }

        initializedRef.current = true;

        setIncidents((current) =>
          reset ? list : mergeIncidents(current, list),
        );
        setActiveCount(Number(payload?.data?.total_active || 0));
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
            "Gagal memuat feed insiden keamanan.",
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
    [enabled, status, type, bikeId, limit],
  );

  const loadMore = useCallback(async () => {
    if (
      !enabled ||
      inFlightRef.current ||
      loadingMore ||
      incidents.length === 0
    ) {
      return;
    }

    const oldest = incidents[incidents.length - 1];

    if (!oldest?.incident_id) return;

    inFlightRef.current = true;
    setLoadingMore(true);

    try {
      const payload = await getAdminIncidents({
        status,
        type,
        bikeId,
        beforeId: oldest.incident_id,
        limit,
      });

      const list = payload?.data?.incidents;

      if (!Array.isArray(list)) {
        throw new Error("Format respons data insiden tidak valid.");
      }

      if (!mountedRef.current) return;

      setIncidents((current) => mergeIncidents(current, list));
      setActiveCount(Number(payload?.data?.total_active || 0));
      setHasMore(list.length >= limit);
      setError("");
    } catch (loadError) {
      if (!mountedRef.current) return;

      setError(
        getApiErrorMessage(loadError, "Gagal memuat insiden sebelumnya."),
      );
    } finally {
      inFlightRef.current = false;

      if (mountedRef.current) setLoadingMore(false);
    }
  }, [
    enabled,
    loadingMore,
    incidents,
    status,
    type,
    bikeId,
    limit,
  ]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    seenIdsRef.current = new Set();
    initializedRef.current = false;
    setIncidents([]);
    setNewCount(0);
    setHasMore(false);

    void loadIncidents({ reset: true });

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadIncidents({ silent: true });
      }
    }, refreshInterval);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadIncidents({ silent: true });
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
  }, [enabled, loadIncidents, refreshInterval]);

  const markSeen = useCallback(() => setNewCount(0), []);

  return {
    incidents,
    activeCount,
    newCount,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    lastUpdated,
    refresh: loadIncidents,
    loadMore,
    markSeen,
    refreshInterval,
    initialLoading: loading && incidents.length === 0,
  };
};

export default useAdminIncidents;
