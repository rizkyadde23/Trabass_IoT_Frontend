# Perencanaan Implementasi Frontend Software: Tracking Bicycle Alert & Security System

Dokumen ini memuat panduan komprehensif alur pengembangan antarmuka pengguna (*Frontend*) untuk sistem *Tracking Bicycle Alert & Security System*, mencakup aplikasi **Progressive Web App (PWA) Penyewa** dan **Dashboard Admin Interactive Map**.

---

## 📋 Ringkasan Stack & Arsitektur Frontend

* **Framework Engine:** React (Vite)
* **Styling Framework:** Tailwind CSS
* **State Management:** React Context API + LocalStorage Sync
* **Routing Engine:** React Router DOM (v6)
* **QR Scanner Engine:** `html5-qrcode`
* **Payment Integration:** Midtrans Snap SDK JS (`https://app.sandbox.midtrans.com/snap/snap.js`)
* **Real-time Map Engine:** Leaflet.js (`react-leaflet`)
* **Icon Set:** Lucide React
* **PWA Capability:** `vite-plugin-pwa` (Service Worker & Manifest)

---

## 🗺️ Roadmap Alur Implementasi Frontend

```
+-----------------------------------------------------------------------------------+
| FASE 3.1: Progressive Web App (PWA) Penyewa                                       |
| Setup Context & API, QR Scanner, Checkout Snap, Live Timer, Modal Extend, PWA    |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| FASE 3.2: Web Admin Dashboard Interactive Map                                     |
| Leaflet.js Map, Marker Armada Real-time, Remote Control Panel, Alert Push Feed    |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ Detail Langkah Demi Langkah & Output Implementasi

### **FASE 3.1: User Progressive Web App (PWA)**

#### **Langkah 3.1.1: Core Infrastructure, API Layer & State Context**
* **Fokus Utama:** Menyiapkan jembatan komunikasi HTTP ke Backend Node.js dan state global untuk mengelola sesi sewa aktif.
* **Kegiatan:**
  1. Membuat `src/services/api.js` menggunakan Axios instance untuk mengarah ke `http://localhost:3000/api`.
  2. Membuat `src/context/RentalContext.jsx` untuk menyimpan state `rentalSession` (seperti `rental_id`, `bike_id`, `end_time`, `rental_status`) dan tersinkronisasi otomatis dengan `localStorage`.
  3. Konfigurasi `src/App.jsx` dengan `BrowserRouter` untuk memetakan rute navigasi (`/`, `/scan`, `/checkout`, `/active`).
* **Output yang Dihasilkan:**
  * Module `api.js` yang siap melakukan pemicuan endpoint backend.
  * `RentalContext.jsx` yang menjaga sesi sewa tetap aman dari refresh halaman.
  * Struktur routing utama aplikasi.

#### **Langkah 3.1.2: Komponen Pemindai QR Code (`QRScanner.jsx`) & Halaman Scan**
* **Fokus Utama:** Mengakses kamera HP pengguna untuk memindai stiker QR Code `bike_id` secara instant.
* **Kegiatan:**
  1. Membuat komponen `src/components/QRScanner.jsx` memanfaatkan modul `html5-qrcode`.
  2. Menangani izin akses kamera smartphone (*permission management*) serta penyaringan teks `bike_id` dari hasil pemindaian.
  3. Membuat halaman `src/pages/Scan.jsx` dengan fallback input manual `bike_id` jika kamera mengalami kendala.
* **Output yang Dihasilkan:**
  * Komponen scanner kamera responsif yang dapat mengekstraksi kode sepeda (misal: `BK-001`) dan mengarahkan pengguna ke halaman checkout.

#### **Langkah 3.1.3: Form Pilih Paket Durasi & Integrasi Midtrans Snap API**
* **Fokus Utama:** Menampilkan pilihan durasi sewa, kalkulasi harga, dan memunculkan pop-up Midtrans Snap.
* **Kegiatan:**
  1. Membuat halaman `src/pages/Checkout.jsx` dengan pilihan paket waktu (misal 15, 30, 60 menit).
  2. Membuat helper wrapper `src/services/midtransService.js` untuk memicu `window.snap.pay(snapToken)`.
  3. Mengirimkan request `POST /api/rent/create-transaction` saat tombol "Bayar" diklik, lalu menampilkan pop-up Snap.
  4. Menangani callback `onSuccess` dari Midtrans Snap untuk memperbarui state sewa di Context dan berpindah ke halaman `/active`.
* **Output yang Dihasilkan:**
  * Antarmuka checkout transaksi lengkap dengan pop-up pembayaran resmi Midtrans (QRIS, GoPay, Virtual Account).

#### **Langkah 3.1.4: Halaman Active Rental & Live Countdown Timer Engine**
* **Fokus Utama:** Menyajikan informasi status sepeda, sisa waktu hitung mundur, dan penguncian otomatis.
* **Kegiatan:**
  1. Membuat komponen `src/components/CountdownTimer.jsx` yang menghitung sisa detik dari `end_time` secara real-time.
  2. Membuat halaman `src/pages/ActiveRental.jsx` yang menampilkan:
     * Card status penguncian sepeda (*UNLOCKED*).
     * Indicator status koneksi dan peringatan batas waktu (berubah warna menjadi merah saat $\le 5$ menit).
     * Tombol "Selesaikan Sewa" atau "Perpanjang Sewa".
* **Output yang Dihasilkan:**
  * Dashboard penyewa interaktif dengan hitung mundur presisi yang terhubung langsung ke backend.

#### **Langkah 3.1.5: Modal Perpanjangan Sewa (Extend Engine Integration)**
* **Fokus Utama:** Memungkinkan pengguna menambah durasi waktu sewa tanpa harus mengembalikan sepeda terlebih dahulu.
* **Kegiatan:**
  1. Membuat komponen `src/components/ModalExtend.jsx`.
  2. Menghubungkan pemilihan durasi tambahan ke endpoint backend `POST /api/rent/extend-transaction`.
  3. Memicu pop-up Snap Midtrans khusus perpanjangan, dan memperbarui `end_time` di `RentalContext` setelah sukses.
* **Output yang Dihasilkan:**
  * Pop-up modal perpanjangan waktu sewa yang menambah durasi secara seamless pada sesi yang berjalan.

#### **Langkah 3.1.6: PWA Manifest & Service Worker Setup**
* **Fokus Utama:** Mengubah web aplikasi menjadi Progressive Web App yang dapat di-install di HP.
* **Kegiatan:**
  1. Menyiapkan `public/manifest.json` (nama aplikasi, icon 192px/512px, warna tema, display standalone).
  2. Konfigurasi `vite-plugin-pwa` pada `vite.config.js` untuk meregistrasikan `sw.js` (Service Worker caching static assets).
* **Output yang Dihasilkan:**
  * Aplikasi dapat di-install (*Add to Home Screen*) di Android & iOS dengan tampilan penuh tanpa bar browser.

---

### **FASE 3.2: Web Admin Dashboard Interactive Map**

#### **Langkah 3.2.1: Layout Dashboard & Navigation Frame**
* **Fokus Utama:** Menyiapkan struktur tata letak (layout) dashboard monitoring pengelola armada.
* **Kegiatan:**
  1. Membuat halaman dashboard admin `src/pages/AdminDashboard.jsx`.
  2. Menyiapkan sidebar dan statistik ringkasan armada (Total Sepeda, Sepeda Disewa, Sepeda Melanggar Batas/Geofence, Sepeda Rusak/Tamper).
* **Output yang Dihasilkan:**
  * Layout dashboard admin yang rapi dengan indikator statistik utama armada.

#### **Langkah 3.2.2: Peta Interaktif Real-time (Leaflet.js Integration)**
* **Fokus Utama:** Memvisualisasikan lokasi sepeda terkini dan batas area geofencing pada peta.
* **Kegiatan:**
  1. Mengintegrasikan `react-leaflet` dan OpenStreetMap pada dashboard.
  2. Menggambar lingkaran batas geofence (*Geofence Circle Radius 500m*) di sekitar titik koordinat pusat pangkalan.
  3. Memasang marker dinamis untuk setiap sepeda yang posisinya diperbarui secara berkala dari data Redis/MySQL backend (`GET /api/admin/bikes`).
* **Output yang Dihasilkan:**
  * Peta interaktif yang menampilkan posisi seluruh armada sepeda secara live beserta zona aman pangkalan.

#### **Langkah 3.2.3: Remote Control Panel & Incident Push Feed**
* **Fokus Utama:** Memungkinkan admin melakukan kuncian paksa (*Force Remote Lock/Unlock*) dan menerima alert insiden darurat.
* **Kegiatan:**
  1. Menambahkan tombol aksi *Force Lock*, *Force Unlock*, dan *Turn Off Alarm* pada popup marker sepeda di peta.
  2. Menghubungkan tombol kontrol ke endpoint admin backend `POST /api/admin/bike-command`.
  3. Membuat panel *Incident Feed* untuk menampilkan daftar log kejadian keamanan (guncangan MPU6050, geofence violation).
* **Output yang Dihasilkan:**
  * Control center penuh bagi admin untuk memantau dan mengambil kendali keamanan sepeda dari jauh.

---

## 📌 Checklist Status Pengerjaan Frontend

* [x] **Langkah 3.1.1:** Core Infrastructure, Axios `api.js`, `RentalContext.jsx`, & App Router.
* [x] **Langkah 3.1.2:** QR Scanner Component & Page (`html5-qrcode`).
* [x] **Langkah 3.1.3:** Checkout Page & Midtrans Snap SDK Client Integration.
* [x] **Langkah 3.1.4:** Active Rental Page & Live Countdown Timer.
* [x] **Langkah 3.1.5:** Extend Rental Modal & Logic.
* [x] **Langkah 3.1.6:** PWA Manifest & Service Worker Registration.
* [x] **Langkah 3.2.1:** Admin Dashboard Layout & Summary Cards.
* [ ] **Langkah 3.2.2:** Leaflet.js Interactive Live Map & Geofence Polygon.
* [ ] **Langkah 3.2.3:** Admin Remote Control Panel & Incident Feed.