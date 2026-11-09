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
│   │   │   ├── AdminLayout.jsx          # Shell dashboard admin (topbar + konten)
│   │   │   ├── AdminSidebar.jsx         # Sidebar navigasi, menu pengaturan & profil admin
│   │   │   ├── AnomalyAlertBanner.jsx   # Banner peringatan gerakan MPU6050 saat locked
│   │   │   ├── FleetMap.jsx             # Peta Leaflet, marker GPS & geofence
│   │   │   ├── ImuMonitorPanel.jsx      # Panel monitoring sensor IMU MPU6050
│   │   │   └── StatCard.jsx             # Kartu statistik ringkasan armada
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
│   ├── hooks/
│   │   └── useAdminBikes.js      # Polling data armada, geofence & status sinkron
│   ├── pages/
│   │   ├── AdminDashboard.jsx    # Statistik, peta ringkas, tabel & panel IMU
│   │   ├── AdminMap.jsx          # Halaman peta armada penuh (tanpa panel IMU)
│   │   ├── AdminSettings.jsx     # Pengaturan pangkalan, geofence & pricing
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
│   │   ├── fleetStats.js         # Helper statistik & metadata status armada
│   │   └── fleetTelemetry.js     # Helper geofence, IMU, format sensor & waktu
│   ├── App.jsx                   # Routing PWA penyewa & dashboard admin
│   ├── index.css                 # Tailwind CSS + styling marker Leaflet
│   ├── main.jsx                  # Root render React & import CSS Leaflet
│   └── registerServiceWorker.js  # Registrasi Service Worker PWA
├── index.html                    # Entry point HTML & script Snap Midtrans
├── vite.config.js                # Konfigurasi Vite & PWA Plugin
├── tailwind.config.js            # Konfigurasi Tailwind CSS
└── package.json
