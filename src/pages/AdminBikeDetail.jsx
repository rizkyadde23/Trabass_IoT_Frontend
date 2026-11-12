import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BellOff,
  Bike,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gauge,
  History,
  Loader2,
  Lock,
  MapPin,
  Power,
  Radio,
  RefreshCw,
  ShieldAlert,
  Unlock,
  Zap,
} from "lucide-react";
import useAdminBikeDetail from "../hooks/useAdminBikeDetail";
import useBikeCommands from "../hooks/useBikeCommands";
import {
  endAdminBikeRental,
  getApiErrorMessage,
} from "../services/api";
import { getBikeStatusMeta } from "../utils/fleetStats";
import {
  formatCoordinate,
  formatDistance,
  formatRelativeTime,
  formatSpeed,
  getImuState,
  isImuAnomaly,
  isTelemetryStale,
} from "../utils/fleetTelemetry";
import BatteryGauge from "../components/admin/BatteryGauge";

const IMU_BADGE_TONES = {
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
};

const IMU_DOT_TONES = {
  danger: "bg-rose-500",
  info: "bg-sky-500",
  success: "bg-emerald-500",
  neutral: "bg-slate-400",
};

const REMOTE_ACTIONS = [
  {
    action: "FORCE_LOCK",
    label: "Force Lock",
    description: "Kunci paksa sepeda dari jarak jauh.",
    icon: Lock,
    className:
      "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:hover:bg-rose-50",
  },
  {
    action: "FORCE_UNLOCK",
    label: "Force Unlock",
    description: "Buka kunci paksa sepeda dari jarak jauh.",
    icon: Unlock,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:hover:bg-emerald-50",
  },
  {
    action: "ALARM_OFF",
    label: "Turn Off Alarm",
    description: "Matikan alarm aktif pada sepeda.",
    icon: BellOff,
    className:
      "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:hover:bg-sky-50",
  },
];

const TELEMETRY_PAGE_STEP = 50;
const TELEMETRY_MAX_LIMIT = 200;

const SESSION_STATUS_LABELS = {
  ACTIVE: "Aktif",
  WARNING_SENT: "Segera berakhir",
  OVERDUE: "Melewati batas waktu",
  WAITING_PAYMENT: "Menunggu pembayaran",
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getActionLabel = (action) =>
  REMOTE_ACTIONS.find((item) => item.action === action)?.label || action;

/**
 * Kartu metrik perception layer untuk halaman detail per sepeda.
 */
const MetricCard = ({ icon: Icon, label, hint, children, alert = false }) => (
  <div
    className={`rounded-2xl border p-4 shadow-sm ${
      alert
        ? "border-rose-200 bg-rose-50/60"
        : "border-slate-200 bg-white"
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <Icon
        size={15}
        className={alert ? "text-rose-500" : "text-slate-300"}
      />
    </div>
    <div className="mt-2.5 min-h-[30px]">{children}</div>
    {hint && (
      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
        {hint}
      </p>
    )}
  </div>
);

/**
 * Halaman detail monitoring per sepeda tingkat lanjut
 * (/admin/bikes/:bikeId). Kartu metrik live dari perception layer,
 * kontrol remote, dan riwayat telemetri ESP32.
 */
const AdminBikeDetail = () => {
  const { bikeId } = useParams();
  const navigate = useNavigate();

  const [telemetryLimit, setTelemetryLimit] = useState(TELEMETRY_PAGE_STEP);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmEndRental, setConfirmEndRental] = useState(false);
  const [endingRental, setEndingRental] = useState(false);
  const [endRentalFeedback, setEndRentalFeedback] = useState(null);

  const {
    bike,
    activeRental,
    pendingPayment,
    telemetry,
    telemetryTotal,
    loading,
    refreshing,
    error,
    notFound,
    lastUpdated,
    refresh,
    refreshInterval,
  } = useAdminBikeDetail({ bikeId, telemetryLimit });

  const { commandStates, sendCommand, clearFeedback } = useBikeCommands({
    onSuccess: () => {
      void refresh({ silent: true });
    },
  });

  const commandState = commandStates[bikeId] || {};
  const pendingAction = commandState.pending || null;
  const feedback = commandState.feedback || null;

  const statusMeta = getBikeStatusMeta(bike?.status);
  const imuState = getImuState(bike);
  const anomaly = bike ? isImuAnomaly(bike) : false;
  const stale = bike
    ? !bike.has_live_location || isTelemetryStale(bike.last_reported_at)
    : true;
  const outsideGeofence = bike?.geofence_violated === true;
  const refreshSeconds = Math.round(refreshInterval / 1000);

  const handleConfirmCommand = async () => {
    if (!confirmAction || !bikeId) return;

    await sendCommand({ bikeId, action: confirmAction });
    setConfirmAction(null);
  };

  const handleShowOnMap = () => {
    navigate("/admin/map", { state: { bikeId } });
  };

  // Sesi yang dapat diakhiri admin: sewa berjalan, atau pembayaran awal
  // yang masih menunggu (sepeda tertahan berstatus RESERVED).
  const sessionInfo = activeRental || pendingPayment;
  const canEndSession = Boolean(sessionInfo);

  useEffect(() => {
    setConfirmEndRental(false);
    setEndRentalFeedback(null);
  }, [bikeId]);

  const handleEndRental = async () => {
    if (!bikeId || endingRental || !canEndSession) return;

    setEndingRental(true);
    setEndRentalFeedback(null);

    try {
      const payload = await endAdminBikeRental(bikeId);

      setEndRentalFeedback({
        tone: "success",
        message:
          payload?.message ||
          `Sesi sewa pada ${bikeId} berhasil diakhiri.`,
      });
      setConfirmEndRental(false);

      await refresh({ silent: true });
    } catch (endError) {
      setEndRentalFeedback({
        tone: "error",
        message: getApiErrorMessage(
          endError,
          "Gagal mengakhiri sesi sewa. Silakan coba lagi.",
        ),
      });
    } finally {
      setEndingRental(false);
    }
  };

  // --- State: sepeda tidak ditemukan -------------------------------------
  if (notFound) {
    return (
      <div className="space-y-5">
        <Link
          to="/admin/bikes"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:text-brand-700"
        >
          <ArrowLeft size={13} />
          Kembali ke kelola armada
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Bike size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-800">
            Sepeda {bikeId} tidak ditemukan
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Sepeda mungkin sudah dihapus dari armada atau ID salah ketik.
          </p>
          <Link
            to="/admin/bikes"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Lihat Daftar Armada
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            to="/admin/bikes"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:text-brand-700"
          >
            <ArrowLeft size={13} />
            Kembali ke kelola armada
          </Link>
          <h2 className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            <Bike size={26} className="text-brand-600" />
            <span className="font-mono">{bikeId}</span>
            {bike?.name ? (
              <span className="text-lg font-semibold text-slate-400">
                · {bike.name}
              </span>
            ) : null}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Monitoring perception layer per sepeda: GPS NEO-6M, kecepatan,
            kunci solenoid, gerakan MPU6050, baterai, dan jarak geofence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusMeta.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
            {statusMeta.label}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
              stale
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
            title={
              stale
                ? "Tidak ada telemetri live dalam 30 detik terakhir."
                : "Telemetri live diterima dari Redis."
            }
          >
            {stale ? <Clock size={11} /> : <Radio size={11} />}
            {stale ? "Data Lama" : "Live"}
          </span>

          <button
            type="button"
            onClick={handleShowOnMap}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ExternalLink size={13} />
            Lihat di Peta
          </button>

          <button
            type="button"
            onClick={() => void refresh({ silent: true })}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <RefreshCw
              size={13}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Menyegarkan..." : "Muat Ulang"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">Detail sepeda gagal dimuat</p>
            <p className="mt-1 text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {anomaly && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">Anomali gerakan terdeteksi</p>
            <p className="mt-1 text-xs leading-relaxed">
              MPU6050 mendeteksi gerakan saat sepeda terkunci
              {bike?.imu_alert_at
                ? ` (sejak ${formatRelativeTime(bike.imu_alert_at)})`
                : ""}
              . Backend memicu alarm dan notifikasi WhatsApp.
            </p>
          </div>
        </div>
      )}

      {/* Kartu metrik perception layer */}
      {loading && !bike ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={`metric-skeleton-${index}`}
              className="h-[118px] animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : bike ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Zap}
              label="Baterai"
              hint="Persentase baterai terakhir yang dikirim ESP32."
              alert={bike.battery_low === true}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tabular-nums text-slate-800">
                  {bike.battery_percent !== null &&
                  bike.battery_percent !== undefined
                    ? `${Math.round(Number(bike.battery_percent))}%`
                    : "—"}
                </span>
                <BatteryGauge percent={bike.battery_percent} />
              </div>
              {bike.battery_low === true && (
                <span className="mt-1.5 inline-flex rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                  Rendah — perlu pengecekan
                </span>
              )}
            </MetricCard>

            <MetricCard
              icon={Gauge}
              label="Kecepatan"
              hint={
                bike.has_live_location
                  ? "Kecepatan real-time dari GPS NEO-6M."
                  : "Menunggu telemetri live dari ESP32."
              }
            >
              <span className="text-xl font-bold tabular-nums text-slate-800">
                {bike.has_live_location ? formatSpeed(bike.speed) : "—"}
              </span>
            </MetricCard>

            <MetricCard
              icon={bike.lock_state === false ? Unlock : Lock}
              label="Status Kunci"
              hint={
                bike.lock_state === false
                  ? "Solenoid terbuka — sepeda dapat dipakai."
                  : "Solenoid terkunci — sepeda tidak dapat digerakkan."
              }
            >
              {bike.lock_state === false ? (
                <span className="inline-flex items-center gap-1.5 text-xl font-bold text-emerald-600">
                  <Unlock size={20} />
                  Terbuka
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xl font-bold text-slate-700">
                  <Lock size={20} />
                  Terkunci
                </span>
              )}
            </MetricCard>

            <MetricCard
              icon={Activity}
              label="Gerakan MPU6050"
              hint={imuState.description}
              alert={imuState.tone === "danger"}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${IMU_BADGE_TONES[imuState.tone]}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${IMU_DOT_TONES[imuState.tone]}`}
                  />
                  {imuState.label}
                </span>
                {bike.has_live_location && (
                  <span className="text-xs font-semibold text-slate-500">
                    {bike.mpu_motion ? "Gerak" : "Diam"}
                  </span>
                )}
              </div>
            </MetricCard>

            <MetricCard
              icon={MapPin}
              label="Jarak dari Pangkalan"
              alert={outsideGeofence}
              hint={
                bike.geofence_distance_m === null
                  ? "Menunggu koordinat dari GPS."
                  : `Radius geofence ${formatDistance(bike.geofence_radius_m)} dari titik pangkalan.`
              }
            >
              <span
                className={`text-xl font-bold tabular-nums ${
                  outsideGeofence ? "text-rose-600" : "text-slate-800"
                }`}
              >
                {formatDistance(bike.geofence_distance_m)}
              </span>
              {bike.geofence_distance_m !== null && (
                <span
                  className={`ml-2 text-[10px] font-bold uppercase tracking-wide ${
                    outsideGeofence ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {outsideGeofence ? "· Luar geofence" : "· Dalam geofence"}
                </span>
              )}
            </MetricCard>

            <MetricCard
              icon={MapPin}
              label="Koordinat Terakhir"
              hint={
                bike.has_live_location
                  ? "Posisi live dari Redis (telemetri terbaru)."
                  : "Posisi terakhir tersimpan di MySQL."
              }
            >
              <span className="font-mono text-sm font-semibold text-slate-800">
                {formatCoordinate(bike.last_latitude, bike.last_longitude)}
              </span>
            </MetricCard>

            <MetricCard
              icon={Clock}
              label="Update Terakhir"
              alert={stale}
              hint={
                stale
                  ? "Tidak ada telemetri baru dalam 30 detik terakhir."
                  : "Telemetri live aktif diterima."
              }
            >
              <span className="text-sm font-bold text-slate-800">
                {formatRelativeTime(bike.last_reported_at)}
              </span>
            </MetricCard>

            <MetricCard
              icon={Bike}
              label="Status Armada"
              hint={
                bike.stored_status && bike.stored_status !== bike.status
                  ? `Status tersimpan di database: ${bike.stored_status}.`
                  : "Status operasional sepeda di database."
              }
            >
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusMeta.className}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`}
                />
                {statusMeta.label}
              </span>
            </MetricCard>
          </div>

          {/* Kontrol remote */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Kontrol Remote
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Perintah dikirim lewat MQTT ke sepeda {bikeId}.
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Data diperbarui otomatis tiap {refreshSeconds} detik
                {lastUpdated ? ` · terakhir ${formatRelativeTime(lastUpdated)}` : ""}
              </p>
            </div>

            <div className="grid gap-3 px-5 py-5 sm:grid-cols-3">
              {REMOTE_ACTIONS.map(
                ({ action, label, description, icon: Icon, className }) => (
                  <div key={action} className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={pendingAction !== null}
                      onClick={() => {
                        setConfirmAction(action);
                        clearFeedback(bikeId);
                      }}
                      title={label}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
                    >
                      {pendingAction === action ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Icon size={15} />
                      )}
                      {pendingAction === action ? "Mengirim..." : label}
                    </button>
                    <p className="text-center text-[10px] leading-relaxed text-slate-400">
                      {description}
                    </p>
                  </div>
                ),
              )}
            </div>

            {confirmAction && pendingAction === null && (
              <div className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] font-semibold text-amber-800">
                <p>
                  Kirim perintah{" "}
                  <span className="font-bold">
                    {getActionLabel(confirmAction)}
                  </span>{" "}
                  ke {bikeId}?
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleConfirmCommand()}
                    className="rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-amber-700"
                  >
                    Ya, Kirim
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[10px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {feedback && (
              <div
                className={`mx-5 mb-5 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[11px] leading-relaxed ${
                  feedback.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {feedback.tone === "success" ? (
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {feedback.tone === "success"
                      ? "Perintah terkirim"
                      : "Perintah gagal"}
                    {feedback.stateUpdated
                      ? " — status kunci sepeda sudah diperbarui."
                      : ""}
                  </p>
                  <p className="mt-0.5">{feedback.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => clearFeedback(bikeId)}
                  className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/5"
                  aria-label="Tutup pesan"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Akhiri sesi sewa penyewa */}
            <div className="border-t border-slate-200 px-5 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Clock size={14} className="text-slate-400" />
                    Sesi Sewa Penyewa
                  </p>

                  {sessionInfo ? (
                    <div className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-slate-500">
                      <p>
                        <span className="font-bold text-slate-700">
                          {sessionInfo.user_name || "Penyewa"}
                        </span>
                        {sessionInfo.phone_number
                          ? ` · ${sessionInfo.phone_number}`
                          : ""}
                      </p>
                      <p>
                        {activeRental
                          ? `Berakhir ${formatDateTime(activeRental.end_time)}`
                          : `Menunggu pembayaran · ${formatDateTime(
                              pendingPayment?.start_time,
                            )}`}
                        {" · "}
                        <span className="font-semibold text-slate-600">
                          {SESSION_STATUS_LABELS[
                            sessionInfo.rental_status
                          ] || sessionInfo.rental_status}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Tidak ada sesi sewa aktif pada sepeda ini.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmEndRental(true);
                    setEndRentalFeedback(null);
                  }}
                  disabled={!canEndSession || endingRental}
                  title={
                    canEndSession
                      ? `Akhiri sesi sewa pada ${bikeId}`
                      : "Tidak ada sesi sewa untuk diakhiri"
                  }
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-rose-50"
                >
                  {endingRental ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Power size={15} />
                  )}
                  {endingRental ? "Mengakhiri..." : "Akhiri Sesi"}
                </button>
              </div>

              {confirmEndRental && !endingRental && canEndSession && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11px] font-semibold text-rose-800">
                  <p className="leading-relaxed">
                    Akhiri sesi{" "}
                    <span className="font-bold">
                      {sessionInfo?.user_name || "penyewa"}
                    </span>{" "}
                    pada {bikeId}? Sepeda akan dikunci dan statusnya kembali{" "}
                    <span className="font-bold">AVAILABLE</span>.
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleEndRental()}
                      className="rounded-lg bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-rose-700"
                    >
                      Ya, Akhiri
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmEndRental(false)}
                      className="rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-[10px] font-bold text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {endRentalFeedback && (
                <div
                  className={`mt-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[11px] leading-relaxed ${
                    endRentalFeedback.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {endRentalFeedback.tone === "success" ? (
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  )}
                  <p className="min-w-0 flex-1 font-semibold">
                    {endRentalFeedback.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEndRentalFeedback(null)}
                    className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/5"
                    aria-label="Tutup pesan"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Riwayat telemetri */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Riwayat Telemetri
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Log perception layer dari ESP32 —
                    {telemetryTotal > 0
                      ? ` ${telemetryTotal} entri terbaru`
                      : " belum ada data"}
                    .
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void refresh({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <RefreshCw
                  size={13}
                  className={refreshing ? "animate-spin" : ""}
                />
                Segarkan Riwayat
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Waktu</th>
                    <th className="px-4 py-3">Koordinat</th>
                    <th className="px-4 py-3">Kecepatan</th>
                    <th className="px-4 py-3">Kunci</th>
                    <th className="px-4 py-3">Gerakan</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading && telemetry.length === 0 ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={`telemetry-skeleton-${index}`}>
                        {Array.from({ length: 5 }).map((__, cellIndex) => (
                          <td
                            key={`telemetry-skeleton-cell-${cellIndex}`}
                            className="px-4 py-3.5"
                          >
                            <div className="h-3.5 w-full max-w-[110px] animate-pulse rounded bg-slate-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : telemetry.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center"
                      >
                        <History
                          size={28}
                          className="mx-auto mb-2 text-slate-300"
                        />
                        <p className="text-sm font-semibold text-slate-700">
                          Belum ada riwayat telemetri
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Data akan muncul setelah ESP32 pada sepeda ini
                          mengirim paket telemetri pertama.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    telemetry.map((log) => (
                      <tr
                        key={log.log_id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-3 text-xs font-semibold text-slate-600">
                          {formatDateTime(log.recorded_at)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {formatCoordinate(log.latitude, log.longitude)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                          {formatSpeed(log.speed)}
                        </td>
                        <td className="px-4 py-3">
                          {log.lock_state === false ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                              <Unlock size={12} />
                              Terbuka
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                              <Lock size={12} />
                              Terkunci
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {log.mpu_motion ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                              <Activity size={12} />
                              Gerak
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                              <Activity size={12} />
                              Diam
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <p className="text-[11px] text-slate-400">
                Menampilkan {telemetry.length} dari maksimal{" "}
                {TELEMETRY_MAX_LIMIT} entri terbaru.
              </p>
              {telemetryLimit < TELEMETRY_MAX_LIMIT &&
                telemetry.length >= telemetryLimit && (
                  <button
                    type="button"
                    onClick={() =>
                      setTelemetryLimit((current) =>
                        Math.min(
                          current + TELEMETRY_PAGE_STEP,
                          TELEMETRY_MAX_LIMIT,
                        ),
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                  >
                    Muat {TELEMETRY_PAGE_STEP} Lagi
                  </button>
                )}
            </div>
          </section>
        </>
      ) : !error ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Loader2 size={28} className="mx-auto mb-3 animate-spin text-brand-500" />
          <p className="text-sm font-semibold text-slate-700">
            Memuat detail sepeda {bikeId}...
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default AdminBikeDetail;
