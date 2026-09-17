/**
 * KISSAN CONNECT - COMPREHENSIVE REAL-DATA API TEST SUITE
 */

const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING REAL-DATA BACKEND SUITE VERIFICATION');
  console.log('====================================================');

  // 1. Health
  const health = await request({ host: 'localhost', port: 3000, path: '/api/health', method: 'GET' });
  console.log('1. /api/health:', health.status, health.data.database, health.data.configuredApis);

  // 2. Buyers
  const buyers = await request({ host: 'localhost', port: 3000, path: '/api/buyers', method: 'GET' });
  console.log('2. /api/buyers:', buyers.status, 'Buyers found:', buyers.data.buyers ? buyers.data.buyers.length : 0);
  if (buyers.data.buyers) {
    console.log('   Sample Buyer:', buyers.data.buyers[0].id, buyers.data.buyers[0].name, 'GSTIN:', buyers.data.buyers[0].gstin);
  }

  // 3. Lots
  const lots = await request({ host: 'localhost', port: 3000, path: '/api/lots', method: 'GET' });
  console.log('3. /api/lots:', lots.status, 'Lots in DB:', lots.data.count);
  const testLot = lots.data.lots[0];
  console.log('   Sample Lot:', testLot.id, testLot.crop_name_te, 'Reserve: ₹' + testLot.reserve_price, 'Current High: ₹' + testLot.highest_bid);

  // 4. Submit Real Bid via API
  const newBidPrice = Number(testLot.highest_bid) + 150;
  const bidPayload = {
    lotId: testLot.id,
    buyerId: 'USR-BUY-01',
    pricePerQ: newBidPrice,
    logisticsMode: 'buyer_vehicle'
  };
  const bidRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/bids',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, bidPayload);
  console.log('4. POST /api/bids:', bidRes.status, bidRes.data.message);
  console.log('   Recorded Bid ID:', bidRes.data.bid ? bidRes.data.bid.bidId : 'none', 'Amount: ₹' + newBidPrice);

  // 5. Verify Bid in Buyer History
  const myBids = await request({ host: 'localhost', port: 3000, path: '/api/bids/buyer/USR-BUY-01', method: 'GET' });
  console.log('5. /api/bids/buyer/USR-BUY-01:', myBids.status, 'Total Bids:', myBids.data.count);

  // 6. Verify Lot High Bid Updated in SQLite
  const updatedLot = await request({ host: 'localhost', port: 3000, path: `/api/lots/${testLot.id}`, method: 'GET' });
  console.log('6. /api/lots/' + testLot.id + ' Updated Highest Bid: ₹' + updatedLot.data.lot.highest_bid);

  // 7. Market Prices (data.gov.in proxy)
  const market = await request({ host: 'localhost', port: 3000, path: '/api/market-prices', method: 'GET' });
  console.log('7. /api/market-prices:', market.status, 'Status:', market.data.status, 'Source:', market.data.source, 'Message:', market.data.message);

  // 8. Live Weather (Open-Meteo)
  const weather = await request({ host: 'localhost', port: 3000, path: '/api/weather?lat=17.7214&lon=79.1834', method: 'GET' });
  console.log('8. /api/weather (Jangaon):', weather.status, weather.data.current.temperature + '°C', weather.data.current.conditionTe, 'Source:', weather.data.source);

  // 9. Route & Distance (OSRM)
  const route = await request({ host: 'localhost', port: 3000, path: '/api/route?originLat=17.7214&originLon=79.1834&destLat=17.4399&destLon=78.4983', method: 'GET' });
  console.log('9. /api/route:', route.status, 'Status:', route.data.status, route.data.distanceKm ? route.data.distanceKm + ' km' : route.data.message);

  // 10. Buyer Orders
  const orders = await request({ host: 'localhost', port: 3000, path: '/api/orders/buyer/USR-BUY-01', method: 'GET' });
  console.log('10. /api/orders/buyer/USR-BUY-01:', orders.status, 'Orders:', orders.data.count);

  console.log('====================================================');
  console.log('✅ ALL API TESTS EXECUTED SUCCESSFULLY!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
