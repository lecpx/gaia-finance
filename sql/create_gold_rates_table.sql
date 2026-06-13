-- Tạo table lưu giá vàng
CREATE TABLE IF NOT EXISTS gold_rates (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL DEFAULT 'KGB',
  name TEXT NOT NULL,
  vendor_name VARCHAR(100),
  buy_price BIGINT NOT NULL,
  sell_price BIGINT NOT NULL,
  unit VARCHAR(20),
  weight VARCHAR(50),
  trend VARCHAR(20),
  trend_value VARCHAR(20),
  last_updated TIMESTAMPTZ,
  tracked_code VARCHAR(20) DEFAULT 'KGB',
  tracked_name TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo index cho code
CREATE INDEX IF NOT EXISTS idx_gold_rates_code ON gold_rates(code);

-- Bật RLS (Row Level Security) cho public access
ALTER TABLE gold_rates ENABLE ROW LEVEL SECURITY;

-- Cho phép public đọc
CREATE POLICY "Allow public read access to gold_rates"
ON gold_rates FOR SELECT USING (true);

-- Insert giá vàng ban đầu (fallback)
INSERT INTO gold_rates (
  code, name, vendor_name, buy_price, sell_price, unit, weight, 
  trend, trend_value, last_updated, tracked_code, tracked_name, fetched_at
) VALUES (
  'KGB',
  'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)',
  'Kim Gia Bảo',
  85000000,
  85500000,
  'chỉ',
  '1 chỉ',
  'stable',
  '0',
  NOW(),
  'KGB',
  'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)',
  NOW()
) ON CONFLICT (code) DO NOTHING;
