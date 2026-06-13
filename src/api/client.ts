// Type definitions only - implementation is in supabaseApi.ts
// This file keeps the type definitions for backwards compatibility

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
