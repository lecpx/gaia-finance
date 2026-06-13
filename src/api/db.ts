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

// --- BTMH gold rates (CORS proxy for production) ---
// Sử dụng direct CORS proxy (proxy chỉ hoạt động trong dev)
const BTMH_URL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://baotinmanhhai.vn/api/graphql');

// Fallback URL (dùng chung cho dev và production)
const FALLBACK_BTMH_URL = 'https://thingproxy.freeboard.io/fetch/' + encodeURIComponent('https://baotinmanhhai.vn/api/graphql');

function btmhPayload(query: string, variables?: Record<string, unknown>) {
  return {
    method: 'POST',
    headers: {
      'accept': 'application/graphql-response+json, application/json',
      'content-type': 'application/json',
      'referer': 'https://baotinmanhhai.vn/vi/bang-gia-vang',
    },
    body: JSON.stringify({ query, variables, operationName: variables ? 'GetGoldChartData' : 'GetGoldRates' }),
  };
}

async function fetchFromAPI(url: string, query: string): Promise<GoldRate> {
  const res = await fetch(url, btmhPayload(query));
  if (!res.ok) throw new Error(`BTMH API returned ${res.status}`);
  const data = await res.json();
  const items = data?.data?.goldRates?.items ?? [];
  const product = items.find(
    (item: Record<string, unknown>) => item.code === 'KGB' || item.name === 'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)',
  );

  if (!product) throw new Error('BTMH KGB product not found');

  return {
    ...product,
    tracked_code: 'KGB',
    tracked_name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)',
    fetched_at: new Date().toISOString(),
  };
}

export async function fetchBtmhGoldRate(): Promise<GoldRate> {
  const query = `
    query GetGoldRates {
      goldRates {
        items { code name vendor_name buy_price sell_price unit weight trend trend_value last_updated }
        total_count
      }
    }
  `;

  // Check cache first
  const cachedRate = getCache<GoldRate>(KEYS.goldRateCache);
  const cacheValid = isCacheValid(KEYS.goldRateCacheTime);
  
  if (cachedRate && cacheValid) {
    return { ...cachedRate, from_cache: true };
  }

  try {
    // Try with proxy (works in dev)
    const rate = await fetchFromAPI(BTMH_URL, query);
    
    // Save to cache
    setCache(KEYS.goldRateCache, rate);
    setCache(KEYS.goldRateCacheTime, Date.now());
    
    return { ...rate, from_cache: false };
  } catch {
    // If proxy fails, try fallback URL
    try {
      const rate = await fetchFromAPI(FALLBACK_BTMH_URL, query);
      
      setCache(KEYS.goldRateCache, rate);
      setCache(KEYS.goldRateCacheTime, Date.now());
      
      return { ...rate, from_cache: false };
    } catch {
      // If both fail, return cached data if available
      if (cachedRate) {
        console.warn('BTMH API failed, using cached data');
        return { ...cachedRate, from_cache: true };
      }
      throw new Error('BTMH API unavailable and no cached data');
    }
  }
}

const CHART_CACHE_KEY = 'gaia_gold_chart_cache';
const CHART_CACHE_TIME_KEY = 'gaia_gold_chart_cache_time';

// Chart cache timeout: 1 hour
const CHART_CACHE_TIMEOUT = 3600000;

function isChartCacheValid(): boolean {
  const cacheTime = localStorage.getItem(CHART_CACHE_TIME_KEY);
  if (!cacheTime) return false;
  
  const cachedAt = parseInt(cacheTime);
  const now = Date.now();
  return now - cachedAt < CHART_CACHE_TIMEOUT;
}

function getChartCache(): GoldChartResponse | null {
  return getCache<GoldChartResponse>(CHART_CACHE_KEY);
}

function setChartCache(data: GoldChartResponse) {
  setCache(CHART_CACHE_KEY, data);
  setCache(CHART_CACHE_TIME_KEY, Date.now());
}

async function fetchChartFromAPI(
  url: string,
  code: string,
  from_date: string | undefined,
  to_date: string | undefined,
  max_days: number
): Promise<GoldChartResponse> {
  const query = `
    query GetGoldChartData($code: String!, $from_date: String, $to_date: String, $max_days: Int) {
      goldChartData(code: $code, from_date: $from_date, to_date: $to_date, max_days: $max_days) {
        data_points { date buy sell }
        product_options { value label }
        price_changes { label value percentage trend }
        default_product
      }
    }
  `;

  const res = await fetch(url, btmhPayload(query, { code, from_date, to_date, max_days }));
  if (!res.ok) throw new Error(`BTMH chart API returned ${res.status}`);
  const data = await res.json();
  const chartData = data?.data?.goldChartData ?? {};

  const fromYear = parseInt((from_date ?? '').slice(0, 4));
  let year = fromYear || new Date().getFullYear();
  let prevMonth = 0;
  for (const pt of chartData.data_points ?? []) {
    const parts = (pt.date ?? '').split('/');
    if (parts.length === 2) {
      const month = parseInt(parts[1]);
      if (month < prevMonth) year += 1;
      prevMonth = month;
      pt.date = `${parts[0]}/${parts[1]}/${year}`;
    }
  }

  return chartData;
}

export async function fetchBtmhGoldChart(
  code = 'KGB',
  from_date?: string,
  to_date?: string,
  max_days = 366,
): Promise<GoldChartResponse> {
  // Check cache first
  const cachedChart = getChartCache();
  const cacheValid = isChartCacheValid();
  
  if (cachedChart && cacheValid) {
    return { ...cachedChart, from_cache: true };
  }

  try {
    // Try with proxy (works in dev)
    const chartData = await fetchChartFromAPI(BTMH_URL, code, from_date, to_date, max_days);
    
    setChartCache(chartData);
    
    return { ...chartData, from_cache: false };
  } catch {
    // If proxy fails, try fallback URL
    try {
      const chartData = await fetchChartFromAPI(FALLBACK_BTMH_URL, code, from_date, to_date, max_days);
      
      setChartCache(chartData);
      
      return { ...chartData, from_cache: false };
    } catch {
      // If both fail, return cached data if available
      if (cachedChart) {
        console.warn('BTMH chart API failed, using cached data');
        return { ...cachedChart, from_cache: true };
      }
      throw new Error('BTMH chart API unavailable and no cached data');
    }
  }
}
