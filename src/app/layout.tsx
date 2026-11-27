import "@/lib/polyfills";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { OfflineProvider } from "@/components/offline/OfflineProvider";
import { MobileViewportGuard } from "@/components/shared/MobileViewportGuard";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://tokogagan.biz.id"),
  title: "Kasirku POS - Toko Gagan 2",
  description: "Aplikasi POS Toko Sembako Cepat, Akurat, dan Terintegrasi",
  icons: {
    icon: "/favicon.png",
    apple: "/logo-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={jakartaSans.variable}>
      <head>
        {/* Polyfill esensial untuk Android 5.0.2 / Chrome 37+ */}
        <script src="/polyfills.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('kasirku_accent_color');
                  var presets = {
                    red: { p: '#F0090F', h: '#D6080E', a: '#B5070C', l: '#FEE2E2', b: '#FCA5A5' },
                    rose: { p: '#E11D48', h: '#BE123C', a: '#9F1239', l: '#FFE4E6', b: '#FDA4AF' },
                    orange: { p: '#EA580C', h: '#C2410C', a: '#9A3412', l: '#FFEDD5', b: '#FDBA74' },
                    amber: { p: '#D97706', h: '#B45309', a: '#92400E', l: '#FEF3C7', b: '#FCD34D' },
                    emerald: { p: '#059669', h: '#047857', a: '#065F46', l: '#D1FAE5', b: '#6EE7B7' },
                    blue: { p: '#2563EB', h: '#1D4ED8', a: '#1E40AF', l: '#DBEAFE', b: '#93C5FD' },
                    indigo: { p: '#4F46E5', h: '#4338CA', a: '#3730A3', l: '#E0E7FF', b: '#A5B4FC' },
                    purple: { p: '#7C3AED', h: '#6D28D9', a: '#5B21B6', l: '#EDE9FE', b: '#C4B5FD' }
                  };
                  function mix(h1, h2, w) {
                    var a = h1.replace('#',''), b = h2.replace('#','');
                    var r = Math.round(parseInt(a.slice(0,2),16)*(1-w) + parseInt(b.slice(0,2),16)*w);
                    var g = Math.round(parseInt(a.slice(2,4),16)*(1-w) + parseInt(b.slice(2,4),16)*w);
                    var bl = Math.round(parseInt(a.slice(4,6),16)*(1-w) + parseInt(b.slice(4,6),16)*w);
                    return '#' + [r,g,bl].map(function(v){ return v.toString(16).padStart(2,'0'); }).join('');
                  }
                  var c = presets[saved];
                  if (saved === 'custom') {
                    var ch = localStorage.getItem('kasirku_custom_accent_hex') || '#0EA5E9';
                    if (/^#[0-9a-fA-F]{6}$/.test(ch)) {
                      c = { p: ch, h: mix(ch,'#000000',0.14), a: mix(ch,'#000000',0.25), l: mix(ch,'#ffffff',0.88), b: mix(ch,'#ffffff',0.62) };
                    }
                  }
                  if (!c) c = presets.red;
                  var r = document.documentElement;
                  r.style.setProperty('--primary', c.p);
                  r.style.setProperty('--primary-hover', c.h);
                  r.style.setProperty('--primary-active', c.a);
                  r.style.setProperty('--primary-light', c.l);
                  r.style.setProperty('--primary-border', c.b);
                  r.setAttribute('data-accent', saved || 'red');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-[100dvh] bg-slate-50 text-slate-900 antialiased font-sans selection:bg-red-100 selection:text-red-900">
        <MobileViewportGuard />
        <ToastProvider>
          <OfflineProvider>{children}</OfflineProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
