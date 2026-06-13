import { supabase } from './supabaseClient'
import type { SavingRecord, GoldRecord, GoalRecord, GoalProgress, TransactionRecord, MonthlyReport, GoldRate, GoldChartResponse } from './client'

const FALLBACK_GOLD_RATE: GoldRate = {
  code: 'KGB',
  name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K',
  vendor_name: 'Kim Gia Bảo',
  buy_price: 85000000,
  sell_price: 85500000,
  unit: 'chỉ',
  weight: '1 chỉ',
  trend: 'stable',
  trend_value: '0',
  last_updated: new Date().toISOString(),
  tracked_code: 'KGB',
  tracked_name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K',
  fetched_at: new Date().toISOString(),
  from_cache: false
}

const FALLBACK_CHART: GoldChartResponse = {
  data_points: [],
  product_options: [{ value: 'KGB', label: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K' }],
  price_changes: [],
  default_product: 'KGB',
  from_cache: false
}

export const supabaseApi = {
  getSavings: async (): Promise<SavingRecord[]> => {
    const { data, error } = await supabase.from('savings').select('*').order('created_at', { ascending: true })
    if (error) throw error
    return data.map(d => ({ bank: d.bank, amount: d.amount, interest_rate: d.interest_rate, term: d.term, start_date: d.start_date }))
  },
  addSaving: async (record: SavingRecord) => { const { error } = await supabase.from('savings').insert([record]); if (error) throw error; return { status: 'success' } },
  updateSavings: async (data: SavingRecord[]) => { await supabase.from('savings').delete().neq('id', 0); await supabase.from('savings').insert(data); return { status: 'success' } },
  getGold: async (): Promise<GoldRecord[]> => {
    const { data, error } = await supabase.from('gold').select('*').order('created_at', { ascending: true })
    if (error) throw error
    return data.map(d => ({ gold_type: d.gold_type, quantity: d.quantity, buy_price: d.buy_price, buy_date: d.buy_date, note: d.note || '' }))
  },
  addGold: async (record: GoldRecord) => { const { error } = await supabase.from('gold').insert([record]); if (error) throw error; return { status: 'success' } },
  updateGold: async (data: GoldRecord[]) => { await supabase.from('gold').delete().neq('id', 0); await supabase.from('gold').insert(data); return { status: 'success' } },
  getGoals: async (): Promise<GoalRecord[]> => { const { data, error } = await supabase.from('goals').select('*').order('priority', { ascending: true }); if (error) throw error; return data },
  addGoal: async (record: GoalRecord) => { const { error } = await supabase.from('goals').insert([record]); if (error) throw error; return { status: 'success' } },
  updateGoals: async (data: GoalRecord[]) => { await supabase.from('goals').delete().neq('id', ''); await supabase.from('goals').insert(data); return { status: 'success' } },
  deleteGoal: async (id: string) => { const { error } = await supabase.from('goals').delete().eq('id', id); if (error) throw error; return { status: 'success' } },
  getTransactions: async (): Promise<TransactionRecord[]> => { const { data, error } = await supabase.from('cashflow').select('*').order('created_at', { ascending: false }); if (error) throw error; return data },
  addTransaction: async (record: TransactionRecord) => { const { error } = await supabase.from('cashflow').insert([record]); if (error) throw error; return { status: 'success' } },
  updateTransactions: async (data: TransactionRecord[]) => { await supabase.from('cashflow').delete().neq('id', ''); await supabase.from('cashflow').insert(data); return { status: 'success' } },
  deleteTransaction: async (id: string) => { const { error } = await supabase.from('cashflow').delete().eq('id', id); if (error) throw error; return { status: 'success' } },

  getBtmhGoldRate: async (): Promise<GoldRate> => {
    const CACHE_KEY = 'btmh_gold_rate_cache'
    const CACHE_TIME_KEY = 'btmh_gold_rate_cache_time'
    const CACHE_TIMEOUT = 3600000

    const getCache = (): GoldRate | null => {
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        const time = localStorage.getItem(CACHE_TIME_KEY)
        if (!raw || !time) return null
        if (Date.now() - parseInt(time) > CACHE_TIMEOUT) return null
        return JSON.parse(raw)
      } catch { return null }
    }

    const cached = getCache()
    if (cached) return { ...cached, from_cache: true }

    try {
      const proxies = [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/get?url=',
        'https://thingproxy.freeboard.io/fetch/'
      ]

      for (const proxy of proxies) {
        try {
          const response = await fetch(proxy + encodeURIComponent('https://baotinmanhhai.vn/api/graphql'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: `query { goldRates { items { code name vendor_name buy_price sell_price unit weight trend trend_value last_updated } } }` })
          })
          const data = await response.json()
          const kgb = data?.data?.goldRates?.items?.find((i: any) => i.code === 'KGB')
          if (kgb) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(kgb))
            localStorage.setItem(CACHE_TIME_KEY, Date.now().toString())
            return { 
              ...kgb,
              code: 'KGB',
              tracked_code: 'KGB', 
              tracked_name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K',
              from_cache: false 
            }
          }
        } catch { continue }
      }
    } catch {}

    return FALLBACK_GOLD_RATE
  },

  getBtmhGoldChart: async (): Promise<GoldChartResponse> => FALLBACK_CHART,

  getSummary: async () => {
    const [savings, gold, transactions] = await Promise.all([supabaseApi.getSavings(), supabaseApi.getGold(), supabaseApi.getTransactions()])
    const cash = transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
    const total_saving = savings.reduce((s, r) => s + r.amount, 0)
    const total_gold_investment = gold.reduce((s, r) => s + r.quantity * r.buy_price, 0)
    const total_assets = total_saving + total_gold_investment + cash
    return {
      total_assets, total_saving, total_gold_investment, cash_balance: cash,
      saving_percentage: total_assets > 0 ? Math.round((total_saving / total_assets) * 1000) / 10 : 0,
      gold_percentage: total_assets > 0 ? Math.round((total_gold_investment / total_assets) * 1000) / 10 : 0
    }
  },
  getMonthlyReport: async (month: number, year: number): Promise<MonthlyReport> => {
    const transactions = await supabaseApi.getTransactions()
    const filtered = transactions.filter(t => { const parts = t.date.split('/'); return parts.length === 3 && parseInt(parts[1]) === month && parseInt(parts[2]) === year })
    const total_income = filtered.reduce((s, t) => t.type === 'income' ? s + t.amount : s, 0)
    const total_expense = filtered.reduce((s, t) => t.type === 'expense' ? s + t.amount : s, 0)
    const catMap = new Map<string, { category: string; type: string; amount: number; count: number }>()
    for (const t of filtered) {
      const key = t.category; const existing = catMap.get(key)
      if (existing) { existing.amount += t.amount; existing.count += 1 } else { catMap.set(key, { category: key, type: t.type, amount: t.amount, count: 1 }) }
    }
    return { month, year, total_income, total_expense, net: total_income - total_expense, categories: Array.from(catMap.values()) }
  },
  getGoalsWithProgress: async (): Promise<GoalProgress[]> => {
    const [goals, savings, gold] = await Promise.all([supabaseApi.getGoals(), supabaseApi.getSavings(), supabaseApi.getGold()])
    try {
      const rate = await supabaseApi.getBtmhGoldRate()
      const buyPrice = rate?.buy_price ?? 0
      return goals.map(g => {
        let current = 0
        for (const idx of g.saving_indices) { if (idx >= 0 && idx < savings.length) current += savings[idx].amount }
        for (const idx of g.gold_indices) { if (idx >= 0 && idx < gold.length) current += gold[idx].quantity * (buyPrice > 0 ? buyPrice : gold[idx].buy_price) }
        const pct = g.target_amount > 0 ? Math.min((current / g.target_amount) * 100, 100) : 0
        return { ...g, current_amount: Math.round(current), percentage: Math.round(pct * 10) / 10 }
      }).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
    } catch { return goals.map(g => ({ ...g, current_amount: 0, percentage: 0 })) }
  }
}
