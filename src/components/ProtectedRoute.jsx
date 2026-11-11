import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRental } from "../context/RentalContext";

const buildRedirectState = (location) => ({
  from: `${location.pathname}${location.search}`,
});

const SessionLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      Memeriksa sesi login...
    </div>
  </div>
);

/**
 * Membaca bike_id dari query string agar alur scan QR tidak hilang
 * saat user diarahkan ke halaman registrasi ulang.
 */
const buildRegisterPath = (location) => {
  const bikeId = new URLSearchParams(location.search).get("bike_id");
  return bikeId
    ? `/register?bike_id=${encodeURIComponent(bikeId)}`
    : "/register";
};

/**
 * Halaman penyewa (pembayaran / sesi aktif). Guest diarahkan kembali ke
 * halaman registrasi dengan bike_id dipertahankan — user cukup mengisi
 * ulang nama + nomor WA untuk melanjutkan.
 */
export const RenterRoute = () => {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <SessionLoading />;

  if (!isAuthenticated) {
    return <Navigate to={buildRegisterPath(location)} replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

/**
 * Halaman dashboard hanya untuk user dengan role admin.
 * Guest diarahkan ke halaman login admin (/admin/login).
 */
export const AdminRoute = () => {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <SessionLoading />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={buildRedirectState(location)}
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

/**
 * Halaman registrasi (hasil scan QR). Tidak perlu ditampilkan jika user
 * sudah login: admin diarahkan ke dashboard, penyewa dengan sesi aktif
 * ke halaman sesi, penyewa lain langsung dilanjutkan ke pembayaran
 * sepeda yang sama.
 *
 * CATATAN FIX (layar putih setelah registrasi): sebelumnya penyewa yang
 * sudah login diarahkan kembali ke /register — URL yang sama persis
 * dengan halaman aktif. <Navigate> ke URL yang sama tidak pernah
 * memicu perpindahan route dan terus merender null, sehingga aplikasi
 * tampil layar putih. Penyewa kini diarahkan ke /payment dengan
 * bike_id dipertahankan; jika tanpa bike_id halaman register tetap
 * ditampilkan (form meminta user scan QR sepeda terlebih dahulu).
 */
const buildPaymentPath = (location) => {
  const bikeId = new URLSearchParams(location.search).get("bike_id");

  return bikeId
    ? `/payment?bike_id=${encodeURIComponent(bikeId)}`
    : null;
};

export const GuestRoute = () => {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();
  const { activeRental } = useRental();
  const location = useLocation();

  if (isInitializing) return <SessionLoading />;

  if (isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (activeRental) return <Navigate to="/active" replace />;

    const paymentPath = buildPaymentPath(location);
    if (paymentPath) return <Navigate to={paymentPath} replace />;

    return <Outlet />;
  }

  return <Outlet />;
};

/**
 * Halaman login admin. Admin yang sudah login langsung masuk dashboard.
 * Penyewa yang tanpa sengaja membuka halaman ini diarahkan ke alurnya
 * sendiri (bukan diizinkan login sebagai admin).
 */
export const AdminGuestRoute = () => {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();
  const { activeRental } = useRental();

  if (isInitializing) return <SessionLoading />;

  if (isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    return (
      <Navigate to={activeRental ? "/active" : "/register"} replace />
    );
  }

  return <Outlet />;
};
