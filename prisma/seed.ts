import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Menjalankan inisialisasi data dasar...");

  const adminUsername = process.env.ADMIN_USERNAME || "owner";
  const adminPassword = process.env.ADMIN_PASSWORD || "PasswordKuatOwner2026!";
  const adminNama = process.env.ADMIN_NAMA || "Pemilik Toko";
  const adminPin = process.env.ADMIN_PIN || "123456";

  const storeName = process.env.STORE_NAME || "Toko Sembako Berkah";
  const storePhone = process.env.STORE_PHONE || "081234567890";
  const storeAddress = process.env.STORE_ADDRESS || "Jl. Pasar Raya No. 12";

  // 1. Inisialisasi Pengaturan Toko
  const pinHash = await bcrypt.hash(adminPin, 10);
  const settings = await prisma.pengaturanToko.upsert({
    where: { id: "default" },
    update: {
      namaToko: storeName,
      telepon: storePhone,
      alamat: storeAddress,
    },
    create: {
      id: "default",
      namaToko: storeName,
      telepon: storePhone,
      alamat: storeAddress,
      footerStruk: "Terima kasih atas kunjungan Anda di Toko Sembako Berkah",
      pesanWhatsApp: "Halo Kak, terima kasih sudah berbelanja. Berikut rincian belanja Anda:",
      pembulatan: "BULAT_0",
      batasDiskonStaff: 0,
      pinOwnerHash: pinHash,
      ambangUtangLamaHari: 30,
      bolehJualStokNol: false,
    },
  });
  console.log(`✅ Pengaturan Toko siap: ${settings.namaToko}`);

  // 2. Inisialisasi Akun Owner
  const ownerPasswordHash = await bcrypt.hash(adminPassword, 10);
  const owner = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      nama: adminNama,
      role: Role.OWNER,
      passwordHash: ownerPasswordHash,
      aktif: true,
    },
  });
  console.log(`✅ Akun Owner siap: ${owner.username} (${owner.nama})`);

  // 3. Buat staff contoh hanya jika SEED_DEMO=true (Sesuai Prinsip 5.2 #3: Tanpa akun bawaan di production)
  if (process.env.SEED_DEMO === "true") {
    const staffPasswordHash = await bcrypt.hash("Staff123456!", 10);
    const staff = await prisma.user.upsert({
      where: { username: "staff" },
      update: {},
      create: {
        username: "staff",
        nama: "Staff Toko",
        role: Role.STAFF,
        passwordHash: staffPasswordHash,
        aktif: true,
      },
    });
    console.log(`✅ Akun Demo Staff siap: ${staff.username}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

