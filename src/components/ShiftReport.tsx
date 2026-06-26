/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, Item, Forecast, Transaction } from '../types';
import { calculateWIP, calculateTotalWIP } from '../utils/storage';
import { Calendar, Clipboard, Check, RefreshCw, AlertTriangle, Users, Box, Layers, Printer, Search, ToggleLeft, ToggleRight, X, ClipboardList, Camera } from 'lucide-react';

interface ShiftReportProps {
  customers: Customer[];
  items: Item[];
  forecasts: Forecast[];
  transactions: Transaction[];
}

export default function ShiftReport({
  customers,
  items,
  forecasts,
  transactions,
}: ShiftReportProps) {
  // Determine shift based on current time
  // Pagi: 07.00 - 15.00
  // Siang: 15.00 - 23.00
  // Malam: 23.00 - 07.00
  const getInitialShift = (): string => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 15) return 'PAGI (Shift 1)';
    if (hour >= 15 && hour < 23) return 'SIANG (Shift 2)';
    return 'MALAM (Shift 3)';
  };

  const [shift, setShift] = useState(getInitialShift());
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);
  const [hideZeroWIP, setHideZeroWIP] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFullFoto, setSelectedFullFoto] = useState<string | null>(null);

  // Active items and customers
  const activeCustomers = customers.filter(c => c.status);

  // Search Filter: filter by query
  const searchFilteredItems = items.filter(item => {
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const modelMatch = item.model.toLowerCase().includes(query);
      const partMatch = item.part_number.toLowerCase().includes(query);
      
      const cust = customers.find(c => c.id === item.customer_id);
      const custNameMatch = cust ? cust.nama.toLowerCase().includes(query) : false;

      return modelMatch || partMatch || custNameMatch;
    }
    return true;
  });

  // WIP Filter: filter by zero WIP if requested
  const filteredItems = searchFilteredItems.filter(item => {
    if (hideZeroWIP) {
      const totalWIP = calculateTotalWIP(transactions, item);
      return totalWIP > 0;
    }
    return true;
  });

  // Filter customers that have active filtered items
  const filteredCustomers = activeCustomers.filter(cust => {
    const custItems = filteredItems.filter(i => i.customer_id === cust.id);
    return custItems.length > 0;
  });
  
  // Format current timestamp for header
  const printedTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // 1. Calculate WIP per item per process
  const getItemWIPDetail = (item: Item) => {
    return item.alur_proses.map(proc => ({
      process: proc,
      qty: calculateWIP(transactions, item.id, proc)
    }));
  };

  // 2. Process Summary (All active processes and which items are in there)
  // Let's find all unique processes where WIP is > 0 across all items
  const getProcessSummary = () => {
    const summary: { [process: string]: { model: string; qty: number; customer: string }[] } = {};

    for (const item of filteredItems) {
      const cust = customers.find(c => c.id === item.customer_id);
      const custName = cust?.nama || 'Unknown';
      
      for (const proc of item.alur_proses) {
        const qty = calculateWIP(transactions, item.id, proc);
        if (qty > 0) {
          if (!summary[proc]) {
            summary[proc] = [];
          }
          summary[proc].push({
            model: item.model,
            qty,
            customer: custName
          });
        }
      }
    }
    return summary;
  };

  const processSummary = getProcessSummary();

  // 2.5 Filter transactions for this shift
  const shiftTransactions = transactions.filter(tx => {
    const txDate = tx.timestamp.split('T')[0];
    if (txDate !== reportDate) return false;

    // Shift Hour match
    const hour = new Date(tx.timestamp).getHours();
    let txShift = '';
    if (hour >= 7 && hour < 15) {
      txShift = 'PAGI (Shift 1)';
    } else if (hour >= 15 && hour < 23) {
      txShift = 'SIANG (Shift 2)';
    } else {
      txShift = 'MALAM (Shift 3)';
    }

    return txShift === shift;
  });

  // Calculate shift totals
  const totalShiftOK = shiftTransactions.reduce((acc, tx) => acc + tx.qty, 0);
  const totalShiftNG = shiftTransactions.reduce((acc, tx) => acc + (tx.qty_ng || 0), 0);

  // 3. Alerts Section: Remain < 0 and total WIP running is 0
  const getAlertItems = () => {
    const alerts: { item: Item; customer: Customer; deficit: number; target: number }[] = [];
    
    // Only care about items with active forecasts
    const activeForecasts = forecasts.filter(f => f.status === 'ACTIVE');

    for (const forecast of activeForecasts) {
      const item = searchFilteredItems.find(i => i.id === forecast.item_id);
      if (!item) continue;

      const cust = customers.find(c => c.id === item.customer_id);
      if (!cust) continue;

      const currentStock = item.stok_ready;
      const targetQty = forecast.qty;
      const deficit = targetQty - currentStock;

      // If we are short of stock
      if (deficit > 0) {
        const totalWIPRunning = calculateTotalWIP(transactions, item);
        // And there is absolutely NO WIP running anywhere in the custom alur processes
        if (totalWIPRunning === 0) {
          alerts.push({
            item,
            customer: cust,
            deficit,
            target: targetQty
          });
        }
      }
    }
    return alerts;
  };

  const alertItems = getAlertItems();

  // Generate plain-text for WhatsApp sharing
  const generateWhatsAppText = () => {
    let text = `*LAPORAN STOK & WIP PRODUKSI IKEA*\n`;
    text += `Tanggal: ${reportDate}\n`;
    text += `Shift: ${shift}\n`;
    text += `Waktu Cetak: ${printedTime} WIB\n`;
    text += `===================================\n\n`;

    text += `*1. POSISI WIP & STOK PER CUSTOMER*\n`;
    for (const cust of filteredCustomers) {
      const custItems = filteredItems.filter(i => i.customer_id === cust.id);
      if (custItems.length === 0) continue;

      text += `\n*• CUSTOMER: ${cust.nama}*\n`;
      for (const item of custItems) {
        text += `  - *${item.model}* (${item.part_number})\n`;
        text += `    Stok Ready: *${item.stok_ready.toLocaleString()}* pcs\n`;
        
        const wipDetails = getItemWIPDetail(item);
        const activeWIPs = wipDetails.filter(w => w.qty > 0);
        
        if (activeWIPs.length > 0) {
          text += `    WIP: `;
          text += activeWIPs.map(w => `${w.process}(*${w.qty.toLocaleString()}* pcs)`).join(', ');
          text += `\n`;
        } else {
          text += `    WIP: _(Tidak ada WIP berjalan)_\n`;
        }
      }
    }

    text += `\n===================================\n`;
    text += `*2. RINGKASAN PROSES AKTIF*\n`;
    
    const processes = Object.keys(processSummary);
    if (processes.length > 0) {
      for (const proc of processes) {
        text += `\n*• PROSES: ${proc}*\n`;
        for (const item of processSummary[proc]) {
          text += `  - ${item.customer} | ${item.model}: *${item.qty.toLocaleString()}* pcs\n`;
        }
      }
    } else {
      text += `\n_(Tidak ada material aktif di semua proses)_\n`;
    }

    text += `\n===================================\n`;
    text += `*3. LOG HASIL PRODUKSI (OK vs NG)*\n`;
    if (shiftTransactions.length > 0) {
      text += `Total OK: *${totalShiftOK.toLocaleString()}* pcs\n`;
      text += `Total NG: *${totalShiftNG.toLocaleString()}* pcs\n\n`;
      
      for (const tx of shiftTransactions) {
        const item = items.find(i => i.id === tx.item_id);
        const cust = item ? customers.find(c => c.id === item.customer_id) : null;
        const custName = cust ? cust.nama : 'Unknown';
        const modelName = item ? item.model : 'Unknown';
        const timeStr = new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const ngText = tx.qty_ng && tx.qty_ng > 0 ? ` | NG: *${tx.qty_ng.toLocaleString()}* pcs` : '';
        const noteText = tx.catatan ? ` _(${tx.catatan})_` : '';
        
        text += `• [${timeStr}] ${custName} | ${modelName}\n`;
        text += `  *${tx.proses} [${tx.aksi}]*\n`;
        text += `  OK: *${tx.qty.toLocaleString()}* pcs${ngText}${noteText}\n`;
      }
    } else {
      text += `\n_(Belum ada transaksi produksi pada shift ini)_\n`;
    }

    if (alertItems.length > 0) {
      text += `\n===================================\n`;
      text += `*⚠️ ALERT! TARGET BELUM JALAN*\n`;
      text += `_(Kekurangan stok tapi belum ada WIP produksi)_\n`;
      for (const alert of alertItems) {
        text += `\n- *${alert.customer.nama} | ${alert.item.model}*\n`;
        text += `  Target Kirim: ${alert.target.toLocaleString()} pcs\n`;
        text += `  Stok Saat Ini: ${alert.item.stok_ready.toLocaleString()} pcs\n`;
        text += `  *Kurang: ${alert.deficit.toLocaleString()} pcs*\n`;
      }
    }

    text += `\n===================================\n`;
    text += `_Dikirim otomatis dari WIP Tracker IKEA Mobile_`;

    return text;
  };

  const handleCopy = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="pb-24">
      {/* Title & Print/Copy buttons */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Shift Reports</h1>
          <p className="text-xs text-slate-500 font-medium leading-normal font-sans">Optimized summaries for screenshots or copying to WhatsApp</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={handleCopy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 active:scale-95 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={14} className="stroke-[2.5]" /> Tersalin!
              </>
            ) : (
              <>
                <Clipboard size={14} /> Salin Laporan
              </>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-950 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Printer size={14} /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* Control Configuration (For report simulation) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Tanggal Laporan</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono font-extrabold text-slate-800 focus:outline-none focus:border-ikea-blue focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Pilih Shift Kerja</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-slate-800 focus:outline-none focus:border-ikea-blue focus:ring-2 focus:ring-indigo-100 transition-all"
            >
              <option value="PAGI (Shift 1)">PAGI (Shift 1)</option>
              <option value="SIANG (Shift 2)">SIANG (Shift 2)</option>
              <option value="MALAM (Shift 3)">MALAM (Shift 3)</option>
            </select>
          </div>
        </div>

        {/* Search & Filter controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          {/* Search Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">Cari Item / Customer</label>
              {searchQuery && (
                <span className="text-[10px] font-bold bg-[#800412]/10 text-[#800412] px-2 py-0.5 rounded-full">
                  Pencarian Aktif
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari model, nomor part, atau customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200/80 focus:border-[#800412] focus:ring-4 focus:ring-[#800412]/5 pl-11 pr-10 py-3 rounded-2xl text-xs font-bold text-slate-800 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200/75 hover:bg-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <X size={12} className="stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>

          {/* Toggle WIP Switch */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">Filter Tampilan WIP</label>
            <div 
              onClick={() => setHideZeroWIP(!hideZeroWIP)}
              className={`flex items-center justify-between border-2 p-3.5 rounded-2xl cursor-pointer transition-all ${
                hideZeroWIP 
                  ? 'bg-[#800412]/5 border-[#800412]/20 shadow-sm shadow-[#800412]/5' 
                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
              }`}
            >
              <div className="space-y-0.5 pr-4 select-none">
                <span className="text-xs font-extrabold text-slate-800 block">Sembunyikan Tanpa WIP</span>
                <span className="text-[10px] text-slate-400 font-medium leading-tight block">Hanya tampilkan item yang memiliki aktivitas WIP aktif</span>
              </div>
              
              {/* Premium iOS/Material tactile switch */}
              <div className="relative shrink-0">
                <div className={`w-12 h-7 rounded-full transition-colors duration-300 ${
                  hideZeroWIP ? 'bg-[#800412]' : 'bg-slate-300'
                }`} />
                <div className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                  hideZeroWIP ? 'translate-x-5' : 'translate-x-0'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hideZeroWIP ? 'bg-[#800412]' : 'bg-slate-300'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Items Match Badge */}
        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
            <Layers size={12} className="text-slate-400" />
            Status Filter:
          </span>
          <span className="text-[10px] font-black text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            Menampilkan <strong className="text-[#800412] font-mono">{filteredItems.length}</strong> dari <strong className="font-mono">{items.length}</strong> spesifikasi item
          </span>
        </div>
      </div>

      {/* --- PRINTABLE/SCREENSHOT-FRIENDLY CANVAS --- */}
      <div id="shift-report-canvas" className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-md space-y-6 text-slate-800 print:border-0 print:shadow-none font-sans transition-all">
        {/* Paper Header */}
        <div className="border-b-2 border-slate-100 pb-4 text-center">
          <h2 className="text-base font-black font-display text-slate-900 tracking-wide uppercase">LAPORAN STOK &amp; WIP PRODUKSI</h2>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-bold text-slate-400 font-mono">
            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
              <Calendar size={11} /> {reportDate}
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded">SHIFT: {shift}</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded">CETAK: {printedTime} WIB</span>
          </div>
        </div>

        {/* Section 1: Customer Stock & WIP positions */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5 font-display">
            <Users size={14} className="text-slate-400" />
            1. POSISI STOK &amp; WIP PER CUSTOMER
          </h3>

          <div className="space-y-4">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((cust) => {
                const custItems = filteredItems.filter(i => i.customer_id === cust.id);

                return (
                  <div key={cust.id} className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 space-y-3">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide font-display border-l-4 border-l-ikea-blue pl-2.5">
                      {cust.nama}
                    </h4>

                    <div className="space-y-2.5">
                      {custItems.map((item) => {
                        const wipDetails = getItemWIPDetail(item);
                        
                        return (
                          <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200/40 text-xs shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-extrabold text-slate-900 font-display">{item.model}</p>
                                <p className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">{item.part_number}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">STOK READY</p>
                                <p className="font-black text-slate-900 font-mono text-sm mt-0.5">{item.stok_ready.toLocaleString()} pcs</p>
                              </div>
                            </div>

                            {/* Process trail */}
                            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10px]">
                              <span className="text-slate-400 font-bold uppercase font-mono">WIP:</span>
                              {item.alur_proses.map((proc, index) => {
                                const wipVal = calculateWIP(transactions, item.id, proc);
                                return (
                                  <span key={proc} className="inline-flex items-center gap-1">
                                    <span className={`px-1.5 py-0.5 rounded font-mono font-bold border ${
                                      wipVal > 0 
                                        ? 'bg-amber-500/10 text-amber-800 border-amber-500/20' 
                                        : 'bg-slate-100 text-slate-400 border-slate-200/20'
                                    }`}>
                                      {proc} ({wipVal.toLocaleString()})
                                    </span>
                                    {index < item.alur_proses.length - 1 && (
                                      <span className="text-slate-300">→</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 text-xs italic">
                {searchQuery 
                  ? "Tidak ada item atau customer yang cocok dengan pencarian Anda." 
                  : "Tidak ada item dengan WIP aktif saat ini."}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Process summary */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5 font-display">
            <Layers size={14} className="text-slate-400" />
            2. RINGKASAN PROSES AKTIF
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.keys(processSummary).length > 0 ? (
              Object.keys(processSummary).map((proc) => (
                <div key={proc} className="border border-slate-200/60 p-4 rounded-xl bg-slate-50/50">
                  <h4 className="font-bold text-slate-800 text-xs font-mono border-b border-slate-200/40 pb-1.5 mb-2.5 uppercase tracking-wider">
                    PROSES {proc}
                  </h4>
                  <ul className="space-y-2 text-xs font-mono">
                    {processSummary[proc].map((row, idx) => (
                      <li key={idx} className="flex justify-between text-[11px] font-medium">
                        <span className="text-slate-500 truncate max-w-[130px]" title={row.model}>
                          {row.customer} | <strong>{row.model}</strong>
                        </span>
                        <span className="font-extrabold text-slate-800">{row.qty.toLocaleString()} pcs</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-6 text-center text-slate-400 text-xs italic font-medium">
                Tidak ada material aktif di semua alur proses saat ini.
              </div>
            )}
          </div>
        </div>

        {/* Section 2.5: Log Hasil Produksi OK vs NG */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-display">
              <ClipboardList size={14} className="text-slate-400" />
              3. LOG HASIL PRODUKSI SHIFT INI
            </h3>
            {shiftTransactions.length > 0 && (
              <div className="flex items-center gap-2.5 text-[10px] font-mono">
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded-md">
                  OK: <strong>{totalShiftOK.toLocaleString()}</strong>
                </span>
                <span className="text-rose-700 bg-rose-50 border border-rose-200/50 px-1.5 py-0.5 rounded-md">
                  NG: <strong>{totalShiftNG.toLocaleString()}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            {shiftTransactions.length > 0 ? (
              shiftTransactions.map((tx) => {
                const item = items.find(i => i.id === tx.item_id);
                const cust = item ? customers.find(c => c.id === item.customer_id) : null;
                const timeStr = new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={tx.id} className="bg-white p-3.5 rounded-xl border border-slate-200/50 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-black text-slate-800 font-display">
                            {cust ? cust.nama : 'UNKNOWN'} | {item ? item.model : 'UNKNOWN'}
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md font-mono ${
                            tx.aksi === 'MASUK' 
                              ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-800 border border-rose-500/20'
                          }`}>
                            {tx.proses} [{tx.aksi}]
                          </span>
                        </div>
                        {item && (
                          <span className="text-[10px] text-slate-400 font-mono font-medium block mt-0.5">
                            Part: {item.part_number}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                        {timeStr}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-xs font-mono">
                      <div className="flex gap-4">
                        <span className="text-slate-600">
                          OK: <strong className="text-slate-900 font-extrabold">{tx.qty.toLocaleString()}</strong> pcs
                        </span>
                        <span className={tx.qty_ng && tx.qty_ng > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                          NG: <strong className={tx.qty_ng && tx.qty_ng > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-400 font-medium'}>{(tx.qty_ng || 0).toLocaleString()}</strong> pcs
                        </span>
                      </div>
                      {tx.catatan && (
                        <span className="text-[10px] text-slate-500 italic max-w-[150px] truncate" title={tx.catatan}>
                          "{tx.catatan}"
                        </span>
                      )}
                    </div>

                    {tx.foto && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                          <Camera size={10} className="text-indigo-500" />
                          Lampiran Foto:
                        </span>
                        <div className="flex items-center gap-2">
                          <div 
                            onClick={() => setSelectedFullFoto(tx.foto || null)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 transition-all shrink-0 bg-slate-50"
                          >
                            <img src={tx.foto} alt="Lampiran" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[8px] text-slate-400 font-medium font-sans">Tap untuk perbesar</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs italic font-medium">
                Belum ada transaksi produksi yang dicatat untuk shift ini.
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Alerts */}
        {alertItems.length > 0 && (
          <div className="space-y-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5">
            <h3 className="text-[10px] font-black text-rose-800 uppercase tracking-widest flex items-center gap-1.5 font-display">
              <AlertTriangle size={14} className="text-rose-600 animate-pulse" />
              ⚠️ ALERT! TARGET BELUM JALAN
            </h3>
            <p className="text-[10px] text-rose-700/80 leading-relaxed font-medium">
              Daftar model yang statusnya kurang (remain negatif), namun belum ada pergerakan WIP berjalan sama sekali di lantai produksi.
            </p>

            <div className="divide-y divide-rose-500/10">
              {alertItems.map(({ item, customer, deficit, target }) => (
                <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-extrabold text-slate-900 font-display">{customer.nama} | {item.model}</p>
                    <p className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">Kirim target: {target.toLocaleString()} pcs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-rose-500 font-extrabold tracking-wider uppercase">DEFISIT STOK</p>
                    <p className="font-black text-rose-600 font-mono mt-0.5">-{deficit.toLocaleString()} pcs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo Lightbox Modal */}
      {selectedFullFoto && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedFullFoto(null)}
        >
          <div 
            className="relative max-w-md w-full rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={selectedFullFoto} 
              alt="Bukti Foto Full" 
              className="w-full max-h-[70vh] object-contain mx-auto bg-slate-950"
            />
            <div className="p-4 bg-slate-900 flex justify-between items-center text-white border-t border-slate-800">
              <span className="text-xs font-bold font-sans">Lampiran Bukti Foto WIP</span>
              <button
                onClick={() => setSelectedFullFoto(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Tutup [X]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
