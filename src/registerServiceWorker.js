export const registerServiceWorker = () => {
  if (!import.meta.env.PROD) return;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log(
            "[SW] ServiceWorker registration successful with scope: ",
            registration.scope,
          );
        })
        .catch((err) => {
          console.error("[SW] ServiceWorker registration failed: ", err);
        });
    });
  }
};
