import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useRental } from "./context/RentalContext";
import { useAuth } from "./context/AuthContext";

import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Checkout from "./pages/Checkout";
import ActiveRental from "./pages/ActiveRental";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMap from "./pages/AdminMap";
import OfflineDetector from "./components/OfflineDetector";
import MobileLayout from "./components/MobileLayout";
import AdminLayout from "./components/admin/AdminLayout";
import {
  AdminRoute,
  GuestRoute,
  RenterRoute,
} from "./components/ProtectedRoute";

function App() {
  const { activeRental } = useRental();
  const { isAuthenticated, isAdmin } = useAuth();

  const fallbackPath = isAuthenticated ? (isAdmin ? "/admin" : "/") : "/login";

  return (
    <Router>
      <OfflineDetector />
      <Routes>
        {/* Halaman autentikasi memakai shell mobile yang sama dengan PWA. */}
        <Route element={<MobileLayout />}>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
        </Route>

        {/* Dashboard admin memakai layout lebar penuh. */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="map" element={<AdminMap />} />
          </Route>
        </Route>

        {/* Halaman penyewa tetap memakai shell mobile PWA. */}
        <Route element={<RenterRoute />}>
          <Route element={<MobileLayout />}>
            <Route
              path="/"
              element={
                activeRental ? <Navigate to="/active" replace /> : <Home />
              }
            />
            <Route path="/scan" element={<Scan />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/active" element={<ActiveRental />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={fallbackPath} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
