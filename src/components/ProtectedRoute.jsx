import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const buildRedirectState = (location) => ({
  from: `${location.pathname}${location.search}`,
});

/**
 * Membatasi akses halaman hanya untuk user yang sudah login.
 * Guard dasar untuk halaman penyewa.
 */
export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

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
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

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
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

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
  const { isAuthenticated, isAdmin } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  }

  return <Outlet />;
};
