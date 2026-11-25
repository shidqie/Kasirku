#!/usr/bin/env bash
# Script Backup Database POS Toko Sembako
# Sesuai Prinsip TRD 5.6 & 5.7: Backup harian terstruktur

set -e

# Lokasi folder project
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_kasirku_$TIMESTAMP.sql"

# Buat folder backup jika belum ada
mkdir -p "$BACKUP_DIR"

# Baca .env jika variabel DATABASE_URL belum ada di environment
if [ -z "$DATABASE_URL" ]; then
  if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep 'DATABASE_URL' | xargs)
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: Variabel DATABASE_URL tidak ditemukan di environment maupun .env"
  exit 1
fi

echo "📦 Memulai backup database POS Toko Sembako..."
echo "📍 Target file: $BACKUP_FILE"

CLEAN_DB_URL="${DATABASE_URL%%\?*}"

# Cari binary pg_dump yang cocok (termasuk Homebrew macOS dan path sistem)
PG_DUMP_BIN="pg_dump"
for candidate in \
  "/opt/homebrew/opt/postgresql@15/bin/pg_dump" \
  "/opt/homebrew/Cellar/postgresql@15/15.15/bin/pg_dump" \
  "/opt/homebrew/opt/libpq/bin/pg_dump" \
  "/usr/local/opt/postgresql@15/bin/pg_dump" \
  "$(which pg_dump 2>/dev/null)"; do
  if [ -x "$candidate" ]; then
    PG_DUMP_BIN="$candidate"
    break
  fi
done

# Jalankan pg_dump menggunakan CLEAN_DB_URL
if command -v "$PG_DUMP_BIN" >/dev/null 2>&1; then
  "$PG_DUMP_BIN" "$CLEAN_DB_URL" --no-owner --no-acl -F p > "$BACKUP_FILE"
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup database berhasil!"
  echo "📁 Ukuran file: $FILE_SIZE"
  echo "🔒 File disimpan di: $BACKUP_FILE"
else
  echo "⚠️  Peringatan: Utilitas 'pg_dump' tidak ditemukan di sistem PATH."
  echo "💡 Anda juga dapat menjalankan backup via Node.js: npm run backup"
  exit 1
fi
