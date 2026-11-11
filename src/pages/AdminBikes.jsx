import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createAdminBike,
  deleteAdminBike,
  getApiErrorMessage,
  updateAdminBike,
} from "../services/api";
import useAdminBikes from "../hooks/useAdminBikes";
import { BIKE_STATUS_META, getBikeStatusMeta } from "../utils/fleetStats";
import {
  formatCoordinate,
  formatRelativeTime,
} from "../utils/fleetTelemetry";
import BatteryGauge from "../components/admin/BatteryGauge";

// Harus identik dengan validasi backend (POST /api/admin/bikes):
// 2-20 karakter huruf besar, angka, atau tanda hubung, diawali huruf/angka.
const BIKE_ID_REGEX = /^[A-Z0-9][A-Z0-9-]{1,19}$/;

const STATUS_OPTIONS = Object.entries(BIKE_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label }),
);

const LOCK_OPTIONS = [
  { value: "locked", label: "Terkunci" },
  { value: "unlocked", label: "Terbuka" },
];

const EMPTY_CREATE_FORM = {
  bike_id: "",
  name: "",
  status: "AVAILABLE",
  lock_state: "locked",
  latitude: "",
  longitude: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

const labelClass = "text-xs font-semibold text-slate-600";

const toLockValue = (isLocked) => (isLocked ? "locked" : "unlocked");

/**
 * Halaman Kelola Armada (/admin/bikes): tambah, ubah, dan hapus sepeda
 * beserta ringkasan status live dari perception layer.
 */
const AdminBikes = () => {
  const {
    bikes,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
    refreshInterval,
    initialLoading,
  } = useAdminBikes();

  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [searchInput, setSearchInput] = useState("");

  const [editingBike, setEditingBike] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", status: "", lock_state: "locked" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingBike, setDeletingBike] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleCreateChange = (field) => (event) => {
    const value =
      field === "bike_id"
        ? event.target.value.toUpperCase()
        : event.target.value;

    setCreateForm((current) => ({ ...current, [field]: value }));
    setCreateError("");
    setCreateSuccess("");
  };

  const validateCreateForm = () => {
    const bikeId = createForm.bike_id.trim();

    if (!BIKE_ID_REGEX.test(bikeId)) {
      return "ID sepeda tidak valid. Gunakan 2-20 karakter huruf besar, angka, atau tanda hubung (contoh: BK-002).";
    }

    const name = createForm.name.trim();
    if (!name || name.length > 50) {
      return "Nama sepeda wajib diisi (maksimal 50 karakter).";
    }

    const latitude = createForm.latitude.trim();
    const longitude = createForm.longitude.trim();

    if (!latitude !== !longitude) {
      return "Latitude dan longitude harus diisi bersamaan.";
    }

    if (latitude) {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return "Latitude harus berada di rentang -90 sampai 90.";
      }

      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return "Longitude harus berada di rentang -180 sampai 180.";
      }
    }

    return "";
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateCreateForm();
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const payload = await createAdminBike({
        bike_id: createForm.bike_id.trim(),
        name: createForm.name.trim(),
        status: createForm.status,
        lock_state: createForm.lock_state === "locked",
        ...(createForm.latitude.trim()
          ? {
              last_latitude: Number(createForm.latitude),
              last_longitude: Number(createForm.longitude),
            }
          : {}),
      });

      setCreateSuccess(
        payload?.message ||
          `Sepeda ${createForm.bike_id.trim()} berhasil ditambahkan.`,
      );
      setCreateForm(EMPTY_CREATE_FORM);
      void refresh({ silent: true });
    } catch (submitError) {
      setCreateError(
        getApiErrorMessage(submitError, "Gagal menambahkan sepeda."),
      );
    } finally {
      setCreating(false);
    }
  };

  const filteredBikes = useMemo(() => {
    const keyword = searchInput.trim().toLowerCase();

    if (!keyword) return bikes;

    return bikes.filter(
      (bike) =>
        String(bike.bike_id || "").toLowerCase().includes(keyword) ||
        String(bike.name || "").toLowerCase().includes(keyword),
    );
  }, [bikes, searchInput]);

  const handleOpenEdit = (bike) => {
    setEditError("");
    setEditForm({
      name: bike.name || "",
      status: bike.stored_status || bike.status || "AVAILABLE",
      lock_state: toLockValue(bike.lock_state !== false),
    });
    setEditingBike(bike);
  };

  const handleEditChange = (field) => (event) => {
    setEditForm((current) => ({ ...current, [field]: event.target.value }));
    setEditError("");
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!editingBike) return;

    const name = editForm.name.trim();
    if (!name || name.length > 50) {
      setEditError("Nama sepeda wajib diisi (maksimal 50 karakter).");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      await updateAdminBike({
        bike_id: editingBike.bike_id,
        name,
        status: editForm.status,
        lock_state: editForm.lock_state === "locked",
      });

      setEditingBike(null);
      void refresh({ silent: true });
    } catch (submitError) {
      setEditError(
        getApiErrorMessage(submitError, "Gagal memperbarui sepeda."),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBike) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteAdminBike({ bike_id: deletingBike.bike_id });
      setDeletingBike(null);
      void refresh({ silent: true });
    } catch (submitError) {
      setDeleteError(
        getApiErrorMessage(submitError, "Gagal menghapus sepeda."),
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600">
            Manajemen Armada
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            <Bike size={26} className="text-brand-600" />
            Kelola Armada
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Tambahkan sepeda baru untuk dicetak QR-nya, ubah data unit,
            atau hapus sepeda yang sudah tidak dipakai beserta riwayatnya.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh({ silent: true })}
          disabled={refreshing || initialLoading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          <span>{refreshing ? "Menyegarkan..." : "Muat Ulang"}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">Data armada gagal dimuat</p>
            <p className="mt-1 text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Form tambah sepeda */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Plus size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Tambah Sepeda Baru
            </h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              ID sepeda dipakai sebagai isi QR code di unit fisik. Koordinat
              awal opsional — akan otomatis terisi dari telemetri ESP32.
            </p>
          </div>
        </div>

        {createSuccess && (
          <div className="flex items-start gap-2.5 border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-emerald-800">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs font-medium leading-relaxed">
              {createSuccess}
            </p>
          </div>
        )}

        {createError && (
          <div className="flex items-start gap-2.5 border-b border-rose-100 bg-rose-50 px-5 py-3 text-rose-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs font-medium leading-relaxed">
              {createError}
            </p>
          </div>
        )}

        <form onSubmit={handleCreateSubmit}>
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>ID Sepeda</span>
              <input
                type="text"
                value={createForm.bike_id}
                onChange={handleCreateChange("bike_id")}
                disabled={creating}
                placeholder="BK-002"
                maxLength={20}
                className={`${inputClass} font-mono uppercase`}
                required
              />
              <span className="text-[11px] text-slate-400">
                Huruf besar, angka, dan tanda hubung. 2–20 karakter, harus
                unik.
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Nama Unit</span>
              <input
                type="text"
                value={createForm.name}
                onChange={handleCreateChange("name")}
                disabled={creating}
                placeholder="Polygon Premier"
                maxLength={50}
                className={inputClass}
                required
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Status Awal</span>
              <select
                value={createForm.status}
                onChange={handleCreateChange("status")}
                disabled={creating}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Status Kunci Awal</span>
              <select
                value={createForm.lock_state}
                onChange={handleCreateChange("lock_state")}
                disabled={creating}
                className={inputClass}
              >
                {LOCK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Latitude Awal (opsional)</span>
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={createForm.latitude}
                onChange={handleCreateChange("latitude")}
                disabled={creating}
                placeholder="-7.773512"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Longitude Awal (opsional)</span>
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={createForm.longitude}
                onChange={handleCreateChange("longitude")}
                disabled={creating}
                placeholder="110.385411"
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <p className="hidden text-[11px] text-slate-400 sm:block">
              Pastikan ID sesuai label pada unit fisik sebelum mencetak QR.
            </p>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              {creating ? "Menyimpan..." : "Tambah ke Armada"}
            </button>
          </div>
        </form>
      </section>

      {/* Daftar armada */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Bike size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Daftar Armada
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {bikes.length} sepeda terdaftar
                {lastUpdated
                  ? ` · diperbarui ${formatRelativeTime(lastUpdated)}`
                  : ""}
              </p>
            </div>
          </div>

          <label className="relative sm:w-64">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari ID atau nama..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">ID Sepeda</th>
                <th className="px-4 py-3">Nama Unit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Kunci</th>
                <th className="px-4 py-3">Baterai</th>
                <th className="px-4 py-3">Koordinat Terakhir</th>
                <th className="px-4 py-3">Update</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {initialLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <td
                        key={`skeleton-cell-${cellIndex}`}
                        className="px-4 py-4"
                      >
                        <div className="h-3.5 w-full max-w-[120px] animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : bikes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Bike size={34} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">
                      Belum ada sepeda di armada
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Tambahkan sepeda pertama lewat form di atas.
                    </p>
                  </td>
                </tr>
              ) : filteredBikes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center">
                    <Search size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">
                      Tidak ada hasil untuk &quot;{searchInput.trim()}&quot;
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBikes.map((bike) => {
                  const statusMeta = getBikeStatusMeta(bike.status);

                  return (
                    <tr
                      key={bike.bike_id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/admin/bikes/${encodeURIComponent(bike.bike_id)}`}
                          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-800 transition-colors hover:text-brand-700"
                          title="Buka detail monitoring"
                        >
                          {bike.bike_id}
                          <ChevronRight
                            size={14}
                            className="text-slate-300 transition-colors"
                          />
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">
                        {bike.name || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusMeta.className}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`}
                          />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {bike.lock_state === false ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <LockOpen size={13} />
                            Terbuka
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <Lock size={13} />
                            Terkunci
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <BatteryGauge percent={bike.battery_percent} />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                        {formatCoordinate(
                          bike.last_latitude,
                          bike.last_longitude,
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-slate-500">
                        {formatRelativeTime(bike.last_reported_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/bikes/${encodeURIComponent(bike.bike_id)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                          >
                            <ChevronRight size={13} />
                            Detail
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(bike)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 transition-colors hover:bg-sky-100"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError("");
                              setDeletingBike(bike);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100"
                          >
                            <Trash2 size={13} />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <p className="text-[11px] text-slate-400">
            Data live diperbarui otomatis setiap{" "}
            {Math.round(refreshInterval / 1000)} detik
            {refreshing ? " · menyegarkan..." : ""}
            {loading && bikes.length > 0 ? " · memuat..." : ""}
          </p>
        </div>
      </section>

      {/* Modal edit sepeda */}
      {editingBike && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Ubah Sepeda {editingBike.bike_id}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  ID sepeda tidak dapat diubah karena tercetak pada QR unit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBike(null)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {editError && (
              <div className="flex items-start gap-2.5 border-b border-rose-100 bg-rose-50 px-5 py-3 text-rose-800">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p className="text-xs font-medium leading-relaxed">
                  {editError}
                </p>
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4 px-5 py-5">
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Nama Unit</span>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={handleEditChange("name")}
                    disabled={savingEdit}
                    maxLength={50}
                    className={inputClass}
                    required
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Status</span>
                  <select
                    value={editForm.status}
                    onChange={handleEditChange("status")}
                    disabled={savingEdit}
                    className={inputClass}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Status Kunci</span>
                  <select
                    value={editForm.lock_state}
                    onChange={handleEditChange("lock_state")}
                    disabled={savingEdit}
                    className={inputClass}
                  >
                    {LOCK_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400">
                    Perubahan status kunci di database tidak otomatis
                    mengirim perintah ke sepeda — gunakan tombol remote
                    control di halaman detail.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setEditingBike(null)}
                  disabled={savingEdit}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingEdit && <Loader2 size={14} className="animate-spin" />}
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog konfirmasi hapus */}
      {deletingBike && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Hapus {deletingBike.bike_id}?
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="flex items-start gap-2.5 border-b border-rose-100 bg-rose-50 px-5 py-3 text-rose-800">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p className="text-xs font-medium leading-relaxed">
                  {deleteError}
                </p>
              </div>
            )}

            <div className="space-y-3 px-5 py-5">
              <p className="text-sm leading-relaxed text-slate-700">
                Sepeda{" "}
                <span className="font-bold">
                  {deletingBike.bike_id} ({deletingBike.name || "tanpa nama"})
                </span>{" "}
                akan dihapus dari armada.
              </p>
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] leading-relaxed text-amber-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>
                  Seluruh riwayat terkait ikut terhapus permanen: transaksi
                  sewa, log telemetri, insiden keamanan, dan riwayat perintah.
                  Sepeda dengan sesi sewa aktif akan ditolak oleh backend.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setDeletingBike(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Menghapus..." : "Ya, Hapus Sepeda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBikes;
