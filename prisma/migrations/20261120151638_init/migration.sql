-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "Pembulatan" AS ENUM ('BULAT_0', 'BULAT_100', 'BULAT_500');

-- CreateEnum
CREATE TYPE "TipeMutasiStok" AS ENUM ('MASUK', 'JUAL', 'BATAL_JUAL', 'PENYESUAIAN', 'OPNAME', 'SALDO_AWAL');

-- CreateEnum
CREATE TYPE "StatusOpname" AS ENUM ('DRAFT', 'MENUNGGU', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "TipeMutasiKasbon" AS ENUM ('SALDO_AWAL', 'KASBON', 'PEMBAYARAN', 'PEMBALIKAN', 'PENYESUAIAN');

-- CreateEnum
CREATE TYPE "StatusTransaksi" AS ENUM ('SELESAI', 'BATAL');

-- CreateEnum
CREATE TYPE "MetodePembayaran" AS ENUM ('TUNAI', 'TRANSFER', 'KASBON');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "password_hash" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengaturan_toko" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nama_toko" TEXT NOT NULL,
    "alamat" TEXT,
    "telepon" TEXT,
    "footer_struk" TEXT,
    "pesan_whatsapp" TEXT,
    "pembulatan" "Pembulatan" NOT NULL DEFAULT 'BULAT_0',
    "batas_diskon_staff" INTEGER NOT NULL DEFAULT 0,
    "pin_owner_hash" TEXT NOT NULL,
    "pin_failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "pin_locked_until" TIMESTAMP(3),
    "ambang_utang_lama_hari" INTEGER NOT NULL DEFAULT 30,
    "boleh_jual_stok_nol" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengaturan_toko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kategori" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produk" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori_id" TEXT,
    "barcode" TEXT,
    "satuan_dasar" TEXT NOT NULL,
    "stok_minimum" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "stok_cache" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satuan_produk" (
    "id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "nama_satuan" TEXT NOT NULL,
    "faktor_ke_dasar" DECIMAL(12,3) NOT NULL,
    "harga_jual" INTEGER NOT NULL,
    "harga_beli" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "satuan_produk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_mutasi" (
    "id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "tipe" "TipeMutasiStok" NOT NULL,
    "qty_dasar" DECIMAL(12,3) NOT NULL,
    "ref_tipe" TEXT,
    "ref_id" TEXT,
    "user_id" TEXT NOT NULL,
    "catatan" TEXT,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stok_mutasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barang_masuk" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barang_masuk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barang_masuk_item" (
    "id" TEXT NOT NULL,
    "barang_masuk_id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "nama_satuan" TEXT NOT NULL,
    "faktor_ke_dasar" DECIMAL(12,3) NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "qty_dasar" DECIMAL(12,3) NOT NULL,
    "harga_beli_per_satuan" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "barang_masuk_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_opname" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusOpname" NOT NULL DEFAULT 'MENUNGGU',
    "dibuat_oleh_id" TEXT NOT NULL,
    "disetujui_oleh_id" TEXT,
    "catatan" TEXT,
    "tanggal_persetujuan" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stok_opname_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_opname_item" (
    "id" TEXT NOT NULL,
    "stok_opname_id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "stok_sistem" DECIMAL(12,3) NOT NULL,
    "stok_fisik" DECIMAL(12,3) NOT NULL,
    "selisih" DECIMAL(12,3) NOT NULL,
    "nilai_selisih" INTEGER NOT NULL,
    "catatan" TEXT,

    CONSTRAINT "stok_opname_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "telepon" TEXT,
    "alamat" TEXT,
    "batas_kasbon" INTEGER NOT NULL DEFAULT 0,
    "saldo_utang_cache" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kasbon_mutasi" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "tipe" "TipeMutasiKasbon" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "transaksi_id" TEXT,
    "user_id" TEXT NOT NULL,
    "catatan" TEXT,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kasbon_mutasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kasbon_pembayaran" (
    "id" TEXT NOT NULL,
    "nomor_bukti" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "metode" "MetodePembayaran" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "uang_diterima" INTEGER,
    "kembalian" INTEGER,
    "kasir_id" TEXT NOT NULL,
    "catatan" TEXT,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kasbon_pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaksi" (
    "id" TEXT NOT NULL,
    "nomor_struk" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "kasir_id" TEXT NOT NULL,
    "member_id" TEXT,
    "subtotal" INTEGER NOT NULL,
    "diskon" INTEGER NOT NULL DEFAULT 0,
    "pembulatan" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "status" "StatusTransaksi" NOT NULL DEFAULT 'SELESAI',
    "alasan_batal" TEXT,
    "dibatalkan_oleh_id" TEXT,
    "dibatalkan_pada" TIMESTAMP(3),
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaksi_item" (
    "id" TEXT NOT NULL,
    "transaksi_id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "nama_snapshot" TEXT NOT NULL,
    "satuan_snapshot" TEXT NOT NULL,
    "faktor_ke_dasar_snapshot" DECIMAL(12,3) NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "qty_dasar" DECIMAL(12,3) NOT NULL,
    "harga_jual_snapshot" INTEGER NOT NULL,
    "harga_beli_snapshot" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "transaksi_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembayaran" (
    "id" TEXT NOT NULL,
    "transaksi_id" TEXT NOT NULL,
    "metode" "MetodePembayaran" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "uang_diterima" INTEGER,
    "kembalian" INTEGER,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_sequence" (
    "tanggal" VARCHAR(8) NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "receipt_sequence_pkey" PRIMARY KEY ("tanggal")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "role" TEXT,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitas_id" TEXT,
    "sebelum_json" JSONB,
    "sesudah_json" JSONB,
    "ip" TEXT,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "kategori_nama_key" ON "kategori"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "produk_barcode_key" ON "produk"("barcode");

-- CreateIndex
CREATE INDEX "produk_nama_idx" ON "produk"("nama");

-- CreateIndex
CREATE INDEX "produk_barcode_idx" ON "produk"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "satuan_produk_produk_id_nama_satuan_key" ON "satuan_produk"("produk_id", "nama_satuan");

-- CreateIndex
CREATE INDEX "stok_mutasi_produk_id_dibuat_pada_idx" ON "stok_mutasi"("produk_id", "dibuat_pada");

-- CreateIndex
CREATE UNIQUE INDEX "barang_masuk_nomor_key" ON "barang_masuk"("nomor");

-- CreateIndex
CREATE UNIQUE INDEX "stok_opname_nomor_key" ON "stok_opname"("nomor");

-- CreateIndex
CREATE INDEX "member_nama_idx" ON "member"("nama");

-- CreateIndex
CREATE INDEX "member_telepon_idx" ON "member"("telepon");

-- CreateIndex
CREATE INDEX "kasbon_mutasi_member_id_dibuat_pada_idx" ON "kasbon_mutasi"("member_id", "dibuat_pada");

-- CreateIndex
CREATE UNIQUE INDEX "kasbon_pembayaran_nomor_bukti_key" ON "kasbon_pembayaran"("nomor_bukti");

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_nomor_struk_key" ON "transaksi"("nomor_struk");

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_idempotency_key_key" ON "transaksi"("idempotency_key");

-- CreateIndex
CREATE INDEX "transaksi_dibuat_pada_idx" ON "transaksi"("dibuat_pada");

-- CreateIndex
CREATE INDEX "transaksi_status_idx" ON "transaksi"("status");

-- CreateIndex
CREATE INDEX "activity_log_dibuat_pada_idx" ON "activity_log"("dibuat_pada");

-- CreateIndex
CREATE INDEX "activity_log_entitas_entitas_id_idx" ON "activity_log"("entitas", "entitas_id");

-- AddForeignKey
ALTER TABLE "produk" ADD CONSTRAINT "produk_kategori_id_fkey" FOREIGN KEY ("kategori_id") REFERENCES "kategori"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satuan_produk" ADD CONSTRAINT "satuan_produk_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_mutasi" ADD CONSTRAINT "stok_mutasi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barang_masuk" ADD CONSTRAINT "barang_masuk_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barang_masuk_item" ADD CONSTRAINT "barang_masuk_item_barang_masuk_id_fkey" FOREIGN KEY ("barang_masuk_id") REFERENCES "barang_masuk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barang_masuk_item" ADD CONSTRAINT "barang_masuk_item_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_dibuat_oleh_id_fkey" FOREIGN KEY ("dibuat_oleh_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_disetujui_oleh_id_fkey" FOREIGN KEY ("disetujui_oleh_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_item" ADD CONSTRAINT "stok_opname_item_stok_opname_id_fkey" FOREIGN KEY ("stok_opname_id") REFERENCES "stok_opname"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_item" ADD CONSTRAINT "stok_opname_item_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kasbon_mutasi" ADD CONSTRAINT "kasbon_mutasi_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kasbon_mutasi" ADD CONSTRAINT "kasbon_mutasi_transaksi_id_fkey" FOREIGN KEY ("transaksi_id") REFERENCES "transaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kasbon_mutasi" ADD CONSTRAINT "kasbon_mutasi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kasbon_pembayaran" ADD CONSTRAINT "kasbon_pembayaran_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kasbon_pembayaran" ADD CONSTRAINT "kasbon_pembayaran_kasir_id_fkey" FOREIGN KEY ("kasir_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_kasir_id_fkey" FOREIGN KEY ("kasir_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_dibatalkan_oleh_id_fkey" FOREIGN KEY ("dibatalkan_oleh_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_item" ADD CONSTRAINT "transaksi_item_transaksi_id_fkey" FOREIGN KEY ("transaksi_id") REFERENCES "transaksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_item" ADD CONSTRAINT "transaksi_item_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_transaksi_id_fkey" FOREIGN KEY ("transaksi_id") REFERENCES "transaksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
