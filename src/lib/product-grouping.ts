export interface ProductGroupMeta {
  id: string;
  nama: string;
  brand?: string | null;
  kategoriId?: string | null;
  kategori?: { id: string; nama: string } | null;
}

export interface GroupableProduct {
  id: string;
  sku?: string | null;
  nama: string;
  barcode?: string | null;
  groupId?: string | null;
  variantName?: string | null;
  group?: ProductGroupMeta | null;
  kategori?: { id: string; nama: string } | null;
  stokCache: string | number;
  stokMinimum: string | number;
  satuanProduk: {
    id?: string;
    namaSatuan: string;
    faktorKeDasar: string | number;
    hargaJual: number;
    hargaBeli?: number;
    isDefault?: boolean;
  }[];
}

export interface ProductGroupSummary<T extends GroupableProduct = GroupableProduct> {
  type: "group";
  group: ProductGroupMeta;
  variants: T[];
  variantCount: number;
  totalStok: number;
  minPrice: number;
  maxPrice: number;
  hasLowStock: boolean;
  hasOutOfStock: boolean;
}

export interface StandaloneProductEntry<T extends GroupableProduct = GroupableProduct> {
  type: "standalone";
  product: T;
}

export type GroupedDisplayItem<T extends GroupableProduct = GroupableProduct> =
  | ProductGroupSummary<T>
  | StandaloneProductEntry<T>;

/**
 * Bangun nama lengkap varian: "{Induk} {Varian}".
 * Jika nama varian sudah diawali nama induk, hindari pengulangan.
 */
export function buildVariantFullName(groupName: string, variantName: string): string {
  const g = groupName.trim();
  const v = variantName.trim();
  if (!g) return v;
  if (!v) return g;
  if (v.toLowerCase().startsWith(g.toLowerCase())) {
    return v;
  }
  return `${g} ${v}`;
}

export function getProductBaseSellPrice(p: GroupableProduct): number {
  if (!p.satuanProduk || p.satuanProduk.length === 0) return 0;
  const eceran = p.satuanProduk.reduce(
    (prev, cur) => (Number(cur.faktorKeDasar) <= Number(prev.faktorKeDasar) ? cur : prev),
    p.satuanProduk[0]
  );
  return Number(eceran?.hargaJual ?? 0);
}

export function formatPriceRange(minPrice: number, maxPrice: number): string {
  const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
  if (minPrice === maxPrice) return fmt(minPrice);
  return `${fmt(minPrice)} – ${fmt(maxPrice)}`;
}

/**
 * Mengelompokkan daftar produk berdasarkan `groupId`.
 * Produk tanpa `groupId` tetap dikembalikan sebagai `standalone` (backward compatible).
 */
export function groupProductsForDisplay<T extends GroupableProduct>(
  products: T[]
): GroupedDisplayItem<T>[] {
  const groupBuckets = new Map<string, { meta: ProductGroupMeta; variants: T[] }>();
  const result: GroupedDisplayItem<T>[] = [];
  const emittedGroups = new Set<string>();

  for (const p of products) {
    if (p.groupId && p.group) {
      const existing = groupBuckets.get(p.groupId);
      if (existing) {
        existing.variants.push(p);
      } else {
        groupBuckets.set(p.groupId, { meta: p.group, variants: [p] });
      }
    }
  }

  for (const p of products) {
    if (p.groupId && p.group) {
      if (emittedGroups.has(p.groupId)) continue;
      emittedGroups.add(p.groupId);

      const bucket = groupBuckets.get(p.groupId)!;
      const variants = bucket.variants;
      let totalStok = 0;
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      let hasLowStock = false;
      let hasOutOfStock = false;

      for (const v of variants) {
        const stok = Number(v.stokCache ?? 0);
        const min = Number(v.stokMinimum ?? 0);
        const price = getProductBaseSellPrice(v);
        totalStok += stok;
        if (price < minPrice) minPrice = price;
        if (price > maxPrice) maxPrice = price;
        if (stok <= 0) hasOutOfStock = true;
        if (stok <= min) hasLowStock = true;
      }

      if (minPrice === Infinity) minPrice = 0;
      if (maxPrice === -Infinity) maxPrice = 0;

      result.push({
        type: "group",
        group: bucket.meta,
        variants,
        variantCount: variants.length,
        totalStok,
        minPrice,
        maxPrice,
        hasLowStock,
        hasOutOfStock,
      });
    } else {
      result.push({
        type: "standalone",
        product: p,
      });
    }
  }

  return result;
}
