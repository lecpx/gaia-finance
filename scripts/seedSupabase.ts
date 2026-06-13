import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wcxpsimqhqcseuggejcs.supabase.co'
const supabaseKey = 'sb_publishable_QKYIDRYEjF_ti9n_sBq0Pg_xbJHFaeG'
const supabase = createClient(supabaseUrl, supabaseKey)

// Seed data
const SEED_SAVINGS = [
  { bank: "MB", amount: 20000000, interest_rate: 6.1, term: 36, start_date: "01/02/2024" },
  { bank: "MB", amount: 100000000, interest_rate: 6.3, term: 12, start_date: "10/03/2026" },
  { bank: "MB", amount: 22498837, interest_rate: 4.85, term: 12, start_date: "01/07/2025" },
  { bank: "MB", amount: 33679455, interest_rate: 4.85, term: 12, start_date: "25/07/2025" },
  { bank: "MB", amount: 30000000, interest_rate: 4.85, term: 12, start_date: "24/10/2025" },
  { bank: "Vietcombank", amount: 27382874, interest_rate: 5.2, term: 12, start_date: "27/01/2026" },
  { bank: "MB", amount: 48054849, interest_rate: 5.3, term: 6, start_date: "28/01/2026" },
  { bank: "MB", amount: 40000000, interest_rate: 5.3, term: 6, start_date: "21/02/2026" },
  { bank: "MB", amount: 22507332, interest_rate: 6.45, term: 12, start_date: "25/05/2026" },
]

const SEED_GOLD = [
  { gold_type: "PNJ", quantity: 2, buy_price: 7310000, buy_date: "06/04/2024", note: "" },
  { gold_type: "SJC", quantity: 5, buy_price: 7570000, buy_date: "01/06/2024", note: "" },
  { gold_type: "PNJ", quantity: 1, buy_price: 11550000, buy_date: "22/05/2025", note: "" },
  { gold_type: "DOJI", quantity: 1, buy_price: 11645000, buy_date: "06/06/2025", note: "" },
  { gold_type: "BTMH", quantity: 2, buy_price: 11700000, buy_date: "13/06/2025", note: "" },
  { gold_type: "BTMH", quantity: 2, buy_price: 11810000, buy_date: "10/07/2025", note: "" },
  { gold_type: "DOJI", quantity: 10, buy_price: 11900000, buy_date: "12/07/2025", note: "" },
  { gold_type: "BTMH", quantity: 5, buy_price: 15130000, buy_date: "30/11/2025", note: "" },
  { gold_type: "BTMH", quantity: 2, buy_price: 16600000, buy_date: "08/05/2026", note: "" },
]

async function seed() {
  console.log('🌱 Seeding Supabase database...')

  // Xóa dữ liệu cũ
  console.log('🗑️  Cleaning old data...')
  await supabase.from('savings').delete().neq('id', 0)
  await supabase.from('gold').delete().neq('id', 0)

  // Thêm dữ liệu mới
  console.log('📥 Inserting savings...')
  const { error: savingsError } = await supabase.from('savings').insert(SEED_SAVINGS)
  if (savingsError) {
    console.error('❌ Error inserting savings:', savingsError)
    throw savingsError
  }

  console.log('📥 Inserting gold records...')
  const { error: goldError } = await supabase.from('gold').insert(SEED_GOLD)
  if (goldError) {
    console.error('❌ Error inserting gold:', goldError)
    throw goldError
  }

  console.log('✅ Seed completed successfully!')
  console.log('📊 Your Supabase database now has:')
  console.log('   - 9 savings records')
  console.log('   - 9 gold records')
}

seed().catch(console.error)

