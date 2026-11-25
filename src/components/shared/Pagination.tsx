"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Sinkronkan input halaman saat currentPage berubah dari luar
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const commitPageInput = () => {
    const parsed = parseInt(pageInput, 10);
    if (isNaN(parsed)) {
      setPageInput(String(currentPage));
      return;
    }
    const clamped = Math.max(1, Math.min(totalPages, parsed));
    setPageInput(String(clamped));
    if (clamped !== currentPage) {
      onPageChange(clamped);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitPageInput();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setPageInput(String(currentPage));
      e.currentTarget.blur();
    }
  };

  return (
    <div className="relative z-10 flex items-center justify-start gap-2.5 py-3 bg-white dark:bg-[#121214] border-t border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400 select-none font-sans">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white disabled:text-slate-300 dark:disabled:text-zinc-600 disabled:pointer-events-none transition-colors cursor-pointer"
        title="Halaman Sebelumnya"
        aria-label="Halaman Sebelumnya"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          aria-label="Nomor Halaman"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commitPageInput}
          onKeyDown={handleInputKeyDown}
          onFocus={(e) => e.currentTarget.select()}
          className="w-9 h-7 text-center bg-transparent border-b border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 font-medium text-xs focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
        />
        <span className="text-slate-500 dark:text-zinc-400 font-normal">/ {totalPages}</span>
      </div>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages || totalPages === 0}
        className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white disabled:text-slate-300 dark:disabled:text-zinc-600 disabled:pointer-events-none transition-colors cursor-pointer"
        title="Halaman Selanjutnya"
        aria-label="Halaman Selanjutnya"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
