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
// Sesi penyewa tersimpan di localStorage (bertahan setelah browser ditutup),
// sesi admin di sessionStorage — keduanya dibaca di sini.
const readStoredToken = () =>
  localStorage.getItem(TOKEN_STORAGE_KEY) ||
  sessionStorage.getItem(TOKEN_STORAGE_KEY);

api.interceptors.request.use((config) => {
  const token = readStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Redirect saat sesi berakhir (401):
 * - Halaman admin kembali ke /admin/login.
 * - Alur penyewa kembali ke /register dengan bike_id dipertahankan
 *   agar user cukup mengisi ulang nama + nomor WA.
 */
const redirectToLogin = () => {
  if (window.location.pathname.startsWith("/admin")) {
    window.location.assign("/admin/login");
    return;
  }

  const bikeId = new URLSearchParams(window.location.search).get("bike_id");
  window.location.assign(
    bikeId
      ? `/register?bike_id=${encodeURIComponent(bikeId)}`
      : "/register",
  );
};

// Tangani token kedaluwarsa / tidak valid secara global.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isLoginAttempt =
      url.startsWith("/auth/login") ||
      url.startsWith("/auth/quick-register");

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

      if (
        !window.location.pathname.startsWith("/admin/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        redirectToLogin();
      }
    }

    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Autentikasi
// ---------------------------------------------------------------------------
/**
 * Registrasi ringan penyewa hasil scan QR sepeda. Identitas penyewa
 * adalah Nomor WA; backend menerbitkan token agar bisa langsung
 * melanjutkan ke halaman pembayaran.
 */
export const quickRegisterUser = async ({
  name,
  phone_number,
  bike_id,
}) => {
  const response = await api.post("/auth/quick-register", {
    name,
    phone_number,
    bike_id,
  });
  return response.data;
};

/**
 * Login admin dengan username atau email + password.
 */
export const adminLogin = async ({ identifier, password }) => {
  const response = await api.post("/auth/login", {
    identifier,
    password,
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

/**
 * Validasi dini sepeda hasil scan QR (publik, tanpa login).
 * Dipakai halaman registrasi untuk menolak sepeda RENTED/MAINTENANCE
 * sebelum user mengisi form.
 */
export const getBikeAvailability = async (bikeId) => {
  const response = await api.get(
    `/bikes/${encodeURIComponent(bikeId)}/availability`,
  );
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
 * Memulihkan sesi sewa milik user yang sedang login.
 * Dipakai saat tab/browser dibuka kembali agar halaman /active tetap
 * dapat diakses untuk memperpanjang atau mengembalikan sepeda.
 */
export const getActiveRental = async () => {
  const response = await api.get("/rent/active");
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
 * Menambahkan sepeda baru ke armada lewat halaman Kelola Armada.
 * Endpoint admin-only.
 */
export const createAdminBike = async ({
  bike_id,
  name,
  status,
  lock_state,
  last_latitude,
  last_longitude,
}) => {
  const response = await api.post("/admin/bikes", {
    bike_id,
    name,
    status,
    lock_state,
    last_latitude,
    last_longitude,
  });
  return response.data;
};

/**
 * Mengubah data sepeda (nama, status, status kunci).
 * Endpoint admin-only.
 */
export const updateAdminBike = async ({
  bike_id,
  name,
  status,
  lock_state,
}) => {
  const response = await api.put(
    `/admin/bikes/${encodeURIComponent(bike_id)}`,
    {
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(lock_state !== undefined ? { lock_state } : {}),
    },
  );
  return response.data;
};

/**
 * Menghapus sepeda beserta riwayatnya (sewa, telemetri, insiden).
 * Endpoint admin-only.
 */
export const deleteAdminBike = async ({ bike_id }) => {
  const response = await api.delete(
    `/admin/bikes/${encodeURIComponent(bike_id)}`,
  );
  return response.data;
};

/**
 * Mengambil detail satu sepeda (data live Redis + MySQL) untuk
 * halaman monitoring per sepeda tingkat lanjut.
 */
export const getAdminBikeDetail = async (bikeId) => {
  const response = await api.get(
    `/admin/bikes/${encodeURIComponent(bikeId)}`,
  );
  return response.data;
};

/**
 * Mengakhiri sesi sewa aktif pada satu sepeda dari dashboard admin.
 * Backend menutup rental, membatalkan pending extension/pembayaran, lalu
 * mengembalikan status sepeda ke AVAILABLE dan mengunci solenoid.
 */
export const endAdminBikeRental = async (bikeId) => {
  const response = await api.post(
    `/admin/bikes/${encodeURIComponent(bikeId)}/end-rental`,
  );
  return response.data;
};

/**
 * Mengambil riwayat telemetri terbaru satu sepeda dari perception layer.
 */
export const getAdminBikeTelemetry = async (bikeId, { limit = 50 } = {}) => {
  const response = await api.get(
    `/admin/bikes/${encodeURIComponent(bikeId)}/telemetry`,
    { params: { limit } },
  );
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
 * Mengirim perintah remote ke sepeda melalui admin endpoint.
 * Action: FORCE_LOCK, FORCE_UNLOCK, ALARM_OFF.
 */
export const sendBikeCommand = async ({ bike_id, action, reason }) => {
  const response = await api.post("/admin/bike-command", {
    bike_id,
    action,
    reason,
  });
  return response.data;
};

/**
 * Mengambil riwayat insiden keamanan untuk Incident Feed.
 * Filter dan cursor dikirim sebagai query string.
 */
export const getAdminIncidents = async ({
  status = "ALL",
  type = "ALL",
  bikeId = "",
  afterId = null,
  beforeId = null,
  limit = 20,
} = {}) => {
  const params = { limit };

  if (status && status !== "ALL") params.status = status;
  if (type && type !== "ALL") params.type = type;
  if (bikeId) params.bike_id = bikeId;
  if (afterId) params.after_id = afterId;
  if (beforeId) params.before_id = beforeId;

  const response = await api.get("/admin/incidents", { params });
  return response.data;
};

/**
 * Mengambil audit perintah admin untuk tab Riwayat Perintah.
 */
export const getAdminCommandLogs = async ({
  bikeId = "",
  action = "ALL",
  status = "ALL",
  afterId = null,
  beforeId = null,
  limit = 20,
} = {}) => {
  const params = { limit };

  if (bikeId) params.bike_id = bikeId;
  if (action && action !== "ALL") params.action = action;
  if (status && status !== "ALL") params.status = status;
  if (afterId) params.after_id = afterId;
  if (beforeId) params.before_id = beforeId;

  const response = await api.get("/admin/command-logs", { params });
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
