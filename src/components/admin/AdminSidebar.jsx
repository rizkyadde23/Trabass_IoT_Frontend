import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bike,
  LayoutDashboard,
  LogOut,
  Map,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRental } from "../../context/RentalContext";

const MAIN_NAV = [
  {
    label: "Monitoring",
    to: "/admin",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Peta Armada",
    to: "/admin/map",
    icon: Map,
    end: true,
  },
  {
    label: "Insiden Keamanan",
    to: "/admin/incidents",
    icon: ShieldAlert,
    end: true,
  },
  {
    label: "Pengaturan",
    to: "/admin/settings",
    icon: Settings,
    end: true,
  },
];

const AdminSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { clearRentalSession, clearPendingOrder } = useRental();

  const initial = user?.name?.charAt(0)?.toUpperCase() || "A";

  const handleLogout = () => {
    clearRentalSession();
    clearPendingOrder();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup menu navigasi"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-100 shadow-2xl transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
              <Bike size={22} />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">TRABASS</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-400">
                Fleet Monitoring
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup sidebar"
            className="p-1.5 text-slate-400 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Menu Utama
          </p>

          {MAIN_NAV.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/70 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.name || "Admin"}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {user?.email || "Administrator"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={17} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
