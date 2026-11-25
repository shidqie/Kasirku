import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [k, ...v] = trimmed.split("=");
        if (k && v.length > 0 && !process.env[k]) {
          process.env[k] = v.join("=").replace(/(^['"]|['"]$)/g, "");
        }
      }
    }
  }
}

async function runBackup() {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ Error: Variabel DATABASE_URL tidak ditemukan di .env");
    process.exit(1);
  }

  const backupDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .split(".")[0];
  const targetFile = path.join(backupDir, `backup_kasirku_${timestamp}.sql`);

  console.log("📦 Memulai backup database Kasirku POS...");
  console.log(`📍 Lokasi file: ${targetFile}`);

  // Hapus query parameter seperti ?schema=public agar kompatibel dengan pg_dump
  const cleanDbUrl = databaseUrl.split("?")[0];

  // Cari binary pg_dump terbaik
  const candidates = [
    "/opt/homebrew/opt/postgresql@15/bin/pg_dump",
    "/opt/homebrew/Cellar/postgresql@15/15.15/bin/pg_dump",
    "/opt/homebrew/opt/libpq/bin/pg_dump",
    "pg_dump",
  ];
  let pgDumpBin = "pg_dump";
  for (const c of candidates) {
    if (c.startsWith("/") && fs.existsSync(c)) {
      pgDumpBin = c;
      break;
    }
  }

  try {
    execSync(`"${pgDumpBin}" "${cleanDbUrl}" --no-owner --no-acl -F p > "${targetFile}"`, {
      stdio: "inherit",
    });

    const stats = fs.statSync(targetFile);
    console.log(`✅ Backup database berhasil!`);
    console.log(`📁 Ukuran file: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`🔒 Disimpan di: ${targetFile}`);
  } catch (error: any) {
    console.error("❌ Gagal menjalankan pg_dump:", error.message);
    console.log("\n💡 Catatan: Pastikan PostgreSQL client tools (pg_dump) terpasang di komputer Anda.");
    process.exit(1);
  }
}

runBackup();
