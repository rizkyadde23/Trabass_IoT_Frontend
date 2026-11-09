import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Radio } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import { useAuth } from "../../context/AuthContext";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const initial = user?.name?.charAt(0)?.toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu navigasi"
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
                Trabass Admin
              </p>
              <h1 className="text-sm font-bold text-slate-800">
                Fleet Monitoring
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 sm:flex">
              <Radio size={12} />
              <span>Sistem Online</span>
            </span>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">
                {initial}
              </div>
              <div className="hidden sm:block">
                <p className="max-w-[140px] truncate text-xs font-semibold leading-tight text-slate-800">
                  {user?.name || "Admin"}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Administrator
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
