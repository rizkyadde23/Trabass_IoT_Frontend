import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useRental } from "./context/RentalContext";
import { useAuth } from "./context/AuthContext";

import UserRegister from "./pages/UserRegister";
import Payment from "./pages/Payment";
import ActiveRental from "./pages/ActiveRental";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMap from "./pages/AdminMap";
import AdminSettings from "./pages/AdminSettings";
import AdminIncidents from "./pages/AdminIncidents";
import AdminQrGenerator from "./pages/AdminQrGenerator";
import AdminBikes from "./pages/AdminBikes";
import AdminBikeDetail from "./pages/AdminBikeDetail";
import OfflineDetector from "./components/OfflineDetector";
import MobileLayout from "./components/MobileLayout";
import AdminLayout from "./components/admin/AdminLayout";
import {
  AdminRoute,
  AdminGuestRoute,
  GuestRoute,
  RenterRoute,
  SessionLoading,
} from "./components/ProtectedRoute";

/**
 * Halaman Home (/) dihapus dari alur user: alur penyewa dimulai dari
 * scan QR yang membawa bike_id ke halaman registrasi. Route root kini
 * hanya mengarahkan pengguna ke halaman yang relevan.
 */
const RootRedirect = () => {
  const { activeRental, pendingPayment, isRentalHydrating } = useRental();
  const { isAuthenticated, isAdmin, isInitializing } = useAuth();

  if (isInitializing) return <SessionLoading />;

  if (isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin" replace />;

    // Jangan arahkan ke /register sebelum sesi sewa selesai dipulihkan:
    // penyewa yang masih menyewa harus mendarat di /active.
    if (isRentalHydrating) {
      return <SessionLoading message="Memulihkan sesi sewa..." />;
    }

    if (activeRental) return <Navigate to="/active" replace />;

    if (pendingPayment?.bike_id) {
      return (
        <Navigate
          to={`/payment?bike_id=${encodeURIComponent(pendingPayment.bike_id)}`}
          replace
        />
      );
    }

    return <Navigate to="/register" replace />;
  }

  return <Navigate to="/register" replace />;
};

/**
 * /checkout & /scan lama dialihkan ke /register dengan bike_id
 * dipertahankan agar link lama tetap bisa melanjutkan sewa.
 */
const CheckoutRedirect = () => {
  const location = useLocation();
  const bikeId = new URLSearchParams(location.search).get("bike_id");

  return (
    <Navigate
      to={
        bikeId
          ? `/register?bike_id=${encodeURIComponent(bikeId)}`
          : "/register"
      }
      replace
    />
  );
};

function App() {
  const fallbackPath = "/register";

  return (
    <Router>
      <OfflineDetector />
      <Routes>
        {/* Login admin: halaman mandiri, hanya username/email + password. */}
        <Route element={<AdminGuestRoute />}>
          <Route path="/admin/login" element={<AdminLogin />} />
        </Route>

        {/* Registrasi penyewa hasil scan QR (publik, shell mobile PWA). */}
        <Route element={<MobileLayout />}>
          <Route element={<GuestRoute />}>
            <Route path="/register" element={<UserRegister />} />
          </Route>
        </Route>

        {/* Dashboard admin memakai layout lebar penuh. */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="map" element={<AdminMap />} />
            <Route path="bikes" element={<AdminBikes />} />
            <Route path="bikes/:bikeId" element={<AdminBikeDetail />} />
            <Route path="incidents" element={<AdminIncidents />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="qr-generator" element={<AdminQrGenerator />} />
          </Route>
        </Route>

        {/* Halaman penyewa tetap memakai shell mobile PWA. */}
        <Route element={<RenterRoute />}>
          <Route element={<MobileLayout />}>
            <Route path="/payment" element={<Payment />} />
            <Route path="/active" element={<ActiveRental />} />
          </Route>
        </Route>

        {/* Route lama dialihkan agar bookmark/QR lama tetap berfungsi. */}
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/login"
          element={<Navigate to="/admin/login" replace />}
        />
        <Route path="/scan" element={<CheckoutRedirect />} />
        <Route path="/checkout" element={<CheckoutRedirect />} />

        <Route path="*" element={<Navigate to={fallbackPath} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
