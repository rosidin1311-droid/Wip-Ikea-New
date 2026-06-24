/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  Customer,
  Item,
  Forecast,
  Transaction,
} from './types';
import {
  getStoredCustomers,
  saveCustomers,
  getStoredItems,
  saveItems,
  getStoredForecasts,
  saveForecasts,
  getStoredTransactions,
  saveTransactions,
} from './utils/storage';

// Component imports
import Dashboard from './components/Dashboard';
import InputWIP from './components/InputWIP';
import ForecastManager from './components/ForecastManager';
import MasterDataManager from './components/MasterDataManager';
import ShiftReport from './components/ShiftReport';

// Lucide Icons
import {
  LayoutDashboard,
  Layers,
  Calendar,
  FileSpreadsheet,
  FileCheck,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Core States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Prefill parameter states
  const [prefilledItemId, setPrefilledItemId] = useState<string | undefined>(undefined);
  const [prefilledProcess, setPrefilledProcess] = useState<string | undefined>(undefined);

  // Load initial data
  useEffect(() => {
    setCustomers(getStoredCustomers());
    setItems(getStoredItems());
    setForecasts(getStoredForecasts());
    setTransactions(getStoredTransactions());
  }, []);

  // Update handlers
  const handleUpdateCustomers = (updated: Customer[]) => {
    setCustomers(updated);
    saveCustomers(updated);
  };

  const handleUpdateItems = (updated: Item[]) => {
    setItems(updated);
    saveItems(updated);
  };

  const handleUpdateForecasts = (updated: Forecast[]) => {
    setForecasts(updated);
    saveForecasts(updated);
  };

  // Callback to log transaction and auto-update stock if needed
  const handleAddTransaction = (newTx: Transaction, updatedStock?: { itemId: string; newStock: number }) => {
    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    saveTransactions(updatedTxs);

    if (updatedStock) {
      const updatedItems = items.map(i =>
        i.id === updatedStock.itemId ? { ...i, stok_ready: updatedStock.newStock } : i
      );
      setItems(updatedItems);
      saveItems(updatedItems);
    }
  };

  // Navigating with prefilled values from Dashboard card tap
  const handleSelectPrefilledItem = (itemId: string, process?: string) => {
    setPrefilledItemId(itemId);
    setPrefilledProcess(process);
    setActiveTab('input');
  };

  // Navigation from quick actions
  const handleNavigateToTab = (tab: 'input' | 'report') => {
    // Clear prefill when navigating normally
    if (tab === 'input') {
      setPrefilledItemId(undefined);
      setPrefilledProcess(undefined);
    }
    setActiveTab(tab);
  };

  // Reset prefill variables when leaving the input page
  useEffect(() => {
    if (activeTab !== 'input') {
      setPrefilledItemId(undefined);
      setPrefilledProcess(undefined);
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-100/50 flex justify-center md:py-8">
      <div className="w-full max-w-md bg-slate-50 min-h-screen md:min-h-[850px] md:rounded-3xl shadow-2xl relative flex flex-col border border-slate-200/50 overflow-hidden">
        
        {/* Top Bento-style Header bar (Premium layout, zero telemetry logs) */}
        <header className="bg-white border-b border-slate-200/60 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ikea-blue rounded-xl flex items-center justify-center text-white font-display font-black text-sm shadow-md shadow-indigo-600/10">
              W
            </div>
            <div>
              <span className="text-[10px] font-bold text-ikea-blue block tracking-widest leading-none font-display uppercase">IKEA TRACKER</span>
              <span className="text-xs font-extrabold text-slate-800 leading-none mt-0.5 block">WIP &amp; PRODUCTION</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </header>

        {/* Core Content View */}
        <main className="flex-1 overflow-y-auto px-5 pt-5 pb-24">
          {activeTab === 'dashboard' && (
            <Dashboard
              customers={customers}
              items={items}
              forecasts={forecasts}
              transactions={transactions}
              onSelectPrefilledItem={handleSelectPrefilledItem}
              onNavigateToTab={handleNavigateToTab}
            />
          )}

          {activeTab === 'input' && (
            <InputWIP
              customers={customers}
              items={items}
              transactions={transactions}
              prefilledItemId={prefilledItemId}
              prefilledProcess={prefilledProcess}
              onAddTransaction={handleAddTransaction}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'forecast' && (
            <ForecastManager
              customers={customers}
              items={items}
              forecasts={forecasts}
              onUpdateForecasts={handleUpdateForecasts}
              onUpdateItems={handleUpdateItems}
            />
          )}

          {activeTab === 'master' && (
            <MasterDataManager
              customers={customers}
              items={items}
              onUpdateCustomers={handleUpdateCustomers}
              onUpdateItems={handleUpdateItems}
            />
          )}

          {activeTab === 'report' && (
            <ShiftReport
              customers={customers}
              items={items}
              forecasts={forecasts}
              transactions={transactions}
            />
          )}
        </main>

        {/* Bottom Tactile Navigation Bar - Premium Bento Feel */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-3.5 px-3 flex justify-around items-center shrink-0 shadow-xl z-50">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 transition-all bento-tactile ${
              activeTab === 'dashboard' ? 'text-ikea-blue font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard size={19} className={activeTab === 'dashboard' ? 'stroke-[2.5px]' : 'stroke-2'} />
            <span className="text-[9px] mt-1.5 font-bold tracking-tight uppercase font-display">Dashboard</span>
          </button>

          <button
            onClick={() => handleNavigateToTab('input')}
            className={`flex flex-col items-center justify-center flex-1 transition-all bento-tactile ${
              activeTab === 'input' ? 'text-ikea-blue font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Layers size={19} className={activeTab === 'input' ? 'stroke-[2.5px]' : 'stroke-2'} />
            <span className="text-[9px] mt-1.5 font-bold tracking-tight uppercase font-display">Input WIP</span>
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`flex flex-col items-center justify-center flex-1 transition-all bento-tactile ${
              activeTab === 'forecast' ? 'text-ikea-blue font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar size={19} className={activeTab === 'forecast' ? 'stroke-[2.5px]' : 'stroke-2'} />
            <span className="text-[9px] mt-1.5 font-bold tracking-tight uppercase font-display">Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`flex flex-col items-center justify-center flex-1 transition-all bento-tactile ${
              activeTab === 'report' ? 'text-ikea-blue font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileCheck size={19} className={activeTab === 'report' ? 'stroke-[2.5px]' : 'stroke-2'} />
            <span className="text-[9px] mt-1.5 font-bold tracking-tight uppercase font-display">Laporan</span>
          </button>

          <button
            onClick={() => setActiveTab('master')}
            className={`flex flex-col items-center justify-center flex-1 transition-all bento-tactile ${
              activeTab === 'master' ? 'text-ikea-blue font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileSpreadsheet size={19} className={activeTab === 'master' ? 'stroke-[2.5px]' : 'stroke-2'} />
            <span className="text-[9px] mt-1.5 font-bold tracking-tight uppercase font-display">Master</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
