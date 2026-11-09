import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getRentStatus } from "../services/api";

const RentalContext = createContext();

const LOCAL_STORAGE_KEY = "trabass_active_rental";
const PENDING_STORAGE_KEY = "trabass_pending_order";

const INVALID_ACTIVE_STATUSES = ["COMPLETED", "CANCELLED", "EXPIRED"];

/**
 * Menyeragamkan state rental dari backend (confirm/status) menjadi bentuk
 * sesi yang dipakai seluruh aplikasi.
 */
const normalizeRentalState = (state = {}, fallback = {}) => {
  const endTime = state.end_time ?? fallback.end_time ?? null;
  const parentEndTime =
    state.parent_end_time ?? fallback.parent_end_time ?? null;
  const activeEndTime =
    state.active_end_time ??
    (state.parent_rental_id ? parentEndTime : endTime) ??
    fallback.active_end_time ??
    null;

  return {
    order_id:
      state.midtrans_order_id ?? state.order_id ?? fallback.order_id ?? null,
    rental_id: state.rental_id ?? fallback.rental_id ?? null,
    bike_id: state.bike_id ?? fallback.bike_id ?? null,
    user_id: state.user_id ?? fallback.user_id ?? null,
    rental_type: state.rental_type ?? fallback.rental_type ?? "INITIAL",
    parent_rental_id:
      state.parent_rental_id ?? fallback.parent_rental_id ?? null,
    duration_minutes: Number(
      state.duration_minutes ?? fallback.duration_minutes ?? 0,
    ),
    amount: Number(state.amount ?? fallback.amount ?? 0),
    payment_status:
      state.payment_status ?? fallback.payment_status ?? null,
    rental_status: state.rental_status ?? fallback.rental_status ?? null,
    start_time: state.start_time ?? fallback.start_time ?? null,
    end_time: endTime,
    active_end_time: activeEndTime,
    payment_processed_at:
      state.payment_processed_at ?? fallback.payment_processed_at ?? null,
  };
};

export const RentalProvider = ({ children }) => {
  // State Sesi Sewa Aktif
  const [activeRental, setActiveRental] = useState(() => {
    const savedRental = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!savedRental) return null;

    try {
      const parsed = JSON.parse(savedRental);
      return parsed?.order_id ? parsed : null;
    } catch {
      return null;
    }
  });

  const activeRentalRef = useRef(activeRental);

  useEffect(() => {
    activeRentalRef.current = activeRental;
  }, [activeRental]);

  // Pembayaran yang belum selesai (bisa dilanjutkan setelah refresh)
  const [pendingOrder, setPendingOrderState] = useState(() => {
    const savedPending = localStorage.getItem(PENDING_STORAGE_KEY);
    if (!savedPending) return null;

    try {
      const parsed = JSON.parse(savedPending);
      if (parsed?.expires_at && parsed.expires_at <= Date.now()) {
        localStorage.removeItem(PENDING_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // Simpan sesi aktif ke localStorage
  useEffect(() => {
    if (activeRental) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeRental));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [activeRental]);

  // Simpan pending order
  useEffect(() => {
    if (pendingOrder) {
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingOrder));
    } else {
      localStorage.removeItem(PENDING_STORAGE_KEY);
    }
  }, [pendingOrder]);

  const setActiveRentalFromBackend = useCallback((state) => {
    const normalized = normalizeRentalState(state, activeRentalRef.current || {});
    activeRentalRef.current = normalized;
    setActiveRental(normalized);
    return normalized;
  }, []);

  const setPendingOrder = useCallback((order) => {
    setPendingOrderState(order ? { ...order } : null);
  }, []);

  const clearPendingOrder = useCallback(() => {
    setPendingOrderState(null);
  }, []);

  const clearRentalSession = useCallback(() => {
    activeRentalRef.current = null;
    setActiveRental(null);
  }, []);

  /**
   * Mengambil ulang status sesi langsung dari backend.
   * Dipakai halaman Active untuk menyelaraskan timer, status kunci,
   * dan perubahan dari timer service backend.
   */
  const refreshActiveRental = useCallback(async () => {
    const currentRental = activeRentalRef.current;
    if (!currentRental?.order_id) return null;

    const response = await getRentStatus(currentRental.order_id);
    const state = response?.data;
    if (!state) return null;

    const normalized = normalizeRentalState(state, currentRental);

    if (INVALID_ACTIVE_STATUSES.includes(normalized.rental_status)) {
      activeRentalRef.current = null;
      setActiveRental(null);
      return normalized;
    }

    activeRentalRef.current = normalized;
    setActiveRental(normalized);
    return normalized;
  }, []);

  return (
    <RentalContext.Provider
      value={{
        activeRental,
        pendingOrder,
        setRentalFromBackend: setActiveRentalFromBackend,
        updateRentalFromBackend: setActiveRentalFromBackend,
        refreshActiveRental,
        setPendingOrder,
        clearPendingOrder,
        clearRentalSession,
      }}
    >
      {children}
    </RentalContext.Provider>
  );
};

export const useRental = () => {
  const context = useContext(RentalContext);
  if (!context) {
    throw new Error("useRental harus digunakan di dalam <RentalProvider>");
  }
  return context;
};
