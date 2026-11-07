import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useRental } from "./context/RentalContext";

// Import Komponen Halaman (Temporary Placeholder)
const HomePlaceholder = () => (
  <div className="p-6 text-center text-xl font-bold">
    Halaman Home / Scan QR
  </div>
);
const CheckoutPlaceholder = () => (
  <div className="p-6 text-center text-xl font-bold">
    Halaman Checkout Paket
  </div>
);
const ActiveRentalPlaceholder = () => (
  <div className="p-6 text-center text-xl font-bold">
    Halaman Active Rental Session
  </div>
);

function App() {
  const { activeRental } = useRental();

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col max-w-md mx-auto shadow-md">
        <Routes>
          {/* Jika ada sewa aktif, arahkan langsung ke halaman /active */}
          <Route
            path="/"
            element={
              activeRental ? (
                <Navigate to="/active" replace />
              ) : (
                <HomePlaceholder />
              )
            }
          />
          <Route path="/checkout" element={<CheckoutPlaceholder />} />
          <Route path="/active" element={<ActiveRentalPlaceholder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
