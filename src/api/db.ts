import type { GoldChartResponse, GoldRate, GoalRecord, SavingRecord, GoldRecord, TransactionRecord, MonthlyReport } from './client';

const KEYS = {
  savings: 'gaia_savings',
  gold: 'gaia_gold',
  goals: 'gaia_goals',
  cashflow: 'gaia_cashflow',
};

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const db = {
  // --- Savings ---
  getSavings: () => load<SavingRecord>(KEYS.savings),
  setSavings: (data: SavingRecord[]) => save(KEYS.savings, data),
  addSaving: (record: SavingRecord) => {
    const data = load<SavingRecord>(KEYS.savings);
    data.push(record);
    save(KEYS.savings, data);
  },

  // --- Gold ---
  getGold: () => load<GoldRecord>(KEYS.gold),
  setGold: (data: GoldRecord[]) => save(KEYS.gold, data),
  addGold: (record: GoldRecord) => {
    const data = load<GoldRecord>(KEYS.gold);
    data.push(record);
    save(KEYS.gold, data);
  },

  // --- Goals ---
  getGoals: () => load<GoalRecord>(KEYS.goals),
  setGoals: (data: GoalRecord[]) => save(KEYS.goals, data),

  // --- Cashflow ---
  getTransactions: () => load<TransactionRecord>(KEYS.cashflow),
  setTransactions: (data: TransactionRecord[]) => save(KEYS.cashflow, data),

  // --- Computed ---
  getCashBalance: () => {
    const txs = load<TransactionRecord>(KEYS.cashflow);
    return txs.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
  },

  getMonthlyReport: (month: number, year: number): MonthlyReport => {
    const txs = load<TransactionRecord>(KEYS.cashflow);
    const filtered = txs.filter(t => {
      const parts = t.date.split('/');
      return parts.length === 3 && parseInt(parts[1]) === month && parseInt(parts[2]) === year;
    });

    const total_income = filtered.reduce((s, t) => t.type === 'income' ? s + t.amount : s, 0);
    const total_expense = filtered.reduce((s, t) => t.type === 'expense' ? s + t.amount : s, 0);

    const catMap = new Map<string, { category: string; type: string; amount: number; count: number }>();
    for (const t of filtered) {
      const key = t.category;
      const existing = catMap.get(key);
      if (existing) {
        existing.amount += t.amount;
        existing.count += 1;
      } else {
        catMap.set(key, { category: key, type: t.type, amount: t.amount, count: 1 });
      }
    }

    return {
      month,
      year,
      total_income,
      total_expense,
      net: total_income - total_expense,
      categories: Array.from(catMap.values()),
    };
  },

  getSummary: () => {
    const savings = load<SavingRecord>(KEYS.savings);
    const gold = load<GoldRecord>(KEYS.gold);
    const cash = db.getCashBalance();

    const total_saving = savings.reduce((s, r) => s + r.amount, 0);
    const total_gold_investment = gold.reduce((s, r) => s + r.quantity * r.buy_price, 0);
    const total_assets = total_saving + total_gold_investment + cash;
    const saving_pct = total_assets > 0 ? (total_saving / total_assets) * 100 : 0;
    const gold_pct = total_assets > 0 ? (total_gold_investment / total_assets) * 100 : 0;

    return {
      total_assets,
      total_saving,
      total_gold_investment,
      cash_balance: cash,
      saving_percentage: Math.round(saving_pct * 10) / 10,
      gold_percentage: Math.round(gold_pct * 10) / 10,
    };
  },

  getGoalProgress: (currentBuyPrice = 0) => {
    const goals = load<GoalRecord>(KEYS.goals);
    const savings = load<SavingRecord>(KEYS.savings);
    const gold = load<GoldRecord>(KEYS.gold);

    return goals.map(g => {
      let current = 0;
      for (const idx of g.saving_indices) {
        if (idx >= 0 && idx < savings.length) current += savings[idx].amount;
      }
      for (const idx of g.gold_indices) {
        if (idx >= 0 && idx < gold.length) {
          current += gold[idx].quantity * (currentBuyPrice > 0 ? currentBuyPrice : gold[idx].buy_price);
        }
      }
      const target = g.target_amount;
      const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      return {
        ...g,
        current_amount: Math.round(current),
        percentage: Math.round(pct * 10) / 10,
      };
    }).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
  },
};

// ============================================================================
// BTMH Gold Rate Functions
// BTMH API blocks CORS from browser, cannot fetch directly
// Throw error instead of using fallback data
// ============================================================================

export async function fetchBtmhGoldRate(): Promise<GoldRate> {
  throw new Error('Không thể lấy giá BTMH: API bị chặn bởi CORS');
}

export async function fetchBtmhGoldChart(
  _code?: string,
  _from_date?: string,
  _to_date?: string,
  _max_days?: number,
): Promise<GoldChartResponse> {
  throw new Error('Không thể lấy biểu đồ giá BTMH: API bị chặn bởi CORS');
}
