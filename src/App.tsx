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
  Home,
  CircleDollarSign,
  Sparkles,
  CreditCard,
  Menu,
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

  const handleUpdateTransactions = (updated: Transaction[]) => {
    setTransactions(updated);
    saveTransactions(updated);
  };

  // Reset WIP/Transactions logs
  const handleResetWIPLogs = () => {
    setTransactions([]);
    saveTransactions([]);
  };

  // Restore everything from backup
  const handleRestoreBackup = (
    restoredCustomers: Customer[],
    restoredItems: Item[],
    restoredForecasts: Forecast[],
    restoredTransactions: Transaction[]
  ) => {
    setCustomers(restoredCustomers);
    saveCustomers(restoredCustomers);
    setItems(restoredItems);
    saveItems(restoredItems);
    setForecasts(restoredForecasts);
    saveForecasts(restoredForecasts);
    setTransactions(restoredTransactions);
    saveTransactions(restoredTransactions);
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
    <div className="h-screen md:h-auto min-h-screen bg-slate-100/50 flex justify-center md:items-center md:py-8 overflow-hidden">
      <div className="w-full max-w-md bg-slate-50 h-full md:h-[850px] md:max-h-[850px] md:rounded-3xl shadow-2xl relative flex flex-col border border-slate-200/50 overflow-hidden">
        
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
        <main className="flex-1 overflow-y-auto px-5 pt-5 pb-28">
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
              forecasts={forecasts}
              transactions={transactions}
              onUpdateCustomers={handleUpdateCustomers}
              onUpdateItems={handleUpdateItems}
              onUpdateForecasts={handleUpdateForecasts}
              onUpdateTransactions={handleUpdateTransactions}
              onResetWIPLogs={handleResetWIPLogs}
              onRestoreBackup={handleRestoreBackup}
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

        {/* Bottom Tactile Navigation Bar - Curved Crimson Theme matching user's reference */}
        <div className="absolute bottom-0 left-0 right-0 h-[84px] z-50 select-none">
          {/* Custom SVG Background with Center Dip Curve */}
          <svg viewBox="0 0 400 84" preserveAspectRatio="none" className="absolute inset-0 w-full h-full -z-10 drop-shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
            <path d="M 0,22 
                     L 135,22 
                     C 155,22 165,60 200,60 
                     C 235,60 245,22 265,22 
                     L 400,22 
                     L 400,84 
                     L 0,84 
                     Z" 
                  fill="url(#navbar-gradient)" />
            <defs>
              <linearGradient id="navbar-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#800412" />
                <stop offset="15%" stopColor="#5c030d" />
                <stop offset="100%" stopColor="#1c0003" />
              </linearGradient>
            </defs>
          </svg>

          {/* Grid Layout of 5 Columns */}
          <div className="grid grid-cols-5 h-full pt-[22px]">
            {/* Slot 1: Home */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center pb-2.5 transition-all bento-tactile cursor-pointer ${
                activeTab === 'dashboard' ? 'text-white scale-105 font-bold' : 'text-rose-200/50 hover:text-white/90'
              }`}
            >
              <Home size={21} className={activeTab === 'dashboard' ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] mt-1 font-bold tracking-tight">Home</span>
            </button>

            {/* Slot 2: Forecast (Deposit style icon, Coin/Target) */}
            <button
              onClick={() => setActiveTab('forecast')}
              className={`flex flex-col items-center justify-center pb-2.5 transition-all bento-tactile cursor-pointer ${
                activeTab === 'forecast' ? 'text-white scale-105 font-bold' : 'text-rose-200/50 hover:text-white/90'
              }`}
            >
              <CircleDollarSign size={21} className={activeTab === 'forecast' ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] mt-1 font-bold tracking-tight">Forecast</span>
            </button>

            {/* Slot 3: Center Floating Button with Sparkle (Promosi style) */}
            <div className="relative flex flex-col items-center justify-end pb-2.5">
              <button
                onClick={() => handleNavigateToTab('input')}
                className={`absolute -top-[26px] w-[58px] h-[58px] rounded-full flex items-center justify-center transition-all duration-200 shadow-xl border-4 border-[#240104] bento-tactile cursor-pointer ${
                  activeTab === 'input'
                    ? 'bg-gradient-to-b from-[#bd1326] to-[#7a0110] text-white scale-110 ring-2 ring-rose-400/40 shadow-rose-950/50'
                    : 'bg-gradient-to-b from-[#800412] to-[#3a0106] text-white/90 hover:from-[#9c0617] hover:to-[#4a0109] shadow-black/40'
                }`}
              >
                <Sparkles size={22} className={`${activeTab === 'input' ? 'animate-pulse text-white' : 'text-rose-100'}`} />
              </button>
              <span className={`text-[10px] font-bold tracking-tight ${activeTab === 'input' ? 'text-white' : 'text-rose-200/50'}`}>
                Input WIP
              </span>
            </div>

            {/* Slot 4: Laporan (Withdraw style icon, Card/Clipboard) */}
            <button
              onClick={() => setActiveTab('report')}
              className={`flex flex-col items-center justify-center pb-2.5 transition-all bento-tactile cursor-pointer ${
                activeTab === 'report' ? 'text-white scale-105 font-bold' : 'text-rose-200/50 hover:text-white/90'
              }`}
            >
              <CreditCard size={21} className={activeTab === 'report' ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] mt-1 font-bold tracking-tight">Laporan</span>
            </button>

            {/* Slot 5: Master (Menu style icon, Hamburger menu) */}
            <button
              onClick={() => setActiveTab('master')}
              className={`flex flex-col items-center justify-center pb-2.5 transition-all bento-tactile cursor-pointer ${
                activeTab === 'master' ? 'text-white scale-105 font-bold' : 'text-rose-200/50 hover:text-white/90'
              }`}
            >
              <Menu size={21} className={activeTab === 'master' ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] mt-1 font-bold tracking-tight">Master</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
