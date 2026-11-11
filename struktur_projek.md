Trabass-IoT-Frontend/
├── public/
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminLayout.jsx       # Shell dashboard admin (topbar + konten)
│   │   │   ├── AdminSidebar.jsx      # Sidebar navigasi, menu pengaturan & profil admin
│   │   │   ├── AnomalyAlertBanner.jsx # Banner peringatan gerakan MPU6050 saat locked
│   │   │   ├── BatteryGauge.jsx     # Widget baterai perception layer (0-100%)
│   │   │   ├── CommandHistory.jsx    # Tabel audit perintah remote admin
│   │   │   ├── FleetMap.jsx          # Peta Leaflet, marker GPS, geofence, popup baterai & kontrol remote
│   │   │   ├── ImuMonitorPanel.jsx   # Panel monitoring sensor IMU MPU6050
│   │   │   ├── IncidentFeed.jsx      # Feed insiden tamper & pelanggaran geofence
│   │   │   └── StatCard.jsx          # Kartu statistik ringkasan armada
│   │   ├── CountdownTimer.jsx    # Live timer hitung mundur waktu sewa
│   │   ├── MobileLayout.jsx      # Shell PWA penyewa (max-w-md)
│   │   ├── ModalExtend.jsx       # Pop-up opsi perpanjangan waktu sewa
│   │   ├── OfflineDetector.jsx   # Banner status koneksi offline
│   │   └── ProtectedRoute.jsx    # Guard login, role admin & penyewa
│   ├── context/
│   │   ├── AuthContext.jsx       # State autentikasi, user & role
│   │   └── RentalContext.jsx     # State management global sesi sewa
│   ├── hooks/
│   │   ├── useAdminBikeDetail.js # Polling detail sepeda + riwayat telemetri (halaman /admin/bikes/:id)
│   │   ├── useAdminBikes.js      # Polling data armada, geofence & status sinkron
│   │   ├── useAdminCommandLogs.js # Polling audit perintah admin
│   │   ├── useAdminIncidents.js  # Polling feed insiden dengan cursor & filter
│   │   └── useBikeCommands.js    # Kirim perintah remote & state pending per sepeda
│   ├── pages/
│   │   ├── ActiveRental.jsx      # Dashboard penyewa saat sepeda terbuka
│   │   ├── AdminBikeDetail.jsx   # Detail monitoring per sepeda: kartu perception layer, kontrol remote & riwayat telemetri
│   │   ├── AdminBikes.jsx        # Kelola armada: tambah, ubah & hapus sepeda
│   │   ├── AdminDashboard.jsx    # Statistik, peta ringkas, tabel armada (baris klikabel) & feed insiden
│   │   ├── AdminIncidents.jsx    # Halaman insiden keamanan & riwayat perintah
│   │   ├── AdminLogin.jsx        # Login admin (username/email + password)
│   │   ├── AdminMap.jsx          # Halaman peta armada penuh + kontrol remote marker
│   │   ├── AdminQrGenerator.jsx  # Generator & unduh QR code per sepeda
│   │   ├── AdminSettings.jsx     # Pengaturan pangkalan, geofence & pricing
│   │   ├── Payment.jsx           # Checkout: pilih paket durasi & pembayaran Midtrans Snap
│   │   └── UserRegister.jsx      # Registrasi penyewa hasil scan QR (nama + nomor WA)
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
