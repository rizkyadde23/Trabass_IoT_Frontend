const SNAP_SCRIPT_ID = "midtrans-snap-sdk";
const SNAP_SANDBOX_URL = "https://app.sandbox.midtrans.com/snap/snap.js";
const SNAP_LOAD_TIMEOUT_MS = 10000;

const getClientKey = () => import.meta.env.VITE_MIDTRANS_CLIENT_KEY;

let snapLoadPromise = null;

const waitForSnapReady = () => {
  if (window.snap?.pay) {
    return Promise.resolve(window.snap);
  }

  const clientKey = getClientKey();

  if (!clientKey) {
    return Promise.reject(
      new Error(
        "VITE_MIDTRANS_CLIENT_KEY belum diset. Periksa konfigurasi .env frontend.",
      ),
    );
  }

  if (snapLoadPromise) return snapLoadPromise;

  snapLoadPromise = new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId = null;
    let script = document.getElementById(SNAP_SCRIPT_ID);

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);

      if (script) {
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);
      }
    };

    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      cleanup();

      if (handler === reject) {
        snapLoadPromise = null;

        // Hapus script yang gagal agar percobaan berikutnya memuat ulang.
        if (script?.parentNode) {
          script.parentNode.removeChild(script);
        }
      }

      handler(value);
    };

    const handleLoad = () => {
      if (window.snap?.pay) {
        finish(resolve, window.snap);
      } else {
        finish(
          reject,
          new Error("Midtrans Snap SDK gagal diinisialisasi."),
        );
      }
    };

    const handleError = () => {
      finish(
        reject,
        new Error(
          "Midtrans Snap SDK gagal dimuat. Periksa koneksi internet Anda.",
        ),
      );
    };

    timeoutId = setTimeout(() => {
      finish(
        reject,
        new Error(
          "Midtrans Snap SDK tidak merespons. Periksa koneksi internet lalu coba lagi.",
        ),
      );
    }, SNAP_LOAD_TIMEOUT_MS);

    if (script) {
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      return;
    }

    script = document.createElement("script");
    script.id = SNAP_SCRIPT_ID;
    script.src = SNAP_SANDBOX_URL;
    script.type = "text/javascript";
    script.setAttribute("data-client-key", clientKey);
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  });

  return snapLoadPromise;
};

/**
 * Membuka popup pembayaran Midtrans Snap.
 * Callback tetap dipanggil oleh Snap; fungsi ini hanya memastikan SDK siap.
 */
export const openSnapPayment = async (snapToken, callbacks = {}) => {
  if (!snapToken) {
    throw new Error("Snap token tidak tersedia.");
  }

  const snap = await waitForSnapReady();

  snap.pay(snapToken, {
    onSuccess: callbacks.onSuccess,
    onPending: callbacks.onPending,
    onError: callbacks.onError,
    onClose: callbacks.onClose,
  });

  return snap;
};

export const isSnapReady = () => Boolean(window.snap?.pay);
