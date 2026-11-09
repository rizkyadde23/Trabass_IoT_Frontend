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
│   │   ├── admin/
│   │   │   ├── AdminLayout.jsx   # Shell dashboard admin (topbar + konten)
│   │   │   ├── AdminSidebar.jsx  # Sidebar navigasi & profil admin
│   │   │   └── StatCard.jsx      # Kartu statistik ringkasan armada
│   │   ├── QRScanner.jsx         # Komponen scanner kamera HTML5-QRCode
│   │   ├── CountdownTimer.jsx    # Live timer hitung mundur waktu sewa
│   │   ├── Header.jsx            # Navigasi & status koneksi
│   │   ├── MobileLayout.jsx      # Shell PWA penyewa (max-w-md)
│   │   ├── ModalExtend.jsx       # Pop-up opsi perpanjangan waktu sewa
│   │   ├── OfflineDetector.jsx   # Banner status koneksi offline
│   │   └── ProtectedRoute.jsx    # Guard login, role admin & penyewa
│   ├── context/
│   │   ├── AuthContext.jsx       # State autentikasi, user & role
│   │   └── RentalContext.jsx     # State management global sesi sewa
│   ├── pages/
│   │   ├── AdminDashboard.jsx    # Statistik armada, tabel & placeholder peta
│   │   ├── Home.jsx              # Halaman utama & input manual/scan QR
│   │   ├── Scan.jsx              # Halaman kamera pemindai QR Code
│   │   ├── Checkout.jsx          # Halaman pilih paket durasi & pembayaran
│   │   ├── ActiveRental.jsx      # Dashboard penyewa saat sepeda terbuka
│   │   ├── Login.jsx             # Halaman login (redirect sesuai role)
│   │   └── Register.jsx          # Halaman registrasi penyewa
│   ├── services/
│   │   ├── api.js                # Service Axios ke Backend Node.js
│   │   └── midtransService.js    # Wrapper pemanggilan Midtrans Snap SDK
│   ├── utils/
│   │   └── fleetStats.js         # Helper statistik & metadata status armada
│   ├── App.jsx                   # Routing PWA penyewa & dashboard admin
│   ├── index.css                 # Konfigurasi Tailwind CSS
│   ├── main.jsx                  # Root render React
│   └── registerServiceWorker.js  # Registrasi Service Worker PWA
├── index.html                    # Entry point HTML & script Snap Midtrans
├── vite.config.js                # Konfigurasi Vite & PWA Plugin
├── tailwind.config.js            # Konfigurasi Tailwind CSS
└── package.json
