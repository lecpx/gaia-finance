import { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';
import { IncomingMessage } from 'http';

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

// Custom fetch that ignores SSL certificate errors
async function fetchWithNoSSL(url: string, options: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Ignore SSL certificate errors
    });

    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: {
          ...options.headers,
          Host: parsedUrl.hostname,
        },
        agent: httpsAgent,
      },
      (res: IncomingMessage) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              ok: res.statusCode === 200,
              status: res.statusCode,
              json: () => Promise.resolve(JSON.parse(data)),
              text: () => Promise.resolve(data),
            });
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Fetch from BTMH API
    const response = await fetchWithNoSSL(BTMH_GRAPHQL_URL, {
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
      // Fallback to cached value or default
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch from BTMH API',
        goldRate: {
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
          from_cache: true,
        },
      });
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
      return res.status(404).json({
        success: false,
        error: 'KGB product not found',
        goldRate: {
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
          from_cache: false,
        },
      });
    }

    // Fix price: BTMH API returns price in wrong unit (14400000 = 14.4M instead of 144M)
    // Multiply by 10 to get correct price in VND
    const fixedBuyPrice = (kgb.buy_price || 85000000) * 10
    const fixedSellPrice = (kgb.sell_price || 85500000) * 10

    // Return the gold rate
    return res.status(200).json({
      success: true,
      goldRate: {
        code: kgb.code || 'KGB',
        name: kgb.name || 'Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K',
        vendor_name: kgb.vendor_name || 'Kim Gia Bảo',
        buy_price: fixedBuyPrice,
        sell_price: fixedSellPrice,
        unit: 'chỉ',
        weight: kgb.weight || '1 chỉ',
        trend: kgb.trend || 'stable',
        trend_value: kgb.trend_value || '0',
        last_updated: kgb.last_updated || new Date().toISOString(),
        tracked_code: 'KGB',
        tracked_name: 'Nhẫn Tròn ép vỉ (Kim Gia Bảo) 24K',
        fetched_at: new Date().toISOString(),
        from_cache: false,
      },
    });

  } catch (error: any) {
    console.error('Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      goldRate: {
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
        from_cache: true,
      },
    });
  }
}
