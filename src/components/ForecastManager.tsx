/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, Item, Forecast, ForecastStatus } from '../types';
import { Plus, Calendar, AlertCircle, CheckCircle, Archive, Trash2, ArrowUpRight, HelpCircle, X } from 'lucide-react';

interface ForecastManagerProps {
  customers: Customer[];
  items: Item[];
  forecasts: Forecast[];
  onUpdateForecasts: (forecasts: Forecast[]) => void;
  onUpdateItems: (items: Item[]) => void;
}

export default function ForecastManager({
  customers,
  items,
  forecasts,
  onUpdateForecasts,
  onUpdateItems,
}: ForecastManagerProps) {
  const [showForm, setShowForm] = useState(false);
  
  // Custom dialog system for safe usage in sandbox iframe
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'success';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  });

  // Filter for active/archived forecasts
  const [filterStatus, setFilterStatus] = useState<'ACTIVE' | 'ARCHIVED_CLOSED'>('ACTIVE');

  // Form states
  const [selectedCustId, setSelectedCustId] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [tglDelivery, setTglDelivery] = useState('');
  const [qtyDelivery, setQtyDelivery] = useState<number | ''>('');
  const [keterangan, setKeterangan] = useState('');

  // Active customers only
  const activeCustomers = customers.filter(c => c.status);
  const filteredItems = items.filter(i => i.customer_id === selectedCustId);

  // Get unique model names for the selected customer
  const uniqueModels = Array.from(
    new Set(filteredItems.map(i => i.model))
  ).sort();

  // Filter items based on selected customer and model category
  const filteredItemsByModel = filteredItems.filter(i => i.model === selectedModel);

  // Auto-calculated fields when item or quantity changes
  const selectedItem = items.find(i => i.id === selectedItemId);
  const [stokAwal, setStokAwal] = useState(0);

  // Auto-fill initial stock from the selected item's current stock
  useEffect(() => {
    if (selectedItem) {
      setStokAwal(selectedItem.stok_ready);
    } else {
      setStokAwal(0);
    }
  }, [selectedItemId, selectedItem]);

  // Handle customer dropdown change
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCustId(e.target.value);
    setSelectedModel('');
    setSelectedItemId('');
  };

  // Handle model dropdown change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
    setSelectedItemId('');
  };

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

  const handleSaveForecast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !tglDelivery || !qtyDelivery) {
      setDialog({
        isOpen: true,
        type: 'alert',
        title: 'Formulir Belum Lengkap',
        message: 'Mohon lengkapi semua field wajib.'
      });
      return;
    }

    const qty = Number(qtyDelivery);
    const remainValue = stokAwal - qty; // remain = stok_awal - qty (negative = kurang)

    const newForecast: Forecast = {
      id: `f-${Date.now()}`,
      item_id: selectedItemId,
      tgl_delivery: tglDelivery,
      qty,
      stok_awal: stokAwal,
      remain: remainValue,
      status: 'ACTIVE',
      keterangan: keterangan.trim() || undefined
    };

    onUpdateForecasts([newForecast, ...forecasts]);
    
    // Play subtle high-quality scan beep
    playSuccessSound();

    // Reset form
    setSelectedCustId('');
    setSelectedModel('');
    setSelectedItemId('');
    setTglDelivery('');
    setQtyDelivery('');
    setKeterangan('');
    setShowForm(false);
    
    setDialog({
      isOpen: true,
      type: 'success',
      title: 'Disimpan',
      message: 'Forecast berhasil disimpan!'
    });
  };

  const handleDeleteForecast = (id: string) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Hapus Forecast',
      message: 'Apakah Anda yakin ingin menghapus target forecast ini? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: () => {
        onUpdateForecasts(forecasts.filter(f => f.id !== id));
      }
    });
  };

  // Close/Execute Delivery logic
  const handleFulfillForecast = (forecast: Forecast) => {
    const item = items.find(i => i.id === forecast.item_id);
    if (!item) return;

    const shippedQty = forecast.qty;
    const currentStock = item.stok_ready;
    
    let messageBody = `Kirim delivery untuk model ${item.model} sejumlah ${shippedQty.toLocaleString()} pcs?\n\n`;
    
    if (currentStock < shippedQty) {
      messageBody += `⚠️ PERINGATAN: Stok ready saat ini (${currentStock.toLocaleString()} pcs) KURANG dari jumlah delivery (${shippedQty.toLocaleString()} pcs).\n`;
      messageBody += `Jika dilanjutkan, stok akan berkurang dan bernilai negatif.\n\n`;
    } else {
      messageBody += `Stok ready saat ini: ${currentStock.toLocaleString()} pcs\n`;
      messageBody += `Stok setelah kirim: ${(currentStock - shippedQty).toLocaleString()} pcs (Sisa stok tersimpan)\n\n`;
    }
    
    messageBody += `Apakah Anda ingin melanjutkan pengiriman dan menutup (CLOSE) forecast ini?`;

    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Kirim & Selesaikan Delivery',
      message: messageBody,
      onConfirm: () => {
        // 1. Decrement item ready stock by shipped quantity
        const updatedStock = Math.max(0, currentStock - shippedQty); // prevent negative unless they really forced it or keep it at 0
        const updatedItems = items.map(i => 
          i.id === item.id ? { ...i, stok_ready: updatedStock } : i
        );
        onUpdateItems(updatedItems);

        // 2. Mark forecast as CLOSED
        const updatedForecasts = forecasts.map(f =>
          f.id === forecast.id ? { ...f, status: 'CLOSED' as ForecastStatus } : f
        );
        onUpdateForecasts(updatedForecasts);

        setDialog({
          isOpen: true,
          type: 'success',
          title: 'Pengiriman Berhasil',
          message: `Delivery berhasil dikirim!\nStok ${item.model} sekarang: ${updatedStock.toLocaleString()} pcs.\nForecast ini telah ditutup (CLOSED).`
        });
      }
    });
  };

  // Archive forecast (just mark as ARCHIVED)
  const handleArchiveForecast = (id: string) => {
    const updated = forecasts.map(f =>
      f.id === id ? { ...f, status: 'ARCHIVED' as ForecastStatus } : f
    );
    onUpdateForecasts(updated);
  };

  // Display calculations
  const displayForecasts = forecasts.filter(f => {
    if (filterStatus === 'ACTIVE') {
      return f.status === 'ACTIVE';
    } else {
      return f.status === 'CLOSED' || f.status === 'ARCHIVED';
    }
  });

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Forecast &amp; Stock</h1>
          <p className="text-xs text-slate-500 font-medium leading-normal">Monitor delivery requirements &amp; stock availability</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-ikea-blue hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={15} /> Tambah Target
          </button>
        )}
      </div>

      {/* Input Form */}
      {showForm && (
        <form onSubmit={handleSaveForecast} className="space-y-5 mb-6 animate-fadeIn">
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
              className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white font-semibold text-slate-800 transition-all cursor-pointer"
              required
            >
              <option value="">-- Pilih Customer --</option>
              {activeCustomers.map(c => (
                <option key={c.id} value={c.id}>{c.nama}</option>
              ))}
            </select>
          </div>

          {/* Step 2: Kategori Model */}
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
                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white font-semibold text-slate-800 transition-all cursor-pointer"
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

          {/* Step 3: Nomor Part */}
          {selectedModel && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-2.5 animate-fadeIn">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-extrabold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-150">LANGKAH 3</span>
                <span className="text-[10px] text-rose-500 font-extrabold tracking-wide uppercase font-sans">* Wajib</span>
              </div>
              <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Nomor Part ({selectedModel})</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white font-semibold text-slate-800 transition-all cursor-pointer"
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

          {/* Step 4: Detail Delivery Target */}
          {selectedItemId && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-extrabold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-150">LANGKAH 4</span>
                <span className="text-[10px] text-rose-500 font-extrabold tracking-wide uppercase font-sans">* Wajib</span>
              </div>

              {/* Qty & Date Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Qty Delivery (pcs) *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Jumlah kirim..."
                    value={qtyDelivery}
                    onChange={(e) => setQtyDelivery(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all font-extrabold font-mono text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Tgl Delivery *</label>
                  <input
                    type="date"
                    value={tglDelivery}
                    onChange={(e) => setTglDelivery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all font-mono text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Sisa Stok / Stock status live calculation card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50 space-y-2 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500 font-sans">Stok Ready saat ini:</span>
                  <span className="font-extrabold text-slate-800 font-mono">{stokAwal.toLocaleString()} pcs</span>
                </div>
                {qtyDelivery !== '' && (
                  <div className="flex justify-between border-t border-slate-200/40 pt-2 font-sans">
                    <span className="text-slate-500">Status Selisih (Remain):</span>
                    {stokAwal - Number(qtyDelivery) >= 0 ? (
                      <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-150 font-mono">
                        +{ (stokAwal - Number(qtyDelivery)).toLocaleString() } pcs (Cukup)
                      </span>
                    ) : (
                      <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-150 font-mono">
                        { (stokAwal - Number(qtyDelivery)).toLocaleString() } pcs (Kurang)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Keterangan */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Keterangan / No. PO</label>
                <input
                  type="text"
                  placeholder="Contoh: No. PO 4300923, Urgent Kirim Pagi"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all text-slate-800 font-semibold"
                />
              </div>

              {/* Form buttons */}
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-ikea-blue hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all active:scale-95 cursor-pointer"
                >
                  Simpan Target
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Segmented Filter */}
      <div className="flex bg-slate-200/50 border border-slate-200/40 p-1 rounded-xl mb-4">
        <button
          onClick={() => setFilterStatus('ACTIVE')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all bento-tactile cursor-pointer ${
            filterStatus === 'ACTIVE'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Target Aktif
        </button>
        <button
          onClick={() => setFilterStatus('ARCHIVED_CLOSED')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all bento-tactile cursor-pointer ${
            filterStatus === 'ARCHIVED_CLOSED'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Riwayat Delivery ({forecasts.filter(f => f.status !== 'ACTIVE').length})
        </button>
      </div>

      {/* List Container */}
      <div className="space-y-3">
        {displayForecasts.map((f) => {
          const item = items.find(i => i.id === f.item_id);
          const cust = item ? customers.find(c => c.id === item.customer_id) : null;
          
          // Re-evaluate real-time remain based on current actual stock!
          const actualRemain = item ? item.stok_ready - f.qty : 0;
          const isDeficit = actualRemain < 0;

          return (
            <div
              key={f.id}
              className={`p-5 rounded-2xl border bg-white shadow-sm transition-all ${
                f.status === 'ACTIVE'
                  ? isDeficit 
                    ? 'border-l-4 border-l-rose-500 border-slate-200/70'
                    : 'border-l-4 border-l-emerald-500 border-slate-200/70'
                  : 'border-slate-200/60 bg-slate-50/50'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-display">
                      {cust?.nama || 'Unknown Customer'}
                    </span>
                    {f.status === 'CLOSED' && (
                      <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        CLOSED
                      </span>
                    )}
                    {f.status === 'ARCHIVED' && (
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        ARCHIVED
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5 font-display tracking-tight">{item?.model || 'Unknown Item'}</h4>
                  <p className="text-[10px] text-slate-400 font-mono font-medium">{item?.part_number}</p>
                </div>

                <div className="flex gap-1.5">
                  {f.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleFulfillForecast(f)}
                      className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-extrabold flex items-center gap-1 active:scale-95 transition-transform border border-emerald-100/60 cursor-pointer"
                      title="Kirim & Selesaikan Delivery"
                    >
                      <CheckCircle size={12} /> Kirim
                    </button>
                  )}
                  {f.status === 'CLOSED' && (
                    <button
                      onClick={() => handleArchiveForecast(f.id)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer border border-slate-200/40"
                      title="Arsip"
                    >
                      <Archive size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteForecast(f.id)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg text-xs cursor-pointer border border-rose-100/40"
                    title="Hapus"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Status details */}
              <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-slate-200/30 my-3 text-center bg-slate-50 rounded-xl">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">TARGET KIRIM</p>
                  <p className="font-extrabold text-slate-800 text-xs mt-0.5 font-mono">{f.qty.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">STOK READY</p>
                  <p className="font-extrabold text-slate-800 text-xs mt-0.5 font-mono">
                    {item ? item.stok_ready.toLocaleString() : 0}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">SELISIH</p>
                  {isDeficit ? (
                    <p className="font-extrabold text-rose-600 text-xs mt-0.5 font-mono bg-rose-50 mx-1 rounded py-0.5">
                      {actualRemain.toLocaleString()}
                    </p>
                  ) : (
                    <p className="font-extrabold text-emerald-600 text-xs mt-0.5 font-mono bg-emerald-50 mx-1 rounded py-0.5">
                      +{actualRemain.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery info */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500 pt-1 font-sans">
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Kirim: <strong className="text-slate-800 font-mono font-bold">{f.tgl_delivery}</strong></span>
                </div>
                {f.keterangan && (
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] truncate max-w-[150px] font-medium border border-slate-200/30">
                    {f.keterangan}
                  </span>
                )}
              </div>

              {/* Warning logic for deficits */}
              {f.status === 'ACTIVE' && isDeficit && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-amber-800 font-medium font-sans">
                  <AlertCircle size={13} className="shrink-0 text-amber-500" />
                  <span>Stok kurang. Harap segera catat pergerakan MASUK WIP di bagian produksi.</span>
                </div>
              )}
            </div>
          );
        })}

        {displayForecasts.length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/60 shadow-sm text-center text-slate-400 text-xs font-medium">
            {filterStatus === 'ACTIVE'
              ? 'Tidak ada target forecast aktif. Silakan tambahkan target kirim baru.'
              : 'Belum ada riwayat forecast yang diselesaikan.'}
          </div>
        )}
      </div>

      {/* Carry-over Stock Explanation Card */}
      <div className="mt-6 bg-indigo-50/60 border border-indigo-100/60 rounded-2xl p-4.5 flex items-start gap-3">
        <HelpCircle size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 space-y-1 font-sans">
          <p className="font-extrabold font-display">💡 Aturan Carry-Over Stok IKEA</p>
          <p className="leading-relaxed font-medium">
            Sistem dirancang agar ketika Forecast di-<strong>CLOSE / KIRIM</strong>, sisa stok yang diproduksi berlebih tidak akan hilang. Sisa stok tersebut tetap tersimpan di database item (Stok Ready) dan akan otomatis menjadi stok awal di forecast berikutnya untuk item yang sama.
          </p>
        </div>
      </div>

      {/* Custom Dialog Modal (Guarantees functional alerts & confirms inside sandboxed iframe) */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" 
            onClick={() => {
              if (dialog.type !== 'confirm') {
                setDialog(prev => ({ ...prev, isOpen: false }));
              }
            }}
          />
          
          {/* Modal Content */}
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative z-10 border border-slate-100 animate-scaleUp">
            <button 
              onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-50 cursor-pointer"
            >
              <X size={14} className="stroke-[2.5]" />
            </button>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center">
                {dialog.type === 'confirm' ? (
                  <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                    <Trash2 size={24} />
                  </div>
                ) : dialog.type === 'success' ? (
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle size={24} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                    <AlertCircle size={24} />
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900 font-display">
                  {dialog.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium whitespace-pre-wrap leading-relaxed">
                  {dialog.message}
                </p>
              </div>
              
              <div className="flex gap-2.5 pt-2">
                {dialog.type === 'confirm' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (dialog.onConfirm) dialog.onConfirm();
                        setDialog(prev => ({ ...prev, isOpen: false }));
                      }}
                      className="flex-1 py-2.5 bg-[#800412] hover:bg-[#a00618] text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/10 transition-all active:scale-95 cursor-pointer"
                    >
                      Ya, Lanjutkan
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Mengerti
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
