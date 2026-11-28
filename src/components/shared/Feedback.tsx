/**
 * Global Feedback Components
 * - Alert
 * - Meter
 * - ProgressBar
 * - ProgressCircle
 * - Spinner
 *
 * Usage:
 *   import { Alert, Meter, ProgressBar, ProgressCircle, Spinner } from "@/components/shared/Feedback";
 */

"use client";

import { X, Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

// ─────────────────────────────────────────────
// ALERT
// ─────────────────────────────────────────────
export type AlertVariant = "info" | "success" | "warning" | "danger";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const alertConfig: Record<
  AlertVariant,
  { icon: React.ReactNode; bg: string; border: string; text: string; iconColor: string }
> = {
  info: {
    icon: <Info className="w-4 h-4 shrink-0" />,
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-200",
    iconColor: "text-blue-500",
  },
  success: {
    icon: <CheckCircle className="w-4 h-4 shrink-0" />,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-800 dark:text-emerald-200",
    iconColor: "text-emerald-500",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    iconColor: "text-amber-500",
  },
  danger: {
    icon: <XCircle className="w-4 h-4 shrink-0" />,
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
    iconColor: "text-red-500",
  },
};

export function Alert({
  variant = "info",
  title,
  message,
  dismissible = false,
  onDismiss,
  className = "",
}: AlertProps) {
  const c = alertConfig[variant];
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${c.bg} ${c.border} ${c.text} ${className}`}
    >
      <span className={`mt-0.5 ${c.iconColor}`}>{c.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p className="leading-snug">{message}</p>
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// METER (nilai dalam range, misal stok vs minimum)
// ─────────────────────────────────────────────
interface MeterProps {
  value: number;       // 0–max
  max?: number;        // default 100
  low?: number;        // threshold bawah (warning)
  high?: number;       // threshold atas (success)
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function Meter({ value, max = 100, low, high, label, showValue = false, className = "" }: MeterProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  let barColor = "bg-blue-500";
  if (low !== undefined && value <= low) barColor = "bg-red-500";
  else if (high !== undefined && value >= high) barColor = "bg-emerald-500";
  else if (low !== undefined && value <= low * 1.5) barColor = "bg-amber-500";

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5 text-xs text-slate-600 dark:text-zinc-400">
          {label && <span>{label}</span>}
          {showValue && <span className="tabular-nums font-medium">{value}/{max}</span>}
        </div>
      )}
      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
          role="meter"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROGRESS BAR (proses, loading, upload)
// ─────────────────────────────────────────────
interface ProgressBarProps {
  value: number;      // 0–100
  label?: string;
  showPercent?: boolean;
  color?: "blue" | "green" | "amber" | "red" | "slate";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

const pbColors: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  slate: "bg-slate-700 dark:bg-zinc-300",
};

const pbHeights: Record<string, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export function ProgressBar({
  value,
  label,
  showPercent = false,
  color = "blue",
  size = "md",
  animated = false,
  className = "",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5 text-xs text-slate-600 dark:text-zinc-400">
          {label && <span>{label}</span>}
          {showPercent && <span className="tabular-nums font-medium">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden ${pbHeights[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${pbColors[color]} ${
            animated ? "animate-pulse" : ""
          }`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROGRESS CIRCLE (donut/circular progress)
// ─────────────────────────────────────────────
interface ProgressCircleProps {
  value: number;       // 0–100
  size?: number;       // px, default 56
  strokeWidth?: number;
  color?: string;      // tailwind stroke color class or hex
  label?: string;      // center text override
  showPercent?: boolean;
  className?: string;
}

export function ProgressCircle({
  value,
  size = 56,
  strokeWidth = 5,
  color = "#3B82F6",
  label,
  showPercent = true,
  className = "",
}: ProgressCircleProps) {
  const pct = Math.min(100, Math.max(0, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-100 dark:stroke-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      {(showPercent || label) && (
        <span
          className="absolute text-[10px] font-semibold text-slate-700 dark:text-zinc-200 tabular-nums"
          style={{ fontSize: size < 48 ? 9 : 11 }}
        >
          {label ?? `${Math.round(pct)}%`}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────
interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  color?: string; // tailwind class e.g. "text-blue-500"
  className?: string;
}

const spinnerSizes: Record<string, string> = {
  xs: "w-3 h-3 border-[1.5px]",
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-[3px]",
};

export function Spinner({ size = "md", color = "text-blue-500", className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Memuat..."
      className={`inline-block rounded-full border-current border-t-transparent animate-spin ${spinnerSizes[size]} ${color} ${className}`}
    />
  );
}
