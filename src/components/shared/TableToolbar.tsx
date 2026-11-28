"use client";

import React from "react";
import { RefreshCw, Search, X } from "lucide-react";

export function TableSearchRow({
  value,
  onChange,
  onClear,
  placeholder = "Cari...",
  onRefresh,
  loading = false,
  rightExtra,
}: {
  value: string;
  onChange: (val: string) => void;
  onClear?: () => void;
  placeholder?: string;
  onRefresh?: () => void;
  loading?: boolean;
  rightExtra?: React.ReactNode;
}) {
  return (
    <div className="pt-4 flex items-center justify-between gap-4">
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-6 pr-6 h-9 bg-transparent border-b border-slate-200 dark:border-zinc-700 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => (onClear ? onClear() : onChange(""))}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
            title="Hapus pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {rightExtra}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="h-8 w-8 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95 shrink-0 cursor-pointer"
            title="Muat ulang"
            aria-label="Muat ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
          </button>
        )}
      </div>
    </div>
  );
}

export interface FilterPillItem<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  accent?: "default" | "amber" | "violet" | "blue";
}

export function TableFilterPills<T extends string = string>({
  items,
  value,
  onChange,
}: {
  items: FilterPillItem<T>[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
      {items.map((item) => {
        const isSelected = value === item.value;
        const pillStyle = isSelected
          ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-zinc-900"
          : item.accent === "amber"
          ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 hover:border-amber-300"
          : item.accent === "violet"
          ? "bg-violet-50/70 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 hover:border-violet-300"
          : item.accent === "blue"
          ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 hover:border-blue-300"
          : "bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700";

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${pillStyle}`}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" && (
              <span
                className={`text-[11px] tabular-nums ${
                  isSelected ? "text-white/75 dark:text-zinc-900/70" : "opacity-75"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
