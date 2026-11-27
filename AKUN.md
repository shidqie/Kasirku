# 🔐 Catatan Kredensial & Akses POS Kasirku

### 🌐 Akses Jaringan Lokal (Wi-Fi) & Production
- **URL Production:** `https://tokogagan.biz.id`
Aplikasi dapat dibuka langsung dari HP / Tablet / Laptop lain yang terhubung ke jaringan Wi-Fi yang sama:
- **URL Wi-Fi Lokal:** `http://192.168.1.6:3000` (atau IP perangkat server saat ini)
- **URL Komputer Lokal:** `http://localhost:3000`

---

### 1. Super Admin (Platform)
- **Role:** `SUPER_ADMIN`
- **Halaman Utama:** `/admin` (Platform Console)
- **Username:** `superadmin`
- **Password:** `123456`
- **Nama:** Super Admin
- **Hak Akses:**
  - Mengelola akun toko, paket langganan (`BASIC` / `PRO` / `ENTERPRISE`), dan status layanan (`AKTIF` / `TRIAL` / `SUSPEND`)
  - Melihat pengguna platform dan audit aktivitas platform
  - Tidak memiliki akses operasional kasir atau ubah saldo toko

---

### 2. Pemilik Toko (Owner)
- **Role:** `OWNER`
- **Halaman Utama:** `/owner/dashboard`
- **Username:** `owner`
- **Password:** `123456`
- **Nama:** Pemilik Toko
- **Hak Akses:**
  - Dashboard bisnis (Omzet, Laba, Piutang, Transaksi, Produk Terlaris)
  - Seluruh laporan: Laporan Pendapatan, Laporan Piutang, Produk Terlaris
  - Melihat seluruh Riwayat Penjualan & Void transaksi
  - Mengelola Piutang, Kasbon, Pelanggan, Anggota Pengambil, Limit Kasbon, & Koreksi Saldo Piutang
  - Mengelola Produk & Harga, Satuan & Konversi, Kategori Produk
  - Mengelola Pengaturan Toko, Struk/E-Struk/Bon, Akun & Delegasi Izin (`Kepala Toko` & `Staff`)
  - Melihat Log Kontrol & Checklist Go-Live

---

### 3. Kepala Toko
- **Role:** `KEPALA_TOKO`
- **Halaman Utama:** `/owner/dashboard`
- **Username:** `kepalatoko`
- **Password:** `123456`
- **Nama:** Kepala Toko
- **Hak Akses:**
  - Dashboard operasional, Kasir, & Riwayat Penjualan
  - Pengelolaan Piutang & Pelanggan (sesuai delegasi Pemilik Toko)
  - Stok, Barang Masuk, Stok Opname (pengajuan & persetujuan)
  - Laporan operasional terbatas & Produk Terlaris
  - Izin tambahan dapat didelegasikan oleh Pemilik Toko di `Pengaturan > Pengguna > Delegasi Izin`

---

### 4. Staff 1 — Kasir
- **Role:** `STAFF_KASIR` (juga kompatibel dengan akun lama `staff` ber-role `STAFF`)
- **Halaman Utama:** `/kasir`
- **Username:** `kasir` (atau `staff`)
- **Password:** `123456`
- **Nama:** Staff 1 (Kasir)
- **Hak Akses:**
  - Transaksi penjualan Kasir (Tunai, QRIS, Transfer, & Kasbon dalam batas limit)
  - Melihat Riwayat Penjualan & Cetak Struk
  - Mencari & melihat informasi Pelanggan untuk transaksi
  - Terima pembayaran piutang jika didelegasikan izin oleh Pemilik Toko
  - Tidak boleh koreksi saldo, ubah limit kasbon, ubah harga, atau Void tanpa otorisasi PIN Owner

---

### 5. Staff 2 — Stok / Gudang
- **Role:** `STAFF_GUDANG`
- **Halaman Utama:** `/stok/perlu-belanja`
- **Username:** `gudang`
- **Password:** `123456`
- **Nama:** Staff 2 (Gudang)
- **Hak Akses:**
  - Melihat produk & memantau stok minimum (`Stok`)
  - Mencatat penerimaan `Barang Masuk`
  - Melakukan & mengajukan `Stok Opname` fisik
  - Tidak dapat mengakses Kasir, mengubah harga jual, menghapus produk, atau melihat laporan keuangan

---

### 🔑 PIN Otorisasi Pemilik (PIN Owner)
- **PIN:** `111111`
- **Kegunaan:**
  - Membatalkan transaksi (`Void`) di luar wewenang
  - Mengubah/edit rincian nota bon manual (`Edit Bon (PIN Owner)`)
  - Otorisasi diskon kasir di luar batas wewenang staf
