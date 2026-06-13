import React from 'react';
import { Banknote, Coins, Gem, LayoutDashboard, PiggyBank, Target } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'savings', label: 'Gửi tiết kiệm', icon: PiggyBank },
    { id: 'gold', label: 'Tích lũy Vàng', icon: Coins },
    { id: 'cashflow', label: 'Thu chi', icon: Banknote },
    { id: 'goals', label: 'Mục tiêu', icon: Target },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-50 h-screen w-72 flex-col border-r border-slate-200 bg-white px-5 py-5 text-slate-950">
      <div className="mb-8 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-sm shadow-blue-950/20">
          <Gem size={21} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Gaia Finance</h1>
          <p className="text-xs font-medium text-slate-500">Personal wealth ledger</p>
        </div>
      </div>

      <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-[.08em] text-slate-400">Danh mục</div>
      <nav className="flex-1 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-11 w-full items-center gap-3 rounded-md border px-3 text-sm font-semibold transition ${
                isActive
                  ? 'border-blue-200 bg-blue-50 text-blue-800 shadow-sm shadow-blue-950/5'
                  : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-[.08em] text-slate-400">Workspace</div>
        <div className="mt-2 text-sm font-bold text-slate-900">Portfolio cá nhân</div>
        <div className="mt-1 text-xs font-medium text-slate-500">Theo dõi tiết kiệm và vàng</div>
      </div>
    </aside>
  );
};

export default Sidebar;
