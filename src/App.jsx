import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useRental } from "./context/RentalContext";

import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Checkout from "./pages/Checkout";

// Temporary Placeholder untuk Halaman Berikutnya
const ActiveRentalPlaceholder = () => (
  <div className="p-6 text-center text-xl font-bold">
    Halaman Active Rental Session
  </div>
);

function App() {
  const { activeRental } = useRental();

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={
              activeRental ? <Navigate to="/active" replace /> : <Home />
            }
          />
          <Route path="/scan" element={<Scan />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/active" element={<ActiveRentalPlaceholder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
