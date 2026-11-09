import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Shell mobile untuk PWA penyewa.
 * Dipisahkan dari dashboard admin agar admin bisa memakai layout lebar penuh.
 */
const MobileLayout = () => (
  <div className="relative flex min-h-screen max-w-md mx-auto flex-col overflow-hidden bg-slate-50 text-slate-800 shadow-xl">
    <Outlet />
  </div>
);

export default MobileLayout;
