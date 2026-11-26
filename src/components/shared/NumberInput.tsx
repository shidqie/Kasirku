"use client";

import React, { useEffect, useRef, useState } from "react";

export interface NumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "type"
  > {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  /** Hanya izinkan bilangan bulat (tanpa koma/titik) */
  integer?: boolean;
  /** Nilai fallback saat input dikosongkan lalu keluar fokus (blur) */
  emptyFallback?: number;
  min?: number;
  max?: number;
}

/**
 * Input angka ramah pengguna:
 * - Bisa menghapus semua digit (termasuk angka 0) tanpa langsung mental ke "0" atau "01"
 * - Mendukung desimal (titik atau koma) maupun bilangan bulat
 * - Menormalkan & clamp min/max saat blur
 */
export function NumberInput({
  value,
  onChange,
  integer = false,
  emptyFallback,
  min,
  max,
  className = "",
  placeholder = "0",
  onFocus,
  onBlur,
  ...rest
}: NumberInputProps) {
  const formatPropValue = (v: number | string | null | undefined) => {
    if (v === null || v === undefined || v === "") return "";
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? String(n) : "";
  };

  const [draft, setDraft] = useState<string>(() => formatPropValue(value));
  const isFocusedRef = useRef(false);

  // Sinkronkan tampilan jika value berubah dari luar (misal tombol +/-) saat tidak sedang mengetik
  useEffect(() => {
    if (!isFocusedRef.current) {
      setDraft(formatPropValue(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(",", ".");

    if (integer) {
      raw = raw.replace(/\D/g, "");
      if (raw.length > 1) {
        raw = raw.replace(/^0+/, "") || "0";
      }
    } else {
      // Izinkan hanya angka dan maksimal satu titik desimal
      raw = raw.replace(/[^0-9.]/g, "");
      const firstDot = raw.indexOf(".");
      if (firstDot !== -1) {
        raw =
          raw.slice(0, firstDot + 1) +
          raw.slice(firstDot + 1).replace(/\./g, "");
      }
      // Hilangkan nol di depan kecuali "0" atau "0.xxx"
      if (raw.length > 1 && raw[0] === "0" && raw[1] !== ".") {
        raw = raw.replace(/^0+/, "") || "0";
      }
    }

    setDraft(raw);

    if (raw === "" || raw === ".") {
      return;
    }

    const parsed = integer ? parseInt(raw, 10) : parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      let next = parsed;
      if (typeof max === "number" && next > max) next = max;
      onChange(next);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;

    const fallback = emptyFallback ?? (typeof min === "number" ? min : 0);
    let parsed =
      draft === "" || draft === "."
        ? fallback
        : integer
        ? parseInt(draft, 10)
        : parseFloat(draft);

    if (Number.isNaN(parsed)) parsed = fallback;
    if (typeof min === "number" && parsed < min) parsed = min;
    if (typeof max === "number" && parsed > max) parsed = max;

    setDraft(String(parsed));
    onChange(parsed);
    onBlur?.(e);
  };

  return (
    <input
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      value={draft}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      {...rest}
    />
  );
}

export default NumberInput;
