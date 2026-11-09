import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage, sendBikeCommand } from "../services/api";

const ACTION_LABELS = {
  FORCE_LOCK: "Force Lock",
  FORCE_UNLOCK: "Force Unlock",
  ALARM_OFF: "Turn Off Alarm",
};

/**
 * Mengelola status pengiriman perintah remote per sepeda.
 * State disimpan di level halaman agar tidak hilang ketika popup
 * marker dirender ulang oleh polling data armada.
 */
export const useBikeCommands = ({ onSuccess } = {}) => {
  const [pendingByBike, setPendingByBike] = useState({});
  const [feedbackByBike, setFeedbackByBike] = useState({});

  const inFlightRef = useRef(new Set());
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const sendCommand = useCallback(
    async ({ bikeId, action, reason = "" }) => {
      if (!bikeId || !action) {
        return { ok: false, message: "Data perintah tidak lengkap." };
      }

      if (inFlightRef.current.has(bikeId)) {
        return { ok: false, message: "Perintah lain masih diproses." };
      }

      inFlightRef.current.add(bikeId);

      setPendingByBike((current) => ({
        ...current,
        [bikeId]: action,
      }));

      setFeedbackByBike((current) => {
        if (!current[bikeId]) return current;

        const next = { ...current };
        delete next[bikeId];
        return next;
      });

      try {
        const payload = await sendBikeCommand({
          bike_id: bikeId,
          action,
          reason,
        });

        const data = payload?.data || {};
        const message =
          payload?.message ||
          `${ACTION_LABELS[action] || action} terkirim ke sepeda.`;

        setFeedbackByBike((current) => ({
          ...current,
          [bikeId]: {
            tone: "success",
            action,
            message,
            stateUpdated: Boolean(data.state_updated),
            sentAt: data.sent_at || new Date().toISOString(),
          },
        }));

        onSuccessRef.current?.(data);

        return { ok: true, data, message };
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          "Gagal mengirim perintah ke sepeda.",
        );

        setFeedbackByBike((current) => ({
          ...current,
          [bikeId]: {
            tone: "error",
            action,
            message,
            sentAt: new Date().toISOString(),
          },
        }));

        return { ok: false, message };
      } finally {
        inFlightRef.current.delete(bikeId);

        setPendingByBike((current) => {
          if (!current[bikeId]) return current;

          const next = { ...current };
          delete next[bikeId];
          return next;
        });
      }
    },
    [],
  );

  const clearFeedback = useCallback((bikeId) => {
    setFeedbackByBike((current) => {
      if (!current[bikeId]) return current;

      const next = { ...current };
      delete next[bikeId];
      return next;
    });
  }, []);

  const commandStates = useMemo(() => {
    const ids = new Set([
      ...Object.keys(pendingByBike),
      ...Object.keys(feedbackByBike),
    ]);

    const states = {};

    ids.forEach((bikeId) => {
      states[bikeId] = {
        pending: pendingByBike[bikeId] || null,
        feedback: feedbackByBike[bikeId] || null,
      };
    });

    return states;
  }, [pendingByBike, feedbackByBike]);

  return {
    pendingByBike,
    feedbackByBike,
    commandStates,
    sendCommand,
    clearFeedback,
  };
};

export default useBikeCommands;
