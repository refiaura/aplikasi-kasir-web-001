import type { SeedBusinessType } from '@kasir/shared';

export interface SeedCategory {
  name: string;
  sortOrder: number;
}

export interface SeedProduct {
  category: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  cost: number;
  trackStock: boolean;
  stockQty: number;
  minStock: number;
}

interface SeedSet {
  categories: SeedCategory[];
  products: SeedProduct[];
}

/** Contoh produk realistis per jenis usaha (harga dalam rupiah). */
export const PRODUCT_SEEDS: Record<SeedBusinessType, SeedSet> = {
  kelontong: {
    categories: [
      { name: 'Sembako', sortOrder: 0 },
      { name: 'Makanan', sortOrder: 1 },
      { name: 'Minuman', sortOrder: 2 },
      { name: 'Kebersihan', sortOrder: 3 },
    ],
    products: [
      { category: 'Sembako', name: 'Beras 5kg', sku: 'BRG-001', unit: 'karung', price: 65000, cost: 60000, trackStock: true, stockQty: 20, minStock: 5 },
      { category: 'Sembako', name: 'Gula Pasir 1kg', sku: 'BRG-002', unit: 'pcs', price: 17500, cost: 16000, trackStock: true, stockQty: 30, minStock: 10 },
      { category: 'Sembako', name: 'Minyak Goreng 2L', sku: 'BRG-003', unit: 'pcs', price: 45000, cost: 41500, trackStock: true, stockQty: 24, minStock: 6 },
      { category: 'Sembako', name: 'Telur Ayam 1kg', sku: 'BRG-004', unit: 'kg', price: 28000, cost: 25000, trackStock: true, stockQty: 15, minStock: 5 },
      { category: 'Makanan', name: 'Indomie Goreng', sku: 'MKN-001', unit: 'pcs', price: 3500, cost: 2800, trackStock: true, stockQty: 100, minStock: 24 },
      { category: 'Makanan', name: 'Indomie Soto', sku: 'MKN-002', unit: 'pcs', price: 3500, cost: 2800, trackStock: true, stockQty: 80, minStock: 24 },
      { category: 'Makanan', name: 'Chitato Sapi Panggang', sku: 'MKN-003', unit: 'pcs', price: 11000, cost: 9500, trackStock: true, stockQty: 40, minStock: 12 },
      { category: 'Minuman', name: 'Aqua 600ml', sku: 'MNM-001', unit: 'pcs', price: 4000, cost: 3200, trackStock: true, stockQty: 96, minStock: 24 },
      { category: 'Minuman', name: 'Teh Botol Sosro', sku: 'MNM-002', unit: 'pcs', price: 5000, cost: 4000, trackStock: true, stockQty: 48, minStock: 12 },
      { category: 'Minuman', name: 'Kopi Kapal Api Sachet', sku: 'MNM-003', unit: 'pcs', price: 1500, cost: 1100, trackStock: true, stockQty: 120, minStock: 30 },
      { category: 'Kebersihan', name: 'Rinso 800g', sku: 'KBH-001', unit: 'pcs', price: 22000, cost: 20000, trackStock: true, stockQty: 30, minStock: 8 },
      { category: 'Kebersihan', name: 'Sabun Lifebuoy 70g', sku: 'KBH-002', unit: 'pcs', price: 5000, cost: 4200, trackStock: true, stockQty: 50, minStock: 12 },
    ],
  },
  kedai: {
    categories: [
      { name: 'Kopi', sortOrder: 0 },
      { name: 'Non-Kopi', sortOrder: 1 },
      { name: 'Makanan', sortOrder: 2 },
      { name: 'Snack', sortOrder: 3 },
    ],
    products: [
      { category: 'Kopi', name: 'Kopi Tubruk', sku: 'KPI-001', unit: 'gelas', price: 8000, cost: 2500, trackStock: false, stockQty: 0, minStock: 0 },
      { category: 'Kopi', name: 'Kopi Susu Gula Aren', sku: 'KPI-002', unit: 'gelas', price: 15000, cost: 6000, trackStock: false, stockQty: 0, minStock: 0 },
      { category: 'Kopi', name: 'Americano', sku: 'KPI-003', unit: 'gelas', price: 12000, cost: 4000, trackStock: false, stockQty: 0, minStock: 0 },
      { category: 'Kopi', name: 'Caffe Latte', sku: 'KPI-004', unit: 'gelas', price: 18000, cost: 7000, trackStock: false, stockQty: 0, minStock: 0 },
      { category: 'Non-Kopi', name: 'Teh Manis', sku: 'NKO-001', unit: 'gelas', price: 6000, cost: 1500, trackStock: false, stockQty: 0, minStock: 0 },
      { category: 'Non-Kopi', name: 'Lemon Tea', sku: 'NKO-002', unit: 'gelas', price: 10000, cost: 3500, trackStock: false, stockQty: 0, minStock: 0 },
      { category: 'Makanan', name: 'Pisang Goreng (isi 5)', sku: 'MKN-001', unit: 'porsi', price: 12000, cost: 5000, trackStock: false, stockQty: 0, minStock: 0 },
      { category: 'Makanan', name: 'Indomie Telur', sku: 'MKN-002', unit: 'porsi', price: 15000, cost: 7000, trackStock: false, stockQty: 0, minStock: 0 },
      { category: 'Makanan', name: 'Roti Bakar Coklat', sku: 'MKN-003', unit: 'porsi', price: 13000, cost: 5500, trackStock: false, stockQty: 0, minStock: 0 },
      { category: 'Snack', name: 'Kentang Goreng', sku: 'SNK-001', unit: 'porsi', price: 15000, cost: 7000, trackStock: false, stockQty: 0, minStock: 0 },
      { category: 'Snack', name: 'Singkong Goreng', sku: 'SNK-002', unit: 'porsi', price: 10000, cost: 4000, trackStock: false, stockQty: 0, minStock: 0 },
    ],
  },
  bangunan: {
    categories: [
      { name: 'Semen & Pasir', sortOrder: 0 },
      { name: 'Cat', sortOrder: 1 },
      { name: 'Perkakas', sortOrder: 2 },
      { name: 'Listrik', sortOrder: 3 },
    ],
    products: [
      { category: 'Semen & Pasir', name: 'Semen 50kg', sku: 'SMN-001', unit: 'sak', price: 75000, cost: 68000, trackStock: true, stockQty: 50, minStock: 10 },
      { category: 'Semen & Pasir', name: 'Pasir 1 Karung', sku: 'SMN-002', unit: 'karung', price: 25000, cost: 20000, trackStock: true, stockQty: 40, minStock: 10 },
      { category: 'Cat', name: 'Cat Tembok 5kg Putih', sku: 'CAT-001', unit: 'pail', price: 180000, cost: 165000, trackStock: true, stockQty: 20, minStock: 5 },
      { category: 'Perkakas', name: 'Kuas 4 Inch', sku: 'PRK-001', unit: 'pcs', price: 25000, cost: 20000, trackStock: true, stockQty: 30, minStock: 6 },
      { category: 'Perkakas', name: 'Paku 1kg', sku: 'PRK-002', unit: 'kg', price: 20000, cost: 17000, trackStock: true, stockQty: 25, minStock: 5 },
      { category: 'Listrik', name: 'Kabel NYA 50m', sku: 'LST-001', unit: 'roll', price: 350000, cost: 320000, trackStock: true, stockQty: 10, minStock: 2 },
      { category: 'Listrik', name: 'Lampu LED 10W', sku: 'LST-002', unit: 'pcs', price: 35000, cost: 28000, trackStock: true, stockQty: 60, minStock: 12 },
      { category: 'Listrik', name: 'Stop Kontak', sku: 'LST-003', unit: 'pcs', price: 15000, cost: 12000, trackStock: true, stockQty: 40, minStock: 10 },
    ],
  },
};
