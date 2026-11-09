import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import {
  getAdminSettings,
  getApiErrorMessage,
  updateAdminSettings,
} from "../services/api";

const EMPTY_FORM = {
  lat: "",
  lng: "",
  radius_m: "",
  initial_price_per_minute: "",
  extension_price_per_minute: "",
  min_rental_minutes: "",
  max_rental_minutes: "",
};

const toFormValues = (data) => ({
  lat: data?.station?.lat ?? "",
  lng: data?.station?.lng ?? "",
  radius_m: data?.station?.radius_m ?? "",
  initial_price_per_minute: data?.pricing?.initial_price_per_minute ?? "",
  extension_price_per_minute:
    data?.pricing?.extension_price_per_minute ?? "",
  min_rental_minutes: data?.pricing?.min_rental_minutes ?? "",
  max_rental_minutes: data?.pricing?.max_rental_minutes ?? "",
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

const labelClass = "text-xs font-semibold text-slate-600";

const AdminSettings = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await getAdminSettings();
      setForm(toFormValues(payload?.data));
    } catch (loadError) {
      setError(
        getApiErrorMessage(
          loadError,
          "Gagal memuat pengaturan dari backend.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = await updateAdminSettings({
        station: {
          lat: toNumber(form.lat),
          lng: toNumber(form.lng),
          radius_m: toNumber(form.radius_m),
        },
        pricing: {
          initial_price_per_minute: toNumber(form.initial_price_per_minute),
          extension_price_per_minute: toNumber(
            form.extension_price_per_minute,
          ),
          min_rental_minutes: toNumber(form.min_rental_minutes),
          max_rental_minutes: toNumber(form.max_rental_minutes),
        },
      });

      setForm(toFormValues(payload?.data));
      setSuccess(
        payload?.message ||
          "Pengaturan berhasil disimpan dan langsung diterapkan.",
      );
    } catch (saveError) {
      setError(
        getApiErrorMessage(saveError, "Gagal menyimpan pengaturan."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600">
            Pengaturan
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            <SettingsIcon size={26} className="text-brand-600" />
            Pengaturan Sistem
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Ubah titik pangkalan, radius geofence, dan tarif sewa. Perubahan
            langsung berlaku tanpa restart backend.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSettings()}
          disabled={loading || saving}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          <span>{loading ? "Memuat..." : "Muat Ulang"}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">Pengaturan gagal diproses</p>
            <p className="mt-1 text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">Tersimpan</p>
            <p className="mt-1 text-xs leading-relaxed">{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Lokasi pangkalan & geofence */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Pangkalan &amp; Geofence
                </h3>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  Titik pusat pangkalan dan radius aman yang dipakai engine
                  geofence serta peta armada.
                </p>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Latitude pangkalan</span>
                <input
                  type="number"
                  name="lat"
                  step="any"
                  min="-90"
                  max="90"
                  value={form.lat}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="-7.773512"
                  className={inputClass}
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Longitude pangkalan</span>
                <input
                  type="number"
                  name="lng"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.lng}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="110.385411"
                  className={inputClass}
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={labelClass}>Radius geofence (meter)</span>
                <input
                  type="number"
                  name="radius_m"
                  step="1"
                  min="50"
                  max="100000"
                  value={form.radius_m}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="500"
                  className={inputClass}
                  required
                />
                <span className="text-[11px] text-slate-400">
                  Rentang yang diizinkan 50–100000 meter. Sepeda di luar radius
                  akan ditandai sebagai pelanggaran geofence.
                </span>
              </label>

              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] leading-relaxed text-amber-700 sm:col-span-2">
                <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                <span>
                  Perubahan titik pangkalan langsung memengaruhi perhitungan
                  jarak dan status peringatan seluruh sepeda.
                </span>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Pricing Sewa
                </h3>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  Tarif baru dipakai untuk transaksi sewa dan perpanjangan
                  berikutnya.
                </p>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Harga awal / menit (Rp)</span>
                <input
                  type="number"
                  name="initial_price_per_minute"
                  step="1"
                  min="0"
                  value={form.initial_price_per_minute}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="1000"
                  className={inputClass}
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>
                  Harga perpanjangan / menit (Rp)
                </span>
                <input
                  type="number"
                  name="extension_price_per_minute"
                  step="1"
                  min="0"
                  value={form.extension_price_per_minute}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="1000"
                  className={inputClass}
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Durasi minimum (menit)</span>
                <input
                  type="number"
                  name="min_rental_minutes"
                  step="1"
                  min="1"
                  value={form.min_rental_minutes}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="15"
                  className={inputClass}
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Durasi maksimum (menit)</span>
                <input
                  type="number"
                  name="max_rental_minutes"
                  step="1"
                  min="1"
                  value={form.max_rental_minutes}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="1440"
                  className={inputClass}
                  required
                />
              </label>

              <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] leading-relaxed text-slate-500 sm:col-span-2">
                <RefreshCw size={15} className="mt-0.5 shrink-0" />
                <span>
                  Durasi maksimum tidak boleh lebih kecil dari durasi minimum.
                  Halaman checkout mengambil tarif terbaru dari backend.
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col items-start gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-400">
            Disimpan di tabel <span className="font-mono">app_settings</span>{" "}
            dan diterapkan ke engine geofence serta pricing secara langsung.
          </p>

          <button
            type="submit"
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{saving ? "Menyimpan..." : "Simpan Pengaturan"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;
