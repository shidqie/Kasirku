import { jsPDF } from "jspdf";
import { registerPdfFont } from "@/lib/pdf-fonts";
import { formatRupiah } from "@/lib/formatters";
import { formatProductCode } from "@/lib/codification";

export interface PriceListProduct {
  id: string;
  nama: string;
  barcode: string | null;
  satuanDasar: string;
  stokCache: string | number;
  kategori: { id: string; nama: string } | null;
  satuanProduk: {
    id: string;
    namaSatuan: string;
    faktorKeDasar: string | number;
    hargaJual: number;
    hargaBeli: number;
    isDefault: boolean;
  }[];
}

export async function downloadPriceListPdf(
  products: PriceListProduct[],
  storeName = "Toko Sembako"
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const fontName = await registerPdfFont(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const drawHeader = (pageNum: number) => {
    doc.setFont(fontName, "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("DAFTAR HARGA PRODUK", marginX, 16);

    doc.setFont(fontName, "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    doc.text(`${storeName}  •  Dicetak: ${dateStr}  •  Total: ${products.length} produk`, marginX, 22);
    doc.text(`Hal. ${pageNum}`, pageWidth - marginX, 16, { align: "right" });

    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, 25, pageWidth - marginX, 25);
  };

  const drawTableHeader = (y: number) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, y, contentWidth, 8, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, y, pageWidth - marginX, y);
    doc.line(marginX, y + 8, pageWidth - marginX, y + 8);

    doc.setFont(fontName, "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("NO", marginX + 2, y + 5.5);
    doc.text("KODE", marginX + 11, y + 5.5);
    doc.text("NAMA PRODUK", marginX + 35, y + 5.5);
    doc.text("KATEGORI", marginX + 105, y + 5.5);
    doc.text("SATUAN", marginX + 138, y + 5.5);
    doc.text("HARGA JUAL", pageWidth - marginX - 2, y + 5.5, { align: "right" });

    return y + 8;
  };

  let pageNum = 1;
  drawHeader(pageNum);
  let y = drawTableHeader(29);

  // Hitung kode per kategori agar konsisten dengan tabel UI
  const categoryCounters: Record<string, number> = {};

  products.forEach((p, idx) => {
    const catName = p.kategori?.nama || "Umum";
    categoryCounters[catName] = (categoryCounters[catName] || 0) + 1;
    const code = formatProductCode(catName, categoryCounters[catName]);

    const units =
      p.satuanProduk.length > 0
        ? p.satuanProduk
        : [
            {
              id: "default",
              namaSatuan: p.satuanDasar,
              faktorKeDasar: 1,
              hargaJual: 0,
              hargaBeli: 0,
              isDefault: true,
            },
          ];

    const rowHeight = Math.max(7, units.length * 5.5 + 2);
    if (y + rowHeight > pageHeight - 14) {
      doc.addPage();
      pageNum += 1;
      drawHeader(pageNum);
      y = drawTableHeader(29);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(marginX, y, contentWidth, rowHeight, "F");
    }

    doc.setFont(fontName, "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(String(idx + 1), marginX + 2, y + 5);
    doc.text(code, marginX + 11, y + 5);

    doc.setFont(fontName, "bold");
    doc.setTextColor(15, 23, 42);
    const truncatedName = doc.splitTextToSize(p.nama, 67)[0] || p.nama;
    doc.text(truncatedName, marginX + 35, y + 5);

    doc.setFont(fontName, "normal");
    doc.setTextColor(71, 85, 105);
    const truncatedCat = doc.splitTextToSize(catName, 30)[0] || catName;
    doc.text(truncatedCat, marginX + 105, y + 5);

    units.forEach((u, uIdx) => {
      const unitY = y + 5 + uIdx * 5.2;
      doc.setFont(fontName, "normal");
      doc.setTextColor(71, 85, 105);
      const unitLabel = doc.splitTextToSize(u.namaSatuan, 24)[0] || u.namaSatuan;
      doc.text(unitLabel, marginX + 138, unitY);

      doc.setFont(fontName, "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(formatRupiah(u.hargaJual), pageWidth - marginX - 2, unitY, { align: "right" });
    });

    doc.setDrawColor(241, 245, 249);
    doc.line(marginX, y + rowHeight, pageWidth - marginX, y + rowHeight);
    y += rowHeight;
  });

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`daftar-harga-${fileDate}.pdf`);
}

export function downloadPriceListCsv(products: PriceListProduct[]): void {
  const escapeCsv = (val: string | number) => {
    const str = String(val ?? "");
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headers = [
    "Kode",
    "Nama Produk",
    "Kategori",
    "Barcode",
    "Satuan",
    "Isi",
    "Harga Beli",
    "Harga Jual",
    "Stok",
  ];

  const categoryCounters: Record<string, number> = {};
  const rows: string[] = [headers.map(escapeCsv).join(",")];

  for (const p of products) {
    const catName = p.kategori?.nama || "Umum";
    categoryCounters[catName] = (categoryCounters[catName] || 0) + 1;
    const code = formatProductCode(catName, categoryCounters[catName]);

    const units =
      p.satuanProduk.length > 0
        ? p.satuanProduk
        : [
            {
              id: "default",
              namaSatuan: p.satuanDasar,
              faktorKeDasar: 1,
              hargaJual: 0,
              hargaBeli: 0,
              isDefault: true,
            },
          ];

    for (const u of units) {
      rows.push(
        [
          code,
          p.nama,
          catName,
          p.barcode || "",
          u.namaSatuan,
          Number(u.faktorKeDasar) || 1,
          u.hargaBeli,
          u.hargaJual,
          Number(p.stokCache) || 0,
        ]
          .map(escapeCsv)
          .join(",")
      );
    }
  }

  const csvContent = "\uFEFF" + rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileDate = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `daftar-harga-${fileDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
