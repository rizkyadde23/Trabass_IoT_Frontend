import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  AlertCircle,
  BellOff,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldAlert,
  Unlock,
  X,
} from "lucide-react";
import { getBikeStatusMeta } from "../../utils/fleetStats";
import {
  DEFAULT_GEOFENCE,
  formatCoordinate,
  formatDistance,
  formatRelativeTime,
  formatSpeed,
  getBikeCoordinates,
  getBikeDistanceFromStation,
  getImuState,
  isBikeOutsideGeofence,
  isImuAnomaly,
  isTelemetryStale,
} from "../../utils/fleetTelemetry";

const STATUS_COLORS = {
  AVAILABLE: "#22c55e",
  RESERVED: "#0ea5e9",
  RENTED: "#3b82f6",
  OVERDUE: "#f59e0b",
  MAINTENANCE: "#94a3b8",
  GEOFENCE_VIOLATION: "#ef4444",
  TAMPER_ALERT: "#e11d48",
};

const REMOTE_ACTIONS = [
  {
    action: "FORCE_LOCK",
    label: "Force Lock",
    icon: Lock,
    className: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  },
  {
    action: "FORCE_UNLOCK",
    label: "Force Unlock",
    icon: Unlock,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  {
    action: "ALARM_OFF",
    label: "Turn Off Alarm",
    icon: BellOff,
    className: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
  },
];

const getActionLabel = (action) =>
  REMOTE_ACTIONS.find((item) => item.action === action)?.label || action;

const getConfirmMessage = (action, bikeId) => {
  if (action === "FORCE_LOCK") return `Kunci paksa ${bikeId}?`;
  if (action === "FORCE_UNLOCK") {
    return `Buka kunci ${bikeId} secara paksa?`;
  }
  if (action === "ALARM_OFF") return `Matikan alarm ${bikeId}?`;

  return `Kirim perintah ke ${bikeId}?`;
};

const BIKE_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true">
    <circle cx="18.5" cy="17.5" r="3.5"></circle>
    <circle cx="5.5" cy="17.5" r="3.5"></circle>
    <circle cx="15" cy="5" r="1"></circle>
    <path d="M12 17.5V14l-3-3 4-3 2 3h2"></path>
  </svg>
`;

const STATION_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
`;

const getMarkerColor = (bike) => {
  if (isImuAnomaly(bike)) return STATUS_COLORS.TAMPER_ALERT;
  if (bike?.geofence_violated === true) {
    return STATUS_COLORS.GEOFENCE_VIOLATION;
  }

  const status = String(bike?.status || "").toUpperCase();
  return STATUS_COLORS[status] || "#64748b";
};

const buildBikeIcon = (bike, isSelected) => {
  const color = getMarkerColor(bike);
  const anomaly = isImuAnomaly(bike);
  const stale = !bike.has_live_location || isTelemetryStale(bike.last_reported_at);
  const classes = ["fleet-marker__pin"];

  if (anomaly) classes.push("is-anomaly");
  if (isSelected) classes.push("is-selected");
  if (stale) classes.push("is-stale");

  return L.divIcon({
    className: "fleet-marker",
    html: `
      <span class="fleet-marker__pulse ${anomaly ? "is-active" : ""}" style="--marker-color:${color}"></span>
      <span class="${classes.join(" ")}" style="--marker-color:${color}">
        ${BIKE_ICON_SVG}
      </span>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
    tooltipAnchor: [0, -16],
  });
};

const STATION_ICON = L.divIcon({
  className: "fleet-marker",
  html: `<span class="fleet-station-marker">${STATION_ICON_SVG}</span>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -20],
});

const fitMapToFleet = (map, bikes, geofence) => {
  const station = new L.LatLng(geofence.lat, geofence.lng);
  const points = [station];

  bikes.forEach((bike) => {
    const coords = getBikeCoordinates(bike);
    if (coords) points.push(new L.LatLng(coords.lat, coords.lng));
  });

  if (points.length === 1) {
    map.setView(station, 16);
    return;
  }

  map.fitBounds(L.latLngBounds(points), {
    padding: [48, 48],
    maxZoom: 17,
  });
};

const MapAutoFit = ({ bikes, geofence }) => {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (hasFittedRef.current || bikes.length === 0) return;

    fitMapToFleet(map, bikes, geofence);
    hasFittedRef.current = true;
  }, [bikes, geofence, map]);

  return null;
};

const MapFocus = ({ bikes, selectedBikeId, focusNonce }) => {
  const map = useMap();
  const bikesRef = useRef(bikes);

  useEffect(() => {
    bikesRef.current = bikes;
  }, [bikes]);

  useEffect(() => {
    if (!selectedBikeId) return;

    const bike = bikesRef.current.find(
      (item) => item.bike_id === selectedBikeId,
    );
    const coords = getBikeCoordinates(bike);

    if (!coords) return;

    map.flyTo(
      [coords.lat, coords.lng],
      Math.max(map.getZoom(), 17),
      { duration: 0.7 },
    );
  }, [selectedBikeId, focusNonce, map]);

  return null;
};

const MapResizeObserver = () => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => map.invalidateSize();
    const timeoutId = setTimeout(invalidate, 150);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(invalidate);
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver?.disconnect();
    };
  }, [map]);

  return null;
};

const MarkerPopup = ({
  bike,
  geofence,
  commandState,
  onSendCommand,
  onClearFeedback,
}) => {
  const [confirmAction, setConfirmAction] = useState(null);
  const statusMeta = getBikeStatusMeta(bike.status);
  const coordinates = getBikeCoordinates(bike);
  const distanceM = getBikeDistanceFromStation(bike, geofence);
  const geofenceStatus = isBikeOutsideGeofence(bike, geofence);
  const stale = !bike.has_live_location || isTelemetryStale(bike.last_reported_at);
  const anomaly = isImuAnomaly(bike);

  const pendingAction = commandState?.pending || null;
  const feedback = commandState?.feedback || null;
  const isPending = Boolean(pendingAction);

  const handleConfirm = async () => {
    if (!confirmAction || !onSendCommand) return;

    const action = confirmAction;
    setConfirmAction(null);
    await onSendCommand({ bikeId: bike.bike_id, action });
  };

  return (
    <div className="min-w-[224px] space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-slate-900">
            {bike.bike_id}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {bike.name || "Tanpa nama unit"}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusMeta.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
          {statusMeta.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Kunci
          </p>
          <p className="mt-0.5 flex items-center gap-1 font-semibold text-slate-700">
            {bike.lock_state ? <Lock size={11} /> : <Unlock size={11} />}
            {bike.lock_state ? "Locked" : "Unlocked"}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Sensor IMU
          </p>
          <p
            className={`mt-0.5 font-semibold ${
              anomaly ? "text-rose-600" : "text-slate-700"
            }`}
          >
            {bike.mpu_motion ? "Gerak" : "Diam"}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Kecepatan
          </p>
          <p className="mt-0.5 font-semibold text-slate-700">
            {formatSpeed(bike.speed)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Jarak pangkalan
          </p>
          <p
            className={`mt-0.5 font-semibold ${
              geofenceStatus.isOutside ? "text-red-600" : "text-slate-700"
            }`}
          >
            {formatDistance(distanceM)}
          </p>
        </div>
      </div>

      <div className="space-y-1 text-[10px] text-slate-500">
        <p>
          <span className="font-semibold text-slate-600">Koordinat: </span>
          {formatCoordinate(
            coordinates?.lat,
            coordinates?.lng,
          )}
        </p>
        <p>
          <span className="font-semibold text-slate-600">Update: </span>
          {formatRelativeTime(bike.last_reported_at)}
          {stale ? " · data lama" : " · live"}
        </p>
      </div>

      {anomaly && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[10px] leading-relaxed text-rose-700">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
          <span>
            Gerakan terdeteksi saat sepeda terkunci. Backend memicu alarm
            dan notifikasi WA.
          </span>
        </div>
      )}

      {geofenceStatus.isOutside && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-semibold text-red-700">
          Sepeda berada {formatDistance(distanceM)} dari pangkalan (di luar
          radius {formatDistance(geofence.radiusM)}).
        </div>
      )}

      <div
        className="border-t border-slate-100 pt-2.5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Kontrol Admin
          </p>
          {isPending && (
            <span className="text-[9px] font-semibold text-brand-600">
              Mengirim {getActionLabel(pendingAction)}...
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {REMOTE_ACTIONS.map(({ action, label, icon: Icon, className }) => (
            <button
              key={action}
              type="button"
              disabled={isPending}
              onClick={() => setConfirmAction(action)}
              title={label}
              className={`flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-[9px] font-bold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            >
              {pendingAction === action ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Icon size={13} />
              )}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {confirmAction && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-800">
            <p className="font-semibold">
              {getConfirmMessage(confirmAction, bike.bike_id)}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-md bg-amber-600 px-2 py-1 text-[9px] font-bold text-white transition-colors hover:bg-amber-700"
              >
                Kirim
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[9px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <div
            className={`mt-2 flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] ${
              feedback.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {feedback.tone === "success" ? (
              <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
            )}
            <span className="min-w-0 flex-1">{feedback.message}</span>
            {onClearFeedback && (
              <button
                type="button"
                onClick={() => onClearFeedback(bike.bike_id)}
                aria-label="Tutup pesan perintah"
                className="shrink-0 rounded p-0.5 transition-colors hover:bg-white/70"
              >
                <X size={11} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MapLegend = () => {
  const items = [
    { label: "Tersedia", color: "bg-emerald-500" },
    { label: "Disewa", color: "bg-blue-500" },
    { label: "Overdue", color: "bg-amber-500" },
    { label: "Anomali / Geofence", color: "bg-rose-500" },
  ];

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[600] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur">
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
        Legenda
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {items.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600"
          >
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const FleetMap = ({
  bikes = [],
  geofence = DEFAULT_GEOFENCE,
  selectedBikeId = null,
  focusNonce = 0,
  onSelectBike,
  onSendCommand,
  commandStates = {},
  onClearFeedback,
  heightClass = "h-[420px] sm:h-[520px]",
  className = "",
}) => {
  const mapRef = useRef(null);

  const bikesWithCoordinates = useMemo(
    () =>
      bikes.filter((bike) => {
        const coords = getBikeCoordinates(bike);
        return coords !== null;
      }),
    [bikes],
  );

  const markers = useMemo(
    () =>
      bikesWithCoordinates.map((bike) => ({
        bike,
        coords: getBikeCoordinates(bike),
        icon: buildBikeIcon(bike, bike.bike_id === selectedBikeId),
      })),
    [bikesWithCoordinates, selectedBikeId],
  );

  const outOfGeofence = useMemo(
    () =>
      bikesWithCoordinates.filter(
        (bike) => isBikeOutsideGeofence(bike, geofence).isOutside,
      ),
    [bikesWithCoordinates, geofence],
  );

  const missingLocationCount = bikes.length - bikesWithCoordinates.length;

  const handleFit = () => {
    if (!mapRef.current) return;
    fitMapToFleet(mapRef.current, bikesWithCoordinates, geofence);
  };

  return (
    <div className={`relative ${heightClass} ${className}`}>
      <MapContainer
        ref={mapRef}
        center={[geofence.lat, geofence.lng]}
        zoom={16}
        scrollWheelZoom
        worldCopyJump
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <Circle
          center={[geofence.lat, geofence.lng]}
          radius={geofence.radiusM}
          pathOptions={{
            color: "#22c55e",
            weight: 2,
            dashArray: "7 7",
            fillColor: "#22c55e",
            fillOpacity: 0.08,
          }}
        />

        <Marker position={[geofence.lat, geofence.lng]} icon={STATION_ICON}>
          <Popup className="fleet-popup">
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-900">Pangkalan Utama</p>
              <p className="text-[11px] text-slate-500">
                Pusat geofence armada. Radius aman{" "}
                {formatDistance(geofence.radiusM)}.
              </p>
              <p className="font-mono text-[10px] text-slate-500">
                {formatCoordinate(geofence.lat, geofence.lng)}
              </p>
            </div>
          </Popup>
        </Marker>

        {markers.map(({ bike, coords, icon }) => (
          <Marker
            key={bike.bike_id}
            position={[coords.lat, coords.lng]}
            icon={icon}
            zIndexOffset={isImuAnomaly(bike) ? 1000 : 0}
            eventHandlers={{
              click: () => onSelectBike?.(bike.bike_id),
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -12]}
              opacity={1}
              className="fleet-tooltip"
            >
              <span className="font-mono font-bold">{bike.bike_id}</span>
              <span className="mx-1 text-slate-300">•</span>
              <span>{getImuState(bike).label}</span>
            </Tooltip>

            <Popup className="fleet-popup">
              <MarkerPopup
                bike={bike}
                geofence={geofence}
                commandState={commandStates[bike.bike_id]}
                onSendCommand={onSendCommand}
                onClearFeedback={onClearFeedback}
              />
            </Popup>
          </Marker>
        ))}

        {outOfGeofence.map((bike) => {
          const coords = getBikeCoordinates(bike);
          if (!coords) return null;

          return (
            <Polyline
              key={`geofence-line-${bike.bike_id}`}
              positions={[
                [geofence.lat, geofence.lng],
                [coords.lat, coords.lng],
              ]}
              pathOptions={{
                color: "#ef4444",
                weight: 2,
                opacity: 0.65,
                dashArray: "6 8",
              }}
            />
          );
        })}

        <MapAutoFit bikes={bikesWithCoordinates} geofence={geofence} />
        <MapFocus
          bikes={bikesWithCoordinates}
          selectedBikeId={selectedBikeId}
          focusNonce={focusNonce}
        />
        <MapResizeObserver />
      </MapContainer>

      <button
        type="button"
        onClick={handleFit}
        className="absolute right-3 top-3 z-[600] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-lg backdrop-blur transition-colors hover:bg-white"
      >
        Fit ke armada
      </button>

      <MapLegend />

      {missingLocationCount > 0 && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-[600] rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1.5 text-[10px] font-semibold text-amber-700 shadow-sm backdrop-blur">
          {missingLocationCount} unit belum punya koordinat
        </div>
      )}

      {bikes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[550] flex items-center justify-center bg-slate-900/5">
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 text-center shadow-xl backdrop-blur">
            <p className="text-sm font-bold text-slate-800">
              Belum ada data armada
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Peta akan terisi otomatis setelah telemetri masuk.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetMap;
