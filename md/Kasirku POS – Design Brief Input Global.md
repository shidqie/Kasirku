Kasirku POS · Design System v1.0

# Input & kontrol global

Design brief dan prototype interaktif untuk textbox, tombol, dan kontrol form lain, disusun dari gaya dashboard Toko Sembako Berkah Mandiri agar seluruh halaman konsisten.

**Warna utama**

Pilih preset atau warna sendiri. Tombol, fokus, menu aktif, dan input ikut berubah.

## 1. Brief

Tujuan: satu bahasa visual untuk semua input di aplikasi (Kasir, Barang Masuk, Opname, Piutang, Produk & Harga, Pengaturan).

### Prinsip

- **Bersih & lega.** Latar putih, border tipis, banyak ruang kosong seperti dashboard.
- **Merah hanya untuk aksi utama** dan state aktif/fokus. Jangan dipakai dekoratif.
- **Cepat dipakai kasir.** Tinggi 44px (sentuh nyaman), angka besar dan tebal.
- **Konsisten.** Satu radius, satu tinggi, satu pola state di semua form.
- **Terang & Gelap** memakai token yang sama, tidak ada warna hard-code.

### Aturan global

- Label di atas input, 13px semi-bold. Tanda ***** untuk wajib.
- Hint/error 12px di bawah input; error menggantikan hint.
- Satu tombol primer per area. Aksi sekunder pakai Secondary/Ghost.
- Nominal selalu format `Rp 1.506.300` (titik ribuan), rata kanan di tabel.
- Fokus: ring 4px merah transparan. Jangan hilangkan outline tanpa pengganti.
- Teks UI berbahasa Indonesia, ringkas, kata kerja di awal tombol (Simpan, Tambah).

## 2. Token

Diambil dari tampilan dashboard. Semua komponen hanya membaca token ini.

### Warna

**Primary**#E11D2A · aksi utama, fokus

**Primary soft**#FDECEE · menu aktif, soft button

**Text**#0F172A · judul & angka

**Muted**#64748B · label sekunder

**Success**#0A8F5A · penjualan, valid

**Danger**#E11D48 · utang, error

**Border**#E2E8F0 / #CBD5E1

### Tipografi

Ringkasan toko

Display · 30–34 / 800

Transaksi terkini

Heading · 20 / 700

Penjualan hari ini

Body · 15 / 400

Label & tombol kecil

13 / 600

OPERASIONAL

Overline · 12 / 700 / caps

Font: Plus Jakarta Sans (fallback system-ui)

### Bentuk & jarak

| Token | Nilai |
| --- | --- |
| Radius kontrol | 14px |
| Radius kecil | 10px |
| Radius kartu/menu | 18px |
| Pill (segmented, badge) | 999px |
| Tinggi kontrol | 36 · **44** · 54 |
| Padding horizontal | 14px (input), 18px (tombol) |
| Jarak label→input | 6px |
| Jarak antar field | 14–16px |
| Ring fokus | 4px, primary 22% |

## 3. Tombol

Coba klik; “Simpan” menampilkan state loading.

### Varian

### Ukuran

### State

### Lebar penuh (mobile / modal)

## 4. Textbox & field

Ketik di kolom nominal, coba kosongkan kolom wajib, dan fokuskan input untuk melihat ring.

### Default · fokus

Nama produk ***

Maksimal 60 karakter.

Cari produk

Harga jual ***

Rp

Ketik angka saja, titik ribuan otomatis.

Berat

kg

### Validasi & state

Nomor HP pelanggan ***

Nomor HP wajib diisi.

Kode barcode

Barcode tersedia.

Kasir

Terkunci oleh sistem.

Pembayaran

Catatan

### Ukuran

Kecil · 36

Normal · 44

Besar · 54 (Kasir, nominal)

Rp

### Dropdown

Klik, atau fokus lalu tekan ↓ / Enter. Pakai ↑ ↓ untuk memilih, Enter untuk konfirmasi, Esc untuk menutup.

Satuan

Placeholder sebelum dipilih.

Pemasok (dengan pencarian)

Cocok untuk daftar panjang.

Gudang

Ukuran kecil (36).

Satuan beli ***

Satuan beli wajib dipilih.

Cabang

Terkunci.

### Input nominal Rupiah

### Pembayaran kasir

Total tagihan**Rp 336.000**

Uang diterima

Rp

Ketik nominal atau pilih cepat di bawah.

### Aturan input uang

- **Prefix “Rp” terpisah** di kiri dan tidak ikut terhapus; berubah warna saat fokus.
- **Angka saja.** Huruf diblokir, paste “Rp 12.500” dibersihkan otomatis.
- **Titik ribuan live** (12.500) dan posisi kursor tetap saat mengedit di tengah angka.
- **Terbilang** muncul di bawah sebagai konfirmasi agar tidak salah nol.
- **Tombol ×** menghapus cepat; **↑ / ↓** menambah atau mengurangi Rp 1.000.
- **Chip nominal cepat** untuk kasir: uang pas dan pecahan terdekat.
- **Kembalian** hijau, **kurang bayar** merah, tombol Bayar aktif hanya jika cukup.
- Disimpan sebagai angka bulat (336000), ditampilkan dengan format id-ID. Maksimal 999 miliar.

## 5. Kontrol pilihan

### Checkbox

[x] Cetak struk [ ] Kirim ke WhatsApp

### Radio

Lunas Utang

### Switch

[x] Peringatan stok menipis [ ] Mode kasir cepat

### Segmented control

### Badge & item navigasi

LunasUtangStok menipisBaru

[Dashboard](#)[Kasir](#)

## 6. Contoh form utuh

Gabungan komponen di atas untuk “Tambah Produk”.

Nama produk ***

Nama yang tampil di kasir.

Kategori

Harga jual ***

Rp

Harga per satuan terkecil.

[x] Aktif dijual

## 7. Tabel data

Contoh halaman Piutang. Coba ganti tab, cari nama, klik judul kolom untuk mengurutkan, ubah jumlah per halaman, dan hapus pelanggan.

|  | No. HP / WA | Alamat |  | Aksi |
| --- | --- | --- | --- | --- |

**Pelanggan tidak ditemukan**Coba kata kunci lain atau ganti tab.

Hapus pelanggan?

dan seluruh riwayat bonnya akan dihapus. Tindakan ini tidak bisa dibatalkan.

## 8. Checklist implementasi

| Komponen | Class / token | Catatan |
| --- | --- | --- |
| Button | `.btn .btn-primary\|secondary\|soft\|ghost\|danger` | Tinggi 44, radius 14, loading menonaktifkan klik |
| Input | `.field > .ctl > input` | Border berubah di hover, ring di fokus |
| Nominal | `.ctl` + prefix `Rp` | Format id-ID, simpan sebagai angka |
| Dropdown | `.dd > .dd-t + .dd-m > .dd-o` | Menu kustom: ikon, deskripsi, centang, pencarian, aksi tambah; buka ke atas bila ruang bawah kurang; navigasi keyboard |
| Textarea | `.ctl.ta` | Min tinggi 72px |
| Tabel | `.tabs .tab`, `.dt`, `.ib`, `.pn` | Aksi utama berupa tombol, edit/hapus ikon dengan tooltip, hapus wajib konfirmasi, ada empty state dan pagination |
| Check / Radio / Switch | `.chk` | Area klik mencakup label |
| Tema | `:root[data-theme]` | Ikuti sistem, bisa diganti Terang/Gelap |