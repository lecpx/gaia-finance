// Supabase Edge Function to fetch BTMH gold rate and update Supabase table
// This runs on the server-side, so no CORS issues

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BTMH_GRAPHQL_URL = 'https://baotinmanhhai.vn/api/graphql';

const GOLD_RATE_QUERY = `
  query GetGoldRates {
    goldRates {
      items {
        code
        name
        vendor_name
        buy_price
        sell_price
        unit
        weight
        trend
        trend_value
        last_updated
      }
    }
  }
`;

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Fetch from BTMH API (server-side has no CORS issues)
    const response = await fetch(BTMH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/graphql-response+json, application/json',
        'Referer': 'https://baotinmanhhai.vn/vi/bang-gia-vang',
      },
      body: JSON.stringify({
        query: GOLD_RATE_QUERY,
        operationName: 'GetGoldRates',
      }),
    });

    if (!response.ok) {
      console.error(`BTMH API returned ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from BTMH API' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const items = data?.data?.goldRates?.items ?? [];
    
    // Find KGB product
    const kgb = items.find(
      (item: any) => 
        item.code === 'KGB' || 
        item.name?.includes('Nhẫn Tròn ép vỉ')
    );

    if (!kgb) {
      console.error('KGB product not found');
      return new Response(
        JSON.stringify({ error: 'KGB product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update gold_rates table in Supabase
    const { error } = await supabaseClient
      .from('gold_rates')
      .upsert({
        code: kgb.code || 'KGB',
        name: kgb.name || 'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)',
        vendor_name: kgb.vendor_name || 'Kim Gia Bảo',
        buy_price: kgb.buy_price || 85000000,
        sell_price: kgb.sell_price || 85500000,
        unit: kgb.unit || 'chỉ',
        weight: kgb.weight || '1 chỉ',
        trend: kgb.trend || 'stable',
        trend_value: kgb.trend_value || '0',
        last_updated: kgb.last_updated || new Date().toISOString(),
        tracked_code: 'KGB',
        tracked_name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)',
        fetched_at: new Date().toISOString(),
      }, {
        onConflict: 'code',
      });

    if (error) {
      console.error('Error updating gold_rates table:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return the fetched gold rate
    return new Response(
      JSON.stringify({
        goldRate: {
          ...kgb,
          tracked_code: 'KGB',
          tracked_name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo ) 24K (999.9)',
          fetched_at: new Date().toISOString(),
        },
        status: 'success',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
