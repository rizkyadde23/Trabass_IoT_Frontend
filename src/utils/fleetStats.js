const RENTED_STATUSES = ["RENTED", "OVERDUE"];
const READY_STATUSES = ["AVAILABLE", "RESERVED"];
const MAINTENANCE_STATUSES = ["MAINTENANCE"];

const normalizeStatus = (value) => String(value || "").toUpperCase();

const isGeofenceViolation = (bike) =>
  bike?.geofence_violated === true ||
  normalizeStatus(bike?.status) === "GEOFENCE_VIOLATION";

const isTamperAlert = (bike) => normalizeStatus(bike?.status) === "TAMPER_ALERT";

/**
 * Status armada mengikuti nilai kolom `bikes.status` di backend.
 * Warna dibuat eksplisit agar aman dari pemangkasan kelas Tailwind.
 */
export const BIKE_STATUS_META = {
  AVAILABLE: {
    label: "Tersedia",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  RESERVED: {
    label: "Dipesan",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  RENTED: {
    label: "Disewa",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  OVERDUE: {
    label: "Melewati Waktu",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  MAINTENANCE: {
    label: "Perawatan",
    className: "border-slate-200 bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  GEOFENCE_VIOLATION: {
    label: "Keluar Geofence",
    className: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  TAMPER_ALERT: {
    label: "Tamper Alert",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
};

export const getBikeStatusMeta = (status) => {
  const normalized = normalizeStatus(status);

  return (
    BIKE_STATUS_META[normalized] || {
      label: normalized || "Tidak Diketahui",
      className: "border-slate-200 bg-slate-100 text-slate-600",
      dot: "bg-slate-400",
    }
  );
};

/**
 * Menghitung statistik ringkasan armada dari respons GET /api/admin/bikes.
 */
export const computeFleetStats = (bikes = []) => {
  const list = Array.isArray(bikes) ? bikes : [];
  const statusCounts = {};

  list.forEach((bike) => {
    const status = normalizeStatus(bike?.status) || "UNKNOWN";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const countByStatuses = (statuses) =>
    statuses.reduce((total, status) => total + (statusCounts[status] || 0), 0);

  const geofenceCount = list.filter(isGeofenceViolation).length;
  const tamperCount = list.filter(isTamperAlert).length;
  const alertCount = list.filter(
    (bike) => isGeofenceViolation(bike) || isTamperAlert(bike),
  ).length;

  return {
    total: list.length,
    rented: countByStatuses(RENTED_STATUSES),
    ready: countByStatuses(READY_STATUSES),
    maintenance: countByStatuses(MAINTENANCE_STATUSES),
    geofence: geofenceCount,
    damaged: countByStatuses(MAINTENANCE_STATUSES) + tamperCount,
    alert: alertCount,
    statusCounts,
  };
};
