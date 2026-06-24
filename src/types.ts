/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Customer {
  id: string;
  nama: string;
  status: boolean; // true = Aktif, false = Nonaktif
}

export interface Item {
  id: string;
  customer_id: string;
  model: string; // e.g. CONS BOX, MBOX
  part_number: string;
  alur_proses: string[]; // Ordered list of processes, e.g. ['FLEXO', 'KOPEK', 'PACKING']
  stok_ready: number; // Accumulated automatically, can also be manually seeded/adjusted
}

export type ForecastStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface Forecast {
  id: string;
  item_id: string;
  tgl_delivery: string; // YYYY-MM-DD
  qty: number;
  stok_awal: number; // Auto-filled from previous forecast remaining or current stock
  remain: number; // remain = stok_awal - qty (negative means deficit/kurang)
  status: ForecastStatus;
  keterangan?: string;
}

export type TransactionAction = 'MASUK' | 'KELUAR';

export interface Transaction {
  id: string;
  item_id: string;
  proses: string; // e.g. 'FLEXO', 'PACKING'
  aksi: TransactionAction;
  qty: number;
  catatan?: string;
  timestamp: string; // ISO string or epoch
}

export const DEFAULT_PROSES = [
  'FLEXO',
  'DIECUT',
  'LONGWAY',
  'KOPEK',
  'COBLOS',
  'ASSY',
  'LEM AUTO',
  'LEM SEMI',
  'CEK POINT',
  'BANDING',
  'PACKING'
];

export type ActiveTab = 'dashboard' | 'input' | 'forecast' | 'master' | 'report';
