import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  History,
  ShieldAlert,
} from "lucide-react";
import useAdminIncidents from "../hooks/useAdminIncidents";
import useAdminCommandLogs from "../hooks/useAdminCommandLogs";
import IncidentFeed from "../components/admin/IncidentFeed";
import CommandHistory from "../components/admin/CommandHistory";

const TABS = [
  { id: "incidents", label: "Insiden Keamanan", icon: ShieldAlert },
  { id: "commands", label: "Riwayat Perintah", icon: History },
];

const INCIDENT_STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "RESOLVED", label: "Selesai" },
];

const INCIDENT_TYPE_OPTIONS = [
  { value: "ALL", label: "Semua jenis" },
  { value: "TAMPER", label: "Guncangan MPU6050" },
  { value: "GEOFENCE", label: "Pelanggaran Geofence" },
];

const COMMAND_STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "SENT", label: "Terkirim" },
  { value: "FAILED", label: "Gagal" },
];

const COMMAND_ACTION_OPTIONS = [
  { value: "ALL", label: "Semua aksi" },
  { value: "FORCE_LOCK", label: "Force Lock" },
  { value: "FORCE_UNLOCK", label: "Force Unlock" },
  { value: "ALARM_OFF", label: "Turn Off Alarm" },
];

const FilterSelect = ({ value, onChange, options, label }) => (
  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
    {label}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-brand-400"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const FilterInput = ({ value, onChange, label, placeholder }) => (
  <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
    {label}
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-brand-400"
    />
  </label>
);

const AdminIncidents = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("incidents");

  const [incidentStatus, setIncidentStatus] = useState("ALL");
  const [incidentType, setIncidentType] = useState("ALL");
  const [incidentBikeInput, setIncidentBikeInput] = useState("");
  const [incidentBikeId, setIncidentBikeId] = useState("");

  const [commandStatus, setCommandStatus] = useState("ALL");
  const [commandAction, setCommandAction] = useState("ALL");
  const [commandBikeInput, setCommandBikeInput] = useState("");
  const [commandBikeId, setCommandBikeId] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIncidentBikeId(incidentBikeInput.trim());
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [incidentBikeInput]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCommandBikeId(commandBikeInput.trim());
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [commandBikeInput]);

  const {
    incidents,
    activeCount,
    newCount,
    loading: incidentsLoading,
    error: incidentsError,
    refresh: refreshIncidents,
    loadMore: loadMoreIncidents,
    hasMore: hasMoreIncidents,
    loadingMore: loadingMoreIncidents,
    markSeen,
  } = useAdminIncidents({
    status: incidentStatus,
    type: incidentType,
    bikeId: incidentBikeId,
    limit: 20,
    enabled: activeTab === "incidents",
  });

  const {
    logs,
    loading: commandsLoading,
    error: commandsError,
    refresh: refreshCommands,
    loadMore: loadMoreCommands,
    hasMore: hasMoreCommands,
    loadingMore: loadingMoreCommands,
  } = useAdminCommandLogs({
    enabled: activeTab === "commands",
    status: commandStatus,
    action: commandAction,
    bikeId: commandBikeId,
    limit: 20,
  });

  const handleSelectBike = (bikeId) => {
    if (!bikeId) return;

    navigate("/admin/map", {
      state: { bikeId },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:text-brand-700"
          >
            <ArrowLeft size={13} />
            Kembali ke dashboard
          </Link>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            <ShieldAlert size={26} className="text-brand-600" />
            Insiden Keamanan
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Feed guncangan MPU6050, pelanggaran geofence, dan audit perintah
            admin dalam satu halaman.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">
            {activeCount} insiden aktif
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
              activeTab === id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "incidents" ? (
        <>
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
            <FilterSelect
              label="Status"
              value={incidentStatus}
              onChange={setIncidentStatus}
              options={INCIDENT_STATUS_OPTIONS}
            />
            <FilterSelect
              label="Jenis"
              value={incidentType}
              onChange={setIncidentType}
              options={INCIDENT_TYPE_OPTIONS}
            />
            <FilterInput
              label="ID Sepeda"
              value={incidentBikeInput}
              onChange={setIncidentBikeInput}
              placeholder="Contoh: BK-001"
            />
          </div>

          <IncidentFeed
            incidents={incidents}
            activeCount={activeCount}
            newCount={newCount}
            loading={incidentsLoading}
            error={incidentsError}
            onRefresh={refreshIncidents}
            onSelectBike={handleSelectBike}
            onMarkSeen={markSeen}
            onLoadMore={loadMoreIncidents}
            hasMore={hasMoreIncidents}
            loadingMore={loadingMoreIncidents}
          />
        </>
      ) : (
        <>
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
            <FilterSelect
              label="Status"
              value={commandStatus}
              onChange={setCommandStatus}
              options={COMMAND_STATUS_OPTIONS}
            />
            <FilterSelect
              label="Aksi"
              value={commandAction}
              onChange={setCommandAction}
              options={COMMAND_ACTION_OPTIONS}
            />
            <FilterInput
              label="ID Sepeda"
              value={commandBikeInput}
              onChange={setCommandBikeInput}
              placeholder="Contoh: BK-001"
            />
          </div>

          <CommandHistory
            logs={logs}
            loading={commandsLoading}
            error={commandsError}
            loadingMore={loadingMoreCommands}
            hasMore={hasMoreCommands}
            onRefresh={refreshCommands}
            onLoadMore={loadMoreCommands}
          />
        </>
      )}
    </div>
  );
};

export default AdminIncidents;
