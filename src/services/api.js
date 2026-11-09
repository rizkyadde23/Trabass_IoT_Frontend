import axios from "axios";

// Base URL Backend Node.js
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const TOKEN_STORAGE_KEY = "trabass_auth_token";
const USER_STORAGE_KEY = "trabass_auth_user";
const ACTIVE_RENTAL_STORAGE_KEY = "trabass_active_rental";
const PENDING_ORDER_STORAGE_KEY = "trabass_pending_order";
const AUTH_EXPIRED_EVENT = "trabass:auth-expired";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Sisipkan token JWT ke setiap request yang membutuhkan autentikasi.
// Token disimpan di sessionStorage sehingga sesi berakhir saat browser ditutup.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Tangani token kedaluwarsa / tidak valid secara global.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isLoginAttempt =
      url.startsWith("/auth/login") || url.startsWith("/auth/register");

    if (status === 401 && !isLoginAttempt) {
      // Sesi dianggap berakhir: bersihkan token & data user agar guard route
      // langsung mengarahkan pengguna ke halaman login.
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_RENTAL_STORAGE_KEY);
      localStorage.removeItem(PENDING_ORDER_STORAGE_KEY);

      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));

      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Autentikasi
// ---------------------------------------------------------------------------
export const registerUser = async ({
  name,
  phone_number,
  email,
  password,
}) => {
  const response = await api.post("/auth/register", {
    name,
    phone_number,
    email,
    password,
  });
  return response.data;
};

export const loginUser = async ({ email, password }) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

// ---------------------------------------------------------------------------
// Pembayaran & Sewa
// ---------------------------------------------------------------------------
/**
 * Mengambil konfigurasi tarif & batas sewa dari backend.
 * Frontend tidak boleh menebak harga sendiri.
 */
export const getPaymentConfig = async () => {
  const response = await api.get("/config/pricing");
  return response.data;
};

/**
 * Meminta Snap Token untuk Sewa Baru.
 * Backend menghitung nominal berdasarkan duration_minutes dan mengambil
 * user_id dari token JWT.
 */
export const createRentTransaction = async ({
  bike_id,
  duration_minutes,
}) => {
  const response = await api.post("/rent/create-transaction", {
    bike_id,
    duration_minutes,
  });
  return response.data;
};

/**
 * Meminta Snap Token untuk Perpanjangan Sewa (Extend).
 */
export const extendRentTransaction = async ({
  bike_id,
  duration_minutes,
}) => {
  const response = await api.post("/rent/extend-transaction", {
    bike_id,
    duration_minutes,
  });
  return response.data;
};

/**
 * Konfirmasi pembayaran ke backend.
 * Backend akan memverifikasi langsung ke Midtrans dan mengaktifkan sesi
 * (serta mengirim perintah MQTT) jika pembayaran sudah settlement.
 */
export const confirmRentPayment = async ({ order_id }) => {
  const response = await api.post("/rent/confirm-payment", { order_id });
  return response.data;
};

/**
 * Cek status pembayaran / sesi (read-only).
 */
export const getRentStatus = async (orderId) => {
  const response = await api.get(`/rent/status/${encodeURIComponent(orderId)}`);
  return response.data;
};

/**
 * Meminta Pengembalian Sepeda & Mengakhiri Sesi Sewa.
 */
export const finishRentSession = async ({ bike_id }) => {
  const response = await api.post("/rent/finish", { bike_id });
  return response.data;
};

// ---------------------------------------------------------------------------
// Dashboard Admin
// ---------------------------------------------------------------------------
/**
 * Mengambil daftar seluruh armada untuk dashboard admin.
 * Backend membatasi endpoint ini hanya untuk token dengan role admin.
 */
export const getAdminBikes = async () => {
  const response = await api.get("/admin/bikes");
  return response.data;
};

/**
 * Mengambil pengaturan pangkalan, radius geofence, dan pricing.
 * Endpoint admin-only.
 */
export const getAdminSettings = async () => {
  const response = await api.get("/admin/settings");
  return response.data;
};

/**
 * Menyimpan pengaturan admin. Perubahan langsung diterapkan backend
 * tanpa restart.
 */
export const updateAdminSettings = async (settings) => {
  const response = await api.put("/admin/settings", settings);
  return response.data;
};

/**
 * Helper pesan error agar response backend tampil konsisten di UI.
 */
export const getApiErrorMessage = (error, fallback = "Terjadi kesalahan.") => {
  if (!error) return fallback;
  return (
    error.response?.data?.message ||
    error.response?.data?.status_message ||
    error.message ||
    fallback
  );
};

export default api;
