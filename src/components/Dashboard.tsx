/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Customer, Item, Forecast, Transaction } from '../types';
import { calculateWIP, calculateTotalWIP, determineItemStatus } from '../utils/storage';
import { Layers, CheckCircle2, PlayCircle, Loader2, Filter, ChevronRight, FileText, Landmark } from 'lucide-react';

interface DashboardProps {
  customers: Customer[];
  items: Item[];
  forecasts: Forecast[];
  transactions: Transaction[];
  onSelectPrefilledItem: (itemId: string, process?: string) => void;
  onNavigateToTab: (tab: 'input' | 'report') => void;
}

export default function Dashboard({
  customers,
  items,
  forecasts,
  transactions,
  onSelectPrefilledItem,
  onNavigateToTab,
}: DashboardProps) {
  // Filter States
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Active Customers Map (only show active customers in filters, but keep names for all)
  const activeCustomers = customers.filter(c => c.status);

  // --- Live Metrics calculations ---
  // 1. Total Active Items (items belonging to active customers or having active transactions)
  const totalActiveItems = items.filter(item => {
    const cust = customers.find(c => c.id === item.customer_id);
    return cust?.status;
  }).length;

  // 2. Total WIP running (sum of all WIP across all processes of all items)
  let totalWIPRunning = 0;
  for (const item of items) {
    totalWIPRunning += calculateTotalWIP(transactions, item);
  }

  // 3. Total Ready Stock (sum of stok_ready across all items)
  const totalReadyStock = items.reduce((acc, i) => acc + i.stok_ready, 0);

  // --- Filter and Compile Item Cards ---
  const compiledItems = items.map(item => {
    const cust = customers.find(c => c.id === item.customer_id);
    const activeForecast = forecasts.find(f => f.item_id === item.id && f.status === 'ACTIVE');
    const totalWIP = calculateTotalWIP(transactions, item);
    const status = determineItemStatus(transactions, item, forecasts);

    // Get active WIP processes for this item
    const activeProcessesWIP = item.alur_proses
      .map(p => ({ process: p, qty: calculateWIP(transactions, item.id, p) }))
      .filter(w => w.qty > 0);

    return {
      ...item,
      customerName: cust?.nama || 'Unknown',
      customerActive: cust?.status ?? false,
      activeForecast,
      totalWIP,
      status,
      activeProcessesWIP
    };
  });

  // Apply filters
  const filteredCompiledItems = compiledItems.filter(item => {
    // Only display items of ACTIVE customers by default to avoid cluttering
    if (!item.customerActive) return false;

    const matchesCust = selectedCustomerId === 'all' || item.customer_id === selectedCustomerId;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

    return matchesCust && matchesStatus;
  });

  return (
    <div className="pb-24">
      {/* Title */}
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">WIP &amp; Stock Hub</h1>
        <p className="text-xs text-slate-500 font-medium leading-normal">Real-time floor tracking &amp; inventory control</p>
      </div>

      {/* --- QUICK INTERACTIVE TOGGLE BANNER (Replacing live metrics) --- */}
      <div className="grid grid-cols-2 gap-3.5 mb-6">
        <button
          onClick={() => onNavigateToTab('input')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-[24px] font-bold text-xs flex flex-col justify-between h-[135px] shadow-lg shadow-indigo-600/10 active:scale-95 transition-all text-left cursor-pointer border border-indigo-500/10"
        >
          <Layers size={22} className="text-white shrink-0" />
          <div>
            <p className="text-[9px] text-indigo-200 font-extrabold tracking-widest uppercase">LOG MASUK/KELUAR</p>
            <p className="mt-1 font-display text-sm font-black tracking-tight leading-none">Input WIP Cepat</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateToTab('report')}
          className="bg-slate-900 hover:bg-slate-950 text-white p-5 rounded-[24px] font-bold text-xs flex flex-col justify-between h-[135px] shadow-lg shadow-slate-900/10 active:scale-95 transition-all text-left cursor-pointer border border-slate-800/20"
        >
          <FileText size={22} className="text-white shrink-0" />
          <div>
            <p className="text-[9px] text-slate-400 font-extrabold tracking-widest uppercase font-sans">BAGIKAN SHIFT</p>
            <p className="mt-1 font-display text-sm font-black tracking-tight leading-none">Laporan Akhir Shift</p>
          </div>
        </button>
      </div>

      {/* --- HORIZONTAL FILTER BAR --- */}
      <div className="space-y-3 mb-5">
        {/* Customer Filters Scrollable row */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCustomerId('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCustomerId === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-150 hover:bg-slate-50'
            }`}
          >
            Semua Customer
          </button>
          {activeCustomers.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCustomerId(c.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCustomerId === c.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-150 hover:bg-slate-50'
              }`}
            >
              {c.nama}
            </button>
          ))}
        </div>

        {/* Status Filters Scrollable row */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
              selectedStatus === 'all'
                ? 'bg-ikea-blue text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Status
          </button>
          <button
            onClick={() => setSelectedStatus('READY KIRIM')}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedStatus === 'READY KIRIM'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 size={12} /> Ready Kirim
          </button>
          <button
            onClick={() => setSelectedStatus('DALAM PROSES')}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedStatus === 'DALAM PROSES'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Loader2 size={12} className="animate-spin-slow" /> Dalam Proses
          </button>
          <button
            onClick={() => setSelectedStatus('BELUM JALAN')}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedStatus === 'BELUM JALAN'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <PlayCircle size={12} /> Belum Jalan
          </button>
          <button
            onClick={() => setSelectedStatus('SELESAI')}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedStatus === 'SELESAI'
                ? 'bg-slate-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Selesai
          </button>
        </div>
      </div>

      {/* --- ITEM CARDS LIST --- */}
      <div className="space-y-4">
        {filteredCompiledItems.map((item) => {
          // Status color styles
          let statusStyle = 'bg-slate-100 text-slate-700 border-slate-200';
          if (item.status === 'READY KIRIM') statusStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
          if (item.status === 'DALAM PROSES') statusStyle = 'bg-amber-50 text-amber-700 border-amber-200/60';
          if (item.status === 'BELUM JALAN') statusStyle = 'bg-rose-50 text-rose-700 border-rose-200/60';

          return (
            <div
              key={item.id}
              onClick={() => {
                // If there is active WIP, we prefill the input form with the first active process!
                // Else, prefill with the first process in their alur list
                const defaultProc = item.activeProcessesWIP.length > 0
                  ? item.activeProcessesWIP[0].process
                  : (item.alur_proses[0] || '');
                onSelectPrefilledItem(item.id, defaultProc);
              }}
              className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md active:scale-[0.99] active:bg-slate-50/50 transition-all cursor-pointer space-y-4.5"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-display block">
                    {item.customerName}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight font-display mt-0.5">
                    {item.model}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-medium">
                    {item.part_number}
                  </p>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border tracking-wide uppercase ${statusStyle}`}>
                  {item.status}
                </span>
              </div>

              {/* Forecast Delivery Information if active */}
              {item.activeForecast ? (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Target Delivery ({item.activeForecast.tgl_delivery}):</span>
                    <span className="font-bold text-slate-800 font-mono">{item.activeForecast.qty.toLocaleString()} pcs</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/40 pt-1.5 mt-1.5">
                    <span className="text-slate-500">Kekurangan Produksi:</span>
                    {item.stok_ready >= item.activeForecast.qty ? (
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] border border-emerald-100">Stok Cukup</span>
                    ) : (
                      <span className="text-rose-600 font-bold font-mono">
                        {(item.activeForecast.qty - item.stok_ready).toLocaleString()} pcs
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400/80 italic font-medium">Tidak ada target delivery aktif</p>
              )}

              {/* Core metrics: Ready Stock and WIP totals */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/40 text-center transition-all">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">STOK READY</p>
                  <p className="text-base font-extrabold text-slate-800 font-mono mt-0.5">{item.stok_ready.toLocaleString()}</p>
                </div>
                <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 text-center transition-all">
                  <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">TOTAL WIP</p>
                  <p className="text-base font-extrabold text-amber-700 font-mono mt-0.5">{item.totalWIP.toLocaleString()}</p>
                </div>
              </div>

              {/* Workflow & WIP Detail */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ALUR WIP AKTIF:</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.alur_proses.map((p, idx) => {
                    const activeWIP = item.activeProcessesWIP.find(w => w.process === p);
                    return (
                      <span key={p} className="inline-flex items-center gap-1">
                        <span className={`px-2 py-1 rounded-lg font-mono text-[10px] font-semibold transition-all border ${
                          activeWIP
                            ? 'bg-amber-500/10 text-amber-800 font-bold border-amber-500/20'
                            : 'bg-slate-100 text-slate-400 border-slate-200/20'
                        }`}>
                          {p} {activeWIP ? `(${activeWIP.qty.toLocaleString()})` : ''}
                        </span>
                        {idx < item.alur_proses.length - 1 && (
                          <span className="text-slate-300 text-xs">→</span>
                        )}
                      </span>
                    );
                  })}
                  <span className="text-slate-300 text-xs">→</span>
                  <span className="bg-emerald-500/10 text-emerald-800 px-2 py-1 rounded-lg border border-emerald-500/20 font-mono text-[10px] font-bold">
                    STOK ({item.stok_ready.toLocaleString()})
                  </span>
                </div>
              </div>

              {/* Navigation Action Prompt */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1.5 border-t border-slate-100/60">
                <span>Ketuk untuk update pergerakan proses ini</span>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
            </div>
          );
        })}

        {filteredCompiledItems.length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/60 shadow-sm text-center space-y-3">
            <Layers className="mx-auto text-slate-300" size={32} />
            <div className="space-y-1">
              <p className="font-bold text-slate-600 text-sm">Tidak ada item yang cocok</p>
              <p className="text-xs text-slate-400">Silakan sesuaikan filter atau tambahkan master item baru.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
