# 🔐 Catatan Kredensial & Akses POS Kasirku

### 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Laptop lain yang terhubung e jaringan Wi-Fi yang sama:
- **URL Wi-Fi Lokal:** `http://192.168.1.6:3000` (atau IP perangkat server saat ini)
- **URL Komputer Lokal:** `http://localhost:3000`

---

### 1. Akun Pemilik (Owner)
- **Role:** `OWNER`
- **Username:** `owner`
- **Password:** `password`
- **Nama:** Pemilik Toko
- **Hak Akses:**
  - Pengelolaan Master Produk & Satuan Harga
  - Pengaturan Plafon Limit Member & Koreksi Saldo
  - Laporan Keuangan, Omzet, & Laba Bersih
  - Persetujuan (Approval) Stok Opname
  - Manajemen Pengguna (Tambah Kasir & Ganti Password)
  - Pengaturan Toko & PIN Otorisasi

---

### 2. Akun Kasir (Staff)
- **Role:** `STAFF`
- **Username:** `staff`
- **Password:** `123456`
- **Nama:** Staff Toko
- **Hak Akses:**
  - Transaksi Penjualan Kasir (POS)
  - Transaksi Kasbon Member (dalam batas limit)
  - Pencatatan Penerimaan Barang Masuk (Stok)
  - Cek Cepat Harga Produk
  - Input Hasil Stok Opname Fisik

---

### 3. Akun Super Admin (Cadangan Owner)
- **Role:** `OWNER`
- **Username:** `superadmin`
- **Password:** `superadmin123`
- **Nama:** Super Admin

---

### 🔑 PIN Otorisasi Pemilik (Owner PIN)
- **PIN:** `123456`
- **Kegunaan:**
  - Membatalkan transaksi (Void Struk)
  - Mengubah/edit rincian nota bon kasbon lama
  - Otorisasi diskon kasir di luar batas wewenang staf
