/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Customer, Item, Forecast, Transaction } from '../types';

// Storage Keys
const KEY_CUSTOMERS = 'wip_customers';
const KEY_ITEMS = 'wip_items';
const KEY_FORECASTS = 'wip_forecasts';
const KEY_TRANSACTIONS = 'wip_transactions';

// Seed Data
const SEED_CUSTOMERS: Customer[] = [
  { id: 'c-1', nama: 'RAYARD', status: true },
  { id: 'c-2', nama: 'QUTY KARUNIA', status: true },
  { id: 'c-3', nama: 'TENMA', status: true },
  { id: 'c-4', nama: 'LUNG VICTORY', status: true },
  { id: 'c-5', nama: 'IKEA INDONESIA', status: false } // Inactive example
];

const SEED_ITEMS: Item[] = [
  {
    id: 'i-1',
    customer_id: 'c-1',
    model: 'CONS BOX',
    part_number: 'C/T750*570*450-MM',
    alur_proses: ['FLEXO', 'KOPEK', 'PACKING'],
    stok_ready: 200
  },
  {
    id: 'i-2',
    customer_id: 'c-2',
    model: 'MBOX',
    part_number: '810.5*591*105',
    alur_proses: ['FLEXO', 'DIECUT', 'ASSY', 'PACKING'],
    stok_ready: 150
  },
  {
    id: 'i-3',
    customer_id: 'c-3',
    model: 'T-BOX',
    part_number: '500*400*300',
    alur_proses: ['DIECUT', 'LEM AUTO', 'PACKING'],
    stok_ready: 0
  },
  {
    id: 'i-4',
    customer_id: 'c-4',
    model: 'L-TRAY',
    part_number: 'LT-900*600',
    alur_proses: ['FLEXO', 'DIECUT', 'BANDING', 'PACKING'],
    stok_ready: 50
  }
];

const SEED_TRANSACTIONS: Transaction[] = [
  // CONS BOX Transactions (WIP: FLEXO=1000, KOPEK=0, PACKING=0)
  {
    id: 't-1',
    item_id: 'i-1',
    proses: 'FLEXO',
    aksi: 'MASUK',
    qty: 2500,
    catatan: 'Run pertama shift pagi',
    timestamp: '2026-06-24T08:00:00Z'
  },
  {
    id: 't-2',
    item_id: 'i-1',
    proses: 'FLEXO',
    aksi: 'KELUAR',
    qty: 1500,
    catatan: 'Selesai di flexo, lanjut KOPEK',
    timestamp: '2026-06-24T09:30:00Z'
  },
  {
    id: 't-3',
    item_id: 'i-1',
    proses: 'KOPEK',
    aksi: 'MASUK',
    qty: 1500,
    catatan: 'Masuk KOPEK',
    timestamp: '2026-06-24T09:35:00Z'
  },
  {
    id: 't-4',
    item_id: 'i-1',
    proses: 'KOPEK',
    aksi: 'KELUAR',
    qty: 1500,
    catatan: 'Selesai KOPEK, masuk PACKING',
    timestamp: '2026-06-24T11:00:00Z'
  },
  {
    id: 't-5',
    item_id: 'i-1',
    proses: 'PACKING',
    aksi: 'MASUK',
    qty: 1500,
    catatan: 'Masuk packing',
    timestamp: '2026-06-24T11:05:00Z'
  },
  {
    id: 't-6',
    item_id: 'i-1',
    proses: 'PACKING',
    aksi: 'KELUAR',
    qty: 1500,
    catatan: 'Packing selesai, masuk STOK READY',
    timestamp: '2026-06-24T12:00:00Z'
  },
  // We had 200 initial stock + 1500 from transactions = 1700 stock ready
  // Add another run that is still in progress
  {
    id: 't-7',
    item_id: 'i-1',
    proses: 'FLEXO',
    aksi: 'MASUK',
    qty: 1000,
    catatan: 'Run kedua',
    timestamp: '2026-06-24T14:00:00Z'
  },

  // MBOX Transactions (WIP: DIECUT=400)
  {
    id: 't-8',
    item_id: 'i-2',
    proses: 'FLEXO',
    aksi: 'MASUK',
    qty: 1200,
    catatan: 'Mulai produksi MBOX',
    timestamp: '2026-06-24T08:15:00Z'
  },
  {
    id: 't-9',
    item_id: 'i-2',
    proses: 'FLEXO',
    aksi: 'KELUAR',
    qty: 1200,
    catatan: 'FLEXO selesai',
    timestamp: '2026-06-24T10:00:00Z'
  },
  {
    id: 't-10',
    item_id: 'i-2',
    proses: 'DIECUT',
    aksi: 'MASUK',
    qty: 1200,
    catatan: 'Masuk DIECUT',
    timestamp: '2026-06-24T10:05:00Z'
  },
  {
    id: 't-11',
    item_id: 'i-2',
    proses: 'DIECUT',
    aksi: 'KELUAR',
    qty: 800,
    catatan: 'Sebagian selesai',
    timestamp: '2026-06-24T11:45:00Z'
  }
];

const SEED_FORECASTS: Forecast[] = [
  {
    id: 'f-1',
    item_id: 'i-1',
    tgl_delivery: '2026-06-28',
    qty: 2500,
    stok_awal: 200,
    remain: -2300, // stok_awal - qty = 200 - 2500 = -2300
    status: 'ACTIVE',
    keterangan: 'PO #10344'
  },
  {
    id: 'f-2',
    item_id: 'i-2',
    tgl_delivery: '2026-06-29',
    qty: 1200,
    stok_awal: 150,
    remain: -1050,
    status: 'ACTIVE',
    keterangan: 'PO #10345'
  },
  {
    id: 'f-3',
    item_id: 'i-3',
    tgl_delivery: '2026-06-30',
    qty: 500,
    stok_awal: 0,
    remain: -500,
    status: 'ACTIVE',
    keterangan: 'Urgent'
  }
];

// LocalStorage helpers with automatic seeding
export function getStoredCustomers(): Customer[] {
  const data = localStorage.getItem(KEY_CUSTOMERS);
  if (!data) {
    localStorage.setItem(KEY_CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
    return SEED_CUSTOMERS;
  }
  return JSON.parse(data);
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem(KEY_CUSTOMERS, JSON.stringify(customers));
}

export function getStoredItems(): Item[] {
  const data = localStorage.getItem(KEY_ITEMS);
  if (!data) {
    localStorage.setItem(KEY_ITEMS, JSON.stringify(SEED_ITEMS));
    return SEED_ITEMS;
  }
  return JSON.parse(data);
}

export function saveItems(items: Item[]): void {
  localStorage.setItem(KEY_ITEMS, JSON.stringify(items));
}

export function getStoredForecasts(): Forecast[] {
  const data = localStorage.getItem(KEY_FORECASTS);
  if (!data) {
    localStorage.setItem(KEY_FORECASTS, JSON.stringify(SEED_FORECASTS));
    return SEED_FORECASTS;
  }
  return JSON.parse(data);
}

export function saveForecasts(forecasts: Forecast[]): void {
  localStorage.setItem(KEY_FORECASTS, JSON.stringify(forecasts));
}

export function getStoredTransactions(): Transaction[] {
  const data = localStorage.getItem(KEY_TRANSACTIONS);
  if (!data) {
    localStorage.setItem(KEY_TRANSACTIONS, JSON.stringify(SEED_TRANSACTIONS));
    return SEED_TRANSACTIONS;
  }
  return JSON.parse(data);
}

export function saveTransactions(transactions: Transaction[]): void {
  localStorage.setItem(KEY_TRANSACTIONS, JSON.stringify(transactions));
}

// WIP calculations
export function calculateWIP(transactions: Transaction[], itemId: string, processName: string): number {
  let totalMasuk = 0;
  let totalKeluar = 0;
  
  for (const tx of transactions) {
    if (tx.item_id === itemId && tx.proses === processName) {
      if (tx.aksi === 'MASUK') {
        totalMasuk += tx.qty;
      } else if (tx.aksi === 'KELUAR') {
        totalKeluar += tx.qty;
      }
    }
  }
  
  return Math.max(0, totalMasuk - totalKeluar);
}

// Calculate total WIP across all processes for an item
export function calculateTotalWIP(transactions: Transaction[], item: Item): number {
  let total = 0;
  for (const proc of item.alur_proses) {
    total += calculateWIP(transactions, item.id, proc);
  }
  return total;
}

// Determine item status automatically
export function determineItemStatus(
  transactions: Transaction[],
  item: Item,
  activeForecasts: Forecast[]
): 'READY KIRIM' | 'DALAM PROSES' | 'BELUM JALAN' | 'SELESAI' {
  const forecast = activeForecasts.find(f => f.item_id === item.id && f.status === 'ACTIVE');
  const totalWIP = calculateTotalWIP(transactions, item);

  if (forecast) {
    // If we have ready stock sufficient to fulfill delivery
    if (item.stok_ready >= forecast.qty) {
      return 'READY KIRIM';
    }
    // If we have some WIP active
    if (totalWIP > 0) {
      return 'DALAM PROSES';
    }
    // If ready stock is not enough AND no WIP is currently running
    return 'BELUM JALAN';
  } else {
    // No active forecast
    if (totalWIP > 0) {
      return 'DALAM PROSES';
    }
    return 'SELESAI';
  }
}
