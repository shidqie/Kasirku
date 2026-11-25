import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "readline";

const prisma = new PrismaClient();

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function main() {
  console.log("\n==============================================");
  console.log("   SETUP AKUN PEMILIK (OWNER) AWAL POS TOKO   ");
  console.log("==============================================\n");

  const username =
    (await askQuestion("Masukkan Username Owner [default: owner]: ")) ||
    process.env.ADMIN_USERNAME ||
    "owner";
  const nama =
    (await askQuestion("Masukkan Nama Lengkap Owner [default: Pemilik Toko]: ")) ||
    process.env.ADMIN_NAMA ||
    "Pemilik Toko";
  const password =
    (await askQuestion("Masukkan Password Baru: ")) ||
    process.env.ADMIN_PASSWORD ||
    "PasswordKuatOwner2026!";
  const pin =
    (await askQuestion("Masukkan 6 Digit PIN Owner [default: 123456]: ")) ||
    process.env.ADMIN_PIN ||
    "123456";

  if (!/^\d{6}$/.test(pin)) {
    console.error("❌ Error: PIN harus berupa 6 digit angka!");
    process.exit(1);
  }

  const storeName =
    (await askQuestion("Masukkan Nama Toko [default: Toko Sembako Berkah]: ")) ||
    process.env.STORE_NAME ||
    "Toko Sembako Berkah";

  const passwordHash = await bcrypt.hash(password, 10);
  const pinHash = await bcrypt.hash(pin, 10);

  // Buat atau update pengaturan toko
  await prisma.pengaturanToko.upsert({
    where: { id: "default" },
    update: {
      namaToko: storeName,
      pinOwnerHash: pinHash,
    },
    create: {
      id: "default",
      namaToko: storeName,
      pinOwnerHash: pinHash,
      pembulatan: "BULAT_0",
      batasDiskonStaff: 0,
      ambangUtangLamaHari: 30,
      bolehJualStokNol: false,
    },
  });

  // Buat atau update user owner
  const user = await prisma.user.upsert({
    where: { username },
    update: {
      nama,
      passwordHash,
      role: Role.OWNER,
      aktif: true,
    },
    create: {
      username,
      nama,
      role: Role.OWNER,
      passwordHash,
      aktif: true,
    },
  });

  console.log("\n✅ BERHASIL! Akun Pemilik telah siap.");
  console.log(`Username : ${user.username}`);
  console.log(`Nama     : ${user.nama}`);
  console.log(`Peran    : ${user.role}`);
  console.log(`Toko     : ${storeName}`);
  console.log("Silakan login di halaman web.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

