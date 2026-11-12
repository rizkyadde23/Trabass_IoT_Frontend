import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  History,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { formatRelativeTime } from "../../utils/fleetTelemetry";

const ACTION_LABELS = {
  FORCE_LOCK: "Force Lock",
  FORCE_UNLOCK: "Force Unlock",
  ALARM_OFF: "Turn Off Alarm",
  END_RENTAL: "Akhiri Sesi Sewa",
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

const CommandHistory = ({
  logs = [],
  loading = false,
  error = "",
  loadingMore = false,
  hasMore = false,
  onRefresh,
  onLoadMore,
  className = "",
}) => (
  <div
    className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
  >
    <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <History size={16} className="text-brand-600" />
          Riwayat Perintah
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Audit perintah remote, force lock/unlock, alarm, dan pengakhiran sesi
          oleh admin.
        </p>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={() => void onRefresh({ silent: true })}
          className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      )}
    </div>

    {error && (
      <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-[10px] text-amber-800">
        <AlertCircle size={13} className="mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    )}

    {loading ? (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`command-skeleton-${index}`} className="space-y-2">
            <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    ) : logs.length === 0 ? (
      <div className="px-5 py-10 text-center">
        <ShieldAlert size={30} className="mx-auto mb-2 text-slate-300" />
        <p className="text-sm font-semibold text-slate-700">
          Belum ada perintah admin
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Perintah dari popup marker akan muncul di sini.
        </p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3">Waktu</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Sepeda</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Catatan</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => {
              const sent = log.status === "SENT";

              return (
                <tr key={log.command_id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3.5">
                    <span className="block text-[11px] font-semibold text-slate-700">
                      {formatDateTime(log.created_at)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-slate-600">
                    {log.admin_name || "Admin"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="block font-mono text-[11px] font-bold text-slate-800">
                      {log.bike_id}
                    </span>
                    <span className="block max-w-[180px] truncate text-[10px] text-slate-400">
                      {log.bike_name || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[11px] font-semibold text-slate-700">
                    {ACTION_LABELS[log.action] || log.action}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        sent
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {sent ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <AlertCircle size={10} />
                      )}
                      {sent ? "Terkirim" : "Gagal"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[10px] text-slate-500">
                    <span className="block max-w-[220px] truncate">
                      {log.reason || "—"}
                    </span>
                    {log.error_message && (
                      <span className="mt-0.5 block max-w-[220px] truncate text-rose-600">
                        {log.error_message}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}

    {hasMore && (
      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={() => void onLoadMore?.()}
          disabled={loadingMore}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {loadingMore ? "Memuat..." : "Muat lebih banyak"}
        </button>
      </div>
    )}
  </div>
);

export default CommandHistory;
