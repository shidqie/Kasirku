# Kasirku POS Toko Sembako (MVP)

Aplikasi Point of Sale (POS) modern berbasis web yang dirancang khusus untuk toko kelontong & sembako. Dibangun dari nol mengikuti **Dokumen Spesifikasi MVP POS Toko Sembako**, dengan fokus pada keandalan operasional, integritas saldo berbasis buku besar (*append-only ledger*), multi-satuan/harga, pencegahan transaksi ganda (*idempotency*), manajemen utang kasbon member, serta keamanan otorisasi berbasis peran (Owner & Staff).

---

## 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Perangkat Kasir lain yang terhubung ke jaringan Wi-Fi yang sama:
- **URL Jaringan Wi-Fi:** `http://192.168.1.3:3000`
- **URL Komputer Ini:** `http://localhost:3000`

---

## 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Perangkat Kasir lain yang berada di Wi-Fi yang sama:
- **URL Jaringan Wi-Fi:** `http://192.168.1.3:3000`
- **URL Komputer Ini:** `http://localhost:3000`

---

## 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Perangkat Kasir lain yang terhubung ke jaringan Wi-Fi yang sama:
- **URL Jaringan Wi-Fi:** `http://192.168.1.3:3000`
- **URL Komputer Ini:** `http://localhost:3000`

---

## 🔐 Kredensial & Akun Login (Default Database)

Berikut akun login yang aktif di database untuk masuk ke aplikasi Kasirku POS:

| Peran (Role) | Nama Pengguna | Username | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **OWNER** | Pemilik Toko | `owner` | `password` | **Akses Penuh:** Manajemen produk & harga, ubah limit member, laporan laba/omzet, stok opname approval, tambah kasir, pengaturan toko. |
| **STAFF** | Staff Toko | `staff` | `123456` | **Akses Kasir:** Transaksi kasir (POS), scan barcode, tambah kasbon member, penerimaan barang masuk, stok opname fisik. |
| **OWNER** | Super Admin | `superadmin` | `superadmin123` | **Akun Alternatif:** Hak akses setara Owner. |

### 🔑 PIN Otorisasi Pemilik Toko (Owner PIN)
- **PIN Owner:** `123456`
- **Fungsi PIN:** Digunakan saat otorisasi pembatalan transaksi (void), perubahan/edit rincian nota bon piutang lama, dan otorisasi diskon kasir.

---

## 🌟 Fitur Utama & Prinsip Arsitektur

1. **Otorisasi Ketat di Server (RBAC & Sesi HttpOnly):**
   - Peran (*Owner* vs *Staff*) ditentukan dari sesi server terenkripsi via JWT `jose`, bukan `localStorage`.
   - Seluruh rute dashboard dan endpoint API memvalidasi peran dan hak akses di server.
   - Tanpa registrasi publik dan tanpa kredensial bawaan (*no hardcoded secrets*).
2. **Keamanan Aksi Sensitif (PIN Owner):**
   - Aksi sensitif kasir (diskon staff melebihi batas Rp 0, pembatalan/void transaksi, penyesuaian stok manual) dilindungi **PIN Owner 6-digit** yang di-hash dengan bcrypt.
   - Dilengkapi *rate-limiting*: salah 3 kali mengunci verifikasi PIN selama 15 menit.
3. **Ledger Append-Only (Stok & Utang Kasbon):**
   - Saldo stok (`stok_mutasi`) dan utang kasbon (`kasbon_mutasi`) dicatat dalam tabel mutasi yang tidak pernah ditimpa langsung.
   - Kolom `stok_cache` dan `saldo_utang_cache` selalu diperbarui secara atomik dalam transaksi database ACID yang sama.
   - Fungsi rekonsiliasi otomatis menjamin konsistensi saldo fisik terhadap `SUM(mutasi)`.
4. **Checkout Kasir Atomik & Idempotensi:**
   - Transaksi kasir mencakup pembuatan transaksi, snapshot harga/satuan/HPP, mutasi stok, mutasi kasbon, dan pencatatan pembayaran dalam satu transaksi ACID Prisma.
   - *Idempotency Key* mencegah transaksi ganda jika kasir menekan tombol berulang kali.
   - Penomoran struk berurutan harian (`TR-YYYYMMDD-XXXX`) aman dari benturan saat beberapa kasir aktif bersamaan (*concurrent safe*).
5. **Void Non-Destruktif:**
   - Pembatalan transaksi tidak menghapus data transaksi, melainkan mengubah status menjadi `BATAL`, mencatat pelaku & alasan, serta mengembalikan stok dan utang melalui mutasi lawan (`BATAL_JUAL` dan `PEMBALIKAN`).
6. **Multi-Satuan & Harga Konversi:**
   - Satu produk mendukung banyak satuan (misal: Beras dapat dijual eceran per **kg** atau per **karung 25 kg**), otomatis mengonversi ke satuan dasar saat transaksi dan barang masuk.
7. **Pencatatan Member & Kasbon Pelanggan:**
   - Kasbon di kasir memeriksa sisa limit (`saldo_utang + belanja <= batas_kasbon`).
   - Riwayat mutasi utang transparan, pencatatan pembayaran (lunas/sebagian) dengan bukti kirim ke WhatsApp.
8. **Stok Opname Dua Tahap (Dengan Persetujuan Owner):**
   - Staff menginput stok fisik, sistem menghitung selisih dan nilai Rupiahnya. Stok sistem tidak berubah sampai Owner menyetujui.
9. **Laporan Keuangan & Dashboard Bisnis:**
   - Laporan omzet, breakdown per metode bayar, dan performa kasir.
   - Perhitungan **Laba Kotor** akurat berdasarkan snapshot HPP (`hargaBeliSnapshot`) saat transaksi terjadi, tidak terpengaruh perubahan harga beli di masa depan.
   - Laporan umur piutang kasbon (>30 hari) dan rekap transaksi dibatalkan (void).
10. **Checklist Kesiapan Go-Live:**
    - Halaman Checklist Kesiapan Go-Live Owner untuk memverifikasi 8 parameter operasional toko sebelum buka.
    - Skrip backup database harian terotomasi.

---

## 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Perangkat Kasir lain yang terhubung ke jaringan Wi-Fi yang sama:
- **URL Jaringan Wi-Fi:** `http://192.168.1.3:3000`
- **URL Komputer Ini:** `http://localhost:3000`

---

## 🔐 Kredensial & Akun Login (Default Database)

Berikut akun login yang aktif di database untuk masuk ke aplikasi Kasirku POS:

| Peran (Role) | Nama Pengguna | Username | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **OWNER** | Pemilik Toko | `owner` | `password` | **Akses Penuh:** Manajemen produk & harga, ubah limit member, laporan laba/omzet, stok opname approval, tambah kasir, pengaturan toko. |
| **STAFF** | Staff Toko | `staff` | `123456` | **Akses Kasir:** Transaksi kasir (POS), scan barcode, tambah kasbon member, penerimaan barang masuk, stok opname fisik. |
| **OWNER** | Super Admin | `superadmin` | `superadmin123` | **Akun Alternatif:** Hak akses setara Owner. |

### 🔑 PIN Otorisasi Pemilik Toko (Owner PIN)
- **PIN Owner:** `123456`
- **Fungsi PIN:** Digunakan saat otorisasi pembatalan transaksi (void), perubahan/edit rincian nota bon piutang lama, dan otorisasi diskon kasir.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14 (App Router)](https://nextjs.org/) + TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Tema *Elegant*, Mobile & Tablet Friendly, tombol sentuh $\ge 48\text{px}$)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma ORM](https://www.prisma.io/)
- **Autentikasi & Keamanan:** `jose` (JWT HttpOnly Cookie), `bcryptjs`
- **Validasi Data:** [Zod](https://zod.dev/) (Server-side validation)
- **Pengujian:** [Vitest](https://vitest.dev/) (Unit & Integration Testing)

---

## 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Perangkat Kasir lain yang terhubung ke jaringan Wi-Fi yang sama:
- **URL Jaringan Wi-Fi:** `http://192.168.1.3:3000`
- **URL Komputer Ini:** `http://localhost:3000`

---

## 🔐 Kredensial & Akun Login (Default Database)

Berikut akun login yang aktif di database untuk masuk ke aplikasi Kasirku POS:

| Peran (Role) | Nama Pengguna | Username | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **OWNER** | Pemilik Toko | `owner` | `password` | **Akses Penuh:** Manajemen produk & harga, ubah limit member, laporan laba/omzet, stok opname approval, tambah kasir, pengaturan toko. |
| **STAFF** | Staff Toko | `staff` | `123456` | **Akses Kasir:** Transaksi kasir (POS), scan barcode, tambah kasbon member, penerimaan barang masuk, stok opname fisik. |
| **OWNER** | Super Admin | `superadmin` | `superadmin123` | **Akun Alternatif:** Hak akses setara Owner. |

### 🔑 PIN Otorisasi Pemilik Toko (Owner PIN)
- **PIN Owner:** `123456`
- **Fungsi PIN:** Digunakan saat otorisasi pembatalan transaksi (void), perubahan/edit rincian nota bon piutang lama, dan otorisasi diskon kasir.

---

## 📋 Prasyarat Sistem

- **Node.js:** Versi 18.17+ atau 20+
- **npm** atau **yarn** / **pnpm**
- **PostgreSQL:** Versi 14, 15, atau 16 aktif lokal atau cloud (misal: Supabase/Neon)
- **PostgreSQL Client (pg_dump):** Untuk backup database lokal

---

## 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Perangkat Kasir lain yang terhubung ke jaringan Wi-Fi yang sama:
- **URL Jaringan Wi-Fi:** `http://192.168.1.3:3000`
- **URL Komputer Ini:** `http://localhost:3000`

---

## 🔐 Kredensial & Akun Login (Default Database)

Berikut akun login yang aktif di database untuk masuk ke aplikasi Kasirku POS:

| Peran (Role) | Nama Pengguna | Username | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **OWNER** | Pemilik Toko | `owner` | `password` | **Akses Penuh:** Manajemen produk & harga, ubah limit member, laporan laba/omzet, stok opname approval, tambah kasir, pengaturan toko. |
| **STAFF** | Staff Toko | `staff` | `123456` | **Akses Kasir:** Transaksi kasir (POS), scan barcode, tambah kasbon member, penerimaan barang masuk, stok opname fisik. |
| **OWNER** | Super Admin | `superadmin` | `superadmin123` | **Akun Alternatif:** Hak akses setara Owner. |

### 🔑 PIN Otorisasi Pemilik Toko (Owner PIN)
- **PIN Owner:** `123456`
- **Fungsi PIN:** Digunakan saat otorisasi pembatalan transaksi (void), perubahan/edit rincian nota bon piutang lama, dan otorisasi diskon kasir.

---

## 🚀 Petunjuk Menjalankan di Komputer Lokal

### 1. Kloning Repositori & Pasang Dependensi
```bash
git clone <url-repository>
cd Kasirku-Project
npm install
```

### 2. Konfigurasi Environment (`.env`)
Salin file `.env.example` ke `.env` jika belum ada:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi di file `.env`:
```env
# Koneksi Database PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/kasirku_pos?schema=public"

# Rahasia Enkripsi Sesi (Wajib diisi string acak minimal 32 karakter)
SESSION_SECRET="ganti-dengan-kunci-rahasia-keamanan-kasirku-minimal-32-karakter-2026"

# Kredensial Akun Pemilik Awal (Untuk inisialisasi)
ADMIN_USERNAME="owner"
ADMIN_PASSWORD="PasswordKuatOwner2026!"
ADMIN_PIN="123456"
ADMIN_NAMA="Bapak Pemilik Toko"
STORE_NAME="Toko Sembako Berkah"
```

### 3. Migrasi Database Prisma
Jalankan migrasi skema database ke PostgreSQL:
```bash
npx prisma migrate dev
```

### 4. Buat Akun Owner Awal
Jalankan skrip wizard untuk membuat Akun Pemilik dan Pengaturan Toko awal:
```bash
npm run create-owner
```
*Atau jalankan seed data jika ingin mengisi data toko awal:*
```bash
npm run db:seed
```

### 5. Jalankan Server Development
```bash
npm run dev
```
Aplikasi dapat diakses di browser pada: **`http://localhost:3000`**

---

## 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Perangkat Kasir lain yang terhubung ke jaringan Wi-Fi yang sama:
- **URL Jaringan Wi-Fi:** `http://192.168.1.3:3000`
- **URL Komputer Ini:** `http://localhost:3000`

---

## 🔐 Kredensial & Akun Login (Default Database)

Berikut akun login yang aktif di database untuk masuk ke aplikasi Kasirku POS:

| Peran (Role) | Nama Pengguna | Username | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **OWNER** | Pemilik Toko | `owner` | `password` | **Akses Penuh:** Manajemen produk & harga, ubah limit member, laporan laba/omzet, stok opname approval, tambah kasir, pengaturan toko. |
| **STAFF** | Staff Toko | `staff` | `123456` | **Akses Kasir:** Transaksi kasir (POS), scan barcode, tambah kasbon member, penerimaan barang masuk, stok opname fisik. |
| **OWNER** | Super Admin | `superadmin` | `superadmin123` | **Akun Alternatif:** Hak akses setara Owner. |

### 🔑 PIN Otorisasi Pemilik Toko (Owner PIN)
- **PIN Owner:** `123456`
- **Fungsi PIN:** Digunakan saat otorisasi pembatalan transaksi (void), perubahan/edit rincian nota bon piutang lama, dan otorisasi diskon kasir.

---

## 🧪 Menjalankan Pengujian (Testing)

Proyek ini dilengkapi rangkaian pengujian otomatis unit & integrasi mencakup seluruh aturan bisnis kritis:
- **Hak Akses & Otorisasi RBAC:** Pengujian proteksi server terhadap route Owner.
- **PIN Owner & Rate Limiting:** Verifikasi PIN benar/salah, lock 15 menit setelah 3 kali gagal.
- **Produk & Multi-Satuan:** Unik barcode, konversi faktor satuan, cek harga cepat.
- **Stok Ledger & Rekonsiliasi:** Barang masuk, rumus SUM mutasi vs cache, status warna (Merah/Kuning/Hijau).
- **Kasir & Idempotensi:** Checkout atomik, desimal satuan timbang (0,5 kg), idempotency key, void counter-mutation.
- **Member & Kasbon:** Tolak melebihi limit, pembayaran utang, pembalikan saldo utang.
- **Stok Opname:** Status menunggu persetujuan Owner, mutasi selisih fisik.
- **Laporan & Dashboard:** Akumulasi omzet, laba kotor dari snapshot HPP, umur utang member.
- **Go-Live:** Checklist kesiapan operasional toko sebelum go-live.

Jalankan seluruh test suite:
```bash
npm test
```

---

## 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Perangkat Kasir lain yang terhubung ke jaringan Wi-Fi yang sama:
- **URL Jaringan Wi-Fi:** `http://192.168.1.3:3000`
- **URL Komputer Ini:** `http://localhost:3000`

---

## 🔐 Kredensial & Akun Login (Default Database)

Berikut akun login yang aktif di database untuk masuk ke aplikasi Kasirku POS:

| Peran (Role) | Nama Pengguna | Username | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **OWNER** | Pemilik Toko | `owner` | `password` | **Akses Penuh:** Manajemen produk & harga, ubah limit member, laporan laba/omzet, stok opname approval, tambah kasir, pengaturan toko. |
| **STAFF** | Staff Toko | `staff` | `123456` | **Akses Kasir:** Transaksi kasir (POS), scan barcode, tambah kasbon member, penerimaan barang masuk, stok opname fisik. |
| **OWNER** | Super Admin | `superadmin` | `superadmin123` | **Akun Alternatif:** Hak akses setara Owner. |

### 🔑 PIN Otorisasi Pemilik Toko (Owner PIN)
- **PIN Owner:** `123456`
- **Fungsi PIN:** Digunakan saat otorisasi pembatalan transaksi (void), perubahan/edit rincian nota bon piutang lama, dan otorisasi diskon kasir.

---

## 📂 Panduan Operasional Toko

### 1. Struktur Akun & Peran
- **Owner (Pemilik Toko):**
  - Mengelola data produk, harga jual/beli, dan kategori.
  - Mengatur pengguna (tambah akun kasir staff, ganti password, aktif/nonaktifkan).
  - Mengatur PIN keamanan, nama toko, footer struk, batas diskon staff, dan pembulatan.
  - Menyetujui/menolak pengajuan stok opname.
  - Melihat laporan keuangan (omzet, laba kotor, piutang, void) dan dashboard KPI.
- **Staff (Kasir):**
  - Melakukan transaksi checkout tunai, transfer, dan kasbon member.
  - Melakukan pengecekan harga cepat (*Cek Harga*).
  - Mencatat barang masuk dari supplier.
  - Memantau daftar *Perlu Belanja* dengan indikator badge stok menipis.
  - Mencatat stok opname fisik (menunggu tinjauan Owner).
  - Menerima pembayaran kasbon member.

### 2. Alur Kasbon & Pembayaran
1. **Penjualan Kasbon:**
   - Kasir memilih barang di keranjang, memilih metode **Kasbon**, dan memilih nama member terdaftar.
   - Sistem otomatis memvalidasi apakah utang berjalan + total belanja $\le$ batas kasbon member.
   - Jika valid, checkout atomik menyimpan transaksi dan menambah utang di buku besar `kasbon_mutasi`.
2. **Pembayaran Kasbon:**
   - Kasir membuka menu **Member & Kasbon**, memilih member, lalu menekan **Terima Pembayaran Utang**.
   - Input nominal bayar (sebagian atau lunas). Sistem menghitung kembalian tunai jika berlebih.
   - Sisa saldo utang otomatis berkurang dan tautan bukti pembayaran dapat langsung dikirim ke WhatsApp member.

### 3. Backup Database Harian
Sesuai prinsip TRD 5.6 & 5.7, database toko wajib dibackup secara berkala. Tersedia dua cara:
```bash
# Cara 1: Menggunakan npm script (Cross-platform)
npm run backup

# Cara 2: Menggunakan bash script
./scripts/backup-db.sh
```
File backup SQL dengan stempel waktu otomatis tersimpan di folder `./backups/backup_kasirku_YYYYMMDD_HHMMSS.sql`.

Untuk memulihkan data (*restore*):
```bash
psql -d kasirku_pos -f backups/backup_kasirku_YYYYMMDD_HHMMSS.sql
```

---

## 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Perangkat Kasir lain yang terhubung ke jaringan Wi-Fi yang sama:
- **URL Jaringan Wi-Fi:** `http://192.168.1.3:3000`
- **URL Komputer Ini:** `http://localhost:3000`

---

## 🔐 Kredensial & Akun Login (Default Database)

Berikut akun login yang aktif di database untuk masuk ke aplikasi Kasirku POS:

| Peran (Role) | Nama Pengguna | Username | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **OWNER** | Pemilik Toko | `owner` | `password` | **Akses Penuh:** Manajemen produk & harga, ubah limit member, laporan laba/omzet, stok opname approval, tambah kasir, pengaturan toko. |
| **STAFF** | Staff Toko | `staff` | `123456` | **Akses Kasir:** Transaksi kasir (POS), scan barcode, tambah kasbon member, penerimaan barang masuk, stok opname fisik. |
| **OWNER** | Super Admin | `superadmin` | `superadmin123` | **Akun Alternatif:** Hak akses setara Owner. |

### 🔑 PIN Otorisasi Pemilik Toko (Owner PIN)
- **PIN Owner:** `123456`
- **Fungsi PIN:** Digunakan saat otorisasi pembatalan transaksi (void), perubahan/edit rincian nota bon piutang lama, dan otorisasi diskon kasir.

---

## 📁 Struktur Direktori Proyek

```
Kasirku-Project/
├── prisma/
│   ├── schema.prisma            # Skema PostgreSQL terpadu
│   ├── migrations/              # Riwayat migrasi database Prisma
│   └── seed.ts                  # Inisialisasi awal database
├── scripts/
│   ├── create-owner.ts          # CLI wizard pembuatan Owner awal
│   ├── backup-db.sh             # Skrip backup database bash
│   └── backup.ts                # Skrip backup database Node.js
├── src/
│   ├── app/
│   │   ├── (auth)/login/        # Halaman login
│   │   ├── (dashboard)/         # Area dashboard terproteksi sesi
│   │   │   ├── kasir/           # POS Layar sentuh kasir
│   │   │   ├── transaksi/       # Riwayat transaksi & cetak struk
│   │   │   ├── cek-harga/       # Cek harga cepat tanpa tanya
│   │   │   ├── stok/            # Barang masuk, perlu belanja, opname
│   │   │   ├── member/          # Manajemen member & profil kasbon
│   │   │   └── owner/           # Dashboard, produk, laporan, go-live
│   │   └── api/                 # Route Handler API Next.js dengan validasi Zod
│   ├── components/
│   │   ├── layout/              # Sidebar berbasis peran server, Navbar
│   │   └── kasir/               # StrukModal, QuickCash buttons, Cart
│   ├── lib/
│   │   ├── auth/                # JWT session HttpOnly & cookie parser
│   │   ├── validations/         # Skema validasi Zod
│   │   ├── db.ts                # Prisma client singleton
│   │   └── formatters.ts        # Format Rupiah & desimal kuantitas
│   ├── middleware.ts            # Proteksi rute server-side
│   └── services/                # Lapisan logika bisnis murni (testable)
│       ├── auth.service.ts
│       ├── pin.service.ts
│       ├── settings.service.ts
│       ├── product.service.ts
│       ├── stock.service.ts
│       ├── transaction.service.ts
│       ├── member.service.ts
│       ├── opname.service.ts
│       ├── report.service.ts
│       ├── go-live.service.ts
│       └── activity-log.service.ts
└── tests/
    ├── unit/                    # Pengujian unit formatter & pembulatan
    └── integration/             # Pengujian integrasi service database
```

---

## 🌐 Akses Jaringan Lokal (Wi-Fi)
Aplikasi dapat dibuka langsung dari HP / Tablet / Perangkat Kasir lain yang terhubung ke jaringan Wi-Fi yang sama:
- **URL Jaringan Wi-Fi:** `http://192.168.1.3:3000`
- **URL Komputer Ini:** `http://localhost:3000`

---

## 🔐 Kredensial & Akun Login (Default Database)

Berikut akun login yang aktif di database untuk masuk ke aplikasi Kasirku POS:

| Peran (Role) | Nama Pengguna | Username | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **OWNER** | Pemilik Toko | `owner` | `password` | **Akses Penuh:** Manajemen produk & harga, ubah limit member, laporan laba/omzet, stok opname approval, tambah kasir, pengaturan toko. |
| **STAFF** | Staff Toko | `staff` | `123456` | **Akses Kasir:** Transaksi kasir (POS), scan barcode, tambah kasbon member, penerimaan barang masuk, stok opname fisik. |
| **OWNER** | Super Admin | `superadmin` | `superadmin123` | **Akun Alternatif:** Hak akses setara Owner. |

### 🔑 PIN Otorisasi Pemilik Toko (Owner PIN)
- **PIN Owner:** `123456`
- **Fungsi PIN:** Digunakan saat otorisasi pembatalan transaksi (void), perubahan/edit rincian nota bon piutang lama, dan otorisasi diskon kasir.

---

## 📜 Lisensi & Kepatuhan
Aplikasi ini dikembangkan secara eksklusif untuk operasional toko sembako sesuai Dokumen MVP POS Toko Sembako.

