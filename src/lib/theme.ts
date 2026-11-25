export type PresetAccentColor =
  | "red"
  | "rose"
  | "orange"
  | "amber"
  | "emerald"
  | "blue"
  | "indigo"
  | "purple";

export type AccentColor = PresetAccentColor | "custom";

export interface AccentDefinition {
  id: AccentColor;
  label: string;
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryLight: string;
  primaryBorder: string;
  textOnPrimary: string;
}

export const ACCENT_PRESETS: Record<PresetAccentColor, AccentDefinition> = {
  red: {
    id: "red",
    label: "Merah (Default)",
    primary: "#F0090F",
    primaryHover: "#D6080E",
    primaryActive: "#B5070C",
    primaryLight: "#FEE2E2",
    primaryBorder: "#FCA5A5",
    textOnPrimary: "#FFFFFF",
  },
  rose: {
    id: "rose",
    label: "Rose Crimson",
    primary: "#E11D48",
    primaryHover: "#BE123C",
    primaryActive: "#9F1239",
    primaryLight: "#FFE4E6",
    primaryBorder: "#FDA4AF",
    textOnPrimary: "#FFFFFF",
  },
  orange: {
    id: "orange",
    label: "Oranye Terang",
    primary: "#EA580C",
    primaryHover: "#C2410C",
    primaryActive: "#9A3412",
    primaryLight: "#FFEDD5",
    primaryBorder: "#FDBA74",
    textOnPrimary: "#FFFFFF",
  },
  amber: {
    id: "amber",
    label: "Amber Emas",
    primary: "#D97706",
    primaryHover: "#B45309",
    primaryActive: "#92400E",
    primaryLight: "#FEF3C7",
    primaryBorder: "#FCD34D",
    textOnPrimary: "#FFFFFF",
  },
  emerald: {
    id: "emerald",
    label: "Hijau Zamrud",
    primary: "#059669",
    primaryHover: "#047857",
    primaryActive: "#065F46",
    primaryLight: "#D1FAE5",
    primaryBorder: "#6EE7B7",
    textOnPrimary: "#FFFFFF",
  },
  blue: {
    id: "blue",
    label: "Biru Klasik",
    primary: "#2563EB",
    primaryHover: "#1D4ED8",
    primaryActive: "#1E40AF",
    primaryLight: "#DBEAFE",
    primaryBorder: "#93C5FD",
    textOnPrimary: "#FFFFFF",
  },
  indigo: {
    id: "indigo",
    label: "Indigo Modern",
    primary: "#4F46E5",
    primaryHover: "#4338CA",
    primaryActive: "#3730A3",
    primaryLight: "#E0E7FF",
    primaryBorder: "#A5B4FC",
    textOnPrimary: "#FFFFFF",
  },
  purple: {
    id: "purple",
    label: "Ungu Royal",
    primary: "#7C3AED",
    primaryHover: "#6D28D9",
    primaryActive: "#5B21B6",
    primaryLight: "#EDE9FE",
    primaryBorder: "#C4B5FD",
    textOnPrimary: "#FFFFFF",
  },
};

export const DEFAULT_ACCENT: PresetAccentColor = "red";
export const DEFAULT_CUSTOM_HEX = "#0EA5E9";

export function normalizeHex(hex?: string | null): string {
  if (!hex) return DEFAULT_CUSTOM_HEX;
  const cleaned = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned
      .split("")
      .map((ch) => ch + ch)
      .join("");
    return `#${expanded.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  return DEFAULT_CUSTOM_HEX;
}

function mixHex(hexA: string, hexB: string, weightB: number): string {
  const a = normalizeHex(hexA).slice(1);
  const b = normalizeHex(hexB).slice(1);
  const rA = parseInt(a.slice(0, 2), 16);
  const gA = parseInt(a.slice(2, 4), 16);
  const bA = parseInt(a.slice(4, 6), 16);
  const rB = parseInt(b.slice(0, 2), 16);
  const gB = parseInt(b.slice(2, 4), 16);
  const bB = parseInt(b.slice(4, 6), 16);

  const r = Math.round(rA * (1 - weightB) + rB * weightB);
  const g = Math.round(gA * (1 - weightB) + gB * weightB);
  const bl = Math.round(bA * (1 - weightB) + bB * weightB);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function buildCustomAccentDefinition(customHex?: string | null): AccentDefinition {
  const primary = normalizeHex(customHex);
  return {
    id: "custom",
    label: `Kustom (${primary})`,
    primary,
    primaryHover: mixHex(primary, "#000000", 0.14),
    primaryActive: mixHex(primary, "#000000", 0.25),
    primaryLight: mixHex(primary, "#FFFFFF", 0.88),
    primaryBorder: mixHex(primary, "#FFFFFF", 0.62),
    textOnPrimary: "#FFFFFF",
  };
}

export function getAccentDefinition(accentId: AccentColor, customHex?: string | null): AccentDefinition {
  if (accentId === "custom") {
    return buildCustomAccentDefinition(customHex ?? getInitialCustomHex());
  }
  return ACCENT_PRESETS[accentId] || ACCENT_PRESETS[DEFAULT_ACCENT];
}

export function previewAccentOnDocument(accentId: AccentColor, customHex?: string | null) {
  const preset = getAccentDefinition(accentId, customHex);
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--primary", preset.primary);
  root.style.setProperty("--primary-hover", preset.primaryHover);
  root.style.setProperty("--primary-active", preset.primaryActive);
  root.style.setProperty("--primary-light", preset.primaryLight);
  root.style.setProperty("--primary-border", preset.primaryBorder);
  root.setAttribute("data-accent", preset.id);
}

export function applyAccentToDocument(accentId: AccentColor, customHex?: string | null) {
  const preset = getAccentDefinition(accentId, customHex);
  previewAccentOnDocument(accentId, preset.primary);
  try {
    localStorage.setItem("kasirku_accent_color", preset.id);
    if (preset.id === "custom") {
      localStorage.setItem("kasirku_custom_accent_hex", preset.primary);
    }
  } catch {}
}

export function getInitialCustomHex(): string {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_HEX;
  try {
    const saved = localStorage.getItem("kasirku_custom_accent_hex");
    if (saved) return normalizeHex(saved);
  } catch {}
  return DEFAULT_CUSTOM_HEX;
}

export function getInitialAccent(): AccentColor {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  try {
    const saved = localStorage.getItem("kasirku_accent_color") as AccentColor;
    if (saved === "custom") return "custom";
    if (saved && saved in ACCENT_PRESETS) return saved;
  } catch {}
  return DEFAULT_ACCENT;
}

