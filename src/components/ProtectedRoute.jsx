import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
 * Membatasi akses halaman hanya untuk user yang sudah login.
 * Guard dasar untuk halaman penyewa.
 */
export const ProtectedRoute = () => {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <SessionLoading />;

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={buildRedirectState(location)} />
    );
  }

  return <Outlet />;
};

/**
 * Halaman penyewa tidak boleh diakses admin.
 */
export const RenterRoute = () => {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <SessionLoading />;

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={buildRedirectState(location)} />
    );
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

/**
 * Halaman dashboard hanya untuk user dengan role admin.
 */
export const AdminRoute = () => {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <SessionLoading />;

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={buildRedirectState(location)} />
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

/**
 * Halaman login/register tidak perlu ditampilkan jika sudah login.
 * Admin diarahkan ke dashboard, penyewa ke halaman utama.
 */
export const GuestRoute = () => {
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();

  if (isInitializing) return <SessionLoading />;

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  }

  return <Outlet />;
};
