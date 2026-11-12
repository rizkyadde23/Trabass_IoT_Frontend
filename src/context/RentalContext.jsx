import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getActiveRental, getRentStatus } from "../services/api";
import { useAuth } from "./AuthContext";

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
  const { token, isAuthenticated, isAdmin, isInitializing, logout } = useAuth();

  // Status hidrasi sesi sewa dari backend (dipakai untuk menahan render
  // route agar tidak terlanjur melempar penyewa ke /register).
  const [isRentalHydrating, setIsRentalHydrating] = useState(true);

  // Pembayaran awal yang masih menunggu (dipulihkan dari backend).
  // Berbeda dengan pendingOrder: objek ini tidak menyimpan snap_token,
  // sehingga frontend mengarahkan ulang ke /payment?bike_id=...
  const [pendingPayment, setPendingPayment] = useState(null);

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

  // Penanda request hidrasi terakhir agar hasil request lama diabaikan.
  const hydrationRequestRef = useRef(0);

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

  // Ref agar efek hidrasi dapat memeriksa pending order lokal tanpa
  // menjadikannya dependency (menghindari efek berjalan ulang saat dibersihkan).
  const pendingOrderRef = useRef(pendingOrder);

  useEffect(() => {
    pendingOrderRef.current = pendingOrder;
  }, [pendingOrder]);

  const setActiveRentalFromBackend = useCallback((state) => {
    const normalized = normalizeRentalState(state, activeRentalRef.current || {});
    activeRentalRef.current = normalized;
    setActiveRental(normalized);
    setPendingPayment(null);
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
    setPendingPayment(null);
    setPendingOrderState(null);
  }, []);

  // Dipakai tepat setelah login penyewa: tahan redirect route sampai sesi
  // sewa selesai diperiksa, sehingga penyewa yang masih menyewa tidak
  // sempat dilempar ke halaman pembayaran.
  const beginRentalHydration = useCallback(() => {
    setIsRentalHydrating(true);
  }, []);

  /**
   * Hidrasi sesi sewa dari backend.
   *
   * Sesi login penyewa bertahan di localStorage, tetapi detail rental
   * (order_id, waktu berakhir, status) hanya ada di backend. Tanpa hidrasi,
   * membuka kembali tab/browser akan mengarahkan penyewa ke /register
   * padahal ia masih menyewa sepeda.
   *
   * Efek ini sengaja tidak memakai guard "sekali jalan" agar aman terhadap
   * StrictMode (mount -> unmount -> mount): setiap eksekusi memakai
   * requestId sendiri dan hasil yang sudah tidak relevan diabaikan.
   */
  useEffect(() => {
    if (isInitializing) return undefined;

    const requestId = hydrationRequestRef.current + 1;
    hydrationRequestRef.current = requestId;
    let cancelled = false;

    const isCurrentRequest = () =>
      !cancelled && hydrationRequestRef.current === requestId;

    const finishHydration = () => {
      if (isCurrentRequest()) setIsRentalHydrating(false);
    };

    // Admin tidak memiliki sesi sewa; pastikan state penyewa dibersihkan.
    if (!isAuthenticated || isAdmin || !token) {
      activeRentalRef.current = null;
      setActiveRental(null);
      setPendingPayment(null);
      finishHydration();
      return () => {
        cancelled = true;
      };
    }

    setIsRentalHydrating(true);

    const hydrate = async () => {
      try {
        const response = await getActiveRental();
        if (!isCurrentRequest()) return;

        const data = response?.data || {};

        if (data.active_rental) {
          // Sewa berjalan / perpanjangan menunggu pembayaran.
          setActiveRentalFromBackend(data.active_rental);
          setPendingPayment(null);
          setPendingOrderState(null);
        } else if (data.pending_payment?.bike_id) {
          // Sewa awal belum dibayar: lanjutkan lewat /payment.
          activeRentalRef.current = null;
          setActiveRental(null);
          setPendingPayment({ ...data.pending_payment });

          // Buang pending order lokal yang bukan milik transaksi backend
          // (mis. sisa sesi penyewa sebelumnya di perangkat yang sama).
          const localPending = pendingOrderRef.current;
          if (
            localPending?.order_id &&
            localPending.order_id !== data.pending_payment.order_id
          ) {
            setPendingOrderState(null);
          }
        } else {
          // Tidak ada sesi berjalan: buang sisa sesi lama di perangkat.
          activeRentalRef.current = null;
          setActiveRental(null);
          setPendingPayment(null);
          setPendingOrderState(null);
        }
      } catch (error) {
        if (!isCurrentRequest()) return;

        // Token tidak valid: akhiri sesi agar pengguna login ulang.
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          activeRentalRef.current = null;
          setActiveRental(null);
          setPendingPayment(null);
          logout();
          return;
        }

        // Gangguan jaringan: pertahankan sesi lokal yang tersimpan agar
        // penyewa tidak kehilangan akses ke halaman /active.
      } finally {
        finishHydration();
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [
    isInitializing,
    isAuthenticated,
    isAdmin,
    token,
    logout,
    setActiveRentalFromBackend,
  ]);

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
        pendingPayment,
        isRentalHydrating,
        beginRentalHydration,
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
