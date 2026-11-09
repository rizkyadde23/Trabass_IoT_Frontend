import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { getApiErrorMessage, loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const from = location.state?.from || "/";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setErrorMessage("");
    setLoading(true);

    try {
      const result = await loginUser({
        email: email.trim(),
        password,
      });

      const data = result?.data;
      if (!data?.token || !data?.user) {
        throw new Error("Respons login dari server tidak valid.");
      }

      login({ token: data.token, user: data.user });
      navigate(data.user?.role === "admin" ? "/admin" : from, {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Gagal login. Silakan coba lagi."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 justify-between">
      <div className="p-5">
        {/* Brand */}
        <div className="flex items-center space-x-3 my-4">
          <div className="p-3 bg-brand-500 text-white rounded-2xl shadow-md">
            <Bike size={26} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">
              TRABASS RENTAL
            </h1>
            <p className="text-xs text-slate-500">
              Tracking Bicycle Alert & Security
            </p>
          </div>
        </div>

        {/* Hero */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 my-5">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-4 shadow-inner">
            <ShieldCheck size={30} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            Selamat Datang Kembali
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-5">
            Masuk dengan email dan password untuk mulai menyewa sepeda.
          </p>

          {errorMessage && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-2.5 text-red-700">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-100 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-600 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-11 pr-12 py-3 bg-slate-100 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-600/20 transition-all active:scale-[0.98] mt-2"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <ArrowRight size={20} />
              )}
              <span>{loading ? "Memproses Login..." : "Masuk"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-6 text-center">
        <p className="text-xs text-slate-500">
          Belum punya akun?{" "}
          <Link
            to="/register"
            className="font-bold text-brand-600 hover:text-brand-700"
          >
            Daftar Sekarang
          </Link>
        </p>
        <p className="text-[11px] text-slate-400 mt-3">
          © 2026 Tracking Bicycle Alert & Security System
        </p>
      </div>
    </div>
  );
};

export default Login;
