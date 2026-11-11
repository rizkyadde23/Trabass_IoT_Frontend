import React, { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bike,
  Copy,
  Download,
  Info,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import useAdminBikes from "../hooks/useAdminBikes";
import { getBikeStatusMeta } from "../utils/fleetStats";

/**
 * Basis URL publik untuk isi QR code. VITE_PUBLIC_URL dipakai di production
 * (domain PWA); saat development cukup origin lokal Vite.
 */
const resolvePublicBaseUrl = () =>
  String(
    import.meta.env.VITE_PUBLIC_URL || window.location.origin || "",
  ).replace(/\/+$/, "");

const EXPORT_SCALE = 4;
const FALLBACK_QR_SIZE = 220;

/**
 * Halaman generator QR Code per sepeda (/admin/qr-generator).
 * QR mengarah ke alur registrasi penyewa: /register?bike_id={id}.
 * Unduh PNG dilakukan dengan merender SVG ke canvas (skala 4x).
 */
const AdminQrGenerator = () => {
  const {
    bikes,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
  } = useAdminBikes();

  const qrRefs = useRef({});

  const baseUrl = resolvePublicBaseUrl();

  const qrTargets = useMemo(
    () =>
      bikes.map((bike) => ({
        ...bike,
        qrValue: `${baseUrl}/register?bike_id=${encodeURIComponent(
          bike.bike_id,
        )}`,
      })),
    [bikes, baseUrl],
  );

  const handleDownloadPng = (bikeId) => {
    const svgNode = qrRefs.current[bikeId];

    if (!svgNode) return;

    const serialized = new XMLSerializer().serializeToString(svgNode);
    const svgBlob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(svgBlob);

    const image = new Image();

    image.onload = () => {
      const baseSize =
        Number(svgNode.getAttribute("width")) ||
        svgNode.clientWidth ||
        FALLBACK_QR_SIZE;
      const exportSize = Math.round(baseSize * EXPORT_SCALE);

      const canvas = document.createElement("canvas");
      canvas.width = exportSize;
      canvas.height = exportSize;

      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, exportSize, exportSize);
      context.drawImage(image, 0, 0, exportSize, exportSize);

      URL.revokeObjectURL(objectUrl);

      const link = document.createElement("a");
      link.download = `qr-sepeda-${bikeId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  };

  const handleCopyLink = async (bikeId) => {
    const target = `${baseUrl}/register?bike_id=${encodeURIComponent(bikeId)}`;

    try {
      await navigator.clipboard.writeText(target);
    } catch {
      // Clipboard API bisa diblokir pada konteks non-secure; abaikan.
    }
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
            <QrCode size={26} className="text-brand-600" />
            Generator QR Sepeda
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Cetak QR code untuk setiap sepeda. Saat discan penyewa, ponsel
            langsung membuka halaman registrasi dengan ID sepeda terisi
            otomatis.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
            <span
              className={`h-2 w-2 rounded-full ${
                error ? "bg-red-500" : "bg-emerald-500"
              }`}
            />
            <span>{error ? "Gagal sinkron" : "Data tersinkron"}</span>
            <span className="text-slate-300">•</span>
            <span>
              {lastUpdated
                ? `${bikes.length} unit dimuat`
                : "Memuat data..."}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void refresh({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            <span>{refreshing ? "Memperbarui..." : "Perbarui Data"}</span>
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-800">
        <Info size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold">Target URL QR</p>
          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed">
            {baseUrl}/register?bike_id=XXXX
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed">
            Atur variabel <code className="font-bold">VITE_PUBLIC_URL</code>{" "}
            pada file <code className="font-bold">.env</code> agar QR
            mengarah ke domain produksi PWA.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <ArrowLeft size={18} className="mt-0.5 shrink-0 rotate-90" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">Data armada gagal diperbarui</p>
            <p className="mt-1 text-xs leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {loading && qrTargets.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`qr-skeleton-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mx-auto h-44 w-44 animate-pulse rounded-2xl bg-slate-100" />
              <div className="mt-4 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : qrTargets.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
          <Bike size={34} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">
            Belum ada sepeda terdaftar
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tambahkan data sepeda di database agar QR code bisa dibuat.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {qrTargets.map((bike) => {
            const statusMeta = getBikeStatusMeta(bike.status);

            return (
              <div
                key={bike.bike_id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-slate-800">
                      {bike.bike_id}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {bike.name || "Unit tanpa nama"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`}
                    />
                    {statusMeta.label}
                  </span>
                </div>

                <div className="mx-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <QRCodeSVG
                    ref={(node) => {
                      qrRefs.current[bike.bike_id] = node;
                    }}
                    value={bike.qrValue}
                    size={FALLBACK_QR_SIZE}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                    marginSize={2}
                    title={`QR sewa sepeda ${bike.bike_id}`}
                    className="h-auto w-full max-w-[220px]"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadPng(bike.bike_id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
                  >
                    <Download size={13} />
                    Unduh PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyLink(bike.bike_id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Copy size={13} />
                    Salin Link
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-400">
        Sumber: GET /api/admin/bikes • QR PNG diekspor pada skala{" "}
        {EXPORT_SCALE}x agar tajam saat dicetak.
      </p>
    </div>
  );
};

export default AdminQrGenerator;
