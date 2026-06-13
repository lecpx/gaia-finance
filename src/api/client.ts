import { db, fetchBtmhGoldRate, fetchBtmhGoldChart } from './db';

export interface SavingRecord {
  id?: number | string;
  bank: string;
  amount: number;
  interest_rate: number;
  term: number;
  start_date: string;
}

export interface GoldRecord {
  id?: number | string;
  gold_type: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  note?: string;
}

export interface GoldRate {
  code: string;
  name: string;
  vendor_name: string;
  buy_price: number;
  sell_price: number;
  unit: string;
  weight: string | null;
  trend: string;
  trend_value: string;
  last_updated: string;
  tracked_code: string;
  tracked_name: string;
  fetched_at: string;
  from_cache?: boolean;
}

export interface GoldRatePoint {
  date: string;
  buy: number;
  sell: number;
}

export interface GoldChartResponse {
  data_points: GoldRatePoint[];
  product_options: Array<{ value: string; label: string }>;
  price_changes: Array<{ label: string; value: number; percentage: number; trend: string }>;
  default_product: string;
  from_cache?: boolean;
}

export interface GoalRecord {
  id: string;
  name: string;
  priority: number;
  target_amount: number;
  saving_indices: number[];
  gold_indices: number[];
}

export interface GoalProgress extends GoalRecord {
  current_amount: number;
  percentage: number;
}

export interface TransactionRecord {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  note?: string;
  created_at: string;
}

export interface MonthlyReport {
  month: number;
  year: number;
  total_income: number;
  total_expense: number;
  net: number;
  categories: Array<{ category: string; type: string; amount: number; count: number }>;
}

export const api = {
  getSummary: () => Promise.resolve(db.getSummary()),

  getSavings: () => Promise.resolve(db.getSavings()),
  addSaving: (data: SavingRecord) => { db.addSaving(data); return Promise.resolve({ status: 'success' }); },
  updateSavings: (data: SavingRecord[]) => { db.setSavings(data); return Promise.resolve({ status: 'success' }); },

  getGold: () => Promise.resolve(db.getGold()),
  addGold: (data: GoldRecord) => { db.addGold(data); return Promise.resolve({ status: 'success' }); },
  updateGold: (data: GoldRecord[]) => { db.setGold(data); return Promise.resolve({ status: 'success' }); },
  getBtmhGoldRate: () => fetchBtmhGoldRate(),
  getBtmhGoldChart: (code = 'KGB', from_date?: string, to_date?: string, max_days = 365) =>
    fetchBtmhGoldChart(code, from_date, to_date, max_days),

  getGoals: async () => {
    let buyPrice = 0;
    try { const rate = await fetchBtmhGoldRate(); buyPrice = rate.buy_price; } catch { /* fallback to purchase price */ }
    return db.getGoalProgress(buyPrice);
  },
  addGoal: (data: GoalRecord) => {
    const goals = db.getGoals();
    for (const g of goals) {
      if (g.saving_indices.some(i => data.saving_indices.includes(i)))
        return Promise.reject(new Error(`Sổ tiết kiệm đã được dùng cho mục tiêu '${g.name}'`));
      if (g.gold_indices.some(i => data.gold_indices.includes(i)))
        return Promise.reject(new Error(`Vàng đã được dùng cho mục tiêu '${g.name}'`));
    }
    goals.push(data);
    db.setGoals(goals);
    return Promise.resolve({ status: 'success' });
  },
  updateGoals: (data: GoalRecord[]) => {
    const used = new Map<string, Set<number>>();
    const usedGold = new Map<string, Set<number>>();
    for (const g of data) {
      for (const i of g.saving_indices) {
        if (Array.from(used.values()).some(s => s.has(i)))
          return Promise.reject(new Error('Sổ tiết kiệm đã được dùng cho mục tiêu khác.'));
      }
      for (const i of g.gold_indices) {
        if (Array.from(usedGold.values()).some(s => s.has(i)))
          return Promise.reject(new Error('Vàng đã được dùng cho mục tiêu khác.'));
      }
      used.set(g.id, new Set(g.saving_indices));
      usedGold.set(g.id, new Set(g.gold_indices));
    }
    db.setGoals(data);
    return Promise.resolve({ status: 'success' });
  },
  deleteGoal: (id: string) => {
    const goals = db.getGoals().filter(g => g.id !== id);
    db.setGoals(goals);
    return Promise.resolve({ status: 'success' });
  },

  getTransactions: () => Promise.resolve(db.getTransactions()),
  addTransaction: (data: TransactionRecord) => {
    const txs = db.getTransactions();
    txs.push(data);
    db.setTransactions(txs);
    return Promise.resolve({ status: 'success' });
  },
  updateTransactions: (data: TransactionRecord[]) => { db.setTransactions(data); return Promise.resolve({ status: 'success' }); },
  deleteTransaction: (id: string) => {
    const txs = db.getTransactions().filter(t => t.id !== id);
    db.setTransactions(txs);
    return Promise.resolve({ status: 'success' });
  },
  getMonthlyReport: (month?: number, year?: number) => {
    const now = new Date();
    return Promise.resolve(db.getMonthlyReport(month ?? now.getMonth() + 1, year ?? now.getFullYear()));
  },
};
