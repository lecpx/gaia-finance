import { useEffect, useState } from 'react';
import { Banknote, CalendarDays, Coins, Database, LayoutDashboard, PiggyBank, Target } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Savings from './pages/Savings';
import Gold from './pages/Gold';
import Goals from './pages/Goals';
import CashFlow from './pages/CashFlow';
import { ToastProvider } from './components/Toast';
import { todayStr } from './utils/format';
import { seedData } from './api/migrate';

const tabs = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'savings', label: 'Gửi tiết kiệm', icon: PiggyBank },
  { id: 'gold', label: 'Tích lũy Vàng', icon: Coins },
  { id: 'cashflow', label: 'Thu chi', icon: Banknote },
  { id: 'goals', label: 'Mục tiêu', icon: Target },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const pageTitle = tabs.find(t => t.id === activeTab)!.label;

  useEffect(() => { seedData(); }, []);

  return (
    <ToastProvider>
    <div className="min-h-screen bg-[#f6f8fb]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="lg:ml-72 min-h-screen">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[.08em] text-slate-500">Gaia Console</div>
              <div className="truncate text-sm font-semibold text-slate-950">{pageTitle}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600 md:flex">
                <CalendarDays size={16} className="text-slate-400" />
                <span>{todayStr}</span>
              </div>
              <div className="flex h-10 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">
                <Database size={16} />
                <span>Local data</span>
              </div>
            </div>
          </div>
          <nav className="flex gap-1 border-t border-slate-100 px-4 pb-2 pt-2 lg:hidden">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  <Icon size={16} />
                  <span className="truncate">{tab.label.replace('Tích lũy ', '')}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'savings' && <Savings />}
          {activeTab === 'gold' && <Gold />}
          {activeTab === 'cashflow' && <CashFlow />}
          {activeTab === 'goals' && <Goals />}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}

export default App;
