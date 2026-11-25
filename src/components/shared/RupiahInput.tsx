"use client";

import React from "react";

export interface RupiahInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  prefix?: string;
  allowNegative?: boolean;
  containerClassName?: string;
}

/**
 * Komponen Input Format Rupiah Standar (Rp 000.000.000)
 * - Menampilkan prefix "Rp" secara elegan
 * - Otomatis memformat angka dengan pemisah ribuan titik (.)
 * - Keyboard numeric di HP (inputMode="numeric")
 * - Mengembalikan integer murni ke state parent (onChange(number))
 */
export function RupiahInput({
  value,
  onChange,
  prefix = "Rp",
  allowNegative = false,
  containerClassName = "",
  className = "",
  placeholder = "0",
  disabled = false,
  ...rest
}: RupiahInputProps) {
  const numValue =
    typeof value === "number"
      ? value
      : value
      ? parseInt(String(value).replace(/\D/g, ""), 10) || 0
      : 0;

  const isNeg = allowNegative && numValue < 0;
  const absValue = Math.abs(numValue);

  const displayString =
    absValue === 0
      ? ""
      : isNeg
      ? `-${absValue.toLocaleString("id-ID")}`
      : absValue.toLocaleString("id-ID");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const isNegativeInput = allowNegative && raw.includes("-");
    const digits = raw.replace(/\D/g, "");
    const parsed = digits ? parseInt(digits, 10) : 0;
    onChange(isNegativeInput ? -parsed : parsed);
  };

  return (
    <div className={`relative flex items-center ${containerClassName}`}>
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-zinc-500 select-none pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={displayString}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${prefix ? "pl-9" : "px-3"} ${className}`}
        {...rest}
      />
    </div>
  );
}

export default RupiahInput;
