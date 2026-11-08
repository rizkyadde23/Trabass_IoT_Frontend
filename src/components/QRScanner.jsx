import React, { useEffect, useId, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const QRScanner = ({ onScanSuccess, onScanError }) => {
  const id = useId().replace(/:/g, "");
  const elementId = `qr-reader-${id}`;

  const callbacksRef = useRef({
    onScanSuccess,
    onScanError,
  });

  useEffect(() => {
    callbacksRef.current = {
      onScanSuccess,
      onScanError,
    };
  }, [onScanSuccess, onScanError]);

  useEffect(() => {
    let cancelled = false;
    let started = false;
    let handled = false;

    const scanner = new Html5Qrcode(elementId);

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "user" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            if (cancelled || handled) return;

            handled = true;

            try {
              if (started) {
                await scanner.stop();
                started = false;
              }

              scanner.clear();

              if (!cancelled) {
                callbacksRef.current.onScanSuccess?.(decodedText);
              }
            } catch (error) {
              console.error("Gagal menghentikan kamera:", error);
            }
          },
          (errorMessage) => {
            if (!cancelled) {
              callbacksRef.current.onScanError?.(errorMessage);
            }
          },
        );

        started = true;

        // Jika komponen sudah dibersihkan ketika start berlangsung.
        if (cancelled) {
          await scanner.stop();
          started = false;
          scanner.clear();
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Gagal memulai kamera:", error);
          callbacksRef.current.onScanError?.(error);
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;

      // Cleanup dijalankan setelah proses start selesai.
      const cleanup = async () => {
        try {
          if (started) {
            await scanner.stop();
            started = false;
          }

          scanner.clear();
        } catch (error) {
          console.error("Gagal membersihkan kamera:", error);
        }
      };

      // startScanner menangani proses stop jika start selesai
      // setelah cleanup dipanggil.
      if (started) {
        cleanup();
      }
    };
  }, [elementId]);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div
        id={elementId}
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-lg border border-slate-700 bg-slate-800 text-white"
      />
    </div>
  );
};

export default QRScanner;