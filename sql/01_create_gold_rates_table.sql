-- Step 1: Tạo table lưu giá vàng
CREATE TABLE IF NOT EXISTS gold_rates (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL DEFAULT 'KGB',
  name TEXT NOT NULL,
  vendor_name VARCHAR(100),
  buy_price BIGINT NOT NULL,
  sell_price BIGINT NOT NULL,
  unit VARCHAR(20) DEFAULT 'chỉ',
  weight VARCHAR(50),
  trend VARCHAR(20) DEFAULT 'stable',
  trend_value VARCHAR(20) DEFAULT '0',
  last_updated TIMESTAMPTZ,
  tracked_code VARCHAR(20) DEFAULT 'KGB',
  tracked_name TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo index
CREATE INDEX IF NOT EXISTS idx_gold_rates_code ON gold_rates(code);

-- Bật RLS
ALTER TABLE gold_rates ENABLE ROW LEVEL SECURITY;

-- Cho phép public đọc
CREATE POLICY "Allow public read gold_rates"
ON gold_rates FOR SELECT USING (true);

-- Insert dữ liệu khởi tạo
INSERT INTO gold_rates (
  code, name, vendor_name, buy_price, sell_price, unit, weight,
  trend, trend_value, last_updated, tracked_code, tracked_name
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
  'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)'
) ON CONFLICT (code) DO UPDATE SET
  buy_price = EXCLUDED.buy_price,
  sell_price = EXCLUDED.sell_price,
  last_updated = EXCLUDED.last_updated,
  fetched_at = NOW();

-- Tạo trigger function để update từ API
CREATE OR REPLACE FUNCTION public.update_gold_rate_from_api()
RETURNS VOID AS $$
DECLARE
  response_json JSON;
  kgb_item JSON;
BEGIN
  -- Use pg_net extension to make HTTP request
  -- This will be called by Edge Function instead
  RAISE NOTICE 'update_gold_rate_from_api function called';
END;
$$ LANGUAGE plpgsql;
