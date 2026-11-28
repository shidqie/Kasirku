-- Cek barcode produk lama yang tidak sesuai pola angka 8-14 digit
-- atau mengandung karakter non-digit / URL
SELECT
  id,
  nama,
  barcode,
  aktif,
  CASE
    WHEN barcode ~ '^https?://' THEN 'Mengandung URL/Link'
    WHEN barcode !~ '^\d+$' THEN 'Mengandung karakter non-angka'
    WHEN length(barcode) < 8 OR length(barcode) > 14 THEN 'Panjang bukan 8-14 digit'
    ELSE 'Lainnya'
  END AS alasan
FROM produk
WHERE barcode IS NOT NULL
  AND trim(barcode) <> ''
  AND trim(barcode) !~ '^\d{8,14}$'
ORDER BY nama ASC;
