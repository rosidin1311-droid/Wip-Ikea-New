/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, Item, Transaction, TransactionAction } from '../types';
import { calculateWIP } from '../utils/storage';
import { ArrowDownLeft, ArrowUpRight, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface InputWIPProps {
  customers: Customer[];
  items: Item[];
  transactions: Transaction[];
  prefilledItemId?: string;
  prefilledProcess?: string;
  onAddTransaction: (newTx: Transaction, updatedStock?: { itemId: string; newStock: number }) => void;
  onNavigateToDashboard: () => void;
}

export default function InputWIP({
  customers,
  items,
  transactions,
  prefilledItemId,
  prefilledProcess,
  onAddTransaction,
  onNavigateToDashboard,
}: InputWIPProps) {
  // Active customers only
  const activeCustomers = customers.filter(c => c.status);

  // Form states
  const [selectedCustId, setSelectedCustId] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedProses, setSelectedProses] = useState('');
  const [actionType, setActionType] = useState<TransactionAction>('MASUK');
  const [qty, setQty] = useState<number | ''>('');
  const [qtyNG, setQtyNG] = useState<number | ''>('');
  const [note, setNote] = useState('');

  // Handle prefill parameters
  useEffect(() => {
    if (prefilledItemId) {
      const item = items.find(i => i.id === prefilledItemId);
      if (item) {
        setSelectedCustId(item.customer_id);
        setSelectedModel(item.model);
        setSelectedItemId(item.id);
        
        if (prefilledProcess && item.alur_proses.includes(prefilledProcess)) {
          setSelectedProses(prefilledProcess);
        } else if (item.alur_proses.length > 0) {
          setSelectedProses(item.alur_proses[0]);
        }
      }
    }
  }, [prefilledItemId, prefilledProcess, items]);

  // Filter items based on selected customer
  const filteredItems = items.filter(i => i.customer_id === selectedCustId);

  // Get unique model names for the selected customer
  const uniqueModels = Array.from(
    new Set(filteredItems.map(i => i.model))
  ).sort();

  // Filter items based on selected customer and model category
  const filteredItemsByModel = filteredItems.filter(i => i.model === selectedModel);

  const selectedItem = items.find(i => i.id === selectedItemId);

  // Filter processes based on selected item's custom alur
  const availableProcesses = selectedItem ? selectedItem.alur_proses : [];

  // Reset model, item & processes when customer changes
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setSelectedCustId(cid);
    setSelectedModel('');
    setSelectedItemId('');
    setSelectedProses('');
  };

  // Reset item and processes when model category changes
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelName = e.target.value;
    setSelectedModel(modelName);
    setSelectedItemId('');
    setSelectedProses('');
  };

  // Reset process when item changes
  const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const iid = e.target.value;
    setSelectedItemId(iid);
    const item = items.find(i => i.id === iid);
    if (item && item.alur_proses.length > 0) {
      setSelectedProses(item.alur_proses[0]);
    } else {
      setSelectedProses('');
    }
  };

  // Calculate current WIP for the selected item and process
  const currentWIPVal = selectedItemId && selectedProses
    ? calculateWIP(transactions, selectedItemId, selectedProses)
    : 0;

  // Check if selected process is the last process of the item's flow
  const isLastProcess = selectedItem && selectedProses
    ? selectedItem.alur_proses[selectedItem.alur_proses.length - 1] === selectedProses
    : false;

  // Web Audio API tactile feedback sound (Crisp double beep for scanners/warehouse style)
  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // First crisp beep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1000, ctx.currentTime); // Standard 1kHz alert tone
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.08);
      
      // Second pitch-up tactile confirmation beep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1400, ctx.currentTime + 0.07); // Ascending confirmation pitch
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.17);
      osc2.start(ctx.currentTime + 0.07);
      osc2.stop(ctx.currentTime + 0.17);
    } catch (error) {
      console.warn("Audio feedback context failed to initialize:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      alert('Silakan pilih item.');
      return;
    }
    if (!selectedProses) {
      alert('Silakan pilih proses kerja.');
      return;
    }
    if (!qty || Number(qty) <= 0) {
      alert('Silakan masukkan jumlah quantity yang valid.');
      return;
    }

    const inputQty = Number(qty);
    const inputQtyNG = qtyNG ? Number(qtyNG) : 0;
    const totalLeaving = inputQty + inputQtyNG;

    // Business rule: KELUAR cannot exceed current WIP value
    if (actionType === 'KELUAR' && totalLeaving > currentWIPVal) {
      alert(`Peringatan: Jumlah KELUAR (${inputQty} OK + ${inputQtyNG} NG = ${totalLeaving} pcs) melebihi jumlah WIP aktif saat ini (${currentWIPVal} pcs) di proses ${selectedProses}.`);
      return;
    }

    // Prepare transaction object
    const newTx: Transaction = {
      id: `t-${Date.now()}`,
      item_id: selectedItemId,
      proses: selectedProses,
      aksi: actionType,
      qty: inputQty,
      qty_ng: inputQtyNG,
      catatan: note.trim() || undefined,
      timestamp: new Date().toISOString(),
    };

    // Calculate updated stock if action is KELUAR and it's the last process
    let updatedStock: { itemId: string; newStock: number } | undefined;
    if (actionType === 'KELUAR' && isLastProcess && selectedItem) {
      const newStock = selectedItem.stok_ready + inputQty;
      updatedStock = {
        itemId: selectedItem.id,
        newStock: newStock
      };
    }

    onAddTransaction(newTx, updatedStock);

    // Reset some of the inputs but keep customer/item for faster continuous logging
    setQty('');
    setQtyNG('');
    setNote('');
    
    // Play subtle high-quality audio scan beep
    playSuccessSound();
    
    // Smooth scroll back to top or show success feedback
    alert(`Sukses mencatat ${actionType} ${inputQty} pcs OK${inputQtyNG > 0 ? ` & ${inputQtyNG} pcs NG` : ''} di ${selectedProses}!${updatedStock ? ' (Otomatis masuk ke STOK READY)' : ''}`);
    
    // Navigate back to dashboard if user wants to see results
    onNavigateToDashboard();
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Log WIP Movement</h1>
        <p className="text-xs text-slate-500 font-medium leading-normal font-sans">Real-time floor material logging &amp; tracking</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Customer Dropdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-extrabold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-150">LANGKAH 1</span>
            <span className="text-[10px] text-rose-500 font-extrabold tracking-wide uppercase font-sans">* Wajib</span>
          </div>
          <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Pilih Customer</label>
          <select
            value={selectedCustId}
            onChange={handleCustomerChange}
            className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white font-semibold text-slate-800 transition-all"
            required
          >
            <option value="">-- Pilih Customer Aktif --</option>
            {activeCustomers.map(c => (
              <option key={c.id} value={c.id}>{c.nama}</option>
            ))}
          </select>
        </div>

        {/* Step 2: Model Category Dropdown */}
        {selectedCustId && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-2.5 animate-fadeIn">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-extrabold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-150">LANGKAH 2</span>
              <span className="text-[10px] text-rose-500 font-extrabold tracking-wide uppercase font-sans">* Wajib</span>
            </div>
            <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Kategori Model</label>
            <select
              value={selectedModel}
              onChange={handleModelChange}
              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white font-semibold text-slate-800 transition-all"
              required
            >
              <option value="">-- Pilih Kategori Model --</option>
              {uniqueModels.map(m => {
                const count = filteredItems.filter(i => i.model === m).length;
                return (
                  <option key={m} value={m}>
                    {m} ({count} Part Number)
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Step 3: Item / Part Number Dropdown */}
        {selectedModel && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-2.5 animate-fadeIn">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-extrabold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-150">LANGKAH 3</span>
              <span className="text-[10px] text-rose-500 font-extrabold tracking-wide uppercase font-sans">* Wajib</span>
            </div>
            <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Nomor Part ({selectedModel})</label>
            <select
              value={selectedItemId}
              onChange={handleItemChange}
              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white font-semibold text-slate-800 transition-all"
              required
            >
              <option value="">-- Pilih Nomor Part --</option>
              {filteredItemsByModel.map(i => (
                <option key={i.id} value={i.id}>
                  {i.part_number} (Stok Ready: {i.stok_ready.toLocaleString()} pcs)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 4: Process Dropdown */}
        {selectedItemId && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-2.5 animate-fadeIn">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-extrabold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-150">LANGKAH 4</span>
              <span className="text-[10px] text-rose-500 font-extrabold tracking-wide uppercase font-sans">* Wajib</span>
            </div>
            <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Pilih Proses Kerja</label>
            {availableProcesses.length > 0 ? (
              <select
                value={selectedProses}
                onChange={(e) => setSelectedProses(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white font-semibold text-slate-800 transition-all"
                required
              >
                {availableProcesses.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-rose-500 py-2">
                Item ini belum memiliki alur proses terdaftar. Konfigurasi dulu di Master Data.
              </p>
            )}

            {/* Quick WIP summary helper */}
            {selectedProses && (
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mt-2 flex justify-between items-center text-xs">
                <div>
                  <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">WIP Aktif Saat Ini</p>
                  <p className="font-extrabold text-slate-700 font-display mt-0.5">{selectedProses}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-slate-800 font-mono">{currentWIPVal.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 font-bold ml-1 font-mono">pcs</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Action MASUK or KELUAR */}
        {selectedProses && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-3 animate-fadeIn">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-extrabold font-mono text-[#800412] bg-[#800412]/5 px-2.5 py-0.5 rounded-full border border-[#800412]/15">LANGKAH 5</span>
              <span className="text-[10px] text-rose-500 font-extrabold tracking-wide uppercase font-sans">* Wajib</span>
            </div>
            <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Jenis Pergerakan (Aksi)</label>
            
            {/* Styled segmented buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActionType('MASUK')}
                className={`py-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all bento-tactile cursor-pointer ${
                  actionType === 'MASUK'
                    ? 'border-[#800412]/60 bg-[#800412]/5 text-[#800412] ring-4 ring-[#800412]/10 font-bold shadow-sm'
                    : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className={actionType === 'MASUK' ? 'text-[#800412]' : 'text-slate-400'} size={20} />
                <span className="text-xs font-bold font-display uppercase tracking-wider">MASUK</span>
                <span className="text-[9px] font-medium opacity-70">WIP bertambah (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('KELUAR')}
                className={`py-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all bento-tactile cursor-pointer ${
                  actionType === 'KELUAR'
                    ? 'border-[#800412]/60 bg-[#800412]/5 text-[#800412] ring-4 ring-[#800412]/10 font-bold shadow-sm'
                    : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className={actionType === 'KELUAR' ? 'text-[#800412]' : 'text-slate-400'} size={20} />
                <span className="text-xs font-bold font-display uppercase tracking-wider">KELUAR</span>
                <span className="text-[9px] font-medium opacity-70">WIP berkurang (-)</span>
              </button>
            </div>

            {/* Hint message */}
            {actionType === 'KELUAR' && isLastProcess && (
              <div className="bg-[#800412]/5 text-[#800412] p-3.5 rounded-xl border border-[#800412]/15 flex items-start gap-2.5 text-xs animate-fadeIn">
                <Check className="text-[#800412] shrink-0 mt-0.5" size={15} />
                <p className="leading-normal font-medium">
                  <strong>Logika Stok Otomatis:</strong> {selectedProses} adalah proses terakhir. Quantity KELUAR otomatis terakumulasi langsung ke <strong>STOK READY</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 6 & 7: Quantity and Notes */}
        {selectedProses && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-extrabold font-mono text-[#800412] bg-[#800412]/5 px-2.5 py-0.5 rounded-full border border-[#800412]/15">LANGKAH 6 &amp; 7</span>
              <span className="text-[10px] text-rose-500 font-extrabold tracking-wide uppercase font-sans">* Wajib</span>
            </div>

            {/* Qty Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Qty OK */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Jumlah OK (Pcs) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="OK..."
                  value={qty}
                  onChange={(e) => setQty(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-base focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white font-extrabold font-mono transition-all text-slate-800"
                  required
                />
              </div>

              {/* Qty NG */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Jumlah NG (Pcs)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="NG..."
                  value={qtyNG}
                  onChange={(e) => setQtyNG(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-base focus:outline-none focus:border-[#800412] focus:ring-4 focus:ring-red-100 focus:bg-white font-extrabold font-mono transition-all text-slate-800"
                />
              </div>
            </div>

            {actionType === 'KELUAR' && currentWIPVal > 0 && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1 font-mono font-medium">
                <span>Maksimal Keluar (OK+NG):</span>
                <span className="font-bold text-slate-600">{currentWIPVal.toLocaleString()} pcs</span>
              </div>
            )}

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Catatan <span className="font-normal text-slate-400 text-[9px]">(Opsional)</span></label>
              <input
                type="text"
                placeholder="Contoh: split di 2 mesin, sisa ke Cmi"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Submit button */}
        {selectedProses && qty !== '' && Number(qty) > 0 && (
          <div className="pt-2 animate-fadeIn">
            <button
              type="submit"
              className={`w-full py-4 rounded-2xl text-white font-extrabold text-sm tracking-wide shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                actionType === 'MASUK' 
                  ? 'bg-emerald-600 shadow-emerald-600/10 hover:bg-emerald-700' 
                  : 'bg-rose-600 shadow-rose-600/10 hover:bg-rose-700'
              }`}
            >
              Simpan Pergerakan WIP
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
