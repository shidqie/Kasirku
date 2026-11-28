/**
 * Utilitas pembatasan visibilitas harga beli & perhitungan margin keuntungan.
 */

export function sanitizeProductCost<T extends Record<string, any>>(
  product: T,
  showCost: boolean
): T {
  if (showCost || !product) return product;

  const copy: Record<string, any> = { ...product };
  if (Array.isArray(copy.satuanProduk)) {
    copy.satuanProduk = copy.satuanProduk.map((s: Record<string, any>) => {
      const { hargaBeli: _omitted, ...rest } = s;
      return rest;
    });
  }
  if (Array.isArray(copy.satuanList)) {
    copy.satuanList = copy.satuanList.map((s: Record<string, any>) => {
      const { hargaBeli: _omitted, ...rest } = s;
      return rest;
    });
  }
  return copy as T;
}

export function sanitizeProductsCost<T extends Record<string, any>>(
  products: T[],
  showCost: boolean
): T[] {
  if (showCost) return products;
  return products.map((p) => sanitizeProductCost(p, false));
}

export function calculateMargin(hargaJual: number, hargaBeli?: number | null): {
  nominal: number;
  percent: number | null;
} {
  if (typeof hargaBeli !== "number" || hargaBeli <= 0) {
    return {
      nominal: typeof hargaBeli === "number" ? hargaJual - hargaBeli : 0,
      percent: null,
    };
  }
  const nominal = hargaJual - hargaBeli;
  const percent = Math.round((nominal / hargaBeli) * 1000) / 10;
  return { nominal, percent };
}
