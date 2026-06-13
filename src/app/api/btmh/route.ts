import { supabase } from '../../../api/supabaseClient'
import { NextResponse } from 'next/server'

// Bypass SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export async function GET() {
  try {
    const btmhResponse = await fetch('https://baotinmanhhai.vn/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/graphql-response+json, application/json',
        'Referer': 'https://baotinmanhhai.vn/'
      },
      body: JSON.stringify({
        query: `query GetGoldRates {
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
        }`
      })
    })

    if (!btmhResponse.ok) throw new Error(`BTMH API failed: ${btmhResponse.status}`)

    const data = await btmhResponse.json()
    const items = data?.data?.goldRates?.items || []
    const kgb = items.find((i: any) => i.code === 'KGB')

    if (!kgb) throw new Error('KGB not found')

    // Save to Supabase
    const { error } = await supabase
      .from('gold_rates')
      .upsert({
        code: kgb.code || 'KGB',
        name: kgb.name || 'Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K',
        vendor_name: kgb.vendor_name || 'Kim Gia Bảo',
        buy_price: kgb.buy_price,
        sell_price: kgb.sell_price,
        unit: kgb.unit || 'chỉ',
        weight: kgb.weight || '1 chỉ',
        trend: kgb.trend || 'stable',
        trend_value: kgb.trend_value || '0',
        last_updated: kgb.last_updated || new Date().toISOString(),
        tracked_code: 'KGB',
        tracked_name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K',
        fetched_at: new Date().toISOString()
      }, { onConflict: 'code' })

    if (error) throw new Error(error.message)

    return NextResponse.json({
      success: true,
      goldRate: {
        ...kgb,
        code: 'KGB',
        tracked_code: 'KGB',
        tracked_name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K'
      }
    })

  } catch (error) {
    console.error('BTMH error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
