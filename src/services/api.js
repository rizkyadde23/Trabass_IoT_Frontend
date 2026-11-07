import axios from "axios";

// Base URL Backend Node.js
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

/**
 * Meminta Snap Token untuk Sewa Baru
 */
export const createRentTransaction = async (data) => {
  const response = await api.post("/rent/create-transaction", data);
  return response.data;
};

/**
 * Meminta Snap Token untuk Perpanjangan Sewa (Extend)
 */
export const extendRentTransaction = async (data) => {
  const response = await api.post("/rent/extend-transaction", data);
  return response.data;
};

/**
 * Cek Status Sepeda Terkini (Opsional / Helper)
 */
export const getBikeStatus = async (bikeId) => {
  const response = await api.get(`/bikes/${bikeId}`);
  return response.data;
};

export default api;
