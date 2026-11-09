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
import OfflineDetector from "./components/OfflineDetector";
import { GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  const { activeRental } = useRental();
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">
        <OfflineDetector />
        <Routes>
          {/* Hanya untuk user yang belum login */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Wajib login */}
          <Route element={<ProtectedRoute />}>
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

          <Route
            path="*"
            element={
              <Navigate to={isAuthenticated ? "/" : "/login"} replace />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
