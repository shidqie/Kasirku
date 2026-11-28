export type TipePromo =
  | "BELI_X_GRATIS_Y"
  | "DISKON_PERSEN"
  | "DISKON_NOMINAL"
  | "HARGA_PAKET";

export interface PromoRuleDTO {
  id: string;
  nama: string;
  tipe: TipePromo;
  produkId: string | null;
  kategoriId: string | null;
  minQty: number;
  bonusQty: number;
  bonusProdukId: string | null;
  diskonPersen: number;
  diskonNominal: number;
  hargaPaket: number;
  berlakuKelipatan: boolean;
  mulaiPada: string | Date | null;
  berakhirPada: string | Date | null;
  aktif: boolean;
  produk?: { id: string; nama: string; satuanDasar?: string } | null;
  bonusProduk?: { id: string; nama: string; satuanDasar?: string } | null;
  kategori?: { id: string; nama: string } | null;
}

export interface PromoCartInputItem {
  produkId: string;
  kategoriId?: string | null;
  satuanProdukId: string;
  nama: string;
  hargaJual: number;
  qty: number;
}

export interface PromoItemResult {
  promoId: string;
  promoNama: string;
  tipe: TipePromo;
  badgeText: string;
  discount: number;
  bonusQty: number;
  bonusProdukId: string;
  bonusProdukNama: string;
}

export interface PromoBonusItem {
  produkId: string;
  nama: string;
  qty: number;
  promoNama: string;
}

export interface PromoEvaluationResult {
  totalPromoDiscount: number;
  itemPromos: Record<string, PromoItemResult>;
  bonusItems: PromoBonusItem[];
}

export function isPromoActiveNow(promo: PromoRuleDTO, now: Date = new Date()): boolean {
  if (!promo.aktif) return false;
  if (promo.mulaiPada) {
    const start = new Date(promo.mulaiPada);
    if (now < start) return false;
  }
  if (promo.berakhirPada) {
    const end = new Date(promo.berakhirPada);
    // Anggap berlaku sampai akhir hari tersebut jika jam 00:00:00
    if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0) {
      end.setHours(23, 59, 59, 999);
    }
    if (now > end) return false;
  }
  return true;
}

export function formatPromoShortLabel(promo: PromoRuleDTO): string {
  switch (promo.tipe) {
    case "BELI_X_GRATIS_Y":
      if (promo.bonusProduk && promo.bonusProdukId && promo.bonusProdukId !== promo.produkId) {
        return `Beli ${promo.minQty} Gratis ${promo.bonusQty} ${promo.bonusProduk.nama}`;
      }
      return `Beli ${promo.minQty} Gratis ${promo.bonusQty}`;
    case "DISKON_PERSEN":
      return promo.minQty > 1
        ? `Min. ${promo.minQty} · Diskon ${promo.diskonPersen}%`
        : `Diskon ${promo.diskonPersen}%`;
    case "DISKON_NOMINAL":
      return promo.minQty > 1
        ? `Min. ${promo.minQty} · Potongan Rp ${promo.diskonNominal.toLocaleString("id-ID")}`
        : `Potongan Rp ${promo.diskonNominal.toLocaleString("id-ID")}`;
    case "HARGA_PAKET":
      return `Beli ${promo.minQty} Rp ${promo.hargaPaket.toLocaleString("id-ID")}`;
    default:
      return promo.nama;
  }
}

/**
 * Evaluasi seluruh aturan promo aktif terhadap keranjang belanja.
 * Prioritas pencocokan per item:
 * 1. Promo spesifik produkId
 * 2. Promo kategoriId
 * 3. Promo global (produkId === null && kategoriId === null)
 */
export function evaluateCartPromos(
  items: PromoCartInputItem[],
  promos: PromoRuleDTO[],
  now: Date = new Date()
): PromoEvaluationResult {
  const activePromos = promos.filter((p) => isPromoActiveNow(p, now));
  const itemPromos: Record<string, PromoItemResult> = {};
  const bonusMap = new Map<string, PromoBonusItem>();
  let totalPromoDiscount = 0;

  for (const item of items) {
    if (item.qty <= 0) continue;

    // Cari promo yang cocok dengan prioritas: produk > kategori > global
    const matching =
      activePromos.find((p) => p.produkId === item.produkId) ||
      (item.kategoriId
        ? activePromos.find((p) => !p.produkId && p.kategoriId === item.kategoriId)
        : undefined) ||
      activePromos.find((p) => !p.produkId && !p.kategoriId);

    if (!matching) continue;
    if (item.qty < matching.minQty) continue;

    const key = `${item.produkId}:${item.satuanProdukId}`;
    const multiplier = matching.berlakuKelipatan
      ? Math.floor(item.qty / matching.minQty)
      : 1;
    if (multiplier <= 0) continue;

    let discount = 0;
    let bonusQty = 0;
    const bonusProdukId = matching.bonusProdukId || item.produkId;
    const bonusProdukNama =
      matching.bonusProdukId && matching.bonusProduk
        ? matching.bonusProduk.nama
        : item.nama;

    if (matching.tipe === "BELI_X_GRATIS_Y" && matching.bonusQty > 0) {
      bonusQty = multiplier * matching.bonusQty;
      const prev = bonusMap.get(bonusProdukId);
      if (prev) {
        prev.qty += bonusQty;
      } else {
        bonusMap.set(bonusProdukId, {
          produkId: bonusProdukId,
          nama: bonusProdukNama,
          qty: bonusQty,
          promoNama: matching.nama,
        });
      }
    } else if (matching.tipe === "HARGA_PAKET" && matching.hargaPaket > 0) {
      const normalBundlePrice = multiplier * matching.minQty * item.hargaJual;
      const bundlePrice = multiplier * matching.hargaPaket;
      discount = Math.max(0, normalBundlePrice - bundlePrice);
    } else if (matching.tipe === "DISKON_PERSEN" && matching.diskonPersen > 0) {
      discount = Math.round((item.qty * item.hargaJual * matching.diskonPersen) / 100);
    } else if (matching.tipe === "DISKON_NOMINAL" && matching.diskonNominal > 0) {
      discount = Math.min(
        Math.round(item.qty * item.hargaJual),
        multiplier * matching.diskonNominal
      );
    }

    if (discount > 0 || bonusQty > 0) {
      totalPromoDiscount += discount;
      itemPromos[key] = {
        promoId: matching.id,
        promoNama: matching.nama,
        tipe: matching.tipe,
        badgeText:
          bonusQty > 0
            ? `Gratis +${bonusQty} ${bonusProdukId !== item.produkId ? bonusProdukNama : ""}`.trim()
            : `Hemat Rp ${discount.toLocaleString("id-ID")}`,
        discount,
        bonusQty,
        bonusProdukId,
        bonusProdukNama,
      };
    }
  }

  return {
    totalPromoDiscount,
    itemPromos,
    bonusItems: Array.from(bonusMap.values()),
  };
}
