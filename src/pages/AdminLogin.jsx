import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bike,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import { adminLogin, getApiErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";

/**
 * Halaman login khusus admin (URL: /admin/login).
 * Autentikasi hanya username/email + password — tanpa opsi registrasi.
 */
const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const from = location.state?.from || "/admin";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setErrorMessage("");
    setLoading(true);

    try {
      const result = await adminLogin({
        identifier: identifier.trim(),
        password,
      });

      const data = result?.data;
      if (!data?.token || !data?.user) {
        throw new Error("Respons login dari server tidak valid.");
      }

      if (data.user?.role !== "admin") {
        throw new Error(
          "Akun ini bukan admin. Gunakan halaman registrasi untuk menyewa sepeda.",
        );
      }

      login({ token: data.token, user: data.user });
      navigate(from, { replace: true });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Gagal login. Silakan coba lagi."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-5 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center space-x-3">
          <div className="bg-brand-500 text-white rounded-2xl p-3 shadow-lg shadow-brand-500/30">
            <Bike size={28} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-white">
              TRABASS RENTAL
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400">
              Fleet Monitoring
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-inner">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              Admin Login
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Masuk dengan username atau email untuk mengakses dashboard
              monitoring armada.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 flex items-start space-x-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="admin-identifier"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Username / Email
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="admin-identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="admin"
                  className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-12 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center space-x-2 rounded-2xl bg-brand-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 active:scale-[0.98] disabled:bg-slate-300"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              <span>
                {loading ? "Memproses Login..." : "Masuk Dashboard"}
              </span>
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Akun admin dibuat oleh pengelola sistem. Registrasi penyewa hanya
          melalui scan QR pada sepeda.
        </p>
        <p className="mt-3 text-center text-[11px] text-slate-500">
          © 2026 Tracking Bicycle Alert & Security System
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
