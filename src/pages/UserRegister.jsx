import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  Phone,
  QrCode,
  RefreshCw,
  ScanLine,
  User,
  UserPlus,
} from "lucide-react";
import {
  getApiErrorMessage,
  getBikeAvailability,
  quickRegisterUser,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

const PHONE_REGEX = /^08\d{8,13}$/;

const normalizePhoneNumber = (value) => {
  let phone = String(value || "").replace(/[\s\-().]/g, "");

  if (phone.startsWith("+62")) {
    phone = `0${phone.slice(3)}`;
  } else if (phone.startsWith("62")) {
    phone = `0${phone.slice(2)}`;
  } else if (phone.startsWith("8")) {
    phone = `0${phone}`;
  }

  return phone;
};

/**
 * Halaman registrasi penyewa hasil scan QR sepeda (/register?bike_id=...).
 * Identitas penyewa hanya Nama + Nomor WA — tanpa email & password —
 * lalu langsung dilanjutkan ke halaman pembayaran.
 */
const UserRegister = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const bikeId = (searchParams.get("bike_id") || "")
    .trim()
    .toUpperCase();

  const [bikeInfo, setBikeInfo] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(
    Boolean(bikeId),
  );
  const [availabilityError, setAvailabilityError] = useState("");

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const checkAvailability = useCallback(async () => {
    if (!bikeId) {
      setAvailabilityLoading(false);
      return;
    }

    setAvailabilityLoading(true);
    setAvailabilityError("");

    try {
      const response = await getBikeAvailability(bikeId);
      setBikeInfo(response?.data || null);
    } catch (error) {
      setBikeInfo(null);
      setAvailabilityError(
        getApiErrorMessage(
          error,
          "Gagal memeriksa ketersediaan sepeda. Pastikan koneksi internet stabil.",
        ),
      );
    } finally {
      setAvailabilityLoading(false);
    }
  }, [bikeId]);

  useEffect(() => {
    void checkAvailability();
  }, [checkAvailability]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || !bikeId) return;

    setErrorMessage("");

    const trimmedName = name.trim();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (trimmedName.length < 2) {
      setErrorMessage("Nama minimal 2 karakter.");
      return;
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      setErrorMessage("Nomor WA tidak valid. Gunakan format 08xxxxxxxxxx.");
      return;
    }

    setLoading(true);

    try {
      const result = await quickRegisterUser({
        name: trimmedName,
        phone_number: normalizedPhone,
        bike_id: bikeId,
      });

      const data = result?.data;
      if (!data?.token || !data?.user) {
        throw new Error("Respons registrasi dari server tidak valid.");
      }

      // Registrasi berhasil -> sesi login aktif -> langsung ke pembayaran.
      login({ token: data.token, user: data.user });
      navigate(`/payment?bike_id=${encodeURIComponent(bikeId)}`, {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Gagal mendaftar. Silakan coba lagi."),
      );
    } finally {
      setLoading(false);
    }
  };

  // URL dibuka tanpa bike_id: alur sewa selalu dimulai dari scan QR sepeda.
  if (!bikeId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 shadow-inner">
          <QrCode size={40} />
        </div>
        <h2 className="mb-1 text-base font-bold text-slate-800">
          Scan QR Code Sepeda Terlebih Dahulu
        </h2>
        <p className="mb-6 max-w-xs text-xs leading-relaxed text-slate-500">
          Arahkan kamera ponsel ke QR code yang terpasang pada sepeda untuk
          memulai proses penyewaan. Setiap sepeda memiliki QR tersendiri.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95"
        >
          <ScanLine size={16} />
          Coba Buka Ulang Halaman
        </button>
        <p className="mt-6 text-[11px] text-slate-400">
          © 2026 Tracking Bicycle Alert & Security System
        </p>
      </div>
    );
  }

  const bikeUnavailable =
    bikeInfo !== null && bikeInfo.available !== true;

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50">
      <div className="p-5">
        {/* Brand */}
        <div className="my-4 flex items-center space-x-3">
          <div className="rounded-2xl bg-brand-500 p-3 text-white shadow-md">
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

        {/* Form */}
        <div className="my-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-inner">
            <UserPlus size={30} />
          </div>
          <h2 className="mb-1 text-lg font-bold text-slate-800">
            Daftar & Sewa Sepeda
          </h2>
          <p className="mb-5 text-xs leading-relaxed text-slate-500">
            Isi data diri singkat. Nomor WA dipakai untuk data penyewaan dan
            notifikasi selama sesi berlangsung — tanpa perlu password.
          </p>

          {/* Validasi sepeda hasil scan */}
          {availabilityLoading ? (
            <div className="mb-4 flex items-center space-x-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-medium text-slate-500">
              <RefreshCw size={16} className="animate-spin" />
              <span>Memeriksa ketersediaan sepeda {bikeId}...</span>
            </div>
          ) : availabilityError ? (
            <div className="mb-4 space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              <div className="flex items-start space-x-2.5">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p className="leading-relaxed">{availabilityError}</p>
              </div>
              <button
                type="button"
                onClick={() => void checkAvailability()}
                className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white"
              >
                Coba Lagi
              </button>
            </div>
          ) : bikeUnavailable ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
              <div className="flex items-start space-x-2.5">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <p className="font-bold">
                    Sepeda {bikeId} tidak dapat disewa saat ini.
                  </p>
                  <p className="mt-1">
                    Status: {bikeInfo.bike_status_label || bikeInfo.bike_status}
                    . Silakan pilih sepeda lain atau hubungi pengelola
                    pangkalan.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            bikeInfo && (
              <div className="mb-4 flex items-start space-x-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  <span className="font-bold">{bikeId}</span>
                  {bikeInfo.name ? ` (${bikeInfo.name})` : ""} tersedia dan
                  siap disewa.
                </p>
              </div>
            )
          )}

          {errorMessage && (
            <div className="mb-4 flex items-start space-x-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-red-700">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {bikeUnavailable ? (
            <p className="pt-1 text-center text-[11px] leading-relaxed text-slate-400">
              Formulir pendaftaran hanya muncul untuk sepeda yang tersedia.
              Scan QR sepeda lain untuk melanjutkan.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="register-name"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="register-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nama sesuai identitas"
                    className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="register-phone"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="register-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="081234567890"
                    className="w-full rounded-xl bg-slate-100 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                  Contoh: 081234567890. Format +62/62 otomatis disesuaikan.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || availabilityLoading}
                className="mt-2 flex w-full items-center justify-center space-x-2 rounded-2xl bg-brand-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 active:scale-[0.98] disabled:bg-slate-300"
              >
                {loading ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <UserPlus size={20} />
                )}
                <span>
                  {loading
                    ? "Memproses Registrasi..."
                    : "Daftar & Lanjut ke Pembayaran"}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-6 text-center">
        <p className="text-[11px] leading-relaxed text-slate-400">
          Nomor WA yang pernah dipakai akan otomatis dikenali sistem — cukup
          isi ulang nama untuk melanjutkan sewa.
        </p>
        <p className="mt-3 text-[11px] text-slate-400">
          © 2026 Tracking Bicycle Alert & Security System
        </p>
      </div>
    </div>
  );
};

export default UserRegister;
