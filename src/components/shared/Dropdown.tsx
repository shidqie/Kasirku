"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  hint?: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** "underline" untuk filter bar minimalis, "box" untuk form/modal */
  variant?: "underline" | "box";
  /** Tampilkan kolom pencarian di dalam menu (otomatis aktif jika opsi > 8) */
  searchable?: boolean;
  searchPlaceholder?: string;
  align?: "left" | "right";
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  ariaLabel?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Pilih opsi...",
  variant = "underline",
  searchable,
  searchPlaceholder = "Cari...",
  align = "left",
  disabled = false,
  className = "",
  menuClassName = "",
  ariaLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  const showSearch = searchable ?? options.length > 8;

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.hint && opt.hint.toLowerCase().includes(q))
    );
  }, [options, query]);

  // Tutup saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Reset pencarian & fokus ke input search saat menu dibuka
  useEffect(() => {
    if (open) {
      setQuery("");
      const activeIdx = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(activeIdx >= 0 ? activeIdx : 0);
      if (showSearch) {
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    }
  }, [open, options, showSearch, value]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0 ? -1 : (prev + 1) % filteredOptions.length
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0
          ? -1
          : (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const item = filteredOptions[highlightedIndex];
      if (item) handleSelect(item.value);
    }
  };

  const triggerClasses =
    variant === "underline"
      ? `w-full h-9 inline-flex items-center justify-between gap-2 bg-transparent border-b text-xs transition-colors cursor-pointer focus:outline-none ${
          open
            ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
            : "border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:border-slate-500 dark:hover:border-zinc-500"
        }`
      : `w-full h-11 px-3.5 inline-flex items-center justify-between gap-2 bg-slate-50 dark:bg-zinc-900 border rounded-xl text-sm transition-colors cursor-pointer focus:outline-none ${
          open
            ? "border-blue-500 ring-2 ring-blue-500/20 text-slate-900 dark:text-zinc-100"
            : "border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:border-slate-300 dark:hover:border-zinc-600"
        }`;

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-block ${variant === "box" ? "w-full" : ""} ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`${triggerClasses} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`truncate ${
            selectedOption
              ? "font-medium"
              : "text-slate-400 dark:text-zinc-500 font-normal"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${
            open ? "rotate-180 text-slate-700 dark:text-zinc-200" : ""
          }`}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute z-50 mt-1.5 min-w-[210px] w-max max-w-[280px] rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            align === "right" ? "right-0" : "left-0"
          } ${variant === "box" ? "w-full max-w-none" : ""} ${menuClassName}`}
        >
          {showSearch && (
            <div className="p-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8 pr-2.5 text-xs rounded-lg bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-zinc-100 placeholder-slate-400 border border-slate-200/70 dark:border-zinc-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-zinc-500">
                Tidak ada opsi yang cocok
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={opt.value || "__empty__"}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                        : isHighlighted
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                        : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {opt.hint && (
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                          {opt.hint}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
