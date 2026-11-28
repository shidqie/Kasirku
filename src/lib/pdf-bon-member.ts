import type { jsPDF } from "jspdf";
import { registerPdfFont } from "@/lib/pdf-fonts";

export interface BonItem {
  nama: string;
  qty: number;
  satuan: string;
  harga: number;
  subtotal: number;
}

export interface BonSubEntry {
  label: string;
  jam: string;
  rawDate: Date;
  pengambil: string;
  kasir: string;
  dikoreksiOleh?: string;
  items: BonItem[];
  total: number;
}

export interface BonEntry {
  label: string;
  tanggal: string;
  rawDate?: Date;
  pengambil: string;
  kasir: string;
  items: BonItem[];
  subEntries?: BonSubEntry[];
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
  kasbonPembayaran?: any[];
}

export interface StoreInfo {
  namaToko: string;
  alamat?: string | null;
  telepon?: string | null;
  headerBon?: string | null;
  footerBon?: string | null;
  footerStruk?: string | null;
  logoToko?: string | null;
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

async function renderMemberBonToDoc(
  doc: jsPDF,
  member: MemberPDFData,
  storeInfo: StoreInfo,
  fontFamily: string,
  logoBase64: string | null,
  options?: { skipHeader?: boolean; skipFooter?: boolean; startY?: number }
): Promise<{ bons: BonEntry[]; finalY: number }> {
  const pageW = 210;
  const pageH = 297;
  const marginL = 16;
  const marginR = 194;
  const contentW = marginR - marginL; // 178mm
  let y = options?.startY ?? 0;

  const font = (size: number, bold = false, italic = false) => {
    let style = "normal";
    if (fontFamily === "PlusJakartaSans") {
      style = bold ? "bold" : "normal";
    } else {
      if (bold && italic) style = "bolditalic";
      else if (bold) style = "bold";
      else if (italic) style = "italic";
    }
    doc.setFont(fontFamily, style);
    doc.setFontSize(size);
  };

  const color = (...rgb: [number, number, number]) => doc.setTextColor(...rgb);
  const fill = (...rgb: [number, number, number]) => doc.setFillColor(...rgb);
  const draw = (...rgb: [number, number, number]) => doc.setDrawColor(...rgb);

  const rp = (n: number) =>
    "Rp " + Number(n).toLocaleString("id-ID", { minimumFractionDigits: 0 });

  const C_ACCENT: [number, number, number] = [225, 29, 42]; // #E11D2A
  const C_PILL_DEBT_BG: [number, number, number] = [253, 232, 238];
  const C_PILL_DEBT_FG: [number, number, number] = [200, 22, 64];
  const C_PILL_OK_BG: [number, number, number] = [227, 246, 238];
  const C_PILL_OK_FG: [number, number, number] = [10, 143, 90];

  const isLunas = Number(member.saldoUtangCache || 0) <= 0;
  const printedDateLong = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const drawPageHeader = () => {
    const centerX = pageW / 2;
    y = 14;

    // Logo bulat tengah
    const logoSize = 11;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", centerX - logoSize / 2, y, logoSize, logoSize);
      } catch {}
    } else {
      fill(...C_ACCENT);
      doc.circle(centerX, y + logoSize / 2, logoSize / 2, "F");
    }
    y += logoSize + 4;

    // NAMA TOKO (Centered, lebih besar)
    font(15, true);
    color(...C_DARK);
    doc.text((storeInfo.namaToko || "Toko Sembako").toUpperCase(), centerX, y, { align: "center" });
    y += 5.5;

    // ALAMAT (Centered, lebih besar & jelas)
    font(9.5, false);
    color(...C_MUTED);
    const alamatTelp = [storeInfo.alamat, storeInfo.telepon].filter(Boolean).join(" · ") || "Kasirku POS";
    const alamatLines: string[] = doc.splitTextToSize(alamatTelp, contentW - 12);
    doc.text(alamatLines, centerX, y, { align: "center" });
    y += alamatLines.length * 4.4 + 3;

    // Divider 1
    draw(...C_BORDER);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, marginR, y);
    y += 6;

    // RINCIAN BON PIUTANG (Centered, customizable)
    font(14, true);
    color(...C_DARK);
    doc.text((storeInfo.headerBon || "RINCIAN BON PIUTANG").toUpperCase(), centerX, y, { align: "center" });
    y += 4;

    // Divider 2
    draw(...C_BORDER);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, marginR, y);
    y += 5.5;

    // Dicetak - ... + Status teks polos tanpa bubble (Centered)
    font(8, false);
    color(...C_MUTED);
    doc.text(`Dicetak - ${printedDateLong}`, centerX, y, { align: "center" });
    y += 5;

    const statusText = isLunas ? "Lunas" : "Belum Lunas";
    font(9, true);
    color(...(isLunas ? C_PILL_OK_FG : C_PILL_DEBT_FG));
    doc.text(statusText, centerX, y, { align: "center" });

    y += 7;
  };

  const checkPage = (neededSpace = 30) => {
    if (y + neededSpace > pageH - 22) {
      doc.addPage();
      y = 14;
      font(8, true);
      color(...C_MUTED);
      doc.text(`${storeInfo.namaToko || "Kasirku POS"} · Rincian Bon Piutang: ${member.nama}`, marginL, y);
      font(7.5, false);
      color(...C_LIGHT_MUTED);
      doc.text(
        new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
        marginR,
        y,
        { align: "right" }
      );
      y += 3;
      draw(...C_BORDER);
      doc.setLineWidth(0.2);
      doc.line(marginL, y, marginR, y);
      y += 7;
    }
  };

  // 1. Initial Page Header (opsional jika digabung dalam rekap semua)
  if (!options?.skipHeader) {
    drawPageHeader();
  }

  // 2. Pelanggan & Total Utang Strip (Tanpa Limit Kasbon)
  draw(...C_DARK);
  doc.setLineWidth(0.45);
  doc.line(marginL, y, marginR, y);
  y += 6;

  // Left: Pelanggan
  font(8, false);
  color(...C_MUTED);
  doc.text("Pelanggan", marginL, y);

  font(14, true);
  color(...C_DARK);
  doc.text(member.nama, marginL, y + 6.5);

  font(8, false);
  color(...C_MUTED);
  const infoKontak = [
    member.telepon ? `No. HP: ${member.telepon}` : "No. HP: -",
    member.alamat ? `Alamat: ${member.alamat}` : "Alamat: -",
  ].join(" · ");
  doc.text(infoKontak, marginL, y + 12);

  // Right: Total utang (tanpa limit kasbon)
  font(8, false);
  color(...C_MUTED);
  doc.text("Total utang", marginR, y, { align: "right" });

  font(18, true);
  color(...C_ACCENT);
  doc.text(rp(member.saldoUtangCache), marginR, y + 8, { align: "right" });

  y += 17;
  draw(...C_BORDER);
  doc.setLineWidth(0.25);
  doc.line(marginL, y, marginR, y);
  y += 9;

  // 3. Compile Bon Entries (dikelompokkan per tanggal, detail per jam pengambilan)
  const rawSubs: BonSubEntry[] = [];

  const formatBonDateOnly = (d: string | Date) =>
    new Date(d).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatBonTime = (d: string | Date) =>
    `${new Date(d).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })} WIB`;

  const getLocalDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  for (const trx of member.transaksi || []) {
    const dt = new Date(trx.dibuatPada);
    rawSubs.push({
      label: trx.nomorStruk || "STRUK POS",
      jam: formatBonTime(dt),
      rawDate: dt,
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
    const dt = new Date(m.dibuatPada);
    rawSubs.push({
      label: "#" + m.id.slice(-6).toUpperCase(),
      jam: formatBonTime(dt),
      rawDate: dt,
      pengambil: pd?.pengambil || member.nama,
      kasir: pd?.kasir || m.user?.nama || "Pemilik Toko",
      dikoreksiOleh: pd?.dikoreksiOleh || undefined,
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

  const groupedByDate = new Map<string, BonSubEntry[]>();
  for (const sub of rawSubs) {
    const key = getLocalDateKey(sub.rawDate);
    const bucket = groupedByDate.get(key) || [];
    bucket.push(sub);
    groupedByDate.set(key, bucket);
  }

  const bons: BonEntry[] = Array.from(groupedByDate.values()).map((subs) => {
    const sortedSubs = [...subs].sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    return {
      label:
        sortedSubs.length === 1
          ? sortedSubs[0].label
          : `${sortedSubs.length} pengambilan`,
      tanggal: formatBonDateOnly(sortedSubs[0].rawDate),
      rawDate: sortedSubs[0].rawDate,
      pengambil: Array.from(new Set(sortedSubs.map((s) => s.pengambil))).join(", "),
      kasir: Array.from(new Set(sortedSubs.map((s) => s.kasir))).join(", "),
      items: sortedSubs.flatMap((s) => s.items),
      subEntries: sortedSubs,
      total: sortedSubs.reduce((sum, s) => sum + Number(s.total || 0), 0),
    };
  });

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

  // 4. Hitung status pembayaran tiap bon secara FIFO (kronologis)
  const totalAllBons = bons.reduce((sum, b) => sum + Number(b.total || 0), 0);
  let remainingPaid = isLunas
    ? totalAllBons
    : Math.max(0, totalAllBons - Number(member.saldoUtangCache || 0));

  const bonStatusList = bons.map((b) => {
    const amt = Number(b.total || 0);
    if (isLunas || amt <= 0 || remainingPaid >= amt) {
      remainingPaid = Math.max(0, remainingPaid - amt);
      return { status: "LUNAS" as const, paidAmt: amt, sisaAmt: 0 };
    }
    if (remainingPaid > 0) {
      const paid = remainingPaid;
      remainingPaid = 0;
      return { status: "CICIL" as const, paidAmt: paid, sisaAmt: Math.max(0, amt - paid) };
    }
    return { status: "BELUM_LUNAS" as const, paidAmt: 0, sisaAmt: amt };
  });

  const C_AMBER_BG: [number, number, number] = [254, 243, 199];
  const C_AMBER_FG: [number, number, number] = [180, 83, 9];

  // Render each Bon Entry
  for (let i = 0; i < bons.length; i++) {
    const bon = bons[i];
    const bInfo = bonStatusList[i];
    checkPage(45);

    // Bon Header (Sama seperti UI: BON 0001 + Status di kanan, lalu baris Tanggal)
    const bonCode = `BON ${String(i + 1).padStart(4, "0")}`;
    font(10, true);
    color(...C_DARK);
    doc.text(bonCode, marginL, y);

    const statusLabel =
      bInfo.status === "LUNAS"
        ? "Lunas"
        : bInfo.status === "CICIL"
        ? "Cicilan"
        : "Belum Lunas";
    const statusFg =
      bInfo.status === "LUNAS"
        ? C_PILL_OK_FG
        : bInfo.status === "CICIL"
        ? C_AMBER_FG
        : C_PILL_DEBT_FG;

    font(8.5, true);
    color(...statusFg);
    doc.text(statusLabel, marginR, y, { align: "right" });

    y += 5;
    font(8.5, false);
    color(...C_MUTED);
    doc.text("Tanggal", marginL, y);

    font(8.5, true);
    color(...C_DARK);
    doc.text(bon.tanggal, marginR, y, { align: "right" });

    y += 3.5;
    draw(...C_BORDER);
    doc.setLineWidth(0.25);
    doc.line(marginL, y, marginR, y);
    y += 6;

    // Render tiap pengambilan (sub-entry) pada tanggal tersebut dengan jamnya
    const subEntries = bon.subEntries && bon.subEntries.length > 0
      ? bon.subEntries
      : [
          {
            label: bon.label,
            jam: bon.rawDate
              ? `${bon.rawDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`
              : "",
            rawDate: bon.rawDate || new Date(),
            pengambil: bon.pengambil,
            kasir: bon.kasir,
            items: bon.items,
            total: bon.total,
          },
        ];

    const colQtyX = marginL + 95;
    const colHargaX = marginL + 135;
    const colSubtotalX = marginR;

    for (let sIdx = 0; sIdx < subEntries.length; sIdx++) {
      const sub = subEntries[sIdx];
      checkPage(28);

      // Baris Pengambilan X + Jam
      font(9, true);
      color(...C_DARK);
      doc.text(`Pengambilan ${sIdx + 1}`, marginL, y);

      font(8.5, false);
      color(...C_MUTED);
      doc.text(sub.jam || "", marginR, y, { align: "right" });
      y += 4.5;

      // Baris Diambil oleh [Bold] · #... · Kasir [Bold]
      let curX = marginL;
      const drawSeg = (txt: string, bold: boolean, rgb: [number, number, number]) => {
        font(8, bold);
        color(...rgb);
        doc.text(txt, curX, y);
        curX += doc.getTextWidth(txt);
      };
      drawSeg("Diambil oleh ", false, C_MUTED);
      drawSeg(sub.pengambil, true, C_DARK);
      const cleanSubCode = String(sub.label || "").replace(/^ID Bon:\s*/i, "");
      if (cleanSubCode) {
        drawSeg(` · ${cleanSubCode}`, false, C_MUTED);
      }
      drawSeg(" · Kasir ", false, C_MUTED);
      drawSeg(sub.kasir, true, C_DARK);
      if (sub.dikoreksiOleh) {
        drawSeg(" · Dikoreksi oleh : ", false, C_AMBER_FG);
        drawSeg(sub.dikoreksiOleh, true, C_AMBER_FG);
      }
      y += 5.5;

      // Table Header (Barang, Qty, Harga Satuan, Subtotal)
      font(8, true);
      color(...C_MUTED);
      doc.text("Barang", marginL, y);
      doc.text("Qty", colQtyX, y, { align: "right" });
      doc.text("Harga Satuan", colHargaX, y, { align: "right" });
      doc.text("Subtotal", colSubtotalX, y, { align: "right" });

      y += 2.5;
      draw(...C_DARK);
      doc.setLineWidth(0.35);
      doc.line(marginL, y, marginR, y);
      y += 5;

      // Table Rows
      if (sub.items.length > 0) {
        for (let j = 0; j < sub.items.length; j++) {
          const it = sub.items[j];
          checkPage(12);

          font(8.5, false);
          color(...C_DARK);
          doc.text(it.nama.substring(0, 44), marginL, y);

          font(8.5, false);
          color(...C_DARK);
          doc.text(`${it.qty} ${it.satuan}`, colQtyX, y, { align: "right" });
          doc.text(rp(it.harga), colHargaX, y, { align: "right" });

          font(8.5, true);
          color(...C_DARK);
          doc.text(rp(it.subtotal), colSubtotalX, y, { align: "right" });

          y += 3;
          draw(...C_BORDER);
          doc.setLineWidth(0.2);
          doc.line(marginL, y, marginR, y);
          y += 5;
        }
      } else {
        font(8, false, true);
        color(...C_LIGHT_MUTED);
        doc.text("(Tidak ada rincian item)", marginL, y);
        y += 6;
      }

      if (sIdx < subEntries.length - 1) {
        y += 2;
      }
    }

    // Bon Summary (Clean right-aligned)
    y += 1.5;
    const summaryW = 72;
    const summaryX = marginR - summaryW;

    const summaryRows: Array<{ lbl: string; val: number; isGreen?: boolean }> = [
      { lbl: "Subtotal", val: bon.total },
      { lbl: "Total Bon", val: bon.total },
      { lbl: "Sudah Dibayar", val: bInfo.paidAmt, isGreen: bInfo.paidAmt > 0 },
    ];

    for (const row of summaryRows) {
      font(8.5, row.isGreen ? true : false);
      color(...(row.isGreen ? C_PILL_OK_FG : C_MUTED));
      doc.text(row.lbl, summaryX, y);
      doc.text(rp(row.val), marginR, y, { align: "right" });
      y += 5;
    }

    y += 1;
    draw(...C_DARK);
    doc.setLineWidth(0.4);
    doc.line(summaryX, y, marginR, y);
    y += 5.5;

    font(10.5, true);
    if (bInfo.status === "LUNAS") {
      color(...C_PILL_OK_FG);
      doc.text("Sisa Tagihan (Lunas)", summaryX, y);
      doc.text(rp(0), marginR, y, { align: "right" });
    } else if (bInfo.status === "CICIL") {
      color(...C_AMBER_FG);
      doc.text("Sisa Tagihan", summaryX, y);
      doc.text(rp(bInfo.sisaAmt), marginR, y, { align: "right" });
    } else {
      color(...C_ACCENT);
      doc.text("Sisa Tagihan", summaryX, y);
      doc.text(rp(bInfo.sisaAmt), marginR, y, { align: "right" });
    }

    y += 12;
  }

  // 4b. Riwayat Pembayaran (jika sudah ada pembayaran)
  const payments = Array.isArray(member.kasbonPembayaran) ? member.kasbonPembayaran : [];
  if (payments.length > 0) {
    checkPage(32);
    const totalPaidAll = payments.reduce((sum, p) => sum + Number(p.jumlah || 0), 0);

    font(10, true);
    color(...C_DARK);
    doc.text("Riwayat Pembayaran", marginL, y);

    font(9, true);
    color(...C_PILL_OK_FG);
    doc.text(`Total dibayar: ${rp(totalPaidAll)}`, marginR, y, { align: "right" });
    y += 5;

    const pColTgl = marginL + 38;
    const pColMetode = marginL + 86;
    const pColKasir = marginL + 114;

    font(7.5, true);
    color(...C_MUTED);
    doc.text("NO. BUKTI", marginL, y);
    doc.text("WAKTU", pColTgl, y);
    doc.text("METODE", pColMetode, y);
    doc.text("KASIR", pColKasir, y);
    doc.text("NOMINAL", marginR, y, { align: "right" });

    y += 2.5;
    draw(...C_DARK);
    doc.setLineWidth(0.35);
    doc.line(marginL, y, marginR, y);
    y += 5;

    for (const p of payments) {
      checkPage(10);
      const tglPay = p.dibuatPada
        ? new Date(p.dibuatPada).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "-";

      font(8, true);
      color(...C_DARK);
      doc.text(String(p.nomorBukti || "-"), marginL, y);

      font(8, false);
      color(...C_MUTED);
      doc.text(tglPay, pColTgl, y);
      doc.text(String(p.metode || "-"), pColMetode, y);
      doc.text(String(p.kasir?.nama || "Kasir").substring(0, 22), pColKasir, y);

      font(8.5, true);
      color(...C_PILL_OK_FG);
      doc.text(rp(Number(p.jumlah || 0)), marginR, y, { align: "right" });

      y += 3;
      draw(...C_BORDER);
      doc.setLineWidth(0.2);
      doc.line(marginL, y, marginR, y);
      y += 5;
    }

    y += 4;
  }

  y += 4;

  // 5. Footer Minimalis (Centered)
  if (!options?.skipFooter) {
    checkPage(26);
    draw(...C_BORDER);
    doc.setLineWidth(0.25);
    doc.line(marginL, y, marginR, y);
    y += 7;

    const centerX = pageW / 2;
    const nowDate = new Date();
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const nowStr = `${pad2(nowDate.getDate())}/${pad2(nowDate.getMonth() + 1)}/${nowDate.getFullYear()} ${pad2(
      nowDate.getHours()
    )}.${pad2(nowDate.getMinutes())}`;

    const footerBonText =
      storeInfo.footerBon?.trim() ||
      "Harap simpan bukti transaksi ini sebagai arsip pembayaran.\nTerima kasih atas kepercayaan Anda.";
    const footerBonLines = footerBonText.split("\n").map((l) => l.trim()).filter(Boolean);

    footerBonLines.forEach((line, idx) => {
      const isLast = idx === footerBonLines.length - 1;
      font(isLast ? 9 : 8, isLast);
      color(...(isLast ? C_DARK : C_MUTED));
      doc.text(line, centerX, y, { align: "center" });
      y += 5.5;
    });

    font(7.5, false);
    color(...C_LIGHT_MUTED);
    doc.text(`Dicetak otomatis dari Kasirku POS · ${nowStr}`, centerX, y, { align: "center" });
  }

  return { bons, finalY: y };
}

export async function generateBonMemberPDF(
  member: MemberPDFData,
  storeInfo: StoreInfo,
  logoBase64Override?: string
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontFamily = await registerPdfFont(doc);

  let logoBase64: string | null = logoBase64Override || storeInfo.logoToko || null;
  if (!logoBase64 && typeof window !== "undefined") {
    // Try circular store logo first, fallback to transparent logo
    logoBase64 = await getBase64Image("/img/Logo%20Toko%20Gagan%202.png");
    if (!logoBase64) {
      logoBase64 = await getBase64Image("/logo.png");
    }
  }

  const { bons } = await renderMemberBonToDoc(doc, member, storeInfo, fontFamily, logoBase64);

  const pageH = 297;
  const marginR = 194;
  const font = (size: number, bold = false) => {
    doc.setFont(fontFamily, bold ? "bold" : "normal");
    doc.setFontSize(size);
  };
  const color = (...rgb: [number, number, number]) => doc.setTextColor(...rgb);

  // 7. Page numbers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    font(6.5, false);
    color(...C_LIGHT_MUTED);
    doc.text(`Halaman ${p} dari ${totalPages}`, marginR, pageH - 8, { align: "right" });
  }

  // 8. Save: TRANSAKSI_BON_{NAMA_TOKO}_{YYYY-MM-DD}_{URUTAN}.pdf
  const tokoSlug =
    (storeInfo.namaToko || "TOKO")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "TOKO";

  const lastBon = bons[bons.length - 1];
  const refDate =
    lastBon?.rawDate && !isNaN(new Date(lastBon.rawDate).getTime())
      ? new Date(lastBon.rawDate)
      : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const tglStr = `${refDate.getFullYear()}-${pad(refDate.getMonth() + 1)}-${pad(refDate.getDate())}`;

  const lastLabel = lastBon ? lastBon.label.replace(/^ID Bon:\s*/i, "").replace(/^#/, "") : "";
  const labelParts = lastLabel.split("-");
  const urutanBon = labelParts[labelParts.length - 1] || "001";

  doc.save(`TRANSAKSI_BON_${tokoSlug}_${tglStr}_${urutanBon}.pdf`);
}

export interface AllMemberSummaryRow {
  kode: string;
  nama: string;
  telepon?: string | null;
  alamat?: string | null;
  batasKasbon: number;
  saldoUtangCache: number;
  detail?: MemberPDFData;
}

export async function generateAllMembersPDF(
  members: AllMemberSummaryRow[],
  storeInfo: StoreInfo,
  filterLabel = "Semua Pelanggan"
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontFamily = await registerPdfFont(doc);

  let logoBase64: string | null = storeInfo.logoToko || null;
  if (!logoBase64 && typeof window !== "undefined") {
    logoBase64 = await getBase64Image("/img/Logo%20Toko%20Gagan%202.png");
    if (!logoBase64) logoBase64 = await getBase64Image("/logo.png");
  }

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 14;
  const marginR = pageW - 14;
  const contentW = marginR - marginL;

  const font = (size: number, bold = false) => {
    doc.setFont(fontFamily, bold ? "bold" : "normal");
    doc.setFontSize(size);
  };
  const color = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

  const centerX = pageW / 2;
  let y = 14;

  // Logo bulat tengah
  const logoSize = 11;
  if (logoBase64) {
    try {
      const fmt = logoBase64.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(logoBase64, fmt, centerX - logoSize / 2, y, logoSize, logoSize);
    } catch {}
  } else {
    doc.setFillColor(...C_RED_TOP);
    doc.circle(centerX, y + logoSize / 2, logoSize / 2, "F");
  }
  y += logoSize + 4;

  // Nama Toko (Centered)
  font(15, true);
  color(...C_DARK);
  doc.text((storeInfo.namaToko || "Toko Sembako").toUpperCase(), centerX, y, { align: "center" });
  y += 5.5;

  // Alamat & Telepon (Centered)
  font(9.5, false);
  color(...C_MUTED);
  const alamatTelp = [storeInfo.alamat, storeInfo.telepon].filter(Boolean).join(" · ") || "Kasirku POS";
  const alamatLines: string[] = doc.splitTextToSize(alamatTelp, contentW - 12);
  doc.text(alamatLines, centerX, y, { align: "center" });
  y += alamatLines.length * 4.4 + 3;

  // Divider 1
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, marginR, y);
  y += 6;

  // Judul Rekap (Centered)
  font(13, true);
  color(...C_DARK);
  doc.text("REKAP PIUTANG PELANGGAN", centerX, y, { align: "center" });
  y += 4;

  // Divider 2
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, marginR, y);
  y += 5.5;

  const now = new Date();
  const printedDateLong = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  font(8, false);
  color(...C_MUTED);
  doc.text(`${filterLabel} · Dicetak - ${printedDateLong}`, centerX, y, { align: "center" });
  y += 7;

  // Summary boxes
  const totalPelanggan = members.length;
  const totalUtang = members.reduce((sum, m) => sum + Number(m.saldoUtangCache || 0), 0);
  const jumlahBerutang = members.filter((m) => Number(m.saldoUtangCache || 0) > 0).length;

  const boxW = (contentW - 6) / 3;
  const drawSummaryBox = (x: number, label: string, val: string, isDanger = false) => {
    doc.setFillColor(...C_BG_CARD);
    doc.setDrawColor(...C_BORDER);
    doc.roundedRect(x, y, boxW, 14, 2, 2, "FD");
    font(7, false);
    color(...C_MUTED);
    doc.text(label, x + 3.5, y + 5);
    font(10.5, true);
    if (isDanger) color(...C_RED_TEXT);
    else color(...C_DARK);
    doc.text(val, x + 3.5, y + 11);
  };

  drawSummaryBox(marginL, "Total Pelanggan", `${totalPelanggan} orang`);
  drawSummaryBox(marginL + boxW + 3, "Pelanggan Berutang", `${jumlahBerutang} orang`);
  drawSummaryBox(marginL + (boxW + 3) * 2, "Total Saldo Piutang", rp(totalUtang), totalUtang > 0);
  y += 20;

  // Table Header
  const drawTableHeader = (startY: number) => {
    doc.setFillColor(...C_BG_HEADER);
    doc.rect(marginL, startY, contentW, 7.5, "F");
    font(7.5, true);
    color(...C_MUTED);
    doc.text("No", marginL + 2.5, startY + 5);
    doc.text("Kode", marginL + 11, startY + 5);
    doc.text("Nama Pelanggan", marginL + 31, startY + 5);
    doc.text("No. HP / WA", marginL + 84, startY + 5);
    doc.text("Status", marginL + 124, startY + 5);
    doc.text("Total Utang", marginR - 2.5, startY + 5, { align: "right" });
    return startY + 7.5;
  };

  y = drawTableHeader(y);

  members.forEach((m, idx) => {
    if (y > pageH - 22) {
      doc.addPage();
      doc.setFillColor(...C_RED_TOP);
      doc.rect(0, 0, pageW, 3, "F");
      y = drawTableHeader(14);
    }

    const rowH = 7.5;
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(marginL, y, contentW, rowH, "F");
    }

    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.2);
    doc.line(marginL, y + rowH, marginR, y + rowH);

    const utang = Number(m.saldoUtangCache || 0);
    font(7.5, false);
    color(...C_MUTED);
    doc.text(String(idx + 1), marginL + 2.5, y + 5);
    doc.text(m.kode, marginL + 11, y + 5);

    font(8, true);
    color(...C_DARK);
    doc.text(m.nama.slice(0, 26), marginL + 31, y + 5);

    font(7.5, false);
    color(...C_MUTED);
    doc.text((m.telepon || "-").slice(0, 18), marginL + 84, y + 5);

    font(7.5, true);
    if (utang > 0) color(...C_RED_TEXT);
    else color(22, 163, 74);
    doc.text(utang > 0 ? "Belum Lunas" : "Lunas", marginL + 124, y + 5);

    font(8, true);
    if (utang > 0) color(...C_RED_TEXT);
    else color(...C_DARK);
    doc.text(rp(utang), marginR - 2.5, y + 5, { align: "right" });

    y += rowH;
  });

  // Render rincian nota bon tiap pelanggan pada halaman baru masing-masing (tidak digabung)
  const detailedMembers = members.filter((m) => Boolean(m.detail));
  if (detailedMembers.length > 0) {
    for (let i = 0; i < detailedMembers.length; i++) {
      const m = detailedMembers[i];
      if (!m.detail) continue;

      // Selalu mulai di halaman baru untuk setiap pelanggan berbeda
      doc.addPage();
      y = 16;

      // Sub-bab judul per pelanggan
      doc.setFillColor(248, 250, 252);
      doc.rect(marginL, y, contentW, 10, "F");
      doc.setDrawColor(...C_BORDER);
      doc.setLineWidth(0.25);
      doc.line(marginL, y, marginR, y);
      doc.line(marginL, y + 10, marginR, y + 10);

      font(9.5, true);
      color(...C_DARK);
      doc.text(
        `RINCIAN BON PELANGGAN ${i + 1} : ${m.nama.toUpperCase()}`,
        marginL + 3,
        y + 6.5
      );

      font(7.5, false);
      color(...C_MUTED);
      doc.text(
        `${storeInfo.namaToko || "Kasirku POS"} · ${i + 1}/${detailedMembers.length}`,
        marginR - 3,
        y + 6.5,
        { align: "right" }
      );

      y += 14;

      const { finalY } = await renderMemberBonToDoc(
        doc,
        m.detail,
        storeInfo,
        fontFamily,
        logoBase64,
        { skipHeader: true, skipFooter: true, startY: y }
      );
      y = finalY + 4;
    }
  }

  // Footer centered di bagian paling bawah dokumen
  if (y + 28 > pageH - 20) {
    doc.addPage();
    y = 18;
  } else {
    y += 8;
  }
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.25);
  doc.line(marginL, y, marginR, y);
  y += 6.5;

  const footerBonText =
    storeInfo.footerBon?.trim() ||
    "Harap simpan bukti transaksi ini sebagai arsip pembayaran.\nTerima kasih atas kepercayaan Anda.";
  const footerBonLines = footerBonText.split("\n").map((l) => l.trim()).filter(Boolean);
  footerBonLines.forEach((line, idx) => {
    const isLast = idx === footerBonLines.length - 1;
    font(isLast ? 9 : 8, isLast);
    color(...(isLast ? C_DARK : C_MUTED));
    doc.text(line, centerX, y, { align: "center" });
    y += 5.5;
  });

  const pad = (n: number) => String(n).padStart(2, "0");
  const nowStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
    now.getHours()
  )}.${pad(now.getMinutes())}`;
  font(7.5, false);
  color(...C_LIGHT_MUTED);
  doc.text(`Dicetak otomatis dari Kasirku POS · ${nowStr}`, centerX, y, { align: "center" });

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    font(6.5, false);
    color(...C_LIGHT_MUTED);
    doc.text(`Halaman ${p} dari ${totalPages}`, marginR, pageH - 8, { align: "right" });
  }

  const tglStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  doc.save(`REKAP_PIUTANG_SEMUA_${tglStr}.pdf`);
}
