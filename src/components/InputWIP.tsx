/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, Item, Transaction, TransactionAction } from '../types';
import { calculateWIP } from '../utils/storage';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Camera, 
  Upload, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileText 
} from 'lucide-react';

interface AIDraftTransaction {
  id: string;
  itemId: string;
  modelName: string;
  partNumber: string;
  proses: string;
  aksi: TransactionAction;
  qty: number;
  qty_ng: number;
  operator: string;
  shift: 1 | 2 | 3;
  catatan: string;
  confidence: number;
}

interface InputWIPProps {
  customers: Customer[];
  items: Item[];
  transactions: Transaction[];
  prefilledItemId?: string;
  prefilledProcess?: string;
  onAddTransaction: (newTx: Transaction | Transaction[], updatedStock?: { itemId: string; newStock: number }) => void;
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

  // Mode state
  const [activeMode, setActiveMode] = useState<'manual' | 'ai'>('manual');

  // AI Scan states
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState('');
  const [aiDrafts, setAiDrafts] = useState<AIDraftTransaction[]>([]);
  const [aiLogSummary, setAiLogSummary] = useState('');

  // Form states
  const [selectedCustId, setSelectedCustId] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedProses, setSelectedProses] = useState('');
  const [actionType, setActionType] = useState<TransactionAction>('MASUK');
  const [qty, setQty] = useState<number | ''>('');
  const [qtyNG, setQtyNG] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [autoDeductPrevious, setAutoDeductPrevious] = useState(true);

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

  // Determine previous process and its current WIP
  const currentProcessIndex = selectedItem && selectedProses ? selectedItem.alur_proses.indexOf(selectedProses) : -1;
  const previousProcess = currentProcessIndex > 0 ? selectedItem.alur_proses[currentProcessIndex - 1] : null;
  const previousWIPVal = selectedItemId && previousProcess
    ? calculateWIP(transactions, selectedItemId, previousProcess)
    : 0;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 480;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); // 60% quality compressed JPEG
          setFoto(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAiPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiDrafts([]);
    setAiLogSummary('');
    setIsAiLoading(true);
    setAiStatusMessage('Membaca file gambar...');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Max 1024px for great legibility without bloating payload
        const MAX_DIM = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); // 85% high quality for clear text reading
          setAiImage(compressedBase64);
          triggerAiParsing(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerAiParsing = async (base64Image: string) => {
    try {
      setAiStatusMessage('Menganalisis tulisan tangan...');
      
      const payload = {
        image: base64Image,
        items: items,
        customers: customers
      };

      const response = await fetch('/api/parse-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || 'Gagal terhubung ke API');
      }

      const data = await response.json();
      
      if (data.error === 'API_KEY_MISSING') {
        alert(`API Key Gemini belum diatur. Silakan buka menu Settings > Secrets di AI Studio lalu simpan kunci GEMINI_API_KEY Anda.`);
        setIsAiLoading(false);
        return;
      }

      setAiStatusMessage('Menyusun draf laporan...');
      
      const parsedTransactions = Array.isArray(data.transactions) ? data.transactions : [];
      
      const drafts: AIDraftTransaction[] = parsedTransactions.map((tx: any, idx: number) => {
        // Find best match in existing items
        let matchedItem = items.find(i => i.id === tx.itemId);
        
        // Match by model name or part number (case-insensitive) fallback
        if (!matchedItem && tx.modelName) {
          matchedItem = items.find(
            i => i.model.toUpperCase() === String(tx.modelName).toUpperCase()
          );
        }
        if (!matchedItem && tx.partNumber) {
          matchedItem = items.find(
            i => i.part_number.toUpperCase() === String(tx.partNumber).toUpperCase()
          );
        }

        // Map process
        let selectedProsesVal = '';
        if (matchedItem) {
          const matchedProc = matchedItem.alur_proses.find(
            p => p.toUpperCase() === String(tx.proses || '').toUpperCase()
          );
          selectedProsesVal = matchedProc || matchedItem.alur_proses[0] || '';
        }

        // Map action 'IN' / 'OUT' / 'WIP_UPDATE' to 'MASUK' / 'KELUAR'
        let mappedAksi: TransactionAction = 'MASUK';
        if (tx.action === 'OUT' || tx.action === 'KELUAR') {
          mappedAksi = 'KELUAR';
        }

        return {
          id: `ai-draft-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          itemId: matchedItem ? matchedItem.id : '',
          modelName: tx.modelName || matchedItem?.model || 'TIDAK DIKENAL',
          partNumber: tx.partNumber || matchedItem?.part_number || '',
          proses: selectedProsesVal || tx.proses || '',
          aksi: mappedAksi,
          qty: typeof tx.qty === 'number' ? tx.qty : 0,
          qty_ng: typeof tx.qty_ng === 'number' ? tx.qty_ng : 0,
          operator: tx.operator || 'Operator AI',
          shift: tx.shift === 1 || tx.shift === 2 || tx.shift === 3 ? tx.shift : 1,
          catatan: tx.catatan || '',
          confidence: typeof tx.confidence === 'number' ? tx.confidence : 0.8
        };
      });

      setAiDrafts(drafts);
      setAiLogSummary(data.catatanRingkas || 'Catatan berhasil dibaca.');
      playSuccessSound();

    } catch (error: any) {
      console.error('Failed parsing with AI:', error);
      alert(`Gagal memproses foto catatan: ${error?.message || error || 'Koneksi terputus'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveAllDrafts = () => {
    const invalid = aiDrafts.some(d => !d.itemId || !d.proses || d.qty <= 0);
    if (invalid) {
      alert('Mohon lengkapi data item, proses, dan kuantitas di semua baris laporan.');
      return;
    }

    aiDrafts.forEach(draft => {
      const selectedItem = items.find(i => i.id === draft.itemId);
      const isLastProcess = selectedItem && draft.proses
        ? selectedItem.alur_proses[selectedItem.alur_proses.length - 1] === draft.proses
        : false;

      const txsToSubmit: Transaction[] = [];

      // Determine previous process for auto deduction in AI flow
      const draftProcessIndex = selectedItem && draft.proses ? selectedItem.alur_proses.indexOf(draft.proses) : -1;
      const draftPreviousProcess = draftProcessIndex > 0 ? selectedItem.alur_proses[draftProcessIndex - 1] : null;

      if (draft.aksi === 'MASUK' && draftPreviousProcess) {
        const prevTx: Transaction = {
          id: `tx-prev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          item_id: draft.itemId,
          proses: draftPreviousProcess,
          aksi: 'KELUAR',
          qty: draft.qty,
          qty_ng: 0,
          catatan: `Selesai dipindahkan otomatis ke proses ${draft.proses} (AI: ${draft.operator})`,
          foto: aiImage || undefined,
          timestamp: new Date().toISOString()
        };
        txsToSubmit.push(prevTx);
      }

      const newTx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        item_id: draft.itemId,
        proses: draft.proses,
        aksi: draft.aksi,
        qty: draft.qty,
        qty_ng: draft.qty_ng > 0 ? draft.qty_ng : undefined,
        catatan: draft.catatan.trim() ? `${draft.catatan.trim()} (AI: ${draft.operator})` : `AI: ${draft.operator}`,
        foto: aiImage || undefined,
        timestamp: new Date().toISOString(),
      };
      txsToSubmit.push(newTx);

      // Calculate stock update
      let updatedStock: { itemId: string; newStock: number } | undefined;
      if (draft.aksi === 'KELUAR' && isLastProcess && selectedItem) {
        const newStock = selectedItem.stok_ready + draft.qty;
        updatedStock = {
          itemId: selectedItem.id,
          newStock: newStock
        };
      }

      onAddTransaction(txsToSubmit, updatedStock);
    });

    playSuccessSound();
    alert(`Sukses menginput ${aiDrafts.length} transaksi laporan dari foto catatan kertas! (Otomatis menyesuaikan WIP proses sebelumnya)`);
    
    // Clear state
    setAiDrafts([]);
    setAiImage(null);
    setAiLogSummary('');
    
    onNavigateToDashboard();
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

    // Prepare transaction objects to submit
    const txsToSubmit: Transaction[] = [];

    // Determine if there is a previous process to auto-deduct
    const currentProcessIndex = selectedItem ? selectedItem.alur_proses.indexOf(selectedProses) : -1;
    const previousProcess = currentProcessIndex > 0 ? selectedItem.alur_proses[currentProcessIndex - 1] : null;

    if (actionType === 'MASUK' && autoDeductPrevious && previousProcess) {
      // Create automatic KELUAR from previous process
      const prevTx: Transaction = {
        id: `t-${Date.now()}-auto-prev`,
        item_id: selectedItemId,
        proses: previousProcess,
        aksi: 'KELUAR',
        qty: inputQty,
        qty_ng: 0,
        catatan: `Selesai dipindahkan otomatis ke proses ${selectedProses}${note.trim() ? ` (${note.trim()})` : ''}`,
        foto: foto || undefined,
        timestamp: new Date().toISOString()
      };
      txsToSubmit.push(prevTx);
    }

    // Current transaction object
    const newTx: Transaction = {
      id: `t-${Date.now()}`,
      item_id: selectedItemId,
      proses: selectedProses,
      aksi: actionType,
      qty: inputQty,
      qty_ng: inputQtyNG,
      catatan: note.trim() || undefined,
      foto: foto || undefined,
      timestamp: new Date().toISOString(),
    };
    txsToSubmit.push(newTx);

    // Calculate updated stock if action is KELUAR and it's the last process
    let updatedStock: { itemId: string; newStock: number } | undefined;
    if (actionType === 'KELUAR' && isLastProcess && selectedItem) {
      const newStock = selectedItem.stok_ready + inputQty;
      updatedStock = {
        itemId: selectedItem.id,
        newStock: newStock
      };
    }

    onAddTransaction(txsToSubmit, updatedStock);

    // Reset some of the inputs but keep customer/item for faster continuous logging
    setQty('');
    setQtyNG('');
    setNote('');
    setFoto(null);
    
    // Play subtle high-quality audio scan beep
    playSuccessSound();
    
    // Smooth scroll back to top or show success feedback
    if (actionType === 'MASUK' && autoDeductPrevious && previousProcess) {
      alert(`Sukses memindahkan ${inputQty} pcs dari proses ${previousProcess} ke ${selectedProses}! (Otomatis mencatat KELUAR di ${previousProcess} dan MASUK di ${selectedProses})`);
    } else {
      alert(`Sukses mencatat ${actionType} ${inputQty} pcs OK${inputQtyNG > 0 ? ` & ${inputQtyNG} pcs NG` : ''} di ${selectedProses}!${updatedStock ? ' (Otomatis masuk ke STOK READY)' : ''}`);
    }
    
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

      {/* Mode Switcher Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveMode('manual')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMode === 'manual'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={14} />
          Input Manual
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('ai')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMode === 'ai'
              ? 'bg-gradient-to-r from-indigo-600 to-rose-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-indigo-600'
          }`}
        >
          <Sparkles size={14} />
          AI Scan Catatan Kertas
          <span className="bg-rose-500 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-pulse font-extrabold">
            BARU
          </span>
        </button>
      </div>

      {activeMode === 'ai' ? (
        <div className="space-y-6">
          {/* AI Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl border border-slate-800 shadow-md text-white space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-extrabold font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">
                Fitur Cerdas
              </span>
              <span className="bg-rose-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                Gemini 3.5 Flash
              </span>
            </div>
            <h2 className="text-lg font-bold font-display tracking-tight">AI Scan Catatan Kertas Harian</h2>
            <p className="text-xs text-slate-300 leading-normal font-sans">
              Terlalu sibuk mengejar target produksi untuk menginput manual? Cukup foto kertas coretan laporan, tumpukan palet, atau slip produksi kerja Anda. AI kami akan secara otomatis membaca tulisan tangan dan memasukkannya ke sistem transaksi WIP secara langsung!
            </p>
          </div>

          {/* Photo Input Block */}
          {!isAiLoading && aiDrafts.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Camera size={32} />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-slate-800 font-sans">Ambil Foto Catatan Produksi</h3>
                <p className="text-xs text-slate-400 font-medium leading-normal font-sans">
                  Gunakan kamera HP untuk memotret atau pilih file dari galeri Anda. Pastikan tulisan tangan terbaca jelas dengan cahaya cukup.
                </p>
              </div>

              <label className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-[0.97] shadow-lg shadow-indigo-600/10">
                <Camera size={16} />
                <span>Foto Catatan Sekarang</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleAiPhotoChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Loading State with animated status */}
          {isAiLoading && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative w-16 h-16">
                {/* Visual ripple effect */}
                <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-75"></div>
                <div className="relative w-16 h-16 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <RefreshCw size={28} className="animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider font-mono animate-pulse">
                  {aiStatusMessage}
                </h3>
                <p className="text-xs text-slate-400 font-medium max-w-xs leading-normal">
                  Gemini sedang membaca tulisan tangan dan memetakan model dengan Master Data... Mohon tunggu sebentar.
                </p>
              </div>
            </div>
          )}

          {/* AI Draft List & Validation Screen */}
          {aiDrafts.length > 0 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex justify-between items-center bg-indigo-50 border border-indigo-150 px-4 py-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                  <span className="text-xs font-bold text-indigo-800">
                    Berhasil Membaca {aiDrafts.length} Laporan Transaksi!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAiDrafts([]);
                    setAiImage(null);
                  }}
                  className="text-[10px] font-extrabold text-rose-600 hover:text-rose-800 uppercase tracking-wide cursor-pointer"
                >
                  Ulangi [X]
                </button>
              </div>

              {/* Photo Thumbnail used to parse */}
              {aiImage && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 shrink-0">
                    <img src={aiImage} alt="Parsed Source" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">Foto Sumber Catatan</p>
                    <p className="text-xs text-slate-600 font-semibold truncate leading-normal italic">
                      "{aiLogSummary || 'Catatan terdeteksi'}"
                    </p>
                  </div>
                </div>
              )}

              {/* Draft Cards */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tinjau & Validasi Data Laporan:</h3>
                
                {aiDrafts.map((draft, idx) => {
                  const matchedItem = items.find(i => i.id === draft.itemId);
                  
                  return (
                    <div 
                      key={draft.id}
                      className="bg-white p-4 rounded-xl border-2 border-slate-200/80 shadow-sm space-y-3 relative overflow-hidden"
                    >
                      {/* Left border indicator based on matching success */}
                      <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                        draft.itemId ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}></div>

                      <div className="flex justify-between items-start pl-2">
                        {/* Title Info */}
                        <div className="space-y-0.5">
                          {draft.itemId ? (
                            <span className="bg-emerald-50 text-emerald-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                              Model Terdaftar
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
                              Butuh Konfirmasi Model
                            </span>
                          )}
                          <div className="text-sm font-bold text-slate-800">
                            {draft.modelName} {draft.partNumber && `[${draft.partNumber}]`}
                          </div>
                        </div>

                        {/* Delete single draft button */}
                        <button
                          type="button"
                          onClick={() => {
                            setAiDrafts(aiDrafts.filter(d => d.id !== draft.id));
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Hapus baris ini"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Editing Fields Row */}
                      <div className="grid grid-cols-2 gap-3 pl-2 text-xs">
                        {/* Map Item Selector if needed */}
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Sesuaikan Item / Part Number:</label>
                          <select
                            value={draft.itemId}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const matched = items.find(i => i.id === selectedId);
                              setAiDrafts(aiDrafts.map(d => {
                                if (d.id === draft.id) {
                                  return {
                                    ...d,
                                    itemId: selectedId,
                                    modelName: matched ? matched.model : d.modelName,
                                    partNumber: matched ? matched.part_number : d.partNumber,
                                    // Default process to first process of the newly selected item
                                    proses: matched && matched.alur_proses.length > 0 ? matched.alur_proses[0] : d.proses
                                  };
                                }
                                return d;
                              }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 transition-all"
                          >
                            <option value="">-- Hubungkan dengan Part Number --</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.model} - Part #: {i.part_number} ({customers.find(c => c.id === i.customer_id)?.nama})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Process dropdown */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Proses:</label>
                          {matchedItem ? (
                            <select
                              value={draft.proses}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAiDrafts(aiDrafts.map(d => d.id === draft.id ? { ...d, proses: val } : d));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 transition-all"
                            >
                              <option value="">-- Pilih Proses --</option>
                              {matchedItem.alur_proses.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={draft.proses}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAiDrafts(aiDrafts.map(d => d.id === draft.id ? { ...d, proses: val.toUpperCase() } : d));
                              }}
                              placeholder="Ketik Proses (misal: POTONG)"
                              className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-850 uppercase transition-all"
                            />
                          )}
                        </div>

                        {/* Action selector */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Aksi:</label>
                          <select
                            value={draft.aksi}
                            onChange={(e) => {
                              const val = e.target.value as TransactionAction;
                              setAiDrafts(aiDrafts.map(d => d.id === draft.id ? { ...d, aksi: val } : d));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 transition-all"
                          >
                            <option value="MASUK">MASUK</option>
                            <option value="KELUAR">KELUAR</option>
                          </select>
                        </div>

                        {/* Qty Good */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Qty OK (Bagus):</label>
                          <input
                            type="number"
                            value={draft.qty === 0 ? '' : draft.qty}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                              setAiDrafts(aiDrafts.map(d => d.id === draft.id ? { ...d, qty: val } : d));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 transition-all"
                            required
                          />
                        </div>

                        {/* Qty NG */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Qty NG (Cacat):</label>
                          <input
                            type="number"
                            value={draft.qty_ng === 0 ? '' : draft.qty_ng}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                              setAiDrafts(aiDrafts.map(d => d.id === draft.id ? { ...d, qty_ng: val } : d));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 transition-all"
                          />
                        </div>

                        {/* Operator & Shift Row */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Operator:</label>
                          <input
                            type="text"
                            value={draft.operator}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAiDrafts(aiDrafts.map(d => d.id === draft.id ? { ...d, operator: val } : d));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Shift:</label>
                          <select
                            value={draft.shift}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) as 1 | 2 | 3;
                              setAiDrafts(aiDrafts.map(d => d.id === draft.id ? { ...d, shift: val } : d));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-800 transition-all"
                          >
                            <option value={1}>Shift 1</option>
                            <option value={2}>Shift 2</option>
                            <option value={3}>Shift 3</option>
                          </select>
                        </div>

                        {/* Notes */}
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Catatan Tambahan:</label>
                          <input
                            type="text"
                            value={draft.catatan}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAiDrafts(aiDrafts.map(d => d.id === draft.id ? { ...d, catatan: val } : d));
                            }}
                            placeholder="Catatan pengerjaan"
                            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-850 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action trigger button */}
              <button
                type="button"
                onClick={handleSaveAllDrafts}
                disabled={aiDrafts.some(d => !d.itemId || !d.proses || d.qty <= 0)}
                className={`w-full py-4 rounded-xl font-bold font-sans flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer ${
                  aiDrafts.some(d => !d.itemId || !d.proses || d.qty <= 0)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-indigo-600 to-rose-600 text-white hover:from-indigo-700 hover:to-rose-700 shadow-indigo-600/10'
                }`}
              >
                <CheckCircle2 size={18} />
                <span>Simpan {aiDrafts.length} Laporan ke Sistem</span>
              </button>

              {aiDrafts.some(d => !d.itemId || !d.proses) && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2 text-amber-800">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-normal font-semibold font-sans">
                    Ada draf laporan yang belum memiliki Item/Part Number atau nama Proses resmi. Silakan hubungkan terlebih dahulu melalui pilihan di atas agar laporan dapat disimpan.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
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

            {/* Auto-deduction toggle for MASUK when there is a previous process */}
            {actionType === 'MASUK' && previousProcess && (
              <div className="bg-indigo-50/70 border border-indigo-150 p-3.5 rounded-xl flex flex-col gap-2 animate-fadeIn text-xs text-indigo-950">
                <label className="flex items-start gap-2.5 font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoDeductPrevious}
                    onChange={(e) => setAutoDeductPrevious(e.target.checked)}
                    className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="font-extrabold text-indigo-900 block text-xs">Otomatis Kurangi WIP Proses Sebelumnya ({previousProcess})</span>
                    <span className="text-[10px] text-indigo-700/95 font-medium block mt-1 leading-normal">
                      WIP di {previousProcess} saat ini: <strong className="font-extrabold text-slate-800">{previousWIPVal.toLocaleString()} pcs</strong>. Dengan opsi ini aktif, sistem otomatis mencatat <strong className="font-extrabold text-rose-700">KELUAR</strong> dari {previousProcess} sebanyak jumlah input Anda. Tidak perlu input 2x!
                    </span>
                  </div>
                </label>
              </div>
            )}

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

            {/* Foto Bukti (Opsional) */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="text-[10px] font-extrabold text-slate-500 block uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={12} className="text-indigo-600" />
                <span>Foto Bukti Kerja / Palet / Kertas Catatan <span className="font-normal text-slate-400 text-[9px]">(Opsional)</span></span>
              </label>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-all active:scale-[0.98]">
                  <Camera size={16} className="text-indigo-600" />
                  <span>Ambil Foto / Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>

                {foto && (
                  <div className="relative group w-16 h-16 rounded-xl overflow-hidden border-2 border-indigo-200 bg-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                    <img src={foto} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFoto(null)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                      title="Hapus Foto"
                    >
                      <Trash2 size={16} />
                    </button>
                    {/* Small label */}
                    <span className="absolute bottom-0 inset-x-0 text-[8px] bg-indigo-600 text-white font-extrabold text-center py-0.5 uppercase tracking-wide">
                      OKE
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[9px] text-slate-400 leading-normal">
                Memotret tumpukan palet, barang NG, atau coretan kertas catatan kerja langsung dari kamera HP Anda agar laporannya lebih akurat dan praktis.
              </p>
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
      )}
    </div>
  );
}
