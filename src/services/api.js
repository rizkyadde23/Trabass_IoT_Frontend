import axios from "axios";

// Base URL Backend Node.js
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

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
 * Backend menghitung nominal berdasarkan duration_minutes.
 */
export const createRentTransaction = async ({ bike_id, user_id, duration_minutes }) => {
  const response = await api.post("/rent/create-transaction", {
    bike_id,
    user_id,
    duration_minutes,
  });
  return response.data;
};

/**
 * Meminta Snap Token untuk Perpanjangan Sewa (Extend).
 */
export const extendRentTransaction = async ({ bike_id, user_id, duration_minutes }) => {
  const response = await api.post("/rent/extend-transaction", {
    bike_id,
    user_id,
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
export const finishRentSession = async ({ bike_id, user_id }) => {
  const response = await api.post("/rent/finish", { bike_id, user_id });
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
