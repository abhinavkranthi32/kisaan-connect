/**
 * KISSAN CONNECT - GOVERNMENT MARKET PRICE SERVICE
 * Connects to data.gov.in AGMARKNET Daily Mandi Prices for Telangana
 * Strictly NO fake fallback prices.
 */

const https = require('https');

let priceCache = {
  data: null,
  lastUpdated: null
};

/**
 * Fetch real market prices from data.gov.in / AGMARKNET
 * @param {string} apiKey - Optional data.gov.in API key
 */
async function fetchMarketPrices(apiKey = process.env.DATA_GOV_IN_API_KEY) {
  // If no API key is provided, return strictly transparent unavailable state
  if (!apiKey || apiKey.trim() === '') {
    return {
      status: 'unavailable',
      message: 'Live market data currently unavailable (Govt API Key required)',
      source: 'AGMARKNET / data.gov.in',
      requiredEnv: 'DATA_GOV_IN_API_KEY',
      configured: false,
      lastUpdated: new Date().toISOString(),
      mandis: []
    };
  }

  // Cache for 15 minutes to respect government API rate limits
  if (priceCache.data && priceCache.lastUpdated && (Date.now() - priceCache.lastUpdated < 15 * 60 * 1000)) {
    return priceCache.data;
  }

  const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&filters%5Bstate%5D=Telangana&limit=100`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve({
              status: 'unavailable',
              message: `Upstream AGMARKNET API returned HTTP ${res.statusCode}`,
              source: 'AGMARKNET / data.gov.in',
              lastUpdated: new Date().toISOString(),
              mandis: []
            });
            return;
          }

          const parsed = JSON.parse(rawData);
          const records = parsed.records || [];

          if (records.length === 0) {
            resolve({
              status: 'unavailable',
              message: 'No live arrival records reported for Telangana mandis today.',
              source: 'AGMARKNET / data.gov.in',
              lastUpdated: new Date().toISOString(),
              mandis: []
            });
            return;
          }

          const normalized = records.map((r, idx) => ({
            id: `gov-${idx}`,
            market: r.market || r.market_name,
            commodity: r.commodity,
            variety: r.variety || 'Standard',
            minPrice: Number(r.min_price) || 0,
            maxPrice: Number(r.max_price) || 0,
            modalPrice: Number(r.modal_price) || 0,
            arrivalDate: r.arrival_date || new Date().toISOString().split('T')[0],
            unit: 'Quintal (100 Kg)',
            source: 'AGMARKNET (data.gov.in)',
            lastUpdated: new Date().toISOString()
          }));

          const response = {
            status: 'live',
            source: 'AGMARKNET / data.gov.in',
            lastUpdated: new Date().toISOString(),
            mandis: normalized
          };

          priceCache = { data: response, lastUpdated: Date.now() };
          resolve(response);
        } catch (err) {
          resolve({
            status: 'unavailable',
            message: 'Error parsing upstream AGMARKNET response',
            source: 'AGMARKNET / data.gov.in',
            lastUpdated: new Date().toISOString(),
            mandis: []
          });
        }
      });
    }).on('error', (err) => {
      resolve({
        status: 'unavailable',
        message: `Network error reaching AGMARKNET: ${err.message}`,
        source: 'AGMARKNET / data.gov.in',
        lastUpdated: new Date().toISOString(),
        mandis: []
      });
    });
  });
}

module.exports = { fetchMarketPrices };
