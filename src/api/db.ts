import type { GoldChartResponse, GoldRate, GoalRecord, SavingRecord, GoldRecord, TransactionRecord, MonthlyReport } from './client';

const KEYS = {
  savings: 'gaia_savings',
  gold: 'gaia_gold',
  goals: 'gaia_goals',
  cashflow: 'gaia_cashflow',
  goldRateCache: 'gaia_gold_rate_cache',
  goldRateCacheTime: 'gaia_gold_rate_cache_time',
};

// Cache timeout: 1 hour (in milliseconds)
const CACHE_TIMEOUT = 3600000;

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Cache helpers
function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

function isCacheValid(cacheTimeKey: string): boolean {
  const cacheTime = localStorage.getItem(cacheTimeKey);
  if (!cacheTime) return false;
  
  const cachedAt = parseInt(cacheTime);
  const now = Date.now();
  return now - cachedAt < CACHE_TIMEOUT;
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
// Since BTMH API blocks CORS from browser, we use fallback data only
// ============================================================================

// Fallback gold rate data (KGB - Nhẫn Tròn ép vỉ 24K)
// Giá vàng 24K hiện nay khoảng 85-90 triệu/chỉ
const FALLBACK_GOLD_RATE: GoldRate = {
  code: 'KGB',
  name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)',
  vendor_name: 'Kim Gia Bảo',
  buy_price: 85000000, // 85 triệu/chỉ - giá fallback an toàn
  sell_price: 85500000,
  unit: 'chỉ',
  weight: '1 chỉ',
  trend: 'stable',
  trend_value: '0',
  last_updated: new Date().toISOString(),
  tracked_code: 'KGB',
  tracked_name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)',
  fetched_at: new Date().toISOString(),
  from_cache: false,
};

// Fallback chart data (empty - no historical data)
const FALLBACK_CHART_DATA: GoldChartResponse = {
  data_points: [],
  product_options: [{ value: 'KGB', label: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)' }],
  price_changes: [],
  default_product: 'KGB',
  from_cache: false,
};

// Cache keys for gold rate
export async function fetchBtmhGoldRate(): Promise<GoldRate> {
  // Check cache first
  const cachedRate = getCache<GoldRate>(KEYS.goldRateCache);
  const cacheValid = isCacheValid(KEYS.goldRateCacheTime);
  
  if (cachedRate && cacheValid) {
    return { ...cachedRate, from_cache: true };
  }

  // BTMH API blocks CORS from browser, so we cannot fetch directly
  // All proxies are also blocked, so we use fallback data
  console.warn('BTMH API blocked by CORS, using fallback gold rate data');
  
  // Save fallback to cache so subsequent calls use it
  setCache(KEYS.goldRateCache, FALLBACK_GOLD_RATE);
  setCache(KEYS.goldRateCacheTime, Date.now());
  
  return { ...FALLBACK_GOLD_RATE, from_cache: false };
}

// Cache keys for chart
export async function fetchBtmhGoldChart(
  _code?: string,
  _from_date?: string,
  _to_date?: string,
  _max_days?: number,
): Promise<GoldChartResponse> {
  // Check cache first
  const cachedChart = getCache<GoldChartResponse>('gaia_gold_chart_cache');
  const cacheValid = isCacheValid('gaia_gold_chart_cache_time');
  
  if (cachedChart && cacheValid) {
    return { ...cachedChart, from_cache: true };
  }

  // BTMH chart API also blocked by CORS
  console.warn('BTMH chart API blocked by CORS, using fallback chart data');
  
  // Save fallback to cache
  setCache('gaia_gold_chart_cache', FALLBACK_CHART_DATA);
  setCache('gaia_gold_chart_cache_time', Date.now());
  
  return { ...FALLBACK_CHART_DATA, from_cache: false };
}
