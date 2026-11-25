import type { jsPDF } from "jspdf";

let cachedRegularB64: string | null = null;
let cachedBoldB64: string | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

async function fetchFontBase64(url: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return arrayBufferToBase64(buf);
  } catch {
    return null;
  }
}

/**
 * Registers Plus Jakarta Sans (normal & bold) on a jsPDF document.
 * Returns the active font family name ("PlusJakartaSans" or fallback "helvetica").
 */
export async function registerPdfFont(doc: jsPDF): Promise<string> {
  try {
    if (!cachedRegularB64) {
      cachedRegularB64 = await fetchFontBase64("/fonts/PlusJakartaSans-Regular.ttf");
    }
    if (!cachedBoldB64) {
      cachedBoldB64 = await fetchFontBase64("/fonts/PlusJakartaSans-Bold.ttf");
    }
    if (!cachedRegularB64 || !cachedBoldB64) {
      return "helvetica";
    }

    doc.addFileToVFS("PlusJakartaSans-Regular.ttf", cachedRegularB64);
    doc.addFont("PlusJakartaSans-Regular.ttf", "PlusJakartaSans", "normal");

    doc.addFileToVFS("PlusJakartaSans-Bold.ttf", cachedBoldB64);
    doc.addFont("PlusJakartaSans-Bold.ttf", "PlusJakartaSans", "bold");

    doc.setFont("PlusJakartaSans", "normal");
    return "PlusJakartaSans";
  } catch {
    return "helvetica";
  }
}
