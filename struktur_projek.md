Trabass-IoT-Frontend/
├── public/
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.json
├── src/
│   ├── assets/
│   │   └── logo.svg
│   ├── components/
│   │   ├── QRScanner.jsx        # Komponen scanner kamera HTML5-QRCode
│   │   ├── CountdownTimer.jsx   # Live timer hitung mundur waktu sewa
│   │   ├── Header.jsx           # Navigasi & status koneksi
│   │   └── ModalExtend.jsx      # Pop-up opsi perpanjangan waktu sewa
│   ├── context/
│   │   └── RentalContext.jsx    # State management global (sesi sewa aktif & user)
│   ├── pages/
│   │   ├── Home.jsx             # Halaman utama & input manual/scan QR
│   │   ├── Scan.jsx             # Halaman kamera pemindai QR Code
│   │   ├── Checkout.jsx         # Halaman pilih paket durasi & pembayaran
│   │   └── ActiveRental.jsx     # Dashboard penyewa saat sepeda terbuka
│   ├── services/
│   │   ├── api.js               # Service Axios ke Backend Node.js
│   │   └── midtransService.js   # Wrapper pemanggilan Midtrans Snap SDK
│   ├── utils/
│   │   └── formatters.js        # Helper format waktu & rupiah
│   ├── App.jsx                  # Routing (React Router DOM)
│   ├── index.css                # Konfigurasi Tailwind CSS
│   ├── main.jsx                 # Root render React
│   └── sw.js                    # Service Worker offline caching
├── index.html                   # Entry point HTML & script Snap Midtrans
├── vite.config.js               # Konfigurasi Vite & PWA Plugin
├── tailwind.config.js           # Konfigurasi Tailwind CSS
└── package.json