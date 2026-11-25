import type { jsPDF } from "jspdf";

export interface BonItem {
  nama: string;
  qty: number;
  satuan: string;
  harga: number;
  subtotal: number;
}

export interface BonEntry {
  label: string;
  tanggal: string;
  rawDate?: Date;
  pengambil: string;
  kasir: string;
  items: BonItem[];
  total: number;
}

export interface MemberPDFData {
  nama: string;
  telepon?: string | null;
  alamat?: string | null;
  saldoUtangCache: number;
  batasKasbon?: number;
  transaksi?: any[];
  kasbonMutasi?: any[];
}

export interface StoreInfo {
  namaToko: string;
  alamat?: string | null;
  telepon?: string | null;
  footerStruk?: string | null;
}

// Colors matching system theme & receipts
const C_RED_TOP: [number, number, number] = [240, 9, 15]; // #F0090F
const C_DARK: [number, number, number] = [17, 24, 39]; // slate-900
const C_MUTED: [number, number, number] = [100, 116, 139]; // slate-500
const C_LIGHT_MUTED: [number, number, number] = [148, 163, 184]; // slate-400
const C_BORDER: [number, number, number] = [226, 232, 240]; // slate-200
const C_BG_CARD: [number, number, number] = [248, 250, 252]; // slate-50
const C_BG_HEADER: [number, number, number] = [241, 245, 249]; // slate-100
const C_RED_TEXT: [number, number, number] = [220, 38, 38]; // rose-600
const C_RED_BG: [number, number, number] = [254, 242, 242]; // rose-50

async function getBase64Image(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateBonMemberPDF(
  member: MemberPDFData,
  storeInfo: StoreInfo,
  logoBase64Override?: string
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let logoBase64: string | null = logoBase64Override || null;
  if (!logoBase64 && typeof window !== "undefined") {
    // Try circular store logo first, fallback to transparent logo
    logoBase64 = await getBase64Image("/img/Logo%20Toko%20Gagan%202.png");
    if (!logoBase64) {
      logoBase64 = await getBase64Image("/logo.png");
    }
  }

  const pageW = 210;
  const pageH = 297;
  const marginL = 16;
  const marginR = 194;
  const contentW = marginR - marginL; // 178mm
  let y = 0;

  const font = (size: number, bold = false, italic = false) => {
    let style = "normal";
    if (bold && italic) style = "bolditalic";
    else if (bold) style = "bold";
    else if (italic) style = "italic";
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };

  const color = (...rgb: [number, number, number]) => doc.setTextColor(...rgb);
  const fill = (...rgb: [number, number, number]) => doc.setFillColor(...rgb);
  const draw = (...rgb: [number, number, number]) => doc.setDrawColor(...rgb);

  const rp = (n: number) =>
    "Rp " + Number(n).toLocaleString("id-ID", { minimumFractionDigits: 0 });

  const drawRedTopBar = () => {
    fill(...C_RED_TOP);
    doc.rect(0, 0, pageW, 2.5, "F");
  };

  const drawPageHeader = () => {
    drawRedTopBar();
    y = 12;

    // Logo
    let headerTextX = marginL;
    if (logoBase64) {
      try {
        const logoSize = 18;
        doc.addImage(logoBase64, "PNG", marginL, y, logoSize, logoSize);
        headerTextX = marginL + logoSize + 4;
      } catch {}
    }

    // Store Info
    font(15, true);
    color(...C_DARK);
    doc.text((storeInfo.namaToko || "TOKO GAGAN 2").toUpperCase(), headerTextX, y + 4.5);

    font(7.5, false);
    color(...C_MUTED);
    const alamat = storeInfo.alamat || "Toko Sembako & Kebutuhan Harian";
    doc.text(alamat, headerTextX, y + 9);

    const telp = storeInfo.telepon
      ? (storeInfo.telepon.toLowerCase().includes("telp") ? storeInfo.telepon : `Telp/WA: ${storeInfo.telepon}`)
      : "Layanan Pelanggan Kasirku POS";
    doc.text(telp, headerTextX, y + 13.5);

    // Document Title on Right
    font(13, true);
    color(...C_RED_TEXT);
    doc.text("RINCIAN BON PIUTANG", marginR, y + 4.5, { align: "right" });

    font(7.5, false);
    color(...C_MUTED);
    doc.text("Rekap Mutasi & Tagihan Kasbon", marginR, y + 9, { align: "right" });

    // Status Pill: BELUM LUNAS
    const badgeW = 24;
    const badgeH = 5;
    fill(...C_RED_BG);
    draw(254, 202, 202);
    doc.roundedRect(marginR - badgeW, y + 11.5, badgeW, badgeH, 1, 1, "FD");
    font(7, true);
    color(...C_RED_TEXT);
    doc.text("BELUM LUNAS", marginR - badgeW / 2, y + 15, { align: "center" });

    y += 24;

    // Divider line
    draw(...C_BORDER);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, marginR, y);
    y += 5;
  };

  const checkPage = (neededSpace = 30) => {
    if (y + neededSpace > pageH - 22) {
      doc.addPage();
      drawRedTopBar();
      // Running compact header on subsequent pages
      y = 12;
      font(8, true);
      color(...C_MUTED);
      doc.text(`${(storeInfo.namaToko || "Toko Gagan 2").toUpperCase()} · Rincian Bon Piutang: ${member.nama}`, marginL, y);
      font(7.5, false);
      color(...C_LIGHT_MUTED);
      doc.text(new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }), marginR, y, { align: "right" });
      y += 3;
      draw(...C_BORDER);
      doc.setLineWidth(0.2);
      doc.line(marginL, y, marginR, y);
      y += 6;
    }
  };

  // 1. Initial Page Header
  drawPageHeader();

  // 2. Member Info Card
  const cardH = 24;
  fill(...C_BG_CARD);
  draw(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginL, y, contentW, cardH, 2, 2, "FD");

  // Left column in card: Member Data
  const midX = marginL + contentW * 0.58;
  font(7, true);
  color(...C_LIGHT_MUTED);
  doc.text("INFORMASI MEMBER / PELANGGAN", marginL + 4, y + 5);

  font(11, true);
  color(...C_DARK);
  doc.text(member.nama, marginL + 4, y + 11);

  font(7.5, false);
  color(...C_MUTED);
  const infoKontak = [
    member.telepon ? `No. HP: ${member.telepon}` : "No. HP: -",
    member.alamat ? `Alamat: ${member.alamat}` : "Alamat: -",
  ].join("  •  ");
  doc.text(infoKontak, marginL + 4, y + 16.5);

  font(7, false);
  color(...C_LIGHT_MUTED);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`, marginL + 4, y + 21);

  // Right column in card: Total Hutang Highlight
  font(7, true);
  color(...C_LIGHT_MUTED);
  doc.text("TOTAL HUTANG", marginR - 4, y + 5, { align: "right" });

  font(13, true);
  color(...C_RED_TEXT);
  doc.text(rp(member.saldoUtangCache), marginR - 4, y + 11.5, { align: "right" });

  font(7.5, false);
  color(...C_MUTED);
  if (member.batasKasbon && member.batasKasbon > 0) {
    doc.text(`Limit Kasbon: ${rp(member.batasKasbon)}`, marginR - 4, y + 16.5, { align: "right" });
  } else {
    doc.text("Limit Kasbon: Tanpa Batas", marginR - 4, y + 16.5, { align: "right" });
  }

  y += cardH + 7;

  // 3. Compile Bon Entries
  const bons: BonEntry[] = [];

  for (const trx of member.transaksi || []) {
    bons.push({
      label: "ID Bon: " + (trx.nomorStruk || "STRUK POS"),
      tanggal: new Date(trx.dibuatPada).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      rawDate: new Date(trx.dibuatPada),
      pengambil: member.nama,
      kasir: trx.kasir?.nama || "Pemilik Toko",
      items: (trx.items || []).map((it: any) => ({
        nama: it.namaSnapshot,
        qty: Number(it.qty),
        satuan: it.satuanSnapshot || "pcs",
        harga: it.hargaJualSnapshot,
        subtotal: it.subtotal,
      })),
      total: trx.total,
    });
  }

  const manualMutasiForPdf = (member.kasbonMutasi || []).filter(
    (m: any) => m.tipe === "KASBON" && (!m.transaksiId || m.catatan?.includes("BON MANUAL"))
  );

  for (const m of manualMutasiForPdf) {
    let pd: any = null;
    if (m.catatan?.includes("|| JSON:")) {
      try {
        pd = JSON.parse(m.catatan.split("|| JSON:")[1]);
      } catch {}
    }
    bons.push({
      label: "ID Bon: #" + m.id.slice(-6).toUpperCase(),
      tanggal: new Date(m.dibuatPada).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      rawDate: new Date(m.dibuatPada),
      pengambil: pd?.pengambil || member.nama,
      kasir: pd?.kasir || m.user?.nama || "Pemilik Toko",
      items: (pd?.items || []).map((it: any) => ({
        nama: it.nama,
        qty: Number(it.qty),
        satuan: it.satuan || "pcs",
        harga: it.harga,
        subtotal: it.subtotal,
      })),
      total: m.jumlah,
    });
  }

  // Urutkan semua bon sesuai tanggal (terlama ke terbaru / kronologis)
  bons.sort((a, b) => (a.rawDate?.getTime() || 0) - (b.rawDate?.getTime() || 0));

  if (bons.length === 0) {
    fill(...C_BG_CARD);
    draw(...C_BORDER);
    doc.roundedRect(marginL, y, contentW, 20, 2, 2, "FD");
    font(9, false);
    color(...C_MUTED);
    doc.text("Tidak ada rincian transaksi bon kasbon aktif untuk member ini.", pageW / 2, y + 11, { align: "center" });
    y += 26;
  }

  // 4. Render each Bon Entry
  for (let i = 0; i < bons.length; i++) {
    const bon = bons[i];
    checkPage(45);

    // Bon Header Bar
    const bonHeaderH = 11;
    fill(...C_BG_HEADER);
    draw(...C_BORDER);
    doc.roundedRect(marginL, y, contentW, bonHeaderH, 1.5, 1.5, "FD");

    // Title left
    font(9.5, true);
    color(...C_DARK);
    doc.text(`Bon ${i + 1} — ${bon.label}`, marginL + 4, y + 4.5);

    // Date right
    font(8, false);
    color(...C_MUTED);
    doc.text(bon.tanggal, marginR - 4, y + 4.5, { align: "right" });

    // Sub-info: Diambil oleh & Diterima oleh
    font(7.5, false);
    color(...C_LIGHT_MUTED);
    doc.text(`Diambil Oleh: `, marginL + 4, y + 8.5);
    font(7.5, true);
    color(...C_DARK);
    doc.text(bon.pengambil, marginL + 21, y + 8.5);

    font(7.5, false);
    color(...C_LIGHT_MUTED);
    doc.text(`Diterima Kasir: `, marginL + 75, y + 8.5);
    font(7.5, true);
    color(...C_DARK);
    doc.text(bon.kasir, marginL + 95, y + 8.5);

    y += bonHeaderH + 1.5;

    // Table Header
    const colQtyX = marginL + 88;
    const colHargaX = marginL + 125;
    const colSubtotalX = marginR - 4;

    fill(...C_BG_CARD);
    doc.rect(marginL, y, contentW, 6.5, "F");
    draw(...C_BORDER);
    doc.setLineWidth(0.2);
    doc.line(marginL, y + 6.5, marginR, y + 6.5);

    font(7, true);
    color(...C_MUTED);
    doc.text("NAMA BARANG", marginL + 4, y + 4.3);
    doc.text("QTY", colQtyX, y + 4.3, { align: "center" });
    doc.text("HARGA SATUAN", colHargaX, y + 4.3, { align: "right" });
    doc.text("SUBTOTAL", colSubtotalX, y + 4.3, { align: "right" });

    y += 7.5;

    // Table Rows
    if (bon.items.length > 0) {
      for (let j = 0; j < bon.items.length; j++) {
        const it = bon.items[j];
        checkPage(12);

        // Subtle row separator
        if (j > 0) {
          draw(245, 247, 250);
          doc.setLineWidth(0.15);
          doc.line(marginL + 2, y - 1, marginR - 2, y - 1);
        }

        font(8.5, false);
        color(...C_DARK);
        doc.text(it.nama.substring(0, 42), marginL + 4, y + 3.2);

        font(8, false);
        color(...C_MUTED);
        doc.text(`${it.qty} ${it.satuan}`, colQtyX, y + 3.2, { align: "center" });

        doc.text(rp(it.harga), colHargaX, y + 3.2, { align: "right" });

        font(8.5, true);
        color(...C_DARK);
        doc.text(rp(it.subtotal), colSubtotalX, y + 3.2, { align: "right" });

        y += 5.5;
      }
    } else {
      font(8, false, true);
      color(...C_LIGHT_MUTED);
      doc.text("(Tidak ada rincian item)", marginL + 4, y + 3.5);
      y += 6;
    }

    // Bon Summary Box (Sub Total, Bayar DP, Sisa, Total)
    y += 1.5;
    draw(...C_BORDER);
    doc.setLineWidth(0.2);
    doc.line(marginL, y, marginR, y);
    y += 4;

    const summaryW = 75;
    const summaryX = marginR - summaryW;

    const summaryRows: [string, number, boolean][] = [
      ["Sub Total", bon.total, false],
      ["Bayar DP", 0, false],
      ["Sisa Tagihan", bon.total, false],
    ];

    for (const [lbl, val, isTotal] of summaryRows) {
      font(7.5, false);
      color(...C_MUTED);
      doc.text(`${lbl} :`, summaryX + 22, y + 2.8, { align: "right" });

      font(8, false);
      color(...C_DARK);
      doc.text(rp(val), marginR - 4, y + 2.8, { align: "right" });
      y += 4.5;
    }

    // Highlight Total Box
    fill(...C_RED_BG);
    draw(254, 202, 202);
    doc.roundedRect(summaryX, y, summaryW, 7, 1, 1, "FD");

    font(8, true);
    color(...C_RED_TEXT);
    doc.text("TOTAL BON :", summaryX + 22, y + 4.5, { align: "right" });

    font(9.5, true);
    doc.text(rp(bon.total), marginR - 4, y + 4.7, { align: "right" });

    y += 12;

    // Spacing between bons
    if (i < bons.length - 1) {
      draw(...C_BORDER);
      doc.setLineWidth(0.3);
      doc.line(marginL, y, marginR, y);
      y += 7;
    }
  }

  y += 4;

  // 5. Footer (Pinned or at bottom)
  checkPage(15);
  draw(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, marginR, y);
  y += 4;

  font(7.5, false, true);
  color(...C_MUTED);
  const footerNote = storeInfo.footerStruk || "Terima kasih, mohon simpan bukti bon ini sebagai catatan pembayaran yang sah.";
  doc.text(footerNote, pageW / 2, y, { align: "center" });
  y += 3.8;

  font(7, false);
  color(...C_LIGHT_MUTED);
  doc.text(
    `Dicetak otomatis dari Sistem Kasirku POS · ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`,
    pageW / 2,
    y,
    { align: "center" }
  );

  // 7. Page numbers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    font(6.5, false);
    color(...C_LIGHT_MUTED);
    doc.text(`Halaman ${p} dari ${totalPages}`, marginR, pageH - 8, { align: "right" });
  }

  // 8. Save
  const safeMemberName = member.nama.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
  doc.save(`BonPiutang_${safeMemberName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
