/**
 * KISSAN CONNECT - PRODUCTION BACKEND SERVER (SIH PLATFORM)
 * Native Node.js REST API & Real-Time Event Engine with SQLite Database
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Zero-dependency .env loader
try {
  if (fs.existsSync(path.join(__dirname, '.env'))) {
    const lines = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (process.env[key] === undefined) process.env[key] = val;
      }
    }
  }
} catch (e) {}
const { DatabaseSync } = require('node:sqlite');
const { initDatabase, DB_PATH } = require('./db/init_db');
const { fetchMarketPrices } = require('./services/marketService');
const { fetchWeather } = require('./services/weatherService');
const { calculateRoute } = require('./services/routingService');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// Initialize SQLite database
const db = initDatabase();

// Connected SSE clients for genuine real-time synchronization
const sseClients = new Set();

function broadcastEvent(eventType, payload) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(message);
    } catch (e) {
      sseClients.delete(res);
    }
  }
}

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// Request body helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // ---------------------------------------------------------------------------
  // API ROUTES
  // ---------------------------------------------------------------------------

  // 1. System Health
  if (method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'healthy',
      database: 'SQLite (node:sqlite)',
      connectedClients: sseClients.size,
      timestamp: new Date().toISOString(),
      configuredApis: {
        market: Boolean(process.env.DATA_GOV_IN_API_KEY),
        weather: 'Open-Meteo (Active)',
        routing: 'OSRM Driving (Active)',
        gemini: Boolean(process.env.GEMINI_API_KEY)
      }
    });
  }

  // 2. Real-Time Server-Sent Events (SSE)
  if (method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(': connected\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 3. Buyers
  if (method === 'GET' && pathname === '/api/buyers') {
    const buyers = db.prepare('SELECT * FROM buyers ORDER BY name ASC').all();
    return sendJson(res, 200, { status: 'success', buyers });
  }

  if (method === 'GET' && pathname.startsWith('/api/buyers/')) {
    const buyerId = pathname.replace('/api/buyers/', '');
    const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(buyerId);
    if (!buyer) return sendJson(res, 404, { status: 'error', message: 'Buyer not found' });
    return sendJson(res, 200, { status: 'success', buyer });
  }

  // 4. Harvest Lots
  if (method === 'GET' && pathname === '/api/lots') {
    let query = "SELECT * FROM harvest_lots WHERE status = 'active'";
    const params = [];

    const cropKey = parsedUrl.query.crop;
    const grade = parsedUrl.query.grade;
    const search = parsedUrl.query.search;

    if (cropKey && cropKey !== 'all') {
      query += ' AND crop_key = ?';
      params.push(cropKey);
    }
    if (grade && grade !== 'all') {
      query += ' AND grade = ?';
      params.push(grade);
    }
    if (search && search.trim() !== '') {
      query += ' AND (crop_name_te LIKE ? OR crop_name_en LIKE ? OR location_te LIKE ? OR id LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC';

    const lots = db.prepare(query).all(...params);

    // Attach active bids for each lot
    const bidsStmt = db.prepare('SELECT * FROM bids WHERE lot_id = ? ORDER BY price_per_q DESC');
    for (const lot of lots) {
      lot.bids = bidsStmt.all(lot.id);
    }

    return sendJson(res, 200, { status: 'success', count: lots.length, lots });
  }

  if (method === 'GET' && pathname.startsWith('/api/lots/')) {
    const lotId = pathname.replace('/api/lots/', '');
    const lot = db.prepare('SELECT * FROM harvest_lots WHERE id = ?').get(lotId);
    if (!lot) return sendJson(res, 404, { status: 'error', message: 'Lot not found' });
    lot.bids = db.prepare('SELECT * FROM bids WHERE lot_id = ? ORDER BY price_per_q DESC').all(lotId);
    return sendJson(res, 200, { status: 'success', lot });
  }

  // 4b. Create Harvest Lot (Farmer -> Backend -> DB -> Broadcast)
  if (method === 'POST' && pathname === '/api/lots') {
    try {
      const body = await parseBody(req);
      const lotId = body.id || `LOT-TS-${Date.now().toString().slice(-4)}`;
      let requestedFarmerId = body.farmerId || 'USR-FARM-01';
      let farmer = db.prepare('SELECT id, name, phone FROM farmers WHERE id = ?').get(requestedFarmerId);
      if (!farmer) {
        farmer = db.prepare('SELECT id, name, phone FROM farmers LIMIT 1').get();
      }
      const farmerId = farmer ? farmer.id : 'USR-FARM-01';
      const farmerName = body.farmerName || (farmer ? farmer.name : 'మల్లారెడ్డి (Malla Reddy)');
      const farmerPhone = body.farmerPhone || (farmer ? farmer.phone : '+91 98480 55210');
      const cropKey = body.cropKey || 'teja_chilli';
      const cropNameTe = body.cropNameTe || 'పంట';
      const cropNameEn = body.cropNameEn || 'Crop';
      const varietyTe = body.varietyTe || '';
      const varietyEn = body.varietyEn || '';
      const quantity = Number(body.quantity || body.quantity_quintals || 50);
      const grade = body.grade || 'A';
      const moisture = body.moisture || body.moisture_pct || '10%';
      const locationTe = body.locationTe || body.location_te || 'తెలంగాణ';
      const locationEn = body.locationEn || body.location_en || 'Telangana';
      const storageTe = body.storageTe || body.storage_type_te || 'పొలంలో ఉంది (Farm Gate)';
      const storageEn = body.storageEn || body.storage_type_en || 'Farm Gate Pickup';
      const reservePrice = Number(body.reservePrice || body.reserve_price || 20000);
      const image = body.image || body.image_url || '/shared/assets/crops/teja_chilli.jpg';

      db.prepare(`
        INSERT INTO harvest_lots (
          id, farmer_id, farmer_name, farmer_phone, crop_key, crop_name_te, crop_name_en,
          variety_te, variety_en, quantity_quintals, grade, moisture_pct, location_te, location_en,
          storage_type_te, storage_type_en, reserve_price, highest_bid, image_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        lotId, farmerId, farmerName, farmerPhone, cropKey, cropNameTe, cropNameEn,
        varietyTe, varietyEn, quantity, grade, moisture, locationTe, locationEn,
        storageTe, storageEn, reservePrice, reservePrice, image
      );

      const createdLot = db.prepare('SELECT * FROM harvest_lots WHERE id = ?').get(lotId);
      createdLot.bids = [];
      broadcastEvent('NEW_LOT', { lot: createdLot });

      return sendJson(res, 201, { status: 'success', message: 'Harvest lot listed successfully', lot: createdLot });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 5. Submit Bid (Buyer -> Backend -> DB -> Broadcast)
  if (method === 'POST' && pathname === '/api/bids') {
    try {
      const body = await parseBody(req);
      const { lotId, buyerId, pricePerQ, logisticsMode } = body;

      if (!lotId || !buyerId || !pricePerQ) {
        return sendJson(res, 400, { status: 'error', message: 'Missing required fields: lotId, buyerId, pricePerQ' });
      }

      const lot = db.prepare('SELECT * FROM harvest_lots WHERE id = ?').get(lotId);
      if (!lot) return sendJson(res, 404, { status: 'error', message: 'Lot not found' });

      if (Number(pricePerQ) < Number(lot.reserve_price)) {
        return sendJson(res, 400, {
          status: 'error',
          message: `Bid price ₹${pricePerQ} is below farmer reserve price ₹${lot.reserve_price}`
        });
      }

      const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(buyerId);
      if (!buyer) return sendJson(res, 404, { status: 'error', message: 'Buyer profile not found in database' });

      const bidId = `BID-${Date.now().toString().slice(-6)}`;
      const totalDeal = Number(pricePerQ) * Number(lot.quantity_quintals);

      const isBuyerVehicle = logisticsMode === 'buyer_vehicle';
      const logTextTe = isBuyerVehicle
        ? '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)'
        : '🚚 ప్లాట్‌ఫామ్ రవాణాదారుడు కావాలి';
      const logTextEn = isBuyerVehicle
        ? '🚛 Buyer arranges own truck (₹0 farmer cost)'
        : '🚚 Platform transporter requested';

      // Insert real bid into DB
      db.prepare(`
        INSERT INTO bids (id, lot_id, buyer_id, buyer_name, buyer_rating, buyer_location, price_per_q, total_deal_amount, logistics_mode, logistics_text_te, logistics_text_en, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bidId,
        lotId,
        buyer.id,
        buyer.name,
        buyer.rating,
        buyer.city,
        Number(pricePerQ),
        totalDeal,
        logisticsMode || 'buyer_vehicle',
        logTextTe,
        logTextEn,
        'active'
      );

      // Update highest bid if greater
      if (Number(pricePerQ) > Number(lot.highest_bid)) {
        db.prepare('UPDATE harvest_lots SET highest_bid = ? WHERE id = ?').run(Number(pricePerQ), lotId);
      }

      const createdBid = {
        bidId,
        lotId,
        buyerId: buyer.id,
        buyerName: buyer.name,
        buyerRating: buyer.rating,
        buyerLocation: buyer.city,
        pricePerQ: Number(pricePerQ),
        totalDealAmount: totalDeal,
        logisticsMode: logisticsMode || 'buyer_vehicle',
        logisticsTextTe: logTextTe,
        logisticsTextEn: logTextEn,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      // Real-time broadcast to all portals
      broadcastEvent('NEW_BID', { lotId, bid: createdBid });

      return sendJson(res, 201, { status: 'success', message: 'Bid recorded in database', bid: createdBid });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 6. Get Buyer's Active Bids
  if (method === 'GET' && pathname.startsWith('/api/bids/buyer/')) {
    const buyerId = pathname.replace('/api/bids/buyer/', '');
    const bids = db.prepare(`
      SELECT b.*, h.crop_name_te, h.crop_name_en, h.quantity_quintals, h.grade, h.highest_bid, h.farmer_name, h.location_te as farmer_location
      FROM bids b
      JOIN harvest_lots h ON b.lot_id = h.id
      WHERE b.buyer_id = ?
      ORDER BY b.created_at DESC
    `).all(buyerId);

    const formatted = bids.map(b => ({
      bidId: b.id,
      lotId: b.lot_id,
      cropNameTe: b.crop_name_te,
      cropNameEn: b.crop_name_en,
      quantity: b.quantity_quintals,
      grade: b.grade,
      farmerName: b.farmer_name,
      farmerLocation: b.farmer_location,
      myPrice: b.price_per_q,
      highestPrice: b.highest_bid,
      totalValuation: b.total_deal_amount,
      logisticsMode: b.logistics_mode,
      status: b.price_per_q >= b.highest_bid ? 'leading' : 'outbid',
      createdAt: b.created_at
    }));

    return sendJson(res, 200, { status: 'success', count: formatted.length, bids: formatted });
  }

  // 7. Buyer Procurement Orders
  if (method === 'GET' && pathname.startsWith('/api/orders/buyer/')) {
    const buyerId = pathname.replace('/api/orders/buyer/', '');
    const orders = db.prepare('SELECT * FROM procurement_orders WHERE buyer_id = ? ORDER BY created_at DESC').all(buyerId);
    return sendJson(res, 200, { status: 'success', count: orders.length, orders });
  }

  // 8. Assign Truck to Order
  if (method === 'POST' && pathname.match(/^\/api\/orders\/[^\/]+\/assign-truck$/)) {
    try {
      const orderId = pathname.split('/')[3];
      const body = await parseBody(req);
      const { vehicleReg, driverName, driverPhone } = body;

      const order = db.prepare('SELECT * FROM procurement_orders WHERE id = ?').get(orderId);
      if (!order) return sendJson(res, 404, { status: 'error', message: 'Order not found' });

      db.prepare(`
        UPDATE procurement_orders 
        SET current_step = 3, vehicle_reg = ?, driver_name = ?, driver_phone = ?, status = 'dispatched', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(vehicleReg, driverName, driverPhone, orderId);

      broadcastEvent('ORDER_UPDATED', { orderId, currentStep: 3, vehicleReg, driverName });

      return sendJson(res, 200, { status: 'success', message: 'Vehicle assigned to order' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 9. Verify OTP & Release Escrow
  if (method === 'POST' && pathname.match(/^\/api\/orders\/[^\/]+\/verify-otp$/)) {
    try {
      const orderId = pathname.split('/')[3];
      const body = await parseBody(req);
      const { otp } = body;

      const order = db.prepare('SELECT * FROM procurement_orders WHERE id = ?').get(orderId);
      if (!order) return sendJson(res, 404, { status: 'error', message: 'Order not found' });

      if (order.farm_gate_otp !== String(otp).trim()) {
        return sendJson(res, 400, { status: 'error', message: 'Invalid OTP provided' });
      }

      db.prepare(`
        UPDATE procurement_orders
        SET current_step = 5, status = 'delivered', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(orderId);

      // Deduct buyer escrow and credit farmer wallet
      db.prepare('UPDATE buyers SET escrow_balance = escrow_balance - ? WHERE id = ?')
        .run(order.total_escrow_amount, order.buyer_id);
      db.prepare('UPDATE farmers SET wallet_balance = wallet_balance + ? WHERE id = ?')
        .run(order.total_escrow_amount, order.farmer_id);

      broadcastEvent('ORDER_DELIVERED', { orderId, totalAmount: order.total_escrow_amount });

      return sendJson(res, 200, { status: 'success', message: 'OTP verified. Escrow funds released to farmer.' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 10. Buyer RFQs
  if (method === 'GET' && pathname === '/api/rfqs') {
    const rfqs = db.prepare("SELECT * FROM rfqs WHERE status = 'active' ORDER BY created_at DESC").all();
    return sendJson(res, 200, { status: 'success', count: rfqs.length, rfqs });
  }

  if (method === 'POST' && pathname === '/api/rfqs') {
    try {
      const body = await parseBody(req);
      const { buyerId, cropKey, cropNameTe, cropNameEn, targetQty, offerPrice, deliveryMandi, validUntil } = body;

      const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(buyerId);
      if (!buyer) return sendJson(res, 404, { status: 'error', message: 'Buyer not found' });

      const rfqId = `RFQ-${Date.now().toString().slice(-6)}`;
      db.prepare(`
        INSERT INTO rfqs (id, buyer_id, buyer_name, crop_key, crop_name_te, crop_name_en, target_qty, offer_price, delivery_mandi, valid_until, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        rfqId,
        buyer.id,
        buyer.name,
        cropKey,
        cropNameTe || cropKey,
        cropNameEn || cropKey,
        Number(targetQty),
        Number(offerPrice),
        deliveryMandi,
        validUntil,
        'active'
      );

      const createdRfq = {
        id: rfqId,
        buyerId: buyer.id,
        buyerName: buyer.name,
        cropKey,
        cropNameTe: cropNameTe || cropKey,
        cropNameEn: cropNameEn || cropKey,
        targetQty: Number(targetQty),
        offerPrice: Number(offerPrice),
        deliveryMandi,
        validUntil,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      broadcastEvent('NEW_RFQ', createdRfq);
      return sendJson(res, 201, { status: 'success', rfq: createdRfq });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 11. External APIs: Market Prices
  if (method === 'GET' && pathname === '/api/market-prices') {
    const prices = await fetchMarketPrices();
    return sendJson(res, 200, prices);
  }

  // 12. External APIs: Live Weather
  if (method === 'GET' && pathname === '/api/weather') {
    const lat = Number(parsedUrl.query.lat) || 17.9689;
    const lon = Number(parsedUrl.query.lon) || 79.5941;
    const weather = await fetchWeather(lat, lon);
    return sendJson(res, 200, weather);
  }

  // 13. External APIs: Distance & Route
  if (method === 'GET' && pathname === '/api/route') {
    const originLat = Number(parsedUrl.query.originLat);
    const originLon = Number(parsedUrl.query.originLon);
    const destLat = Number(parsedUrl.query.destLat);
    const destLon = Number(parsedUrl.query.destLon);
    const route = await calculateRoute(originLat, originLon, destLat, destLon);
    return sendJson(res, 200, route);
  }

  // ---------------------------------------------------------------------------
  // STATIC FILE SERVING & ROUTE RE-WRITING
  // ---------------------------------------------------------------------------
  const rawPath = (pathname || '/').replace(/\\/g, '/').replace(/\/+/g, '/');

  // Friendly redirect for root
  if (rawPath === '' || rawPath === '/') {
    res.writeHead(302, { 'Location': '/main_portal/' });
    res.end();
    return;
  }

  // Redirect extensionless portal routes to trailing slash so relative assets resolve cleanly
  const portalShortcuts = ['/main_portal', '/farmer_portal', '/buyer_portal', '/logistics_portal'];
  if (portalShortcuts.includes(rawPath)) {
    res.writeHead(302, { 'Location': `${rawPath}/` });
    res.end();
    return;
  }

  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  // Security check: ensure path is within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    // If request is a directory, automatically look for index.html inside it
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File Not Found');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌾 KISSAN CONNECT REAL-DATA SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🔗 Main Portal:       http://localhost:${PORT}/main_portal/index.html`);
  console.log(`👨‍🌾 Farmer Portal:     http://localhost:${PORT}/farmer_portal/index.html`);
  console.log(`🏢 Buyer Portal:      http://localhost:${PORT}/buyer_portal/index.html`);
  console.log(`🚛 Logistics Portal:  http://localhost:${PORT}/logistics_portal/index.html`);
  console.log(`📡 REST API Health:   http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
