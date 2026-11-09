const toFiniteNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readEnvNumber = (value, fallback) =>
  toFiniteNumber(value, fallback) ?? fallback;

export const DEFAULT_GEOFENCE = Object.freeze({
  lat: readEnvNumber(import.meta.env.VITE_GEOFENCE_LAT, -7.773512),
  lng: readEnvNumber(import.meta.env.VITE_GEOFENCE_LNG, 110.385411),
  radiusM: readEnvNumber(import.meta.env.VITE_GEOFENCE_RADIUS_M, 500),
});

export const TELEMETRY_STALE_MS = 30 * 1000;

/**
 * Backend mengirim geofence dengan nama radius_m. Helper ini juga menerima
 * radiusM/radius agar komponen tetap aman jika bentuk respons berubah.
 */
export const normalizeGeofence = (source) => {
  if (!source) return DEFAULT_GEOFENCE;

  return {
    lat: toFiniteNumber(source.lat ?? source.latitude, DEFAULT_GEOFENCE.lat),
    lng: toFiniteNumber(
      source.lng ?? source.longitude ?? source.lon,
      DEFAULT_GEOFENCE.lng,
    ),
    radiusM: toFiniteNumber(
      source.radius_m ?? source.radiusM ?? source.radius,
      DEFAULT_GEOFENCE.radiusM,
    ),
  };
};

export const getBikeCoordinates = (bike) => {
  const lat = toFiniteNumber(
    bike?.last_latitude ?? bike?.latitude ?? bike?.lat,
  );
  const lng = toFiniteNumber(
    bike?.last_longitude ?? bike?.longitude ?? bike?.lng,
  );

  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

/**
 * Jarak Haversine dalam meter.
 */
export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const values = [lat1, lng1, lat2, lng2].map((value) => Number(value));

  if (values.some((value) => !Number.isFinite(value))) return null;

  const [fromLat, fromLng, toLat, toLng] = values;
  const earthRadius = 6371000;
  const rad = Math.PI / 180;
  const dLat = (toLat - fromLat) * rad;
  const dLng = (toLng - fromLng) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat * rad) *
      Math.cos(toLat * rad) *
      Math.sin(dLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getBikeDistanceFromStation = (
  bike,
  geofence = DEFAULT_GEOFENCE,
) => {
  const coords = getBikeCoordinates(bike);
  if (!coords) return null;

  const station = normalizeGeofence(geofence);
  return haversineDistance(
    coords.lat,
    coords.lng,
    station.lat,
    station.lng,
  );
};

export const isBikeOutsideGeofence = (bike, geofence = DEFAULT_GEOFENCE) => {
  const distanceM = getBikeDistanceFromStation(bike, geofence);
  const station = normalizeGeofence(geofence);

  if (distanceM === null) {
    return { isOutside: false, distanceM: null };
  }

  return {
    isOutside: distanceM > station.radiusM,
    distanceM,
  };
};

export const isBikeLocked = (bike) => bike?.lock_state === true;

export const isImuAnomaly = (bike) =>
  isBikeLocked(bike) && bike?.mpu_motion === true;

export const isImuSensing = (bike) =>
  !isBikeLocked(bike) && bike?.mpu_motion === true;

export const isTelemetryStale = (
  value,
  staleMs = TELEMETRY_STALE_MS,
) => {
  if (!value) return true;

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return true;

  return Date.now() - timestamp > staleMs;
};

/**
 * Status IMU untuk UI. "Sensing" saat unlocked sengaja dibedakan dari
 * anomali agar operator tidak salah membaca gerakan biasa sebagai tamper.
 */
export const getImuState = (bike) => {
  if (!bike?.has_live_location) {
    return {
      key: "no-data",
      label: "Belum ada telemetri",
      tone: "neutral",
      description: "Data sensor live belum diterima dari Redis.",
    };
  }

  if (isImuAnomaly(bike)) {
    return {
      key: "anomaly",
      label: "Anomali gerakan",
      tone: "danger",
      description:
        "MPU6050 mendeteksi gerakan saat sepeda terkunci. Alarm dan notifikasi WA diproses backend.",
    };
  }

  if (isImuSensing(bike)) {
    return {
      key: "sensing",
      label: "Sensing aktif",
      tone: "info",
      description:
        "Sepeda unlocked. Sensor tetap membaca gerakan, tetapi bukan indikasi tamper.",
    };
  }

  if (!isBikeLocked(bike)) {
    return {
      key: "unlocked",
      label: "Terbuka / siaga",
      tone: "info",
      description: "Sepeda unlocked dan tidak ada gerakan yang terdeteksi.",
    };
  }

  return {
    key: "locked-safe",
    label: "Terkunci aman",
    tone: "success",
    description: "Sepeda terkunci dan sensor tidak mendeteksi gerakan.",
  };
};

export const summarizeImu = (bikes = []) => {
  const list = Array.isArray(bikes) ? bikes : [];
  const summary = {
    total: list.length,
    anomaly: 0,
    sensing: 0,
    lockedSafe: 0,
    noData: 0,
  };

  list.forEach((bike) => {
    const state = getImuState(bike);

    if (state.key === "anomaly") summary.anomaly += 1;
    else if (state.key === "sensing") summary.sensing += 1;
    else if (state.key === "locked-safe") summary.lockedSafe += 1;
    else if (state.key === "no-data") summary.noData += 1;
  });

  return {
    ...summary,
    monitored: summary.total - summary.noData,
  };
};

export const formatCoordinate = (lat, lng) => {
  const latitude = toFiniteNumber(lat);
  const longitude = toFiniteNumber(lng);

  if (latitude === null || longitude === null) return "—";

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

export const formatSpeed = (value) => {
  const speed = toFiniteNumber(value);
  if (speed === null) return "—";

  return `${speed.toFixed(1)} km/jam`;
};

export const formatDistance = (value) => {
  const distance = toFiniteNumber(value);
  if (distance === null) return "—";

  if (distance < 1000) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(1)} km`;
};

export const formatTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const formatRelativeTime = (value) => {
  if (!value) return "—";

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "—";

  const diffMs = Date.now() - timestamp;

  if (diffMs < 0) return "baru saja";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 10) return "baru saja";
  if (seconds < 60) return `${seconds} dtk lalu`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mnt lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
};
