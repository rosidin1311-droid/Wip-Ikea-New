/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Customer, Item, DEFAULT_PROSES } from '../types';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Check, X, ToggleLeft, ToggleRight, Settings } from 'lucide-react';

interface MasterDataManagerProps {
  customers: Customer[];
  items: Item[];
  onUpdateCustomers: (customers: Customer[]) => void;
  onUpdateItems: (items: Item[]) => void;
}

export default function MasterDataManager({
  customers,
  items,
  onUpdateCustomers,
  onUpdateItems,
}: MasterDataManagerProps) {
  const [subTab, setSubTab] = useState<'customer' | 'item'>('customer');

  // Customer State
  const [showCustForm, setShowCustForm] = useState(false);
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [custName, setCustName] = useState('');
  const [custStatus, setCustStatus] = useState(true);

  // Item State
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemCustId, setItemCustId] = useState('');
  const [itemModel, setItemModel] = useState('');
  const [itemPartNumber, setItemPartNumber] = useState('');
  const [selectedProses, setSelectedProses] = useState<string[]>([]);
  const [itemStockReady, setItemStockReady] = useState(0);

  // --- Customer Operations ---
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    if (editingCustId) {
      const updated = customers.map(c =>
        c.id === editingCustId ? { ...c, nama: custName.trim().toUpperCase(), status: custStatus } : c
      );
      onUpdateCustomers(updated);
      setEditingCustId(null);
    } else {
      const newCust: Customer = {
        id: `c-${Date.now()}`,
        nama: custName.trim().toUpperCase(),
        status: true,
      };
      onUpdateCustomers([...customers, newCust]);
    }
    setCustName('');
    setCustStatus(true);
    setShowCustForm(false);
  };

  const handleEditCustomer = (cust: Customer) => {
    setEditingCustId(cust.id);
    setCustName(cust.nama);
    setCustStatus(cust.status);
    setShowCustForm(true);
  };

  const handleToggleCustomerStatus = (id: string) => {
    const updated = customers.map(c =>
      c.id === id ? { ...c, status: !c.status } : c
    );
    onUpdateCustomers(updated);
  };

  // --- Item Operations ---
  const handleToggleProsesSelection = (proc: string) => {
    if (selectedProses.includes(proc)) {
      setSelectedProses(selectedProses.filter(p => p !== proc));
    } else {
      setSelectedProses([...selectedProses, proc]);
    }
  };

  const handleMoveProses = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedProses.length - 1) return;

    const newAlur = [...selectedProses];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    const temp = newAlur[index];
    newAlur[index] = newAlur[swapWith];
    newAlur[swapWith] = temp;
    setSelectedProses(newAlur);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCustId || !itemModel.trim() || !itemPartNumber.trim()) {
      alert('Mohon lengkapi semua kolom wajib.');
      return;
    }
    if (selectedProses.length === 0) {
      alert('Pilih minimal satu proses dalam Alur Proses.');
      return;
    }

    if (editingItemId) {
      const updated = items.map(i =>
        i.id === editingItemId
          ? {
              ...i,
              customer_id: itemCustId,
              model: itemModel.trim().toUpperCase(),
              part_number: itemPartNumber.trim().toUpperCase(),
              alur_proses: selectedProses,
              stok_ready: Number(itemStockReady),
            }
          : i
      );
      onUpdateItems(updated);
      setEditingItemId(null);
    } else {
      const newItem: Item = {
        id: `i-${Date.now()}`,
        customer_id: itemCustId,
        model: itemModel.trim().toUpperCase(),
        part_number: itemPartNumber.trim().toUpperCase(),
        alur_proses: selectedProses,
        stok_ready: Number(itemStockReady) || 0,
      };
      onUpdateItems([...items, newItem]);
    }

    // Reset form
    setItemCustId('');
    setItemModel('');
    setItemPartNumber('');
    setSelectedProses([]);
    setItemStockReady(0);
    setShowItemForm(false);
  };

  const handleEditItem = (item: Item) => {
    setEditingItemId(item.id);
    setItemCustId(item.customer_id);
    setItemModel(item.model);
    setItemPartNumber(item.part_number);
    setSelectedProses(item.alur_proses);
    setItemStockReady(item.stok_ready);
    setShowItemForm(true);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus item ini? Semua data transaksi untuk item ini akan tetap tersimpan tapi tidak tampil di tracker aktif.')) {
      onUpdateItems(items.filter(i => i.id !== id));
    }
  };

  return (
    <div className="pb-24 font-sans">
      {/* Title */}
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Master Data</h1>
        <p className="text-xs text-slate-500 font-medium leading-normal">Configure customers, items, and manufacturing routing lines</p>
      </div>

      {/* Segmented Control */}
      <div className="flex bg-slate-200/50 border border-slate-200/40 p-1 rounded-xl mb-6">
        <button
          onClick={() => { setSubTab('customer'); setShowCustForm(false); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all bento-tactile cursor-pointer ${
            subTab === 'customer'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-705'
          }`}
        >
          Customer
        </button>
        <button
          onClick={() => { setSubTab('item'); setShowItemForm(false); }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all bento-tactile cursor-pointer ${
            subTab === 'item'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-705'
          }`}
        >
          Item &amp; Alur Proses
        </button>
      </div>

      {/* --- CUSTOMER SECTION --- */}
      {subTab === 'customer' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display">
              Daftar Customer ({customers.length})
            </h2>
            {!showCustForm && (
              <button
                onClick={() => {
                  setEditingCustId(null);
                  setCustName('');
                  setCustStatus(true);
                  setShowCustForm(true);
                }}
                className="bg-ikea-blue hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} /> Tambah Customer
              </button>
            )}
          </div>

          {showCustForm && (
            <form onSubmit={handleSaveCustomer} className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-4 mb-6 animate-fadeIn">
              <h3 className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-150 inline-block uppercase tracking-wider mb-2">
                {editingCustId ? 'Edit Customer' : 'Tambah Customer Baru'}
              </h3>
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Nama Customer</label>
                <input
                  type="text"
                  placeholder="Contoh: RAYARD, TENMA, LUNG VICTORY"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 transition-all font-semibold text-slate-850 uppercase"
                  required
                />
              </div>

              {editingCustId && (
                <div className="flex items-center justify-between py-2 border-t border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status Keaktifan</span>
                  <button
                    type="button"
                    onClick={() => setCustStatus(!custStatus)}
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    {custStatus ? (
                      <ToggleRight className="text-ikea-blue w-11 h-11" />
                    ) : (
                      <ToggleLeft className="text-slate-400 w-11 h-11" />
                    )}
                  </button>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustForm(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-ikea-blue hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm divide-y divide-slate-100">
            {customers.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div>
                  <p className="font-extrabold text-slate-900 text-sm tracking-tight font-display">{c.nama}</p>
                  <p className={`text-[8px] inline-flex items-center gap-1.5 px-2 py-0.5 mt-1.5 rounded-full font-black uppercase tracking-wider ${
                    c.status ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.status ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    {c.status ? 'Aktif' : 'Nonaktif'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleCustomerStatus(c.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    title={c.status ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {c.status ? (
                      <ToggleRight className="text-ikea-blue w-9 h-9" />
                    ) : (
                      <ToggleLeft className="text-slate-300 w-9 h-9" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEditCustomer(c)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200/30 cursor-pointer active:scale-95 transition-all"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {customers.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">
                Belum ada customer. Silakan tambahkan customer baru.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ITEM SECTION --- */}
      {subTab === 'item' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display">
              Daftar Item ({items.length})
            </h2>
            {!showItemForm && (
              <button
                onClick={() => {
                  setEditingItemId(null);
                  setItemCustId(customers.find(c => c.status)?.id || '');
                  setItemModel('');
                  setItemPartNumber('');
                  setSelectedProses([]);
                  setItemStockReady(0);
                  setShowItemForm(true);
                }}
                className="bg-ikea-blue hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} /> Tambah Item
              </button>
            )}
          </div>

          {showItemForm && (
            <form onSubmit={handleSaveItem} className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-4 mb-6 animate-fadeIn">
              <h3 className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-150 inline-block uppercase tracking-wider mb-2">
                {editingItemId ? 'Edit Item' : 'Tambah Item Baru'}
              </h3>

              {/* Customer ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Customer *</label>
                <select
                  value={itemCustId}
                  onChange={(e) => setItemCustId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 transition-all font-semibold text-slate-800"
                  required
                >
                  <option value="">-- Pilih Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id} disabled={!c.status}>
                      {c.nama} {!c.status && '(Nonaktif)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Nama Model *</label>
                <input
                  type="text"
                  placeholder="Contoh: CONS BOX, MBOX"
                  value={itemModel}
                  onChange={(e) => setItemModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 transition-all font-semibold text-slate-850 uppercase"
                  required
                />
              </div>

              {/* Part Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Part Number *</label>
                <input
                  type="text"
                  placeholder="Contoh: C/T750*570*450-MM"
                  value={itemPartNumber}
                  onChange={(e) => setItemPartNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 transition-all font-mono font-medium text-slate-800 uppercase"
                  required
                />
              </div>

              {/* Ready Stock */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">Stok Ready Awal (pcs)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={itemStockReady || ''}
                  onChange={(e) => setItemStockReady(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-ikea-blue focus:ring-4 focus:ring-indigo-100 transition-all font-mono font-bold text-slate-800"
                  min="0"
                />
              </div>

              {/* Custom Process Flow builder */}
              <div className="space-y-2.5 border-t border-slate-100 pt-4">
                <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider">
                  Alur Proses * <span className="font-medium text-slate-400 text-[10px] lowercase">(tap untuk pilih &amp; urutkan)</span>
                </label>

                {/* Pool of default processes */}
                <div className="flex flex-wrap gap-1.5 py-2">
                  {DEFAULT_PROSES.map((proc) => {
                    const isSelected = selectedProses.includes(proc);
                    const position = selectedProses.indexOf(proc);
                    return (
                      <button
                        type="button"
                        key={proc}
                        onClick={() => handleToggleProsesSelection(proc)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 border cursor-pointer ${
                          isSelected
                            ? 'bg-ikea-blue text-white shadow-sm border-ikea-blue'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
                        }`}
                      >
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-white text-ikea-blue text-[9px] flex items-center justify-center font-black">
                            {position + 1}
                          </span>
                        )}
                        {proc}
                      </button>
                    );
                  })}
                </div>

                {/* Ordered Processes layout */}
                {selectedProses.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/55 mt-2 animate-fadeIn">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Urutan Alur Terpilih:</p>
                    <div className="space-y-2">
                      {selectedProses.map((proc, index) => (
                        <div key={proc} className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200/50 text-xs shadow-xs">
                          <span className="font-mono text-slate-400 w-4 font-bold">{index + 1}</span>
                          <span className="font-bold text-slate-800 flex-1 pl-1">{proc}</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveProses(index, 'up')}
                              disabled={index === 0}
                              className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 rounded-lg cursor-pointer"
                            >
                              <ArrowUp size={14} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveProses(index, 'down')}
                              disabled={index === selectedProses.length - 1}
                              className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 rounded-lg cursor-pointer"
                            >
                              <ArrowDown size={14} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleProsesSelection(proc)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              <X size={14} className="stroke-[2.5]" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3.5 flex items-center flex-wrap gap-1.5 text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                      <span>ALUR:</span>
                      {selectedProses.map((proc, idx) => (
                        <React.Fragment key={proc}>
                          <span className="font-black text-slate-700 bg-slate-200/60 px-1 py-0.5 rounded">{proc}</span>
                          {idx < selectedProses.length - 1 && <span className="text-slate-300">→</span>}
                        </React.Fragment>
                      ))}
                      <span className="text-slate-300">→</span>
                      <span className="font-black text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-150">STOK</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-ikea-blue hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Simpan Item
                </button>
              </div>
            </form>
          )}

          {/* Item List */}
          <div className="space-y-3">
            {items.map((item) => {
              const cust = customers.find(c => c.id === item.customer_id);
              return (
                <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3.5 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 font-display tracking-wider uppercase">{cust?.nama || 'Unknown Customer'}</p>
                      <h4 className="font-extrabold text-slate-900 text-sm tracking-tight font-display mt-0.5">{item.model}</h4>
                      <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{item.part_number}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200/30 cursor-pointer active:scale-95 transition-transform"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg border border-rose-100/35 cursor-pointer active:scale-95 transition-transform"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Stock info */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-200/30">
                    <span className="text-slate-500 font-medium">Stok Ready saat ini:</span>
                    <span className="font-extrabold text-slate-800 font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200/20">{item.stok_ready.toLocaleString()} pcs</span>
                  </div>

                  {/* Flow preview */}
                  <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-1.5 font-sans pt-1">
                    <span className="font-extrabold text-slate-400 font-mono">FLOW:</span>
                    {item.alur_proses.map((p, idx) => (
                      <span key={p} className="inline-flex items-center gap-1">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold font-mono border border-slate-200/30">{p}</span>
                        {idx < item.alur_proses.length - 1 && <span className="text-slate-300 font-bold">→</span>}
                      </span>
                    ))}
                    <span className="text-slate-300 font-bold">→</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black border border-emerald-150">STOK</span>
                  </div>
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="bg-white p-12 rounded-2xl border border-slate-200/60 shadow-sm text-center text-slate-400 text-xs font-medium">
                Belum ada item. Silakan tambahkan item baru.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
