# Dokumen MVP: POS Toko Sembako

Versi 1.0 · 20 November 2026 · Berisi PRD, TRD, model data, rencana rilis, rencana tes, dan risiko.

## 1. Ringkasan Eksekutif

Aplikasi POS (Point of Sale) untuk satu toko sembako dengan dua peran: **Pemilik** dan **Staff Toko**. MVP menyelesaikan tiga masalah utama toko: (1) harga tidak lengkap dan salah hitung kembalian, (2) kasbon member yang salah hitung atau tidak tercatat, (3) stok yang tidak tercatat sehingga barang habis atau menipis tidak terpantau.

Prinsip utama: **harga otomatis dari data produk, saldo stok dan kasbon dihitung dari mutasi (ledger), semua otorisasi di server, dan setiap aksi penting tercatat.**

## 2. PRD (Product Requirements Document)

### 2.1 Latar Belakang dan Masalah

| No | Masalah di toko | Dampak |
| --- | --- | --- |
| M1 | Daftar harga belum lengkap | Staff bertanya ke pemilik, antrean lambat, harga tidak konsisten |
| M2 | Kembalian dihitung manual | Salah kembalian, uang kas selisih |
| M3 | Kasbon dicatat di buku | Salah hitung, ada yang tidak tercatat, staff menghitung ulang saat member bayar |
| M4 | Tidak ada pencatatan stok | Tidak tahu mana yang habis, menipis, atau masih banyak; barang langsung dipajang tanpa catatan |

### 2.2 Tujuan dan Metrik Sukses

| Tujuan | Metrik | Target (4 minggu setelah go-live) |
| --- | --- | --- |
| Staff tidak perlu bertanya harga | Jumlah pertanyaan harga ke pemilik per hari | Turun lebih dari 80% |
| Kembalian akurat | Selisih kas harian | Selisih tidak lebih dari Rp 5.000 per hari |
| Kasbon tercatat lengkap | Transaksi kasbon yang ada di sistem vs buku | 100% sesuai |
| Waktu bayar kasbon cepat | Waktu staff melayani pembayaran kasbon | Kurang dari 1 menit |
| Stok terpantau | Produk dengan stok sistem sama dengan fisik (opname) | Lebih dari 95% |
| Tidak kehabisan barang mendadak | Kejadian barang habis yang tidak terdeteksi | Mendekati 0 |

### 2.3 Persona

- **Pemilik Toko:** mengatur harga, produk, melihat laporan dan utang member, menyetujui opname. Tidak selalu ada di toko.
- **Staff Toko:** melayani pembeli, menerima barang, mencatat kasbon dan pembayarannya. Butuh layar yang cepat, tombol besar, minim ketikan.
- **Member:** pelanggan tetap yang boleh berutang (kasbon). Tidak login; menerima ringkasan utang lewat WhatsApp.

### 2.4 Ruang Lingkup MVP

**Termasuk (In scope):**

- Login dan dua peran, PIN Owner, log aktivitas
- Produk, kategori, multi-satuan dan harga, Cek Harga
- Stok: barang masuk, mutasi otomatis, status warna, Perlu Belanja, stok opname dengan persetujuan
- Kasir: tunai, transfer, kasbon; kembalian otomatis; struk; pembatalan (void)
- Member dan kasbon: batas kasbon, profil utang, bayar sebagian atau lunas
- Laporan dasar untuk Owner
- Impor data master (CSV)

**Tidak termasuk (Out of scope, setelah MVP):**

- Multi-cabang dan multi-toko
- Mode offline penuh (PWA) dan sinkronisasi
- Integrasi pembayaran digital otomatis (QRIS dinamis, payment gateway)
- Integrasi printer thermal langsung (MVP: cetak browser/PDF)
- Manajemen supplier dan pembelian (purchase order)
- Program poin dan promo kompleks
- Aplikasi mobile native

### 2.5 Kebutuhan Fungsional

Prioritas: **P0** wajib MVP, **P1** penting, boleh menyusul bila waktu terbatas.

#### A. Pengguna dan Keamanan

| ID | User story | Kriteria penerimaan | Prioritas |
| --- | --- | --- | --- |
| A1 | Sebagai Owner, saya login dan mengelola akun staff | Tidak ada registrasi publik; hanya Owner membuat, menonaktifkan, dan mengatur ulang password user | P0 |
| A2 | Sebagai Staff, saya hanya melihat menu yang boleh saya akses | Menu berasal dari sesi server; membuka URL Owner langsung dialihkan atau ditolak 403 | P0 |
| A3 | Sebagai Owner, saya menyetujui aksi sensitif staff dengan PIN | Pembatalan transaksi, penyesuaian stok manual, diskon di atas batas, dan harga manual meminta PIN Owner; PIN salah dibatasi percobaannya | P0 |
| A4 | Sebagai Owner, saya melihat siapa mengubah apa dan kapan | Log mencatat user, aksi, waktu, nilai sebelum dan sesudah; bisa difilter | P0 |

#### B. Produk dan Harga

| ID | User story | Kriteria penerimaan | Prioritas |
| --- | --- | --- | --- |
| B1 | Sebagai Owner, saya mengelola produk dan kategori | CRUD produk, barcode opsional (unik), stok minimum, status aktif | P0 |
| B2 | Sebagai Owner, saya mengatur beberapa satuan dan harga per produk | Contoh beras: kg dan karung 25 kg; telur: butir, kg, tray; ada faktor konversi ke satuan dasar | P0 |
| B3 | Sebagai Staff, saya mengecek harga tanpa bertanya | Halaman Cek Harga: cari nama atau scan barcode, tampil semua satuan, harga, dan status stok; hanya baca | P0 |
| B4 | Sebagai Owner, saya mendukung jumlah desimal | 0,5 kg dan 250 gram dihitung benar | P0 |
| B5 | Sebagai Owner, saya melihat riwayat perubahan harga | Setiap perubahan harga tercatat di log | P1 |

#### C. Kasir

| ID | User story | Kriteria penerimaan | Prioritas |
| --- | --- | --- | --- |
| C1 | Sebagai Staff, saya menambah barang ke keranjang dengan cepat | Cari nama, scan barcode, tombol favorit; ubah jumlah (desimal) dan satuan; harga tidak bisa diketik staff | P0 |
| C2 | Sebagai Staff, saya langsung melihat kembalian | Input uang diterima; kembalian tampil besar; tombol Uang Pas, 20rb, 50rb, 100rb; status Kurang bila uang kurang | P0 |
| C3 | Sebagai Owner, saya mengatur pembulatan | Pilihan 0, Rp100, atau Rp500; terlihat jelas di struk | P1 |
| C4 | Sebagai Staff, saya menerima pembayaran transfer | Metode Transfer tercatat terpisah di laporan | P0 |
| C5 | Sebagai Staff, saya mencetak atau membagikan struk | Struk cetak atau PDF; tombol bagikan ke WhatsApp; nama toko dari pengaturan | P0 |
| C6 | Sebagai Owner, saya membatalkan transaksi yang salah | Status batal, alasan wajib; stok kembali dan utang dibalik otomatis; data tidak dihapus; staff perlu PIN Owner | P0 |
| C7 | Sebagai Staff, saya diperingatkan jika stok tidak cukup | Peringatan jelas; Owner mengatur apakah boleh jual saat stok 0 | P0 |
| C8 | Klik ganda tidak membuat transaksi ganda | Idempotency key per checkout | P0 |

#### D. Member dan Kasbon

| ID | User story | Kriteria penerimaan | Prioritas |
| --- | --- | --- | --- |
| D1 | Sebagai Staff, saya mencatat kasbon lewat kasir | Metode Kasbon wajib memilih member terdaftar; otomatis menambah utang; tidak ada input manual terpisah | P0 |
| D2 | Sebagai Owner, saya membatasi kasbon per member | Transaksi ditolak bila saldo setelahnya melebihi batas; pesan menampilkan sisa limit | P0 |
| D3 | Sebagai Staff, saya melihat total utang dan rinciannya | Profil member: total utang, rincian per transaksi (tanggal, item, nominal), riwayat pembayaran | P0 |
| D4 | Sebagai Staff, saya menerima pembayaran utang sebagian atau lunas | Sisa utang otomatis; kalkulator kembalian untuk tunai; bukti pembayaran | P0 |
| D5 | Sebagai Owner, saya melihat utang lama | Penanda bila belum membayar lebih dari 30 hari (ambang dapat diatur) | P1 |
| D6 | Sebagai Staff, saya mengirim ringkasan utang ke WhatsApp member | Tautan WhatsApp berisi ringkasan; nama toko dari pengaturan | P1 |
| D7 | Sebagai Owner, saya mengoreksi saldo kasbon bila perlu | Hanya Owner; alasan wajib; tercatat sebagai mutasi Penyesuaian dan di log | P0 |

#### E. Stok

| ID | User story | Kriteria penerimaan | Prioritas |
| --- | --- | --- | --- |
| E1 | Sebagai Staff, saya mencatat barang masuk | Produk, jumlah, satuan, harga beli, tanggal; tercatat atas nama user; dikonversi otomatis ke satuan dasar | P0 |
| E2 | Stok berkurang otomatis saat terjual dan kembali saat dibatalkan | Setiap perubahan lewat mutasi, tidak ada pengeditan angka langsung | P0 |
| E3 | Sebagai Staff dan Owner, saya melihat status stok berwarna | Hijau aman; kuning kurang dari atau sama dengan stok minimum; merah habis | P0 |
| E4 | Sebagai pemilik, saya tahu apa yang harus dibeli | Halaman Perlu Belanja: stok saat ini, stok minimum, rekomendasi jumlah, bisa dicetak; badge di sidebar sama dengan isi halaman | P0 |
| E5 | Sebagai Staff, saya melakukan stok opname | Input stok fisik; sistem menghitung selisih; status Menunggu persetujuan | P0 |
| E6 | Sebagai Owner, saya menyetujui opname | Meninjau selisih beserta nilai Rupiah; stok berubah lewat mutasi hanya setelah disetujui | P0 |

#### F. Laporan (Owner)

| ID | User story | Kriteria penerimaan | Prioritas |
| --- | --- | --- | --- |
| F1 | Penjualan harian dan bulanan | Total, per metode bayar, per kasir | P0 |
| F2 | Laba kotor | Dihitung dari harga beli yang tersimpan di tiap transaksi | P1 |
| F3 | Total utang member | Daftar member dan saldo, urut terbesar | P0 |
| F4 | Stok menipis dan selisih opname | Mengacu pada data Perlu Belanja dan opname | P1 |
| F5 | Rekap pembatalan | Siapa, kapan, alasan | P1 |

### 2.6 Kebutuhan Non-Fungsional

| Aspek | Target |
| --- | --- |
| Kecepatan | Menambah barang ke keranjang kurang dari 300 ms; checkout kurang dari 2 detik pada jaringan toko |
| Perangkat | Tablet dan HP (layar sentuh), juga laptop; tombol besar, kontras jelas |
| Bahasa | Seluruh UI dan pesan error Bahasa Indonesia, format Rp 12.500 |
| Ketersediaan | Dapat diakses selama jam toko; backup harian otomatis |
| Integritas data | Tidak ada transaksi setengah tersimpan; saldo stok dan kasbon selalu cocok dengan mutasi |
| Keamanan | Otorisasi di server, password di-hash, sesi aman, tanpa akun atau rahasia bawaan |
| Kemudahan | Staff baru bisa melayani transaksi pertama dalam 15 menit pelatihan |

## 3. Matriks Hak Akses

| Fitur | Owner | Staff |
| --- | --- | --- |
| Kasir, riwayat transaksi, Cek Harga | Ya | Ya |
| Barang masuk (tercatat atas nama user) | Ya | Ya |
| Perlu Belanja (lihat) | Ya | Ya |
| Stok opname: input | Ya | Ya |
| Stok opname: persetujuan | Ya | Tidak |
| Member: tambah dan ubah data | Ya | Ya |
| Kasbon: catat via kasir, terima pembayaran | Ya | Ya |
| Koreksi saldo kasbon, ubah batas kasbon | Ya | Tidak |
| Produk, kategori, satuan, harga | Ya | Tidak |
| Batalkan transaksi | Ya | Dengan PIN Owner |
| Penyesuaian stok manual | Ya | Dengan PIN Owner |
| Laporan, laba, dashboard | Ya | Tidak |
| Pengaturan toko, kelola user, log aktivitas | Ya | Tidak |

**Sidebar Staff:** Kasir, Riwayat Transaksi | Cek Harga, Barang Masuk, Perlu Belanja (badge), Stok Opname | Member dan Kasbon.

**Sidebar Owner:** semua menu Staff ditambah grup Pemilik (Dashboard, Data Produk, Kategori, Manajemen Stok, Persetujuan Opname, Laporan, Log Aktivitas, Pengguna, Pengaturan).

## 4. Alur Utama

### 4.1 Penjualan Tunai

1. Staff mencari atau scan produk, mengatur jumlah dan satuan.
2. Sistem menampilkan total dari harga produk (staff tidak mengetik harga).
3. Staff memilih Tunai, memasukkan uang diterima (atau Uang Pas).
4. Sistem menampilkan kembalian besar.
5. Staff menekan Selesai; dalam satu transaksi database sistem menyimpan transaksi, mengurangi stok, dan mencatat pembayaran.
6. Struk dicetak atau dibagikan.

### 4.2 Penjualan Kasbon

1. Keranjang terisi; staff memilih metode Kasbon.
2. Staff wajib memilih member terdaftar.
3. Sistem memeriksa: saldo utang ditambah total belanja tidak melebihi batas kasbon. Jika melebihi, ditolak dengan pesan sisa limit.
4. Dalam satu transaksi database: simpan transaksi, kurangi stok, tambah mutasi kasbon.
5. Utang member otomatis bertambah dan muncul di profilnya.

### 4.3 Pembayaran Kasbon

1. Staff membuka profil member; melihat total utang dan rincian per transaksi.
2. Staff memasukkan nominal bayar (sebagian atau lunas); untuk tunai, kembalian dihitung otomatis.
3. Sistem menulis mutasi Pembayaran; sisa utang diperbarui; bukti dapat dikirim ke WhatsApp.

### 4.4 Barang Masuk

1. Staff memilih produk, jumlah, satuan, harga beli.
2. Sistem mengonversi ke satuan dasar (misalnya 1 karung 25 kg = 25 kg) dan menulis mutasi Masuk atas nama staff.
3. Status stok dan daftar Perlu Belanja ikut diperbarui.

### 4.5 Stok Opname

1. Staff menghitung fisik dan menginput; sistem menghitung selisih terhadap stok sistem.
2. Status Menunggu persetujuan.
3. Owner meninjau selisih dan nilai Rupiahnya, lalu setuju atau tolak.
4. Jika disetujui, sistem menulis mutasi Opname dan stok menyesuaikan.

### 4.6 Pembatalan Transaksi

1. Staff memilih transaksi dan memasukkan alasan; sistem meminta PIN Owner.
2. Status berubah menjadi Batal; stok dikembalikan lewat mutasi lawan; untuk kasbon, utang dibalik lewat mutasi Pembalikan. Semua dalam satu transaksi database.
3. Tercatat di log aktivitas.

## 5. TRD (Technical Requirements Document)

### 5.1 Arsitektur dan Stack

| Lapisan | Pilihan default | Catatan |
| --- | --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS | Responsif tablet dan HP, tombol besar |
| Backend | Route handler / server action Next.js, lapisan service terpisah | Logika bisnis (stok, kasbon, checkout) di service yang bisa dites, bukan di komponen UI |
| Database | PostgreSQL (boleh Supabase sebagai hosting DB) | Transaksi ACID wajib |
| ORM | Prisma | Migrasi terversi |
| Auth | Username dan password (argon2 atau bcrypt), sesi cookie httpOnly | Tanpa registrasi publik |
| Validasi | zod | Di server untuk semua input |
| Tes | Vitest (unit dan service), Playwright (alur kasir dan hak akses) | Lihat bagian 7 |
| Deploy | Satu server atau platform serverless dengan PostgreSQL terkelola | Backup harian |

Stack boleh diganti (misalnya Laravel atau Express) selama prinsip teknis di 5.2 tetap berlaku.

### 5.2 Prinsip Teknis Wajib

1. **Otorisasi di server.** Setiap route handler memeriksa sesi dan peran. UI hanya menyembunyikan menu. Peran sidebar berasal dari sesi server, bukan localStorage.
2. **Tanpa registrasi publik.** Owner awal dibuat lewat env (ADMIN\_USERNAME, ADMIN\_PASSWORD) atau perintah setup satu kali.
3. **Tanpa akun dan rahasia bawaan.** SESSION\_SECRET wajib di production; jika kosong aplikasi menolak start. Data contoh hanya jika SEED\_DEMO=true.
4. **Tanpa nama toko tertanam.** Nama toko, alamat, footer struk, dan pesan WhatsApp diambil dari pengaturan toko.
5. **Ledger, bukan angka editan.** Saldo stok dan saldo kasbon bersumber dari tabel mutasi yang hanya bisa ditambah (append-only). Kolom saldo di tabel utama hanya cache yang diperbarui dalam transaksi yang sama, disertai fungsi rekonsiliasi terhadap SUM mutasi. Tidak ada endpoint yang menimpa saldo.
6. **Atomik.** Checkout menyimpan transaksi, item, pembayaran, mutasi stok, dan mutasi kasbon dalam satu transaksi database. Idempotency key mencegah transaksi ganda. Nomor struk berurutan dan aman dari balapan.
7. **Uang integer, jumlah decimal.** Rupiah disimpan sebagai integer; jumlah barang Decimal (3 desimal). Tidak memakai float.
8. **Snapshot.** Item transaksi menyimpan nama produk, satuan, harga jual, dan harga beli saat transaksi.
9. **Void, bukan hapus.** Transaksi dibatalkan dengan status, alasan, dan pelaku; efeknya dibalik lewat mutasi lawan. Data transaksi tidak dihapus.
10. **Semua aksi penting dilog** (siapa, apa, kapan, sebelum, sesudah).
11. **PIN Owner** untuk aksi sensitif staff: di-hash, dengan pembatasan percobaan salah.

### 5.3 Model Data

| Tabel | Kolom utama | Keterangan |
| --- | --- | --- |
| user | id, username (unik), nama, role (OWNER, STAFF), password\_hash, aktif | Dibuat Owner saja |
| pengaturan\_toko | nama\_toko, alamat, telepon, footer\_struk, pembulatan, batas\_diskon\_staff, pin\_owner\_hash, ambang\_utang\_lama\_hari | Satu baris |
| kategori | id, nama |  |
| produk | id, nama, kategori\_id, barcode (unik, boleh kosong), satuan\_dasar, stok\_minimum, aktif, stok\_cache | stok\_cache = cache dari mutasi |
| satuan\_produk | id, produk\_id, nama\_satuan, faktor\_ke\_dasar, harga\_jual, harga\_beli, is\_default | Multi-satuan dan harga |
| stok\_mutasi | id, produk\_id, tipe (MASUK, JUAL, BATAL\_JUAL, PENYESUAIAN, OPNAME, SALDO\_AWAL), qty\_dasar (+/-), ref\_tipe, ref\_id, user\_id, catatan, dibuat\_pada | Append-only |
| barang\_masuk, barang\_masuk\_item | tanggal, user\_id, produk\_id, satuan, qty, harga\_beli\_per\_satuan | Barang masuk tercatat atas nama user |
| stok\_opname, stok\_opname\_item | status (DRAFT, MENUNGGU, DISETUJUI, DITOLAK), dibuat\_oleh, disetujui\_oleh; stok\_sistem, stok\_fisik, selisih, nilai\_selisih | Persetujuan Owner |
| member | id, nama, telepon, alamat, batas\_kasbon, saldo\_utang\_cache, aktif |  |
| kasbon\_mutasi | id, member\_id, tipe (SALDO\_AWAL, KASBON, PEMBAYARAN, PEMBALIKAN, PENYESUAIAN), jumlah (+ menambah utang, - mengurangi), transaksi\_id, user\_id, catatan, dibuat\_pada | Append-only |
| transaksi | id, nomor\_struk, idempotency\_key (unik), kasir\_id, member\_id, total, diskon, pembulatan, status (SELESAI, BATAL), alasan\_batal, dibatalkan\_oleh, dibuat\_pada |  |
| transaksi\_item | transaksi\_id, produk\_id, nama\_snapshot, satuan\_snapshot, qty, harga\_jual\_snapshot, harga\_beli\_snapshot, subtotal | Snapshot |
| pembayaran | transaksi\_id, metode (TUNAI, TRANSFER, KASBON), jumlah, uang\_diterima, kembalian |  |
| activity\_log | id, user\_id, role, aksi, entitas, entitas\_id, sebelum\_json, sesudah\_json, ip, dibuat\_pada |  |

### 5.4 Aturan Bisnis Kritis

| Aturan | Rincian |
| --- | --- |
| Konversi satuan | qty\_dasar = qty x faktor\_ke\_dasar. Contoh: 1 karung beras (faktor 25) = +25 kg |
| Stok saat ini | SUM(qty\_dasar) dari stok\_mutasi per produk; stok\_cache harus sama |
| Status stok | Merah: stok kurang dari atau sama dengan 0. Kuning: stok kurang dari atau sama dengan stok\_minimum. Hijau: di atasnya |
| Saldo utang | SUM(jumlah) dari kasbon\_mutasi per member |
| Batas kasbon | Tolak checkout kasbon jika saldo\_utang + total belanja melebihi batas\_kasbon |
| Kembalian | uang\_diterima dikurangi total setelah pembulatan; tidak boleh negatif |
| Void transaksi | Mutasi BATAL\_JUAL mengembalikan stok; untuk kasbon, mutasi PEMBALIKAN membalik utang; semua dalam satu transaksi |
| Opname | Stok tidak berubah sebelum persetujuan Owner; setelah disetujui, selisih ditulis sebagai mutasi OPNAME |
| Koreksi saldo | Hanya Owner, alasan wajib, mutasi PENYESUAIAN, tercatat di log |

### 5.5 Daftar API (ringkas)

| Area | Endpoint | Akses |
| --- | --- | --- |
| Auth | POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me | Publik untuk login; sesi untuk lainnya |
| Pengguna | GET/POST/PATCH /api/users, POST /api/users/:id/reset-password | Owner |
| Pengaturan | GET/PUT /api/settings, PUT /api/settings/pin | Owner |
| Produk | GET /api/products (cari), GET /api/products/:id, POST/PATCH/DELETE /api/products | GET: semua peran; ubah: Owner |
| Kategori | GET /api/categories, POST/PATCH/DELETE | Ubah: Owner |
| Stok | GET /api/stock/low, GET /api/stock/low-count, POST /api/stock/receipts, POST /api/stock/adjustments | Receipts: semua; adjustments: Owner atau Staff dengan PIN |
| Opname | POST /api/opname, POST /api/opname/:id/submit, POST /api/opname/:id/approve, POST /api/opname/:id/reject | Approve dan reject: Owner |
| Transaksi | POST /api/transactions (checkout), GET /api/transactions, POST /api/transactions/:id/void | Void: Owner atau Staff dengan PIN |
| Member | GET/POST/PATCH /api/members, GET /api/members/:id/debt | Semua peran (tanpa ubah saldo) |
| Kasbon | POST /api/members/:id/payments, POST /api/members/:id/adjustments | Payments: semua; adjustments: Owner |
| Laporan | GET /api/reports/sales, /profit, /debts, /voids | Owner |
| Log | GET /api/activity-log | Owner |

Semua endpoint memvalidasi input dengan zod dan memeriksa peran di server.

### 5.6 Keamanan

- Password di-hash; sesi cookie httpOnly, sameSite lax, secure di production; pembatasan percobaan login.
- Tidak ada token di query string; tidak ada rahasia di repositori.
- PIN Owner di-hash dan dibatasi percobaannya.
- Rute struk publik (jika ada) memakai token acak yang sulit ditebak, bukan ID berurutan.
- Log aktivitas tidak dapat diubah lewat aplikasi.
- Backup database terenkripsi atau disimpan di lokasi terpisah.

### 5.7 Deploy dan Operasional

- Environment: development, production. Variabel wajib: DATABASE\_URL, SESSION\_SECRET, ADMIN\_USERNAME, ADMIN\_PASSWORD.
- Backup database harian otomatis dan satu uji pemulihan sebelum go-live.
- Pemantauan sederhana: log error dan peringatan bila rekonsiliasi stok atau kasbon menemukan selisih.
- Jika memakai platform serverless, gunakan PostgreSQL terkelola; jangan memakai database berbasis file lokal.

## 6. Rencana Rilis

| Tahap | Isi | Hasil yang bisa diuji | Estimasi |
| --- | --- | --- | --- |
| 0 | Rencana: struktur folder, skema, rute dan halaman | Dokumen disetujui | 1-2 hari |
| 1 | Setup, auth, peran, middleware otorisasi, PIN Owner, log aktivitas, sidebar, pengaturan toko | Login dua peran; staff ditolak di rute Owner | 1 minggu |
| 2 | Kategori, produk, satuan dan harga, Cek Harga | Semua harga bisa dicari staff | 1 minggu |
| 3 | Stok: ledger, barang masuk, status warna, Perlu Belanja | Barang masuk tercatat; badge menipis benar | 1 minggu |
| 4 | Kasir: keranjang, tunai dan kembalian, transfer, struk, void, idempotensi | Transaksi nyata di toko (uji coba) | 1-2 minggu |
| 5 | Member dan kasbon: ledger, batas, kasbon di kasir, profil, bayar utang, pembalikan | Kasbon tidak lagi dicatat di buku | 1-2 minggu |
| 6 | Stok opname dengan persetujuan | Selisih tercatat dan disetujui | 1 minggu |
| 7 | Laporan dan dashboard Owner | Penjualan, utang, stok | 1 minggu |
| 8 | Impor data master, checklist go-live, backup, README | Siap dipakai penuh | 1 minggu |

Estimasi kasar untuk satu pengembang penuh waktu; sesuaikan dengan alat dan pengalaman. Uji di toko dengan data nyata setelah Tahap 4 dan Tahap 5 sebelum melanjutkan.

## 7. Rencana Pengujian

| Area | Kasus uji | Jenis |
| --- | --- | --- |
| Hak akses | Staff mendapat 403 di semua rute Owner (uji langsung ke API, bukan hanya UI) | Integrasi |
| Hak akses | Mengubah localStorage tidak memunculkan menu Owner | E2E |
| Aksi sensitif | Staff dengan PIN benar bisa void; PIN salah ditolak dan dibatasi | Integrasi |
| Checkout | Kembalian dan pembulatan benar; desimal 0,5 kg dan 250 gram benar | Unit |
| Checkout | Idempotency key yang sama dua kali menghasilkan satu transaksi | Integrasi |
| Kasbon | Melebihi batas ditolak; tanpa member ditolak | Integrasi |
| Void | Transaksi kasbon dibatalkan: stok kembali dan utang terbalik, atomik | Integrasi |
| Rekonsiliasi | stok\_cache dan saldo\_utang\_cache sama dengan SUM mutasi setelah rangkaian operasi acak | Properti |
| Opname | Stok tidak berubah sebelum disetujui Owner | Integrasi |
| Stok | Barang masuk 1 karung (25 kg) menambah 25 kg; status warna sesuai ambang | Unit |
| UAT di toko | Staff menyelesaikan 20 transaksi nyata, 5 kasbon, dan 1 penerimaan barang tanpa bantuan | Manual |

## 8. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Staff menolak karena merasa lebih lambat | Aplikasi tidak dipakai | Layar kasir cepat, pelatihan 15 menit, uji coba paralel dengan buku selama 1-2 minggu |
| Data master tidak lengkap saat go-live | Harga kosong, kasir terhambat | Impor CSV, tahap checklist go-live, mulai dari produk terlaris |
| Saldo kasbon lama tidak dimigrasikan dengan benar | Sengketa utang | Impor saldo awal per member dari buku, diverifikasi Owner dan member |
| Internet toko tidak stabil | Kasir berhenti | Ukur dulu kebutuhan; jika sering putus, jadwalkan PWA offline sebagai fase 2 |
| Kehilangan data | Kerugian besar | Backup harian dan uji pemulihan |
| Celah akses (registrasi terbuka, peran dari klien) | Penyalahgunaan data | Prinsip teknis 5.2 dan tes hak akses wajib |
| Printer struk tidak cocok | Struk gagal cetak | MVP memakai cetak browser dan PDF; printer thermal masuk fase 2 |

## 9. Data Master untuk Go-Live

| Data | Isi | Sumber | Catatan |
| --- | --- | --- | --- |
| Pengguna | Akun Owner dan Staff, PIN Owner | Owner | Tanpa akun bawaan |
| Pengaturan toko | Nama, alamat, telepon, footer struk, pembulatan | Owner |  |
| Kategori | Beras, minyak, gula, telur, mie, minuman, dan seterusnya | Owner |  |
| Produk | Nama, kategori, barcode, satuan dasar, harga beli dan jual, stok minimum | Owner | Impor CSV |
| Satuan dan konversi | Karung 25 kg = 25 kg; tray = 30 butir; renceng = 10 sachet | Owner | Dengan harga per satuan |
| Stok awal | Jumlah fisik tiap produk | Hitung fisik | Dicatat sebagai barang masuk atau opname awal, bukan edit angka |
| Member | Nama, HP, alamat, batas kasbon | Owner atau Staff |  |
| Saldo awal kasbon | Utang tiap member dari buku | Buku kasbon | Dicatat sebagai mutasi SALDO\_AWAL |

**Checklist go-live Owner:** pengaturan toko terisi, PIN Owner dibuat, minimal satu staff, produk dan harga terisi, stok awal tercatat, member dan saldo kasbon terisi, backup berjalan, uji coba 20 transaksi berhasil.

## 10. Keputusan Terbuka

| No | Pertanyaan | Pengaruh |
| --- | --- | --- |
| 1 | Apakah toko butuh mode offline (PWA)? | Menambah kerumitan besar; tentukan sebelum Tahap 4 |
| 2 | Apakah perlu printer thermal langsung? | Menentukan format struk dan integrasi |
| 3 | Batas diskon staff tanpa PIN berapa? | Aturan di kasir |
| 4 | Apakah boleh jual saat stok 0? | Aturan stok negatif |
| 5 | Berapa batas kasbon default per member? | Aturan kasbon |
| 6 | Apakah ada lebih dari satu kasir aktif bersamaan? | Sesi kasir dan penomoran struk |
| 7 | Apakah perlu pencatatan supplier dan pembelian di fase berikutnya? | Roadmap setelah MVP |
