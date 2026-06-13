import { supabase } from '../../../api/supabaseClient'
import { NextResponse } from 'next/server'

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
        query: `query { goldRates { items { code name vendor_name buy_price sell_price } } }`
      })
    })

    if (!btmhResponse.ok) throw new Error(`BTMH failed: ${btmhResponse.status}`)

    const data = await btmhResponse.json()
    const kgb = data?.data?.goldRates?.items?.find((i: any) => i.code === 'KGB')

    if (!kgb) throw new Error('KGB not found')

    await supabase.from('gold_rates').upsert({
      code: 'KGB',
      name: kgb.name || 'Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K',
      vendor_name: kgb.vendor_name || 'Kim Gia Bảo',
      buy_price: kgb.buy_price,
      sell_price: kgb.sell_price,
      unit: 'chỉ',
      fetched_at: new Date().toISOString()
    })

    return NextResponse.json({ success: true, goldRate: kgb })

  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown' }, { status: 500 })
  }
}
