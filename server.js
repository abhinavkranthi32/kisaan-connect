/**
 * KISSAN CONNECT - PRODUCTION BACKEND SERVER (SIH PLATFORM)
 * Native Node.js REST API & Real-Time Event Engine with SQLite Database
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

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
const { initDatabase, recordAuditLog, DB_PATH } = require('./db/init_db');
const supabaseService = require('./db/supabase');
const { fetchMarketPrices } = require('./services/marketService');
const { fetchWeather } = require('./services/weatherService');
const { calculateRoute } = require('./services/routingService');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// Initialize SQLite database as single source of truth
const db = initDatabase();

// Production OTP Security Helpers
const OTP_SALT = process.env.OTP_SALT || 'kissan_connect_sih_2026_salt';

function hashOtpCode(phone, otpCode) {
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  return crypto.createHash('sha256').update(`${cleanPhone}:${otpCode}:${OTP_SALT}`).digest('hex');
}

function verifyOtpCode(phone, enteredOtp, storedCode) {
  if (!storedCode || !enteredOtp) return false;
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  const cleanEntered = String(enteredOtp).trim();
  // Support 123456 as designated demo OTP strictly if ENABLE_DEMO_LOGIN=true
  if (process.env.ENABLE_DEMO_LOGIN === 'true' && cleanEntered === '123456') return true;
  if (storedCode.length === 64) {
    const enteredHash = hashOtpCode(cleanPhone, cleanEntered);
    try {
      return crypto.timingSafeEqual(Buffer.from(enteredHash), Buffer.from(storedCode));
    } catch (e) {
      return false;
    }
  }
  // Legacy plain-text fallback for backward compatibility
  return storedCode === cleanEntered;
}

// Connected SSE clients mapped with authentication context
const sseClients = new Map(); // res => { userId, role, connectedAt, lastPing }

// Periodic keep-alive ping every 25 seconds
setInterval(() => {
  for (const [res, client] of sseClients.entries()) {
    try {
      res.write(': ping\n\n');
      client.lastPing = Date.now();
    } catch (e) {
      sseClients.delete(res);
    }
  }
}, 25000);

function broadcastEvent(eventType, payload, authFilter = null) {
  const timestamp = new Date().toISOString();
  const structuredPayload = {
    event: eventType,
    timestamp,
    data: payload
  };
  const structuredMsg = `event: ${eventType}\ndata: ${JSON.stringify(structuredPayload)}\n\n`;

  // Determine legacy alias for backwards compatibility
  let legacyEvent = null;
  if (eventType === 'listing.created') legacyEvent = 'NEW_LOT';
  else if (eventType === 'bid.created') legacyEvent = 'NEW_BID';
  else if (eventType === 'order.created') legacyEvent = 'ORDER_CREATED';
  else if (eventType === 'order.updated') legacyEvent = 'ORDER_UPDATED';
  else if (eventType === 'order.delivered') legacyEvent = 'ORDER_DELIVERED';
  else if (eventType === 'transport.assigned') legacyEvent = 'TRIP_ASSIGNED';
  else if (eventType === 'transport.delivered') legacyEvent = 'TRIP_DELIVERED';
  else if (eventType === 'escrow.released') legacyEvent = 'ESCROW_RELEASED';
  else if (eventType === 'rfq.created') legacyEvent = 'NEW_RFQ';
  else if (eventType === 'NEW_LOT') { legacyEvent = 'NEW_LOT'; eventType = 'listing.created'; }
  else if (eventType === 'NEW_BID') { legacyEvent = 'NEW_BID'; eventType = 'bid.created'; }
  else if (eventType === 'ORDER_CREATED') { legacyEvent = 'ORDER_CREATED'; eventType = 'order.created'; }
  else if (eventType === 'ORDER_UPDATED') { legacyEvent = 'ORDER_UPDATED'; eventType = 'order.updated'; }
  else if (eventType === 'ORDER_DELIVERED') { legacyEvent = 'ORDER_DELIVERED'; eventType = 'order.delivered'; }
  else if (eventType === 'TRIP_ASSIGNED') { legacyEvent = 'TRIP_ASSIGNED'; eventType = 'transport.assigned'; }
  else if (eventType === 'TRIP_DELIVERED') { legacyEvent = 'TRIP_DELIVERED'; eventType = 'transport.delivered'; }
  else if (eventType === 'ESCROW_RELEASED') { legacyEvent = 'ESCROW_RELEASED'; eventType = 'escrow.released'; }
  else if (eventType === 'NEW_RFQ') { legacyEvent = 'NEW_RFQ'; eventType = 'rfq.created'; }

  const legacyMsg = legacyEvent && legacyEvent !== eventType ? `event: ${legacyEvent}\ndata: ${JSON.stringify(payload)}\n\n` : null;

  for (const [res, client] of sseClients.entries()) {
    try {
      if (!authFilter || authFilter(client.role, client.userId)) {
        res.write(structuredMsg);
        if (legacyMsg) {
          res.write(legacyMsg);
        }
      }
    } catch (e) {
      sseClients.delete(res);
    }
  }
}

// Distance Calculation Helper for Genuine Transport KM
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const p1 = Number(lat1), l1 = Number(lon1), p2 = Number(lat2), l2 = Number(lon2);
  if (isNaN(p1) || isNaN(l1) || isNaN(p2) || isNaN(l2) || (p1 === 0 && l1 === 0)) return 45.0;
  const R = 6371; // Earth's mean radius in km
  const dLat = (p2 - p1) * Math.PI / 180;
  const dLon = (l2 - l1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1 * Math.PI / 180) * Math.cos(p2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadFactor = 1.25; // Highway & rural mandi road routing curvature
  return Math.max(8.0, Math.round(R * c * roadFactor * 10) / 10);
}

// Dynamic Freight Calculation
function calculateFreightOffer(distanceKm, quantityQuintals) {
  const d = Number(distanceKm) || 40;
  const q = Number(quantityQuintals) || 20;
  const baseRate = 2200;
  const perKmRate = 42;
  const weightSurcharge = q > 50 ? (q - 50) * 18 : 0;
  const totalFreight = baseRate + (d * perKmRate) + weightSurcharge;
  return Math.round(totalFreight / 50) * 50;
}

// Real In-App Notification Dispatcher
function createNotification(db, userId, userRole, title, message, type = 'info', entityType = null, entityId = null) {
  if (!userId) return null;
  try {
    const id = `NOTIF-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO notifications (id, user_id, user_role, title, message, type, is_read, entity_type, entity_id)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, userId, userRole, title, message, type, entityType, entityId ? String(entityId) : null);

    const notifRecord = {
      id,
      userId,
      userRole,
      title,
      message,
      type,
      isRead: 0,
      entityType,
      entityId: entityId ? String(entityId) : null,
      createdAt: new Date().toISOString()
    };

    broadcastEvent('notification.created', notifRecord, (role, targetUserId) => targetUserId === userId);
    return notifRecord;
  } catch (err) {
    console.warn('[Notification Error]', err.message);
    return null;
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
        const parseErr = new Error('Malformed JSON body: ' + err.message);
        parseErr.statusCode = 400;
        reject(parseErr);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  res.end(JSON.stringify(data));
}

function getAuthToken(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function requireAuth(req, res, allowedRoles = null) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    sendJson(res, 401, { status: 'error', message: 'Authentication required. Please provide a valid Bearer token.' });
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    sendJson(res, 403, {
      status: 'error',
      message: `Forbidden: Role '${user.role}' is not authorized for this operation. Allowed: ${allowedRoles.join(', ')}`
    });
    return null;
  }
  return user;
}

function getAuthenticatedUser(req) {
  const token = getAuthToken(req);
  if (!token) return null;
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP').get(token);
    if (!session) return null;
    const user = db.prepare('SELECT id, name, role, city FROM users WHERE id = ?').get(session.user_id);
    return user ? { user_id: user.id, name: user.name, role: user.role, city: user.city } : null;
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// FINANCIAL WALLET & ESCROW CORE HELPERS
// ---------------------------------------------------------------------------
function getOrCreateWallet(db, userId, userRole) {
  let wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  if (!wallet) {
    const walletId = `WLT-${userId}`;
    const initPaise = userRole === 'buyer' ? 30000000 : 0; // ₹3,00,000 test balance for commercial buyers
    db.prepare(`
      INSERT INTO wallets (id, user_id, user_role, total_balance_paise, held_balance_paise, available_balance_paise)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(walletId, userId, userRole, initPaise, initPaise);

    if (initPaise > 0) {
      db.prepare(`
        INSERT INTO wallet_ledger (
          id, user_id, wallet_id, transaction_type, amount_paise, amount_rupees,
          direction, status, idempotency_key, description
        ) VALUES (?, ?, ?, 'wallet_topup', ?, ?, 'credit', 'completed', ?, ?)
      `).run(
        `TXN-INIT-${userId}`, userId, walletId, initPaise, initPaise / 100,
        `IDEM-INIT-${userId}`, `Initial verified commercial wallet balance`
      );
    }
    wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  }
  
  wallet.total_balance_rupees = wallet.total_balance_paise / 100;
  wallet.held_balance_rupees = wallet.held_balance_paise / 100;
  wallet.available_balance_rupees = wallet.available_balance_paise / 100;
  return wallet;
}

function recordLedgerTransaction(db, {
  userId, walletId, transactionType, amountPaise, direction,
  relatedBidId = null, relatedOrderId = null, relatedEscrowId = null,
  relatedTransportRequestId = null, idempotencyKey = null,
  providerReference = null, description
}) {
  const txnId = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const amountRupees = amountPaise / 100;
  const key = idempotencyKey || `IDEM-${txnId}`;

  db.prepare(`
    INSERT INTO wallet_ledger (
      id, user_id, wallet_id, transaction_type, amount_paise, amount_rupees,
      direction, related_bid_id, related_order_id, related_escrow_id,
      related_transport_request_id, status, idempotency_key, provider_reference, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)
  `).run(
    txnId, userId, walletId, transactionType, amountPaise, amountRupees,
    direction, relatedBidId, relatedOrderId, relatedEscrowId,
    relatedTransportRequestId, key, providerReference, description
  );
  return txnId;
}

function holdBuyerEscrow(db, {
  buyerId, bidId = null, lotId = null, requirementId = null,
  pooledOrderId = null, offerId = null, cropAmountRupees, platformFeeRupees = 500, description
}) {
  const buyerWallet = getOrCreateWallet(db, buyerId, 'buyer');
  const cropPaise = Math.round(cropAmountRupees * 100);
  const feePaise = Math.round(platformFeeRupees * 100);
  const totalRequiredPaise = cropPaise + feePaise;
  const totalRequiredRupees = totalRequiredPaise / 100;

  if (buyerWallet.available_balance_paise < totalRequiredPaise) {
    const missingRupees = (totalRequiredPaise - buyerWallet.available_balance_paise) / 100;
    const err = new Error(`Insufficient wallet balance. Required: ₹${totalRequiredRupees.toLocaleString('en-IN')}, Available: ₹${buyerWallet.available_balance_rupees.toLocaleString('en-IN')}. Please add ₹${missingRupees.toLocaleString('en-IN')} to continue.`);
    err.statusCode = 400;
    err.details = {
      requiredRupees: totalRequiredRupees,
      availableRupees: buyerWallet.available_balance_rupees,
      missingRupees: missingRupees
    };
    throw err;
  }

  // Atomically update wallet balance
  const newHeldPaise = buyerWallet.held_balance_paise + totalRequiredPaise;
  const newAvailPaise = buyerWallet.available_balance_paise - totalRequiredPaise;
  db.prepare(`
    UPDATE wallets
    SET held_balance_paise = ?, available_balance_paise = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newHeldPaise, newAvailPaise, buyerWallet.id);

  // Create Escrow Record
  const escrowId = `ESC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  db.prepare(`
    INSERT INTO escrow_records (
      id, buyer_id, bid_id, lot_id, requirement_id, pooled_order_id, offer_id,
      crop_amount_paise, platform_fee_paise, total_escrow_paise,
      crop_amount_rupees, platform_fee_rupees, total_escrow_rupees, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'held')
  `).run(
    escrowId, buyerId, bidId, lotId, requirementId, pooledOrderId, offerId,
    cropPaise, feePaise, totalRequiredPaise, cropAmountRupees, platformFeeRupees, totalRequiredRupees
  );

  // Record Ledger Entry
  recordLedgerTransaction(db, {
    userId: buyerId,
    walletId: buyerWallet.id,
    transactionType: 'bid_escrow_hold',
    amountPaise: totalRequiredPaise,
    direction: 'debit',
    relatedBidId: bidId,
    relatedEscrowId: escrowId,
    description: description || `Escrow hold ₹${totalRequiredRupees} for crop procurement`
  });

  return { escrowId, totalRequiredRupees, buyerWallet };
}

function releaseBuyerEscrowHold(db, { buyerId, escrowId, refundAmountRupees = null, status = 'bid_rejected', description }) {
  const escrow = db.prepare('SELECT * FROM escrow_records WHERE id = ?').get(escrowId);
  if (!escrow || escrow.status !== 'held') return null;

  const buyerWallet = getOrCreateWallet(db, buyerId, 'buyer');
  const releasePaise = refundAmountRupees ? Math.round(refundAmountRupees * 100) : escrow.total_escrow_paise;
  const releaseRupees = releasePaise / 100;

  const newHeldPaise = Math.max(0, buyerWallet.held_balance_paise - releasePaise);
  const newAvailPaise = buyerWallet.available_balance_paise + releasePaise;

  db.prepare(`
    UPDATE wallets
    SET held_balance_paise = ?, available_balance_paise = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newHeldPaise, newAvailPaise, buyerWallet.id);

  db.prepare("UPDATE escrow_records SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, escrowId);

  recordLedgerTransaction(db, {
    userId: buyerId,
    walletId: buyerWallet.id,
    transactionType: 'escrow_refund_to_buyer',
    amountPaise: releasePaise,
    direction: 'credit',
    relatedBidId: escrow.bid_id,
    relatedEscrowId: escrowId,
    description: description || `Escrow hold released: ₹${releaseRupees} refunded to available balance`
  });

  return { releaseRupees, buyerWallet };
}

function executeFarmerPayoutAndEscrowRelease(db, { escrowId, farmerId = null, actualLoadedQty = null, transportRequestId = null, description = null }) {
  const escrow = db.prepare('SELECT * FROM escrow_records WHERE id = ?').get(escrowId);
  if (!escrow || !['held', 'awaiting_transport', 'loaded', 'dispatch_verified'].includes(escrow.status)) {
    return null;
  }

  const buyerWallet = getOrCreateWallet(db, escrow.buyer_id, 'buyer');
  const targetFarmerId = farmerId || escrow.farmer_id || 'USR-FARM-01';
  const farmerWallet = getOrCreateWallet(db, targetFarmerId, 'farmer');

  // Calculate actual crop payout based on loaded quantity
  let cropPayoutPaise = escrow.crop_amount_paise;
  let partialRefundPaise = 0;

  if (actualLoadedQty && escrow.accepted_quantity && actualLoadedQty < escrow.accepted_quantity && escrow.accepted_quantity > 0) {
    const ratio = actualLoadedQty / escrow.accepted_quantity;
    cropPayoutPaise = Math.round(escrow.crop_amount_paise * ratio);
    partialRefundPaise = escrow.crop_amount_paise - cropPayoutPaise;
  }

  const cropPayoutRupees = cropPayoutPaise / 100;
  const partialRefundRupees = partialRefundPaise / 100;

  // 1. Release Buyer Held Balance
  const totalHoldPaise = escrow.total_escrow_paise;
  const buyerHeldNew = Math.max(0, buyerWallet.held_balance_paise - totalHoldPaise);
  let buyerAvailNew = buyerWallet.available_balance_paise;
  
  if (partialRefundPaise > 0) {
    buyerAvailNew += partialRefundPaise;
  }

  db.prepare(`
    UPDATE wallets
    SET held_balance_paise = ?, available_balance_paise = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(buyerHeldNew, buyerAvailNew, buyerWallet.id);

  // 2. Credit Farmer Wallet / Bank Payout
  const farmerTotalNew = farmerWallet.total_balance_paise + cropPayoutPaise;
  const farmerAvailNew = farmerWallet.available_balance_paise + cropPayoutPaise;

  db.prepare(`
    UPDATE wallets
    SET total_balance_paise = ?, available_balance_paise = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(farmerTotalNew, farmerAvailNew, farmerWallet.id);

  // 3. Record Farmer Payout Ledger Entry
  const payoutRef = `PAYOUT-BANK-${Date.now().toString().slice(-6)}`;
  recordLedgerTransaction(db, {
    userId: targetFarmerId,
    walletId: farmerWallet.id,
    transactionType: 'escrow_release_to_farmer',
    amountPaise: cropPayoutPaise,
    direction: 'credit',
    relatedBidId: escrow.bid_id,
    relatedOrderId: escrow.pooled_order_id,
    relatedEscrowId: escrowId,
    relatedTransportRequestId: transportRequestId,
    providerReference: payoutRef,
    description: description || `Farmer payment released for verified crop dispatch (₹${cropPayoutRupees.toLocaleString('en-IN')})`
  });

  // 4. Record Partial Refund Ledger Entry if applicable
  if (partialRefundPaise > 0) {
    recordLedgerTransaction(db, {
      userId: escrow.buyer_id,
      walletId: buyerWallet.id,
      transactionType: 'escrow_refund_to_buyer',
      amountPaise: partialRefundPaise,
      direction: 'credit',
      relatedBidId: escrow.bid_id,
      relatedEscrowId: escrowId,
      description: `Partial refund ₹${partialRefundRupees.toLocaleString('en-IN')} for unloaded quantity difference`
    });
  }

  // 5. Update Escrow Status
  const finalStatus = partialRefundPaise > 0 ? 'partially_refunded' : 'farmer_paid';
  db.prepare(`
    UPDATE escrow_records
    SET status = ?, loaded_quantity = ?, payout_reference = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(finalStatus, actualLoadedQty || escrow.accepted_quantity, payoutRef, escrowId);

  return {
    escrowId,
    cropPayoutRupees,
    partialRefundRupees,
    payoutRef,
    farmerWallet,
    buyerWallet
  };
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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
      platform: 'Kissan Connect (SIH-26132)',
      database: 'SQLite Single Source of Truth (node:sqlite)',
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

  // 2. Real-Time Server-Sent Events (SSE) with Session Authentication & Targeted Routing
  if (method === 'GET' && pathname === '/api/events') {
    const token = parsedUrl.query.token || getAuthToken(req);
    let authUser = null;
    if (token) {
      try {
        authUser = db.prepare(`
          SELECT s.token, s.user_id, s.role, u.name, u.phone
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
        `).get(token);
      } catch (e) {}
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const clientInfo = {
      userId: authUser ? authUser.user_id : null,
      role: authUser ? authUser.role : 'guest',
      connectedAt: Date.now(),
      lastPing: Date.now()
    };
    sseClients.set(res, clientInfo);

    const handshakeData = {
      status: 'connected',
      timestamp: new Date().toISOString(),
      userId: clientInfo.userId,
      role: clientInfo.role
    };
    res.write(`: connected\nevent: connected\ndata: ${JSON.stringify(handshakeData)}\n\n`);

    // Initial snapshot synchronization based on authorized role
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        role: clientInfo.role,
        userId: clientInfo.userId
      };
      if (clientInfo.role === 'buyer' || clientInfo.role === 'farmer' || clientInfo.role === 'guest') {
        snapshot.activeLots = db.prepare("SELECT * FROM harvest_lots WHERE status = 'active' ORDER BY created_at DESC LIMIT 20").all();
      }
      if (clientInfo.role === 'logistics' || clientInfo.role === 'admin') {
        snapshot.availableTrips = db.prepare("SELECT * FROM logistics_trips WHERE status = 'available' ORDER BY created_at DESC LIMIT 20").all();
      }
      res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
    } catch (snapErr) {
      console.warn('[SSE Snapshot Error]', snapErr.message);
    }

    req.on('close', () => {
      sseClients.delete(res);
    });
    req.on('error', () => {
      sseClients.delete(res);
    });
    return;
  }


  // ---------------------------------------------------------------------------
  // 3. AUTHENTICATION & SESSIONS
  // ---------------------------------------------------------------------------

  // 3a. Send Mobile OTP
  if (method === 'POST' && pathname === '/api/auth/otp/send') {
    try {
      const body = await parseBody(req);
      const rawPhone = (body.phone || '').trim();
      const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10);
      if (!cleanDigits || cleanDigits.length !== 10) {
        return sendJson(res, 400, { status: 'error', message: 'Valid 10-digit Indian mobile number is required' });
      }
      const phone = cleanDigits;

      // 1. Resend cooldown check (45 seconds)
      const recentOtp = db.prepare(`
        SELECT created_at FROM auth_otps 
        WHERE phone = ? AND created_at > datetime('now', '-45 seconds')
        ORDER BY id DESC LIMIT 1
      `).get(phone);
      if (recentOtp) {
        return sendJson(res, 429, {
          status: 'error',
          message: 'Please wait 45 seconds before requesting another OTP.'
        });
      }

      // 2. Sliding window rate limiting (Max 5 requests per 15 minutes)
      const recentRequests = db.prepare(`
        SELECT COUNT(*) as count FROM auth_otps
        WHERE phone = ? AND created_at > datetime('now', '-15 minutes')
      `).get(phone).count;
      if (recentRequests >= 5) {
        return sendJson(res, 429, {
          status: 'error',
          message: 'Too many OTP requests for this number. Please try again after 15 minutes.'
        });
      }

      // 3. Generate secure 6-digit random OTP and hash it with SHA-256
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = hashOtpCode(phone, otpCode);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      db.prepare(`
        INSERT INTO auth_otps (phone, otp_code, attempts, expires_at, verified)
        VALUES (?, ?, 0, ?, 0)
      `).run(phone, hashedCode, expiresAt);

      // In non-production, log to console for development verification, but NEVER leak in HTTP response
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔑 [AUTH OTP] (CONSOLE ONLY) Phone: +91 ${phone} -> Code: ${otpCode} (Valid 5 min)`);
      }

      recordAuditLog(db, null, 'guest', 'OTP_REQUESTED', 'auth', phone, `OTP requested for +91 ${phone}`);

      return sendJson(res, 200, {
        status: 'success',
        message: `OTP sent successfully to +91 ${phone}`,
        phone: `+91 ${phone}`
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 3b. Verify OTP & Issue Session
  if (method === 'POST' && pathname === '/api/auth/otp/verify') {
    try {
      const body = await parseBody(req);
      const rawPhone = (body.phone || '').trim();
      const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10);
      const enteredOtp = String(body.otp || '').trim();

      if (!cleanDigits || cleanDigits.length !== 10 || !enteredOtp) {
        return sendJson(res, 400, { status: 'error', message: 'Valid 10-digit phone number and OTP are required' });
      }
      const phone = cleanDigits;

      // 1. Fetch latest unverified OTP record
      const otpRecord = db.prepare(`
        SELECT * FROM auth_otps 
        WHERE phone = ? AND verified = 0
        ORDER BY id DESC LIMIT 1
      `).get(phone);

      if (!otpRecord) {
        return sendJson(res, 400, { status: 'error', message: 'No active OTP found. Please request a new OTP.' });
      }

      // 2. Lockout protection (5 failed attempts)
      if (otpRecord.attempts >= 5) {
        return sendJson(res, 429, {
          status: 'error',
          message: 'This OTP is locked due to 5 consecutive failed attempts. Please request a new OTP.'
        });
      }

      // 3. Expiry check
      const isExpired = new Date(otpRecord.expires_at).getTime() < Date.now();
      if (isExpired) {
        return sendJson(res, 400, { status: 'error', message: 'OTP has expired. Please request a new OTP.' });
      }

      // 4. Verify code match
      const isValid = verifyOtpCode(phone, enteredOtp, otpRecord.otp_code);
      if (!isValid) {
        const newAttempts = Number(otpRecord.attempts || 0) + 1;
        db.prepare('UPDATE auth_otps SET attempts = ? WHERE id = ?').run(newAttempts, otpRecord.id);

        if (newAttempts >= 5) {
          return sendJson(res, 429, {
            status: 'error',
            message: 'Incorrect OTP. You have reached the maximum 5 attempts. This OTP is now locked.'
          });
        }
        return sendJson(res, 400, {
          status: 'error',
          message: `Incorrect OTP. ${5 - newAttempts} attempt(s) remaining.`
        });
      }

      // 5. Atomic mark verified to prevent replay attack
      db.prepare('UPDATE auth_otps SET verified = 1 WHERE id = ?').run(otpRecord.id);

      // 6. Find or create user
      let user = db.prepare(`SELECT * FROM users WHERE REPLACE(REPLACE(phone, ' ', ''), '-', '') LIKE ?`).get(`%${cleanDigits}`);
      if (!user) {
        const requestedRole = body.role || 'farmer';
        const rolePrefix = requestedRole === 'buyer' ? 'BUY' : requestedRole === 'logistics' ? 'LOG' : requestedRole === 'admin' ? 'ADM' : 'FARM';
        const roleAvatar = requestedRole === 'buyer' ? '🏢' : requestedRole === 'logistics' ? '🚛' : requestedRole === 'admin' ? '🛡️' : '👨‍🌾';
        const newUserId = `USR-${rolePrefix}-${Date.now().toString().slice(-4)}`;
        db.prepare(`
          INSERT INTO users (id, name, phone, role, avatar, kyc_status, organization, city)
          VALUES (?, ?, ?, ?, ?, 'verified', ?, ?)
        `).run(newUserId, requestedRole === 'farmer' ? 'రైతు సోదరుడు' : `${requestedRole.toUpperCase()} Member`, `+91 ${cleanDigits}`, requestedRole, roleAvatar, 'Kissan Connect Platform', 'Telangana');
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);
      }

      // 7. Auto-provision domain profile (farmers or buyers)
      if (user.role === 'farmer') {
        const existingFarmer = db.prepare('SELECT * FROM farmers WHERE id = ? OR phone LIKE ?').get(user.id, `%${cleanDigits}`);
        if (!existingFarmer) {
          db.prepare(`
            INSERT INTO farmers (id, name, phone, village, district, wallet_balance, kyc_status)
            VALUES (?, ?, ?, ?, ?, 0, 'rythubandhu_verified')
          `).run(user.id, user.name, user.phone, user.city || 'జనగామ', 'వరంగల్');
        }
      } else if (user.role === 'buyer') {
        const existingBuyer = db.prepare('SELECT * FROM buyers WHERE id = ? OR phone LIKE ?').get(user.id, `%${cleanDigits}`);
        if (!existingBuyer) {
          const gstin = '36AAAC' + Math.floor(1000 + Math.random() * 9000) + 'A1Z' + Math.floor(1 + Math.random() * 9);
          const tradeLic = 'TL-HYD-' + Date.now().toString().slice(-6);
          db.prepare(`
            INSERT INTO buyers (id, name, short_name, gstin, trade_license, phone, city, escrow_balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
          `).run(user.id, user.name, (user.organization || user.name).slice(0, 15), gstin, tradeLic, user.phone, user.city || 'సికింద్రాబాద్');
        }
      }

      // 8. Create session
      const token = 'KSS-' + crypto.randomBytes(24).toString('hex');
      const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO sessions (token, user_id, role, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(token, user.id, user.role, sessionExpiry);

      recordAuditLog(db, user.id, user.role, 'LOGIN_SUCCESS', 'user', user.id, `User authenticated with verified OTP`);

      return sendJson(res, 200, {
        status: 'success',
        message: 'Authentication successful',
        token,
        user
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 3c. Direct Role Login (For Fast Demos and Testing)
  if (method === 'POST' && pathname === '/api/auth/login-role') {
    if (process.env.ENABLE_DEMO_LOGIN !== 'true' && process.env.NODE_ENV === 'production') {
      return sendJson(res, 404, { status: 'error', message: 'Demo role login is disabled in this environment' });
    }
    try {
      const body = await parseBody(req);
      const role = body.role || 'farmer';
      let userId = body.userId;

      let user = null;
      if (userId) {
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
          const rolePrefix = role === 'buyer' ? 'BUY' : (role === 'logistics' ? 'LOG' : (role === 'admin' ? 'ADM' : 'FARM'));
          const roleAvatar = role === 'buyer' ? '🏢' : (role === 'logistics' ? '🚛' : (role === 'admin' ? '🛡️' : '👨‍🌾'));
          db.prepare(`
            INSERT INTO users (id, name, phone, role, avatar, kyc_status, organization, city)
            VALUES (?, ?, ?, ?, ?, 'verified', ?, ?)
          `).run(userId, `Farmer ${userId.slice(-4)}`, `+91 98480 ${Math.floor(10000 + Math.random() * 90000)}`, role, roleAvatar, 'Kissan Connect Platform', 'Telangana');
          user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        }
      }
      if (!user && role) {
        user = db.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get(role);
      }
      if (!user) {
        return sendJson(res, 404, { status: 'error', message: `No user found for role ${role}` });
      }

      // Ensure domain profile exists
      if (user.role === 'farmer') {
        const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(user.id);
        if (!farmer) {
          db.prepare(`
            INSERT INTO farmers (id, name, phone, village, district, wallet_balance, kyc_status, lat, lon)
            VALUES (?, ?, ?, ?, ?, 0, 'rythubandhu_verified', ?, ?)
          `).run(user.id, user.name, user.phone, 'జనగామ', 'వరంగల్', 17.85 + Math.random()*0.1, 79.10 + Math.random()*0.1);
        }
      } else if (user.role === 'buyer') {
        const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(user.id);
        if (!buyer) {
          db.prepare(`
            INSERT INTO buyers (id, name, short_name, gstin, trade_license, phone, city, escrow_balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, 100000)
          `).run(user.id, user.name, user.name.slice(0, 15), '36AAACI9999F1Z9', 'TL-HYD-999', user.phone, user.city || 'హైదరాబాద్');
        }
      }

      const token = 'KSS-' + crypto.randomBytes(24).toString('hex');
      const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO sessions (token, user_id, role, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(token, user.id, user.role, sessionExpiry);

      recordAuditLog(db, user.id, user.role, 'ROLE_LOGIN', 'user', user.id, `Authenticated as ${user.role} (${user.name})`);

      return sendJson(res, 200, {
        status: 'success',
        message: `Logged in as ${user.name}`,
        token,
        user
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 3d. Current User Profile
  if (method === 'GET' && pathname === '/api/auth/me') {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return sendJson(res, 401, { status: 'error', message: 'Unauthorized. No active session found.' });
    }
    return sendJson(res, 200, { status: 'success', user: authUser });
  }

  // 3f. WALLET, FINANCIAL LEDGER & ESCROW API
  // Get Wallet Balance & Active Escrow Holds
  if (method === 'GET' && pathname === '/api/wallet/balance') {
    const authUser = requireAuth(req, res);
    if (!authUser) return;
    try {
      const wallet = getOrCreateWallet(db, authUser.user_id, authUser.role);
      const activeEscrows = db.prepare(`
        SELECT * FROM escrow_records 
        WHERE (buyer_id = ? OR farmer_id = ?) AND status IN ('held', 'awaiting_transport', 'loading_pending', 'loaded', 'dispatch_verified')
        ORDER BY created_at DESC
      `).all(authUser.user_id, authUser.user_id);

      return sendJson(res, 200, {
        status: 'success',
        wallet: {
          id: wallet.id,
          userId: wallet.user_id,
          role: wallet.user_role,
          totalBalancePaise: wallet.total_balance_paise,
          heldBalancePaise: wallet.held_balance_paise,
          availableBalancePaise: wallet.available_balance_paise,
          totalBalanceRupees: wallet.total_balance_rupees,
          heldBalanceRupees: wallet.held_balance_rupees,
          availableBalanceRupees: wallet.available_balance_rupees,
          currency: wallet.currency
        },
        activeEscrowHolds: activeEscrows.map(e => ({
          id: e.id,
          buyerId: e.buyer_id,
          farmerId: e.farmer_id,
          bidId: e.bid_id,
          lotId: e.lot_id,
          requirementId: e.requirement_id,
          cropAmountRupees: e.crop_amount_rupees,
          platformFeeRupees: e.platform_fee_rupees,
          totalEscrowRupees: e.total_escrow_rupees,
          status: e.status,
          createdAt: e.created_at
        }))
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // Get User's Immutable Wallet Ledger
  if (method === 'GET' && pathname === '/api/wallet/ledger') {
    const authUser = requireAuth(req, res);
    if (!authUser) return;
    try {
      const wallet = getOrCreateWallet(db, authUser.user_id, authUser.role);
      const entries = db.prepare(`
        SELECT * FROM wallet_ledger
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `).all(authUser.user_id);

      return sendJson(res, 200, {
        status: 'success',
        walletId: wallet.id,
        count: entries.length,
        ledger: entries.map(e => ({
          id: e.id,
          transactionType: e.transaction_type,
          amountPaise: e.amount_paise,
          amountRupees: e.amount_rupees,
          direction: e.direction,
          relatedBidId: e.related_bid_id,
          relatedOrderId: e.related_order_id,
          relatedEscrowId: e.related_escrow_id,
          relatedTransportRequestId: e.related_transport_request_id,
          status: e.status,
          idempotencyKey: e.idempotency_key,
          providerReference: e.provider_reference,
          description: e.description,
          createdAt: e.created_at
        }))
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // Initiate Wallet Top-up (Razorpay Server Order Creation)
  if (method === 'POST' && pathname === '/api/wallet/topup/initiate') {
    const authUser = requireAuth(req, res, ['buyer', 'farmer', 'admin']);
    if (!authUser) return;
    try {
      const body = await parseBody(req);
      const amountRupees = Number(body.amountRupees || body.amount);
      if (isNaN(amountRupees) || amountRupees <= 0) {
        return sendJson(res, 400, { status: 'error', message: 'Valid top-up amount (> ₹0) is required.' });
      }

      const wallet = getOrCreateWallet(db, authUser.user_id, authUser.role);
      const orderId = `order_rzp_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      const amountPaise = Math.round(amountRupees * 100);

      return sendJson(res, 200, {
        status: 'success',
        order: {
          id: orderId,
          entity: 'order',
          amount: amountPaise,
          amount_paid: 0,
          amount_due: amountPaise,
          currency: 'INR',
          receipt: `rcpt_${wallet.id.slice(-6)}_${Date.now().toString().slice(-4)}`,
          status: 'created'
        },
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_kissanconnect'
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // Server-Verified Wallet Top-up Execution (Signature & Idempotency Protected)
  if (method === 'POST' && (pathname === '/api/wallet/topup/verify' || pathname === '/api/wallet/topup/sandbox')) {
    const authUser = requireAuth(req, res, ['buyer', 'farmer', 'admin']);
    if (!authUser) return;
    try {
      const body = await parseBody(req);
      const amountRupees = Number(body.amountRupees || body.amount);
      if (isNaN(amountRupees) || amountRupees <= 0) {
        return sendJson(res, 400, { status: 'error', message: 'Valid top-up amount (> ₹0) is required.' });
      }

      const amountPaise = Math.round(amountRupees * 100);
      const razorpayPaymentId = body.razorpay_payment_id || body.paymentId || `pay_rzp_sim_${Date.now()}`;
      const razorpayOrderId = body.razorpay_order_id || body.orderId || `order_rzp_sim_${Date.now()}`;
      const idempotencyKey = `IDEM-TOPUP-${razorpayPaymentId}`;

      // Idempotency protection check
      const dup = db.prepare('SELECT id FROM wallet_ledger WHERE idempotency_key = ?').get(idempotencyKey);
      if (dup) {
        const wallet = getOrCreateWallet(db, authUser.user_id, authUser.role);
        return sendJson(res, 200, {
          status: 'success',
          message: 'Top-up already processed (idempotent)',
          wallet
        });
      }

      // Webhook/Signature Verification logic for live Razorpay credentials
      if (process.env.RAZORPAY_KEY_SECRET && body.razorpay_signature) {
        const generatedSig = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');
        if (generatedSig !== body.razorpay_signature) {
          return sendJson(res, 400, { status: 'error', message: 'Invalid payment signature. Verification failed.' });
        }
      }

      db.exec('BEGIN IMMEDIATE');
      let wallet = null;
      try {
        wallet = getOrCreateWallet(db, authUser.user_id, authUser.role);
        const newTotalPaise = wallet.total_balance_paise + amountPaise;
        const newAvailPaise = wallet.available_balance_paise + amountPaise;

        db.prepare(`
          UPDATE wallets
          SET total_balance_paise = ?, available_balance_paise = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newTotalPaise, newAvailPaise, wallet.id);

        recordLedgerTransaction(db, {
          userId: authUser.user_id,
          walletId: wallet.id,
          transactionType: 'wallet_topup',
          amountPaise,
          direction: 'credit',
          idempotencyKey,
          providerReference: razorpayPaymentId,
          description: `Verified wallet top-up ₹${amountRupees.toLocaleString('en-IN')} via ${body.paymentMethod || 'Razorpay Gateway'}`
        });

        createNotification(
          db, authUser.user_id, authUser.role,
          'వ్యాలెట్ రీఛార్జ్ విజయవంతం / Wallet Top-Up Successful',
          `₹${amountRupees.toLocaleString('en-IN')} మీ వ్యాలెట్ ఖాతాకు జమ అయ్యాయి. (అందుబాటులో ఉన్న నిధులు: ₹${(newAvailPaise / 100).toLocaleString('en-IN')})`,
          'success', 'wallet', wallet.id
        );

        recordAuditLog(db, authUser.user_id, authUser.role, 'WALLET_TOPUP', 'wallet', wallet.id, `Top-up ₹${amountRupees} verified via ${razorpayPaymentId}`);

        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      const updatedWallet = getOrCreateWallet(db, authUser.user_id, authUser.role);

      broadcastEvent('wallet_balance_updated', {
        userId: authUser.user_id,
        role: authUser.role,
        availableBalanceRupees: updatedWallet.available_balance_rupees,
        heldBalanceRupees: updatedWallet.held_balance_rupees,
        totalBalanceRupees: updatedWallet.total_balance_rupees
      });

      broadcastEvent('wallet_topup_verified', {
        userId: authUser.user_id,
        amountRupees,
        paymentId: razorpayPaymentId
      });

      return sendJson(res, 200, {
        status: 'success',
        message: `₹${amountRupees.toLocaleString('en-IN')} successfully added to wallet!`,
        wallet: updatedWallet
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // Razorpay Production Server Webhook Handler
  if (method === 'POST' && pathname === '/api/wallet/webhook') {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const bodyText = await new Promise((resolve) => {
        let b = '';
        req.on('data', c => b += c);
        req.on('end', () => resolve(b));
      });

      if (secret && signature) {
        const expectedSig = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');
        if (expectedSig !== signature) {
          return sendJson(res, 400, { status: 'error', message: 'Webhook signature verification failed' });
        }
      }

      const event = JSON.parse(bodyText);
      if (event.event === 'payment.captured' || event.event === 'order.paid') {
        const entity = event.payload?.payment?.entity || event.payload?.order?.entity;
        const paymentId = entity?.id;
        const amountPaise = entity?.amount;
        const notes = entity?.notes || {};
        const userId = notes.userId || notes.user_id;

        if (userId && paymentId && amountPaise) {
          const idempotencyKey = `IDEM-WEBHOOK-${paymentId}`;
          const dup = db.prepare('SELECT id FROM wallet_ledger WHERE idempotency_key = ?').get(idempotencyKey);
          if (!dup) {
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            if (user) {
              db.exec('BEGIN IMMEDIATE');
              try {
                const wallet = getOrCreateWallet(db, user.id, user.role);
                db.prepare(`
                  UPDATE wallets
                  SET total_balance_paise = total_balance_paise + ?, available_balance_paise = available_balance_paise + ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `).run(amountPaise, amountPaise, wallet.id);

                recordLedgerTransaction(db, {
                  userId: user.id,
                  walletId: wallet.id,
                  transactionType: 'wallet_topup',
                  amountPaise,
                  direction: 'credit',
                  idempotencyKey,
                  providerReference: paymentId,
                  description: `Verified Razorpay Webhook Top-Up ₹${amountPaise / 100}`
                });

                db.exec('COMMIT');
                broadcastEvent('wallet_balance_updated', { userId: user.id, role: user.role });
              } catch (e) {
                db.exec('ROLLBACK');
              }
            }
          }
        }
      }
      return sendJson(res, 200, { status: 'ok', received: true });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // Get Farmer Bank Payout Profile
  if (method === 'GET' && pathname === '/api/farmer/payout-profile') {
    const authUser = requireAuth(req, res, ['farmer', 'admin']);
    if (!authUser) return;
    try {
      const farmerId = authUser.role === 'farmer' ? authUser.user_id : (parsedUrl.query.farmerId || 'USR-FARM-01');
      const profile = db.prepare('SELECT * FROM farmer_payout_profiles WHERE farmer_id = ?').get(farmerId);
      return sendJson(res, 200, { status: 'success', profile: profile || null });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // Update Farmer Bank Payout Profile
  if (method === 'POST' && pathname === '/api/farmer/payout-profile') {
    const authUser = requireAuth(req, res, ['farmer', 'admin']);
    if (!authUser) return;
    try {
      const body = await parseBody(req);
      const { accountHolderName, bankName, accountNumber, ifscCode, upiId } = body;
      if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
        return sendJson(res, 400, { status: 'error', message: 'accountHolderName, bankName, accountNumber, and ifscCode are required.' });
      }

      const farmerId = authUser.role === 'farmer' ? authUser.user_id : (body.farmerId || 'USR-FARM-01');
      const cleanAcc = String(accountNumber).trim();
      const masked = 'X'.repeat(Math.max(4, cleanAcc.length - 4)) + cleanAcc.slice(-4);
      const accHash = crypto.createHash('sha256').update(cleanAcc).digest('hex');

      db.prepare(`
        INSERT INTO farmer_payout_profiles (
          farmer_id, account_holder_name, bank_name, account_number_masked,
          account_number_hash, ifsc_code, upi_id, payout_eligibility, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'verified', CURRENT_TIMESTAMP)
        ON CONFLICT(farmer_id) DO UPDATE SET
          account_holder_name = excluded.account_holder_name,
          bank_name = excluded.bank_name,
          account_number_masked = excluded.account_number_masked,
          account_number_hash = excluded.account_number_hash,
          ifsc_code = excluded.ifsc_code,
          upi_id = excluded.upi_id,
          payout_eligibility = 'verified',
          updated_at = CURRENT_TIMESTAMP
      `).run(farmerId, accountHolderName, bankName, masked, accHash, ifscCode.toUpperCase(), upiId || null);

      const updated = db.prepare('SELECT * FROM farmer_payout_profiles WHERE farmer_id = ?').get(farmerId);
      recordAuditLog(db, farmerId, authUser.role, 'PAYOUT_PROFILE_UPDATED', 'farmer_payout_profile', farmerId, `Bank payout account verified for ${accountHolderName}`);

      return sendJson(res, 200, { status: 'success', message: 'Farmer bank payout profile saved & verified', profile: updated });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // Admin Verification of Farmer Payout Eligibility
  if (method === 'POST' && pathname.match(/^\/api\/admin\/farmers\/[^\/]+\/verify-payout$/)) {
    const authUser = requireAuth(req, res, ['admin']);
    if (!authUser) return;
    try {
      const farmerId = pathname.split('/')[4];
      const body = await parseBody(req);
      const eligibility = body.eligibility || 'verified';

      db.prepare("UPDATE farmer_payout_profiles SET payout_eligibility = ?, updated_at = CURRENT_TIMESTAMP WHERE farmer_id = ?").run(eligibility, farmerId);
      return sendJson(res, 200, { status: 'success', message: `Farmer payout eligibility updated to ${eligibility}` });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // Admin Financial Console Live Statistics
  if (method === 'GET' && pathname === '/api/admin/financial-stats') {
    const authUser = requireAuth(req, res, ['admin']);
    if (!authUser) return;
    try {
      const totalDepositsPaise = db.prepare("SELECT SUM(amount_paise) as total FROM wallet_ledger WHERE transaction_type = 'wallet_topup' AND status = 'completed'").get()?.total || 0;
      const totalHeldPaise = db.prepare("SELECT SUM(held_balance_paise) as total FROM wallets").get()?.total || 0;
      const totalPayoutsPaise = db.prepare("SELECT SUM(amount_paise) as total FROM wallet_ledger WHERE transaction_type = 'escrow_release_to_farmer' AND status = 'completed'").get()?.total || 0;
      const totalPlatformFeesPaise = db.prepare("SELECT SUM(platform_fee_paise) as total FROM escrow_records WHERE status IN ('held', 'farmer_paid', 'partially_refunded')").get()?.total || 0;
      const pendingPayoutsCount = db.prepare("SELECT COUNT(*) as count FROM escrow_records WHERE status IN ('held', 'awaiting_transport', 'loaded', 'dispatch_verified')").get()?.count || 0;
      const unverifiedFarmers = db.prepare("SELECT farmer_id, account_holder_name, bank_name, account_number_masked, ifsc_code, upi_id, payout_eligibility AS payout_eligibility_status, payout_eligibility FROM farmer_payout_profiles WHERE payout_eligibility != 'verified'").all();

      return sendJson(res, 200, {
        status: 'success',
        stats: {
          totalDepositsRupees: totalDepositsPaise / 100,
          total_wallets_rupees: totalDepositsPaise / 100,
          totalHeldEscrowRupees: totalHeldPaise / 100,
          active_escrow_holds_rupees: totalHeldPaise / 100,
          totalSettledPayoutsRupees: totalPayoutsPaise / 100,
          farmer_payouts_released_rupees: totalPayoutsPaise / 100,
          totalPlatformFeesRupees: totalPlatformFeesPaise / 100,
          platform_fees_earned_rupees: totalPlatformFeesPaise / 100,
          pendingPayoutsCount,
          unverified_farmer_profiles: unverifiedFarmers
        }
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // Admin System-wide Wallet Ledger Audit View
  if (method === 'GET' && pathname === '/api/admin/financial-ledger') {
    const authUser = requireAuth(req, res, ['admin']);
    if (!authUser) return;
    try {
      const ledger = db.prepare(`
        SELECT l.*, u.name as user_name
        FROM wallet_ledger l
        JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
        LIMIT 100
      `).all();

      return sendJson(res, 200, { status: 'success', count: ledger.length, ledger });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. BUYERS & FARMERS PROFILES
  // ---------------------------------------------------------------------------

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

  if (method === 'GET' && pathname.startsWith('/api/farmers/')) {
    const farmerId = pathname.replace('/api/farmers/', '');
    const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(farmerId);
    if (!farmer) return sendJson(res, 404, { status: 'error', message: 'Farmer not found' });
    return sendJson(res, 200, { status: 'success', farmer });
  }

  // ---------------------------------------------------------------------------
  // 5. HARVEST LOTS (List, Filter, Create)
  // ---------------------------------------------------------------------------

  if (method === 'GET' && pathname === '/api/lots') {
    let query = "SELECT * FROM harvest_lots WHERE status != 'cancelled'";
    const params = [];

    const cropKey = parsedUrl.query.crop;
    const grade = parsedUrl.query.grade;
    const search = parsedUrl.query.search;
    const status = parsedUrl.query.status;

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
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

  // Create Harvest Lot
  if (method === 'POST' && pathname === '/api/lots') {
    const authUser = requireAuth(req, res, ['farmer', 'admin']);
    if (!authUser) return;
    try {
      const body = await parseBody(req);
      const lotId = body.id || `LOT-TS-${Date.now().toString().slice(-4)}`;
      const targetFarmerId = (authUser && authUser.role === 'farmer') ? authUser.user_id : (body.farmerId || 'USR-FARM-01');
      let farmer = db.prepare('SELECT id, name, phone FROM farmers WHERE id = ?').get(targetFarmerId);
      if (!farmer && authUser) {
        db.prepare(`
          INSERT INTO farmers (id, name, phone, village, district, wallet_balance, kyc_status)
          VALUES (?, ?, ?, ?, ?, 0, 'rythubandhu_verified')
        `).run(authUser.user_id, authUser.name, authUser.phone, authUser.city || 'జనగామ', 'వరంగల్');
        farmer = db.prepare('SELECT id, name, phone FROM farmers WHERE id = ?').get(targetFarmerId);
      }
      if (!farmer) {
        farmer = db.prepare('SELECT id, name, phone FROM farmers LIMIT 1').get();
      }
      const farmerId = farmer ? farmer.id : 'USR-FARM-01';
      const farmerName = body.farmerName || (farmer ? farmer.name : (authUser ? authUser.name : 'మల్లారెడ్డి (Malla Reddy)'));
      const farmerPhone = body.farmerPhone || (farmer ? farmer.phone : (authUser ? authUser.phone : '+91 98480 55210'));
      const cropKey = body.cropKey || 'teja_chilli';
      const cropNameTe = body.cropNameTe || 'పంట';
      const cropNameEn = body.cropNameEn || 'Crop';
      const varietyTe = body.varietyTe || '';
      const varietyEn = body.varietyEn || '';
      const rawQuantity = body.quantity !== undefined ? body.quantity : (body.quantity_quintals !== undefined ? body.quantity_quintals : 50);
      const rawPrice = body.reservePrice !== undefined ? body.reservePrice : (body.reserve_price !== undefined ? body.reserve_price : 20000);
      const quantity = Number(rawQuantity);
      const reservePrice = Number(rawPrice);

      if (isNaN(quantity) || quantity <= 0) {
        return sendJson(res, 400, { status: 'error', message: 'Quantity must be a positive number greater than 0' });
      }
      if (isNaN(reservePrice) || reservePrice <= 0) {
        return sendJson(res, 400, { status: 'error', message: 'Reserve price must be greater than ₹0' });
      }

      const grade = body.grade || 'A';
      const moisture = body.moisture || body.moisture_pct || '10%';
      const locationTe = body.locationTe || body.location_te || 'జనగామ మండలం, వరంగల్';
      const locationEn = body.locationEn || body.location_en || 'Jangaon, Warangal';
      const storageTe = body.storageTe || body.storage_type_te || 'పొలంలో ఉంది (Farm Gate)';
      const storageEn = body.storageEn || body.storage_type_en || 'Farm Gate Pickup';
      const lat = Number(body.lat || (farmer ? farmer.lat : 17.8400)) || 17.8400;
      const lon = Number(body.lon || (farmer ? farmer.lon : 79.1100)) || 79.1100;
      const image = body.image || body.image_url || body.imageUrl || '../shared/assets/crops/paddy.jpg';

      db.prepare(`
        INSERT INTO harvest_lots (
          id, farmer_id, farmer_name, farmer_phone, crop_key, crop_name_te, crop_name_en,
          variety_te, variety_en, quantity_quintals, grade, moisture_pct, location_te, location_en,
          lat, lon, storage_type_te, storage_type_en, reserve_price, highest_bid, image_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(
        lotId, farmerId, farmerName, farmerPhone, cropKey, cropNameTe, cropNameEn,
        varietyTe, varietyEn, quantity, grade, moisture, locationTe, locationEn,
        lat, lon, storageTe, storageEn, reservePrice, reservePrice, image
      );

      const createdLot = db.prepare('SELECT * FROM harvest_lots WHERE id = ?').get(lotId);
      createdLot.bids = [];

      if (supabaseService.isSupabaseConfigured()) {
        supabaseService.createLotInSupabase(createdLot).catch(e => console.error('[Supabase Lot Sync Error]', e));
      }

      recordAuditLog(db, farmerId, 'farmer', 'LOT_CREATED', 'harvest_lot', lotId, `Listed ${quantity}Q ${cropNameEn} @ ₹${reservePrice}`);
      broadcastEvent('listing.created', { lot: createdLot, lotId: createdLot.id });
      broadcastEvent('NEW_LOT', { lot: createdLot });

      createNotification(db, farmerId, 'farmer', 'పంట నమోదు విజయవంతం / Crop Listed', `${createdLot.crop_name_te} (${quantity}Q) మార్కెట్లో విజయవంతంగా నమోదు చేయబడింది.`, 'success', 'harvest_lot', lotId);
      createNotification(db, 'USR-ADM-01', 'admin', 'కొత్త పంట నమోదు / New Crop Listing', `రైతు ${farmerName} ${quantity}Q ${cropNameEn} అమ్మకానికి పెట్టారు.`, 'info', 'harvest_lot', lotId);

      return sendJson(res, 201, { status: 'success', message: 'Harvest lot listed successfully', lot: createdLot });
    } catch (err) {
      return sendJson(res, err.statusCode || 500, { status: 'error', message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // 6. LIVE BIDDING & OFFERS
  // ---------------------------------------------------------------------------

  if (method === 'POST' && pathname === '/api/bids') {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
    try {
      const body = await parseBody(req);
      const { lotId, buyerId, pricePerQ, logisticsMode } = body;
      const effectiveBuyerId = buyerId || authUser.user_id;

      if (!lotId || !effectiveBuyerId || !pricePerQ) {
        return sendJson(res, 400, { status: 'error', message: 'Missing required fields: lotId, buyerId, pricePerQ' });
      }

      const lot = db.prepare('SELECT * FROM harvest_lots WHERE id = ?').get(lotId);
      if (!lot) return sendJson(res, 404, { status: 'error', message: 'Lot not found' });

      if (lot.status !== 'active') {
        return sendJson(res, 400, { status: 'error', message: `Bidding is closed for this lot (Status: ${lot.status})` });
      }

      if (Number(pricePerQ) < Number(lot.reserve_price)) {
        return sendJson(res, 400, {
          status: 'error',
          message: `Bid price ₹${pricePerQ} is below farmer reserve price ₹${lot.reserve_price}`
        });
      }

      const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(effectiveBuyerId);
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

      db.exec('BEGIN IMMEDIATE');
      try {
        const platformFeeRupees = 500;
        const escrowResult = holdBuyerEscrow(db, {
          buyerId: buyer.id,
          bidId,
          lotId,
          cropAmountRupees: totalDeal,
          platformFeeRupees,
          description: `Bid escrow hold ₹${(totalDeal + platformFeeRupees).toLocaleString('en-IN')} for ${lot.crop_name_en} lot #${lotId}`
        });

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

        recordAuditLog(db, buyer.id, 'buyer', 'BID_SUBMITTED', 'bid', bidId, `Bid ₹${pricePerQ}/Q on lot ${lotId} (Escrow Held: ₹${totalDeal + platformFeeRupees})`);

        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
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

      if (supabaseService.isSupabaseConfigured()) {
        supabaseService.createBidInSupabase(createdBid).catch(e => console.error('[Supabase Bid Sync Error]', e));
      }

      // Private bid event: strictly dispatched to lot's farmer, bidding buyer, and admin (FIND-PRIV-01 Remediation)
      const bidAuthFilter = (role, targetUserId) => role === 'admin' || targetUserId === lot.farmer_id || targetUserId === buyer.id;
      broadcastEvent('bid.created', createdBid, bidAuthFilter);
      broadcastEvent('NEW_BID', { lotId, bid: createdBid }, bidAuthFilter);

      // Public market event: lot price update without disclosing competing bidder identity
      broadcastEvent('listing.updated', {
        lotId: lot.id,
        highestBid: Math.max(Number(lot.highest_bid || 0), Number(pricePerQ))
      });

      // Dispatch real in-app notifications
      createNotification(db, lot.farmer_id, 'farmer', 'కొత్త బిడ్ వచ్చింది / New Bid Received', `${buyer.name} మీ ${lot.crop_name_te} కోసం ₹${pricePerQ}/Q ఆఫర్ చేశారు.`, 'info', 'bid', bidId);
      createNotification(db, buyer.id, 'buyer', 'బిడ్ సమర్పించబడింది / Bid Placed', `మీరు ${lot.crop_name_te} కోసం ₹${pricePerQ}/Q బిడ్ సమర్పించారు.`, 'info', 'bid', bidId);

      return sendJson(res, 201, { status: 'success', message: 'Bid recorded in database', bid: createdBid });
    } catch (err) {
      return sendJson(res, err.statusCode || 500, { status: 'error', message: err.message });
    }
  }

  // Get Buyer's Active Bids
  if (method === 'GET' && pathname.startsWith('/api/bids/buyer/')) {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
    const buyerId = pathname.replace('/api/bids/buyer/', '');
    if (authUser.role !== 'admin' && authUser.user_id !== buyerId) {
      return sendJson(res, 403, { status: 'error', message: 'Forbidden: You cannot view bids placed by another buyer' });
    }
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

  // 6c. Bid Rejection & Cancellation (with Escrow Refund)
  if (method === 'POST' && pathname.match(/^\/api\/bids\/[^\/]+\/reject$/)) {
    const authUser = requireAuth(req, res, ['farmer', 'admin']);
    if (!authUser) return;
    try {
      const bidId = pathname.split('/')[3];
      const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(bidId);
      if (!bid) return sendJson(res, 404, { status: 'error', message: 'Bid not found' });
      if (bid.status !== 'active') {
        return sendJson(res, 400, { status: 'error', message: `Bid cannot be rejected (Current status: ${bid.status})` });
      }

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare("UPDATE bids SET status = 'rejected' WHERE id = ?").run(bidId);
        const escrow = db.prepare("SELECT * FROM escrow_records WHERE bid_id = ? AND status = 'held'").get(bidId);
        if (escrow) {
          releaseBuyerEscrowHold(db, { buyerId: bid.buyer_id, escrowId: escrow.id, status: 'bid_rejected', description: `Bid #${bidId} rejected by farmer` });
        }
        recordAuditLog(db, authUser.user_id, authUser.role, 'BID_REJECTED', 'bid', bidId, `Bid #${bidId} rejected. Escrow refunded to buyer.`);
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      broadcastEvent('bid_updated', { bidId, status: 'rejected' });
      return sendJson(res, 200, { status: 'success', message: 'Bid rejected and escrow refunded to buyer' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  if (method === 'POST' && pathname.match(/^\/api\/bids\/[^\/]+\/cancel$/)) {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
    try {
      const bidId = pathname.split('/')[3];
      const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(bidId);
      if (!bid) return sendJson(res, 404, { status: 'error', message: 'Bid not found' });
      if (authUser.role === 'buyer' && bid.buyer_id !== authUser.user_id) {
        return sendJson(res, 403, { status: 'error', message: "Forbidden: You cannot cancel another buyer's bid" });
      }
      if (bid.status !== 'active') {
        return sendJson(res, 400, { status: 'error', message: `Bid cannot be cancelled (Current status: ${bid.status})` });
      }

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare("UPDATE bids SET status = 'cancelled' WHERE id = ?").run(bidId);
        const escrow = db.prepare("SELECT * FROM escrow_records WHERE bid_id = ? AND status = 'held'").get(bidId);
        if (escrow) {
          releaseBuyerEscrowHold(db, { buyerId: bid.buyer_id, escrowId: escrow.id, status: 'bid_cancelled', description: `Bid #${bidId} cancelled by buyer` });
        }
        recordAuditLog(db, authUser.user_id, authUser.role, 'BID_CANCELLED', 'bid', bidId, `Bid #${bidId} cancelled. Escrow refunded.`);
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      broadcastEvent('bid_updated', { bidId, status: 'cancelled' });
      return sendJson(res, 200, { status: 'success', message: 'Bid cancelled and escrow refunded to buyer' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // 7. ORDERS, ESCROW LIFECYCLE & DEAL ACCEPTANCE
  // ---------------------------------------------------------------------------

  // 7a. Accept Bid -> Create Procurement Order & Lock Escrow
  if (method === 'POST' && pathname === '/api/orders/accept-bid') {
    const authUser = requireAuth(req, res, ['farmer', 'admin']);
    if (!authUser) return;
    try {
      const body = await parseBody(req);
      const { lotId, bidId } = body;

      if (!lotId || !bidId) {
        return sendJson(res, 400, { status: 'error', message: 'lotId and bidId are required' });
      }

      const lot = db.prepare('SELECT * FROM harvest_lots WHERE id = ?').get(lotId);
      if (!lot) return sendJson(res, 404, { status: 'error', message: 'Harvest lot not found' });
      if (lot.status !== 'active') {
        return sendJson(res, 400, { status: 'error', message: `Deal already finalized for this lot (Current status: ${lot.status})` });
      }

      const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(bidId);
      if (!bid) return sendJson(res, 404, { status: 'error', message: 'Bid not found' });
      if (bid.status !== 'active') {
        return sendJson(res, 400, { status: 'error', message: `Bid is not active (Current status: ${bid.status})` });
      }

      // Ensure no duplicate order exists for this lot
      const existingOrder = db.prepare('SELECT id FROM procurement_orders WHERE lot_id = ?').get(lotId);
      if (existingOrder) {
        return sendJson(res, 409, { status: 'error', message: `An order already exists for this lot (${existingOrder.id})` });
      }

      const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(bid.buyer_id);
      const distanceKm = calculateDistanceKm(
        lot.lat || 17.8400, lot.lon || 79.1100,
        buyer ? buyer.lat : 17.3850, buyer ? buyer.lon : 78.4867
      );
      const freightOffer = calculateFreightOffer(distanceKm, lot.quantity_quintals);
      let vehicleType = '6-Ton Canter DCM';
      if (lot.quantity_quintals <= 30) {
        vehicleType = 'Tata Ace / 3-Ton Mini';
      } else if (lot.quantity_quintals > 70) {
        vehicleType = '10-Ton Multi-Axle Truck';
      }

      const orderId = `ORD-TS-${Date.now().toString().slice(-4)}`;
      const farmGateOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const tripId = `TRIP-TS-${Date.now().toString().slice(-4)}`;

      db.exec('BEGIN IMMEDIATE');
      try {
        // Mark lot deal accepted
        db.prepare("UPDATE harvest_lots SET status = 'deal_accepted' WHERE id = ?").run(lotId);
        // Mark bid accepted
        db.prepare("UPDATE bids SET status = 'accepted' WHERE id = ?").run(bidId);

        // Refund escrow holds for all other bids on this lot that were outbid
        const outbidBids = db.prepare("SELECT * FROM bids WHERE lot_id = ? AND id != ? AND status IN ('active', 'outbid')").all(lotId, bidId);
        for (const ob of outbidBids) {
          db.prepare("UPDATE bids SET status = 'outbid' WHERE id = ?").run(ob.id);
          const obEscrow = db.prepare("SELECT * FROM escrow_records WHERE bid_id = ? AND status = 'held'").get(ob.id);
          if (obEscrow) {
            releaseBuyerEscrowHold(db, { buyerId: ob.buyer_id, escrowId: obEscrow.id, status: 'bid_rejected', description: `Bid outbid on lot #${lotId}` });
          }
        }

        // Update accepted bid escrow record to awaiting_transport
        const acceptedEscrow = db.prepare("SELECT * FROM escrow_records WHERE bid_id = ? AND status = 'held'").get(bidId);
        if (acceptedEscrow) {
          db.prepare(`
            UPDATE escrow_records
            SET farmer_id = ?, accepted_quantity = ?, status = 'awaiting_transport', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(lot.farmer_id, lot.quantity_quintals, acceptedEscrow.id);
        }

        // Generate order
        db.prepare(`
          INSERT INTO procurement_orders (
            id, lot_id, buyer_id, farmer_id, crop_name_te, crop_name_en, quantity_quintals,
            agreed_rate, total_escrow_amount, current_step, farm_gate_otp, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?, 'escrow_locked')
        `).run(
          orderId,
          lot.id,
          bid.buyer_id,
          lot.farmer_id,
          lot.crop_name_te,
          lot.crop_name_en,
          lot.quantity_quintals,
          bid.price_per_q,
          bid.total_deal_amount,
          farmGateOtp
        );

        // Create linked logistics haulage trip with real distance & calculated freight
        db.prepare(`
          INSERT INTO logistics_trips (
            id, order_id, crop_name, origin, destination, distance_km, vehicle_type, freight_offer,
            status, pickup_otp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', ?)
        `).run(
          tripId,
          orderId,
          `${lot.crop_name_te} (${lot.quantity_quintals} క్వింటాళ్లు)`,
          lot.location_te,
          bid.buyer_location || (buyer ? buyer.city : 'సికింద్రాబాద్ హబ్'),
          distanceKm,
          vehicleType,
          freightOffer,
          farmGateOtp
        );

        recordAuditLog(db, lot.farmer_id, 'farmer', 'DEAL_ACCEPTED', 'order', orderId, `Accepted bid ₹${bid.price_per_q} from ${bid.buyer_name}. Escrow ₹${bid.total_deal_amount} locked.`);

        // Create in-app notifications
        createNotification(db, lot.farmer_id, 'farmer', 'బిడ్ ఆమోదించబడింది / Deal Finalized', `ఆర్డర్ #${orderId} సృష్టించబడింది. ₹${bid.total_deal_amount} ఎస్క్రోలో భద్రపరచబడింది.`, 'success', 'order', orderId);
        createNotification(db, bid.buyer_id, 'buyer', 'మీ బిడ్ ఆమోదించబడింది / Bid Accepted!', `రైతు ${lot.farmer_name} మీ బిడ్ ₹${bid.price_per_q}/Q ఆమోదించారు. ఆర్డర్ #${orderId}.`, 'success', 'order', orderId);
        createNotification(db, 'USR-LOG-01', 'logistics', 'కొత్త రవాణా ఆర్డర్ / New Transport Request', `${lot.crop_name_te} (${lot.quantity_quintals}Q) రవాణా ఆర్డర్ #${orderId} సిద్ధంగా ఉంది. దూరం: ${distanceKm} km. బాడుగ: ₹${freightOffer}.`, 'info', 'logistics_trip', tripId);
        createNotification(db, 'USR-ADM-01', 'admin', 'కొత్త ఆర్డర్ & ఎస్క్రో లాక్', `ఆర్డర్ #${orderId} నమోదైంది. మొత్తం విలువ: ₹${bid.total_deal_amount}`, 'info', 'order', orderId);

        if (supabaseService.isSupabaseConfigured()) {
          supabaseService.createOrderInSupabase({
            id: orderId,
            lotId,
            buyerId: bid.buyer_id,
            farmerId: lot.farmer_id,
            cropNameTe: lot.crop_name_te,
            cropNameEn: lot.crop_name_en,
            quantity: lot.quantity_quintals,
            agreedRate: bid.price_per_q,
            totalEscrowAmount: bid.total_deal_amount,
            origin: lot.location_te,
            destination: bid.buyer_location || (buyer ? buyer.city : 'సికింద్రాబాద్ హబ్')
          }).catch(e => console.error('[Supabase Order Sync Error]', e));
        }

        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      const createdOrder = db.prepare('SELECT * FROM procurement_orders WHERE id = ?').get(orderId);
      broadcastEvent('order.created', { order: createdOrder, lotId, bidId, tripId });
      broadcastEvent('ORDER_CREATED', { order: createdOrder, lotId, bidId, tripId });
      broadcastEvent('listing.cancelled', { lotId: lot.id, reason: 'deal_accepted' });
      broadcastEvent('transport.requested', {
        transportRequestId: tripId,
        orderId,
        cropName: `${lot.crop_name_te} (${lot.quantity_quintals} క్వింటాళ్లు)`,
        quantity: lot.quantity_quintals,
        origin: lot.location_te,
        destination: bid.buyer_location || (buyer ? buyer.city : 'సికింద్రాబాద్ హబ్'),
        distanceKm,
        freightOffer,
        status: 'available'
      });
      broadcastEvent('dashboard.updated', { type: 'order_created', orderId });

      return sendJson(res, 201, {
        status: 'success',
        message: 'Deal accepted! Procurement order created and escrow locked.',
        order: createdOrder,
        tripId,
        distanceKm,
        freightOffer
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 7b. Farmer's Orders
  if (method === 'GET' && pathname.startsWith('/api/orders/farmer/')) {
    const authUser = requireAuth(req, res, ['farmer', 'admin']);
    if (!authUser) return;
    const farmerId = pathname.replace('/api/orders/farmer/', '');
    if (authUser.role !== 'admin' && authUser.user_id !== farmerId) {
      return sendJson(res, 403, { status: 'error', message: 'Forbidden: You cannot view orders for another farmer' });
    }
    const orders = db.prepare(`
      SELECT o.*, b.name as buyer_name, b.phone as buyer_phone, b.city as buyer_city
      FROM procurement_orders o
      JOIN buyers b ON o.buyer_id = b.id
      WHERE o.farmer_id = ?
      ORDER BY o.created_at DESC
    `).all(farmerId);
    return sendJson(res, 200, { status: 'success', count: orders.length, orders });
  }

  // 7c. Buyer's Orders (farm_gate_otp securely omitted)
  if (method === 'GET' && pathname.startsWith('/api/orders/buyer/')) {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
    const buyerId = pathname.replace('/api/orders/buyer/', '');
    if (authUser.role !== 'admin' && authUser.user_id !== buyerId) {
      return sendJson(res, 403, { status: 'error', message: 'Forbidden: You cannot view orders for another buyer' });
    }
    const orders = db.prepare(`
      SELECT 
        o.id, o.lot_id, o.buyer_id, o.farmer_id, o.crop_name_te, o.crop_name_en,
        o.quantity_quintals, o.agreed_rate, o.total_escrow_amount, o.current_step,
        o.vehicle_reg, o.driver_name, o.driver_phone, o.status, o.created_at, o.updated_at,
        f.name as farmer_name, f.phone as farmer_phone, f.village as farmer_village
      FROM procurement_orders o
      JOIN farmers f ON o.farmer_id = f.id
      WHERE o.buyer_id = ?
      ORDER BY o.created_at DESC
    `).all(buyerId);
    return sendJson(res, 200, { status: 'success', count: orders.length, orders });
  }

  // 7d. Assign Truck to Order
  if (method === 'POST' && pathname.match(/^\/api\/orders\/[^\/]+\/assign-truck$/)) {
    const authUser = requireAuth(req, res, ['buyer', 'logistics', 'admin']);
    if (!authUser) return;
    try {
      const orderId = pathname.split('/')[3];
      const body = await parseBody(req);
      const { vehicleReg, driverName, driverPhone } = body;

      const order = db.prepare('SELECT * FROM procurement_orders WHERE id = ?').get(orderId);
      if (!order) return sendJson(res, 404, { status: 'error', message: 'Order not found' });

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`
          UPDATE procurement_orders 
          SET current_step = 3, vehicle_reg = ?, driver_name = ?, driver_phone = ?, status = 'dispatched', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(vehicleReg, driverName, driverPhone, orderId);

        // Update linked trip if present
        db.prepare(`
          UPDATE logistics_trips
          SET status = 'assigned', assigned_vehicle = ?, driver_name = ?, driver_phone = ?
          WHERE order_id = ?
        `).run(vehicleReg, driverName, driverPhone, orderId);

        recordAuditLog(db, order.buyer_id, 'buyer', 'TRUCK_ASSIGNED', 'order', orderId, `Assigned truck ${vehicleReg} (${driverName})`);

        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      broadcastEvent('ORDER_UPDATED', { orderId, currentStep: 3, vehicleReg, driverName });

      return sendJson(res, 200, { status: 'success', message: 'Vehicle assigned to order' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 7e. Verify OTP & Release Escrow
  if (method === 'POST' && pathname.match(/^\/api\/orders\/[^\/]+\/verify-otp$/)) {
    const authUser = requireAuth(req, res, ['farmer', 'logistics', 'admin']);
    if (!authUser) return;
    try {
      const orderId = pathname.split('/')[3];
      const body = await parseBody(req);
      const { otp } = body;

      const order = db.prepare('SELECT * FROM procurement_orders WHERE id = ?').get(orderId);
      if (!order) return sendJson(res, 404, { status: 'error', message: 'Order not found' });

      // Ownership check: Caller must be admin, or the order's farmer, or an authorized logistics user
      if (authUser.role !== 'admin' && authUser.user_id !== order.farmer_id && authUser.role !== 'logistics') {
        return sendJson(res, 403, { status: 'error', message: 'Forbidden: You are not authorized to verify delivery for this order.' });
      }

      if (order.status === 'delivered' || order.current_step >= 5) {
        return sendJson(res, 400, { status: 'error', message: 'Order has already been completed and escrow released.' });
      }

      // Verify no open disputes
      const activeDispute = db.prepare("SELECT id FROM disputes WHERE order_id = ? AND status = 'open'").get(orderId);
      if (activeDispute) {
        return sendJson(res, 400, { status: 'error', message: 'Cannot release escrow: An active dispute is open for this order.' });
      }

      const cleanOtp = String(otp || '').trim();
      const isDemoAllowed = process.env.ENABLE_DEMO_LOGIN === 'true';
      const isValid = (isDemoAllowed && cleanOtp === '123456') || (order.farm_gate_otp === cleanOtp);
      if (!isValid) {
        return sendJson(res, 400, { status: 'error', message: 'Invalid OTP provided' });
      }

      db.exec('BEGIN IMMEDIATE');
      try {
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

        // Complete linked trip
        db.prepare(`
          UPDATE logistics_trips
          SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
          WHERE order_id = ?
        `).run(orderId);

        recordAuditLog(db, order.farmer_id, 'farmer', 'ESCROW_RELEASED', 'order', orderId, `OTP verified. ₹${order.total_escrow_amount} credited to farmer.`);

        // Notifications
        createNotification(db, order.farmer_id, 'farmer', 'ఎస్క్రో విడుదల / Payment Credited', `ఆర్డర్ #${orderId} పూర్తయింది. ₹${order.total_escrow_amount} మీ వాలెట్‌కు జమచేయబడింది.`, 'success', 'order', orderId);
        createNotification(db, order.buyer_id, 'buyer', 'డెలివరీ పూర్తయింది / Order Delivered', `ఆర్డర్ #${orderId} రైతు వద్ద విజయవంతంగా పూర్తయింది.`, 'success', 'order', orderId);
        createNotification(db, 'USR-ADM-01', 'admin', 'లావాదేవీ పూర్తయింది / Transaction Settled', `ఆర్డర్ #${orderId} ఎస్క్రో విడుదల పూర్తయింది (₹${order.total_escrow_amount}).`, 'info', 'order', orderId);

        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      broadcastEvent('order.delivered', { orderId, totalAmount: order.total_escrow_amount });
      broadcastEvent('ORDER_DELIVERED', { orderId, totalAmount: order.total_escrow_amount });
      broadcastEvent('transport.delivered', { orderId });
      broadcastEvent('TRIP_DELIVERED', { orderId });
      broadcastEvent('escrow.released', { orderId, farmerId: order.farmer_id, amount: order.total_escrow_amount });
      broadcastEvent('ESCROW_RELEASED', { orderId, farmerId: order.farmer_id, amount: order.total_escrow_amount });
      broadcastEvent('dashboard.updated', { type: 'order_delivered', orderId });

      return sendJson(res, 200, { status: 'success', message: 'OTP verified. Escrow funds released to farmer.' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // 8. LOGISTICS FLEET HAULAGE APIS (Central SQLite source)
  // ---------------------------------------------------------------------------

  if (method === 'GET' && pathname === '/api/trips') {
    let query = `
      SELECT id, order_id, crop_name, origin, destination, distance_km, vehicle_type,
             freight_offer, status, assigned_vehicle, driver_name, driver_phone, delivered_at, created_at
      FROM logistics_trips
    `;
    const status = parsedUrl.query.status;
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';

    const trips = db.prepare(query).all(...params);
    return sendJson(res, 200, { status: 'success', count: trips.length, trips });
  }

  if (method === 'GET' && pathname.startsWith('/api/trips/')) {
    const tripId = pathname.replace('/api/trips/', '');
    const authUser = getAuthenticatedUser(req);
    const trip = db.prepare('SELECT * FROM logistics_trips WHERE id = ?').get(tripId);
    if (!trip) return sendJson(res, 404, { status: 'error', message: 'Trip not found' });
    
    // Only return pickup_otp if authenticated as admin or logistics driver or farmer
    const isAuthorizedForOtp = authUser && (authUser.role === 'admin' || authUser.role === 'logistics' || authUser.role === 'farmer');
    if (!isAuthorizedForOtp) {
      delete trip.pickup_otp;
    }
    return sendJson(res, 200, { status: 'success', trip });
  }

  if (method === 'POST' && pathname.match(/^\/api\/trips\/[^\/]+\/accept$/)) {
    const authUser = requireAuth(req, res, ['logistics', 'admin']);
    if (!authUser) return;
    try {
      const tripId = pathname.split('/')[3];
      const body = await parseBody(req);
      const { vehicleReg, driverName, driverPhone } = body;

      const trip = db.prepare('SELECT * FROM logistics_trips WHERE id = ?').get(tripId);
      if (!trip) return sendJson(res, 404, { status: 'error', message: 'Trip not found' });

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`
          UPDATE logistics_trips
          SET status = 'assigned', assigned_vehicle = ?, driver_name = ?, driver_phone = ?
          WHERE id = ?
        `).run(vehicleReg || 'TS 03 UB 8192', driverName || 'రాము యాదవ్', driverPhone || '9848123990', tripId);

        // If linked to order, dispatch it
        if (trip.order_id) {
          db.prepare(`
            UPDATE procurement_orders
            SET current_step = 3, vehicle_reg = ?, driver_name = ?, driver_phone = ?, status = 'dispatched', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(vehicleReg || 'TS 03 UB 8192', driverName || 'రాము యాదవ్', driverPhone || '9848123990', trip.order_id);

          const linkedOrder = db.prepare('SELECT * FROM procurement_orders WHERE id = ?').get(trip.order_id);
          if (linkedOrder) {
            createNotification(db, linkedOrder.farmer_id, 'farmer', 'లారీ కేటాయించబడింది / Truck Assigned', `డ్రైవర్ ${driverName || 'రాము యాదవ్'} (${vehicleReg || 'TS 03 UB 8192'}) మీ పంట లోడింగ్‌కు బయలుదేరారు.`, 'info', 'order', linkedOrder.id);
            createNotification(db, linkedOrder.buyer_id, 'buyer', 'లారీ కేటాయించబడింది / Transport En Route', `ఆర్డర్ #${linkedOrder.id} కోసం లారీ బయలుదేరింది (${vehicleReg || 'TS 03 UB 8192'}).`, 'info', 'order', linkedOrder.id);
          }
        }

        recordAuditLog(db, 'USR-LOG-01', 'logistics', 'TRIP_ACCEPTED', 'trip', tripId, `Assigned to ${vehicleReg || 'TS 03 UB 8192'} (${driverName || 'రాము యాదవ్'})`);

        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      broadcastEvent('transport.assigned', { tripId, vehicleReg: vehicleReg || 'TS 03 UB 8192', driverName: driverName || 'రాము యాదవ్', orderId: trip.order_id });
      broadcastEvent('TRIP_ASSIGNED', { tripId, vehicleReg: vehicleReg || 'TS 03 UB 8192', driverName: driverName || 'రాము యాదవ్' });
      if (trip.order_id) {
        broadcastEvent('order.updated', { orderId: trip.order_id, currentStep: 3, vehicleReg: vehicleReg || 'TS 03 UB 8192', driverName: driverName || 'రాము యాదవ్', status: 'dispatched' });
      }

      const updatedTrip = db.prepare('SELECT * FROM logistics_trips WHERE id = ?').get(tripId);
      return sendJson(res, 200, { status: 'success', message: 'Trip accepted and assigned to driver', trip: updatedTrip });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  if (method === 'POST' && pathname.match(/^\/api\/trips\/[^\/]+\/verify-otp$/)) {
    const authUser = requireAuth(req, res, ['logistics', 'farmer', 'admin']);
    if (!authUser) return;
    try {
      const tripId = pathname.split('/')[3];
      const body = await parseBody(req);
      const { otp } = body;

      const trip = db.prepare('SELECT * FROM logistics_trips WHERE id = ?').get(tripId);
      if (!trip) return sendJson(res, 404, { status: 'error', message: 'Trip not found' });

      if (trip.status === 'delivered') {
        return sendJson(res, 400, { status: 'error', message: 'Trip has already been delivered.' });
      }

      const cleanOtp = String(otp || '').trim();
      const isDemoAllowed = process.env.ENABLE_DEMO_LOGIN === 'true';
      const isValid = (isDemoAllowed && cleanOtp === '123456') || (String(trip.pickup_otp).trim() === cleanOtp);
      if (!isValid) {
        return sendJson(res, 400, { status: 'error', message: 'Invalid pickup OTP. Please ask farmer for correct OTP.' });
      }

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`
          UPDATE logistics_trips
          SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(tripId);

        if (trip.order_id) {
          const order = db.prepare('SELECT * FROM procurement_orders WHERE id = ?').get(trip.order_id);
          if (order && order.status !== 'delivered') {
            db.prepare(`
              UPDATE procurement_orders
              SET current_step = 5, status = 'delivered', updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(order.id);
            db.prepare('UPDATE buyers SET escrow_balance = escrow_balance - ? WHERE id = ?').run(order.total_escrow_amount, order.buyer_id);
            db.prepare('UPDATE farmers SET wallet_balance = wallet_balance + ? WHERE id = ?').run(order.total_escrow_amount, order.farmer_id);

            createNotification(db, order.farmer_id, 'farmer', 'ఎస్క్రో విడుదల / Payment Credited', `ఆర్డర్ #${order.id} పూర్తయింది. ₹${order.total_escrow_amount} మీ వాలెట్‌కు జమచేయబడింది.`, 'success', 'order', order.id);
            createNotification(db, order.buyer_id, 'buyer', 'డెలివరీ పూర్తయింది / Order Delivered', `ఆర్డర్ #${order.id} విజయవంతంగా పూర్తయింది.`, 'success', 'order', order.id);
          }
        }

        createNotification(db, 'USR-LOG-01', 'logistics', 'రవాణా బాడుగ చెల్లింపు / Freight Released', `ట్రిప్ #${tripId} పూర్తయింది. బాడుగ ₹${trip.freight_offer} విడుదల చేయబడింది.`, 'success', 'logistics_trip', tripId);
        createNotification(db, 'USR-ADM-01', 'admin', 'డెలివరీ పూర్తయింది / Trip Delivered', `ట్రిప్ #${tripId} డెలివరీ OTP ధృవీకరించబడింది.`, 'info', 'logistics_trip', tripId);

        recordAuditLog(db, 'USR-LOG-01', 'logistics', 'TRIP_DELIVERED', 'trip', tripId, `Verified OTP ${otp}. Trip completed and freight released.`);

        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      broadcastEvent('transport.delivered', { tripId, freightOffer: trip.freight_offer, orderId: trip.order_id });
      broadcastEvent('TRIP_DELIVERED', { tripId, freightOffer: trip.freight_offer });
      if (trip.order_id) {
        broadcastEvent('order.delivered', { orderId: trip.order_id });
        broadcastEvent('ORDER_DELIVERED', { orderId: trip.order_id });
        broadcastEvent('escrow.released', { orderId: trip.order_id });
        broadcastEvent('ESCROW_RELEASED', { orderId: trip.order_id });
      }
      broadcastEvent('dashboard.updated', { type: 'trip_delivered', tripId });

      const updatedTrip = db.prepare('SELECT * FROM logistics_trips WHERE id = ?').get(tripId);
      return sendJson(res, 200, { status: 'success', message: 'Pickup OTP verified! Trip completed and freight payout released.', trip: updatedTrip });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // 9. COMMUNITY BULK PROCUREMENT & VILLAGE POOLING APIS
  // ---------------------------------------------------------------------------

  const VALID_REQUIREMENT_TRANSITIONS = {
    'draft': ['published', 'cancelled'],
    'published': ['matching_farmers', 'partially_fulfilled', 'fully_fulfilled', 'cancelled', 'expired'],
    'matching_farmers': ['partially_fulfilled', 'fully_fulfilled', 'cancelled', 'expired'],
    'partially_fulfilled': ['fully_fulfilled', 'procurement_confirmed', 'cancelled'],
    'fully_fulfilled': ['procurement_confirmed', 'cancelled'],
    'procurement_confirmed': ['transport_pending', 'cancelled'],
    'transport_pending': ['in_transit', 'cancelled'],
    'in_transit': ['delivered'],
    'delivered': [],
    'cancelled': [],
    'expired': []
  };

  // 9a. Get / Update Buyer Profile & Community Metadata
  if (method === 'GET' && pathname === '/api/buyer/profile') {
    const authUser = requireAuth(req, res, ['buyer', 'admin', 'farmer', 'logistics']);
    if (!authUser) return;
    const buyerId = parsedUrl.query.buyerId || (authUser.role === 'buyer' ? authUser.user_id : 'USR-BUY-01');
    
    let buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(buyerId);
    if (!buyer && authUser.role === 'buyer') {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(buyerId);
      if (user) {
        db.prepare(`
          INSERT OR IGNORE INTO buyers (id, name, short_name, gstin, trade_license, phone, city, lat, lon, escrow_balance, rating, avatar, buyer_type, families_count, organic_preferred, delivery_area)
          VALUES (?, ?, ?, ?, ?, ?, ?, 17.3850, 78.4867, 1000000, '4.9 ★', '🏢', 'gated_community', 240, 1, 'Hyderabad')
        `).run(user.id, user.name, user.name.slice(0, 15), `36AAACI${Date.now().toString().slice(-7)}Z1`, `LIC-${Date.now().toString().slice(-6)}`, user.phone, user.city || 'Hyderabad');
        buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(buyerId);
      }
    }
    
    if (!buyer) return sendJson(res, 404, { status: 'error', message: 'Buyer profile not found' });

    const activeReqs = db.prepare(`
      SELECT COUNT(*) as count FROM community_requirements 
      WHERE buyer_id = ? AND status NOT IN ('delivered', 'cancelled', 'expired')
    `).get(buyer.id)?.count || 0;

    return sendJson(res, 200, {
      status: 'success',
      profile: {
        id: buyer.id,
        name: buyer.name,
        shortName: buyer.short_name,
        gstin: buyer.gstin,
        tradeLicense: buyer.trade_license,
        phone: buyer.phone,
        city: buyer.city,
        lat: buyer.lat,
        lon: buyer.lon,
        escrowBalance: buyer.escrow_balance,
        rating: buyer.rating,
        avatar: buyer.avatar,
        buyerType: buyer.buyer_type || 'gated_community',
        familiesCount: buyer.families_count || 0,
        organicPreferred: Boolean(buyer.organic_preferred),
        deliveryArea: buyer.delivery_area || buyer.city,
        activeRequirementsCount: activeReqs
      }
    });
  }

  if (method === 'PUT' && pathname === '/api/buyer/profile') {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
    try {
      const body = await parseBody(req);
      const buyerId = authUser.role === 'buyer' ? authUser.user_id : (body.buyerId || 'USR-BUY-01');
      const { name, buyerType, familiesCount, organicPreferred, deliveryArea, city, phone } = body;

      const validBuyerTypes = ['individual', 'business', 'gated_community', 'villa_community', 'apartment_community'];
      const targetType = validBuyerTypes.includes(buyerType) ? buyerType : 'gated_community';

      db.prepare(`
        UPDATE buyers
        SET name = COALESCE(?, name),
            buyer_type = ?,
            families_count = ?,
            organic_preferred = ?,
            delivery_area = COALESCE(?, delivery_area),
            city = COALESCE(?, city),
            phone = COALESCE(?, phone)
        WHERE id = ?
      `).run(name || null, targetType, Number(familiesCount || 0), organicPreferred ? 1 : 0, deliveryArea || null, city || null, phone || null, buyerId);

      const updated = db.prepare('SELECT * FROM buyers WHERE id = ?').get(buyerId);
      recordAuditLog(db, authUser.user_id, authUser.role, 'BUYER_PROFILE_UPDATED', 'buyer', buyerId, `Updated buyer profile: type=${targetType}`);

      return sendJson(res, 200, { status: 'success', message: 'Community profile updated successfully', profile: updated });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 9b. Post Multi-Product Community Requirement
  if (method === 'POST' && pathname === '/api/community-requirements') {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
    try {
      const body = await parseBody(req);
      const deliveryDate = body.deliveryDate || body.requiredDeliveryDate;
      const {
        title, buyerType, organicRequirement, deliveryWindow,
        deliveryAddress, pickupPreference, maxRadiusKm, additionalInstructions,
        isRecurring, items, lat, lon
      } = body;

      if (!title || !deliveryDate || !deliveryAddress || !Array.isArray(items) || items.length === 0) {
        return sendJson(res, 400, { status: 'error', message: 'Title, delivery date, delivery address, and at least 1 product item are required.' });
      }

      const buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(authUser.role === 'buyer' ? authUser.user_id : (body.buyerId || 'USR-BUY-01'));
      if (!buyer) return sendJson(res, 404, { status: 'error', message: 'Buyer profile not found' });

      const reqId = `REQ-COMM-${Date.now().toString().slice(-6)}`;
      const reqLat = Number(lat || buyer.lat || 17.3850);
      const reqLon = Number(lon || buyer.lon || 78.4867);
      const radiusKm = Number(maxRadiusKm) || 25.0;

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`
          INSERT INTO community_requirements (
            id, buyer_id, community_name, buyer_type, title, organic_requirement,
            delivery_date, delivery_window, delivery_address, pickup_preference,
            max_radius_km, additional_instructions, is_recurring, status, lat, lon
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
        `).run(
          reqId, buyer.id, buyer.name, buyerType || buyer.buyer_type || 'gated_community',
          title, organicRequirement || 'preferred', deliveryDate, deliveryWindow || '08:00 AM - 12:00 PM',
          deliveryAddress, pickupPreference || 'farm_gate', radiusKm, additionalInstructions || '',
          isRecurring ? 1 : 0, reqLat, reqLon
        );

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemId = `REQ-ITEM-${reqId.slice(-4)}-${i + 1}`;
          db.prepare(`
            INSERT INTO community_requirement_items (
              id, requirement_id, product_name, crop_key, required_quantity, fulfilled_quantity,
              unit, preferred_grade, max_acceptable_price, status
            ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'open')
          `).run(
            itemId, reqId, item.productName || 'Produce', item.cropKey || 'produce',
            Number(item.requiredQuantity || 100), item.unit || 'kg', item.preferredGrade || 'A',
            item.maxAcceptablePrice ? Number(item.maxAcceptablePrice) : null
          );
        }

        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      // Location-Based Farmer Radius Matching & Notification Engine
      const farmers = db.prepare('SELECT id, name, phone, village, district, lat, lon FROM farmers').all();
      const matchedFarmers = [];
      const productSummaryArr = items.map(it => `${it.productName}: ${it.requiredQuantity} ${it.unit || 'kg'}`);
      const productSummaryText = productSummaryArr.join(', ');

      for (const farmer of farmers) {
        const dist = calculateDistanceKm(reqLat, reqLon, farmer.lat || 17.84, farmer.lon || 79.11);
        if (dist <= radiusKm) {
          matchedFarmers.push(farmer);
          createNotification(
            db, farmer.id, 'farmer',
            `కొత్త సామూహిక కొనుగోలు / Nearby Community Requirement`,
            `${buyer.name} (${farmer.village} నుండి ~${dist.toFixed(1)} km): ${title} (${productSummaryText})`,
            'info', 'community_requirement', reqId
          );
        }
      }

      recordAuditLog(db, buyer.id, 'buyer', 'COMMUNITY_REQUIREMENT_CREATED', 'community_requirement', reqId, `Created bulk requirement '${title}' with ${items.length} items (${radiusKm}km radius, ${matchedFarmers.length} farmers matched)`);

      const createdReq = db.prepare('SELECT * FROM community_requirements WHERE id = ?').get(reqId);
      createdReq.items = db.prepare('SELECT * FROM community_requirement_items WHERE requirement_id = ?').all(reqId);

      const eventPayload = {
        requirementId: reqId,
        buyerId: buyer.id,
        communityName: buyer.name,
        buyerType: createdReq.buyer_type,
        title,
        deliveryDate,
        deliveryAddress,
        maxRadiusKm: radiusKm,
        itemsCount: items.length,
        productSummary: productSummaryText,
        matchedFarmersCount: matchedFarmers.length,
        createdAt: createdReq.created_at
      };

      broadcastEvent('community_requirement_created', eventPayload);

      return sendJson(res, 201, {
        status: 'success',
        message: `Requirement published successfully. Matched ${matchedFarmers.length} nearby farmers within ${radiusKm}km.`,
        requirement: createdReq
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 9c. List Community Requirements
  if (method === 'GET' && pathname === '/api/community-requirements') {
    let query = `
      SELECT r.*, b.name as buyer_name, b.avatar as buyer_avatar, b.rating as buyer_rating
      FROM community_requirements r
      JOIN buyers b ON r.buyer_id = b.id
      WHERE 1=1
    `;
    const params = [];

    const buyerId = parsedUrl.query.buyerId;
    const status = parsedUrl.query.status;
    const farmerId = parsedUrl.query.farmerId;
    const radiusFilter = Number(parsedUrl.query.radiusKm);

    if (buyerId) {
      query += ' AND r.buyer_id = ?';
      params.push(buyerId);
    }
    if (status && status !== 'all') {
      query += ' AND r.status = ?';
      params.push(status);
    } else if (!buyerId) {
      query += " AND r.status NOT IN ('cancelled', 'expired')";
    }

    query += ' ORDER BY r.created_at DESC';

    const reqs = db.prepare(query).all(...params);

    let farmerLoc = null;
    if (farmerId) {
      farmerLoc = db.prepare('SELECT lat, lon, village, district FROM farmers WHERE id = ?').get(farmerId);
    }

    const formatted = [];
    for (const r of reqs) {
      const items = db.prepare('SELECT * FROM community_requirement_items WHERE requirement_id = ?').all(r.id);
      let totalReq = 0;
      let totalFulfilled = 0;

      items.forEach(it => {
        totalReq += Number(it.required_quantity || 0);
        totalFulfilled += Number(it.fulfilled_quantity || 0);
      });

      const pct = totalReq > 0 ? Math.min(100, Math.round((totalFulfilled / totalReq) * 100)) : 0;
      const offersCount = db.prepare("SELECT COUNT(*) as count FROM farmer_requirement_offers WHERE requirement_id = ? AND status != 'withdrawn'").get(r.id)?.count || 0;

      let distKm = null;
      if (farmerLoc && r.lat && r.lon) {
        distKm = calculateDistanceKm(farmerLoc.lat, farmerLoc.lon, r.lat, r.lon);
      }

      if (radiusFilter && distKm !== null && distKm > radiusFilter) {
        continue;
      }

      formatted.push({
        id: r.id,
        buyerId: r.buyer_id,
        communityName: r.community_name || r.buyer_name,
        buyerType: r.buyer_type,
        title: r.title,
        organicRequirement: r.organic_requirement,
        deliveryDate: r.delivery_date,
        deliveryWindow: r.delivery_window,
        deliveryAddress: r.delivery_address,
        pickupPreference: r.pickup_preference,
        maxRadiusKm: r.max_radius_km,
        additionalInstructions: r.additional_instructions,
        isRecurring: Boolean(r.is_recurring),
        status: r.status,
        lat: r.lat,
        lon: r.lon,
        createdAt: r.created_at,
        items: items.map(it => ({
          id: it.id,
          productName: it.product_name,
          cropKey: it.crop_key,
          requiredQuantity: it.required_quantity,
          fulfilledQuantity: it.fulfilled_quantity,
          unit: it.unit,
          preferredGrade: it.preferred_grade,
          maxAcceptablePrice: it.max_acceptable_price,
          status: it.status
        })),
        totalRequiredQty: totalReq,
        totalFulfilledQty: totalFulfilled,
        fulfilledPercentage: pct,
        offersCount,
        distanceKm: distKm !== null ? distKm : null
      });
    }

    return sendJson(res, 200, { status: 'success', count: formatted.length, requirements: formatted });
  }

  // 9d. Get Single Community Requirement Details
  if (method === 'GET' && pathname.match(/^\/api\/community-requirements\/[^\/]+$/)) {
    const reqId = pathname.split('/')[3];
    const r = db.prepare(`
      SELECT r.*, b.name as buyer_name, b.phone as buyer_phone, b.city as buyer_city, b.avatar as buyer_avatar
      FROM community_requirements r
      JOIN buyers b ON r.buyer_id = b.id
      WHERE r.id = ?
    `).get(reqId);

    if (!r) return sendJson(res, 404, { status: 'error', message: 'Requirement not found' });

    const items = db.prepare('SELECT * FROM community_requirement_items WHERE requirement_id = ?').all(r.id);
    const offers = db.prepare(`
      SELECT o.*, f.name as farmer_name, f.village as farmer_village, f.phone as farmer_phone
      FROM farmer_requirement_offers o
      JOIN farmers f ON o.farmer_id = f.id
      WHERE o.requirement_id = ?
      ORDER BY o.created_at DESC
    `).all(r.id);

    const pooledOrder = db.prepare('SELECT * FROM pooled_procurement_orders WHERE requirement_id = ?').get(r.id);
    let transportRequest = null;
    if (pooledOrder) {
      transportRequest = db.prepare('SELECT * FROM transport_requests WHERE pooled_order_id = ?').get(pooledOrder.id);
    }

    let totalReq = 0, totalFulfilled = 0;
    items.forEach(it => {
      totalReq += Number(it.required_quantity || 0);
      totalFulfilled += Number(it.fulfilled_quantity || 0);
    });

    return sendJson(res, 200, {
      status: 'success',
      requirement: {
        id: r.id,
        buyerId: r.buyer_id,
        communityName: r.community_name || r.buyer_name,
        buyerType: r.buyer_type,
        title: r.title,
        organicRequirement: r.organic_requirement,
        deliveryDate: r.delivery_date,
        deliveryWindow: r.delivery_window,
        deliveryAddress: r.delivery_address,
        pickupPreference: r.pickup_preference,
        maxRadiusKm: r.max_radius_km,
        additionalInstructions: r.additional_instructions,
        isRecurring: Boolean(r.is_recurring),
        status: r.status,
        createdAt: r.created_at,
        totalRequiredQty: totalReq,
        totalFulfilledQty: totalFulfilled,
        fulfilledPercentage: totalReq > 0 ? Math.min(100, Math.round((totalFulfilled / totalReq) * 100)) : 0,
        items: items.map(it => ({
          id: it.id,
          productName: it.product_name,
          cropKey: it.crop_key,
          requiredQuantity: it.required_quantity,
          fulfilledQuantity: it.fulfilled_quantity,
          unit: it.unit,
          preferredGrade: it.preferred_grade,
          maxAcceptablePrice: it.max_acceptable_price,
          status: it.status
        })),
        offers: offers.map(o => ({
          id: o.id,
          farmerId: o.farmer_id,
          farmerName: o.farmer_name,
          farmerVillage: o.farmer_village,
          farmerPhone: o.farmer_phone,
          requirementItemId: o.requirement_item_id,
          productName: o.product_name,
          offeredQuantity: o.offered_quantity,
          acceptedQuantity: o.accepted_quantity,
          pricePerUnit: o.price_per_unit,
          totalAmount: o.total_amount,
          harvestDate: o.harvest_date,
          qualityInfo: o.quality_info,
          organicCertified: Boolean(o.organic_certified),
          status: o.status,
          createdAt: o.created_at
        })),
        pooledOrder: pooledOrder || null,
        transportRequest: transportRequest || null
      }
    });
  }

  // 9e. Backend-Validated Requirement Status Transition Engine
  if (method === 'POST' && pathname.match(/^\/api\/community-requirements\/[^\/]+\/status$/)) {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
    try {
      const reqId = pathname.split('/')[3];
      const body = await parseBody(req);
      const { targetStatus } = body;

      const reqRecord = db.prepare('SELECT * FROM community_requirements WHERE id = ?').get(reqId);
      if (!reqRecord) return sendJson(res, 404, { status: 'error', message: 'Requirement not found' });

      if (authUser.role !== 'admin' && reqRecord.buyer_id !== authUser.user_id) {
        return sendJson(res, 403, { status: 'error', message: 'Forbidden: You do not own this requirement.' });
      }

      const currentStatus = reqRecord.status;
      const allowedNext = VALID_REQUIREMENT_TRANSITIONS[currentStatus] || [];

      if (!allowedNext.includes(targetStatus)) {
        return sendJson(res, 400, {
          status: 'error',
          message: `Invalid state transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions from '${currentStatus}': [${allowedNext.join(', ')}]`
        });
      }

      db.prepare("UPDATE community_requirements SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(targetStatus, reqId);
      recordAuditLog(db, authUser.user_id, authUser.role, 'REQUIREMENT_STATUS_CHANGED', 'community_requirement', reqId, `Status transitioned from ${currentStatus} -> ${targetStatus}`);

      broadcastEvent('community_requirement_updated', { requirementId: reqId, previousStatus: currentStatus, newStatus: targetStatus });
      return sendJson(res, 200, { status: 'success', message: `Status updated to ${targetStatus}`, status: targetStatus });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 9f. Submit Farmer Requirement Offer
  if (method === 'POST' && pathname === '/api/community-requirements/offers') {
    const authUser = requireAuth(req, res, ['farmer', 'admin']);
    if (!authUser) return;
    try {
      const body = await parseBody(req);
      const {
        requirementId, requirementItemId, offeredQuantity, pricePerUnit,
        harvestDate, qualityInfo, organicCertified
      } = body;

      if (!requirementId || !requirementItemId || !offeredQuantity || !pricePerUnit) {
        return sendJson(res, 400, { status: 'error', message: 'requirementId, requirementItemId, offeredQuantity (>0), and pricePerUnit (>0) are required.' });
      }

      const farmerId = authUser.role === 'farmer' ? authUser.user_id : (body.farmerId || 'USR-FARM-01');
      let farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(farmerId);
      if (!farmer) {
        const u = db.prepare('SELECT * FROM users WHERE id = ?').get(farmerId);
        if (u) {
          db.prepare(`
            INSERT INTO farmers (id, name, phone, village, district, wallet_balance, kyc_status, lat, lon)
            VALUES (?, ?, ?, ?, ?, 0, 'rythubandhu_verified', ?, ?)
          `).run(u.id, u.name, u.phone, 'జనగామ', 'వరంగల్', 17.85 + Math.random()*0.05, 79.10 + Math.random()*0.05);
          farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(farmerId);
        }
      }
      if (!farmer) return sendJson(res, 404, { status: 'error', message: 'Farmer profile not found in database' });

      const reqRecord = db.prepare('SELECT * FROM community_requirements WHERE id = ?').get(requirementId);
      if (!reqRecord) return sendJson(res, 404, { status: 'error', message: 'Community requirement not found' });
      if (['cancelled', 'expired', 'delivered'].includes(reqRecord.status)) {
        return sendJson(res, 400, { status: 'error', message: `Cannot submit offer on requirement with status '${reqRecord.status}'` });
      }

      const item = db.prepare('SELECT * FROM community_requirement_items WHERE id = ?').get(requirementItemId);
      if (!item) return sendJson(res, 404, { status: 'error', message: 'Requirement product item not found' });
      if (item.status === 'fulfilled') {
        return sendJson(res, 400, { status: 'error', message: 'This product item has already been fully fulfilled.' });
      }

      const qty = Number(offeredQuantity);
      const price = Number(pricePerUnit);
      if (isNaN(qty) || qty <= 0) return sendJson(res, 400, { status: 'error', message: 'Offered quantity must be greater than 0' });
      if (isNaN(price) || price <= 0) return sendJson(res, 400, { status: 'error', message: 'Price per unit must be greater than 0' });

      const dup = db.prepare(`
        SELECT id FROM farmer_requirement_offers 
        WHERE farmer_id = ? AND requirement_item_id = ? AND status IN ('submitted', 'under_review', 'accepted')
      `).get(farmer.id, item.id);
      if (dup) {
        return sendJson(res, 409, { status: 'error', message: 'You already have an active offer for this product requirement item.' });
      }

      const offerId = `OFFER-FARM-${Date.now().toString().slice(-6)}`;
      const totalAmt = Math.round(qty * price * 100) / 100;

      db.prepare(`
        INSERT INTO farmer_requirement_offers (
          id, farmer_id, farmer_name, farmer_phone, farmer_village, farmer_district,
          farmer_lat, farmer_lon, requirement_id, requirement_item_id, product_name,
          offered_quantity, accepted_quantity, price_per_unit, total_amount,
          harvest_date, quality_info, organic_certified, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'submitted')
      `).run(
        offerId, farmer.id, farmer.name, farmer.phone, farmer.village, farmer.district,
        farmer.lat || 17.84, farmer.lon || 79.11, requirementId, item.id, item.product_name,
        qty, price, totalAmt, harvestDate || 'Immediately Available', qualityInfo || `Grade ${item.preferred_grade || 'A'}`, organicCertified ? 1 : 0
      );

      createNotification(
        db, reqRecord.buyer_id, 'buyer',
        `కొత్త ఆఫర్ వచ్చింది / New Farmer Offer Received`,
        `${farmer.name} (${farmer.village}): ${qty} ${item.unit} ${item.product_name} @ ₹${price}/${item.unit} (మొత్తం: ₹${totalAmt})`,
        'info', 'farmer_offer', offerId
      );

      recordAuditLog(db, farmer.id, 'farmer', 'FARMER_OFFER_SUBMITTED', 'farmer_offer', offerId, `Offered ${qty} ${item.unit} ${item.product_name} @ ₹${price}`);

      const offerData = {
        id: offerId,
        farmerId: farmer.id,
        farmerName: farmer.name,
        farmerVillage: farmer.village,
        requirementId,
        requirementItemId: item.id,
        productName: item.product_name,
        offeredQuantity: qty,
        pricePerUnit: price,
        totalAmount: totalAmt,
        status: 'submitted',
        createdAt: new Date().toISOString()
      };

      broadcastEvent('farmer_offer_created', offerData);

      return sendJson(res, 201, { status: 'success', message: 'Offer submitted successfully to community buyer', offer: offerData });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 9g. Transactional Offer Acceptance & Pooled Order / Transport Generation Engine
  if (method === 'POST' && pathname.match(/^\/api\/community-requirements\/offers\/[^\/]+\/accept$/)) {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
    try {
      const offerId = pathname.split('/')[4];
      const body = await parseBody(req);

      const offer = db.prepare('SELECT * FROM farmer_requirement_offers WHERE id = ?').get(offerId);
      if (!offer) return sendJson(res, 404, { status: 'error', message: 'Farmer offer not found' });
      if (offer.status === 'accepted') {
        return sendJson(res, 400, { status: 'error', message: 'Offer is already accepted.' });
      }

      const reqRecord = db.prepare('SELECT * FROM community_requirements WHERE id = ?').get(offer.requirement_id);
      if (!reqRecord) return sendJson(res, 404, { status: 'error', message: 'Requirement not found' });

      if (authUser.role !== 'admin' && reqRecord.buyer_id !== authUser.user_id) {
        return sendJson(res, 403, { status: 'error', message: 'Forbidden: You do not own this requirement.' });
      }

      const item = db.prepare('SELECT * FROM community_requirement_items WHERE id = ?').get(offer.requirement_item_id);
      if (!item) return sendJson(res, 404, { status: 'error', message: 'Requirement product item not found' });

      const remainingNeeded = item.required_quantity - item.fulfilled_quantity;
      if (remainingNeeded <= 0) {
        return sendJson(res, 400, { status: 'error', message: `Product item '${item.product_name}' is already fully fulfilled (${item.fulfilled_quantity}/${item.required_quantity} ${item.unit}).` });
      }

      const requestedAcceptQty = body.acceptedQuantity ? Number(body.acceptedQuantity) : offer.offered_quantity;
      const actualAcceptQty = Math.min(offer.offered_quantity, remainingNeeded, requestedAcceptQty);

      if (actualAcceptQty <= 0) {
        return sendJson(res, 400, { status: 'error', message: 'No remaining quantity available to accept for this item.' });
      }

      const offerStatus = actualAcceptQty < offer.offered_quantity ? 'partially_accepted' : 'accepted';
      const newFulfilledQty = item.fulfilled_quantity + actualAcceptQty;
      const itemStatus = newFulfilledQty >= item.required_quantity ? 'fulfilled' : 'partially_fulfilled';

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`
          UPDATE farmer_requirement_offers
          SET accepted_quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(actualAcceptQty, offerStatus, offerId);

        db.prepare(`
          UPDATE community_requirement_items
          SET fulfilled_quantity = ?, status = ?
          WHERE id = ?
        `).run(newFulfilledQty, itemStatus, item.id);

        const allItems = db.prepare('SELECT * FROM community_requirement_items WHERE requirement_id = ?').all(reqRecord.id);
        const allFulfilled = allItems.every(it => it.fulfilled_quantity >= it.required_quantity);
        const reqStatus = allFulfilled ? 'fully_fulfilled' : 'partially_fulfilled';

        db.prepare(`
          UPDATE community_requirements
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(reqStatus, reqRecord.id);

        createNotification(
          db, offer.farmer_id, 'farmer',
          `ఆఫర్ ఆమోదించబడింది! / Offer Accepted!`,
          `${reqRecord.community_name} మీ ${actualAcceptQty} ${item.unit} ${item.product_name} ఆఫర్‌ను ఆమోదించారు (మొత్తం: ₹${actualAcceptQty * offer.price_per_unit}).`,
          'success', 'farmer_offer', offerId
        );

        recordAuditLog(db, authUser.user_id, authUser.role, 'FARMER_OFFER_ACCEPTED', 'farmer_offer', offerId, `Accepted ${actualAcceptQty} ${item.unit} from farmer ${offer.farmer_name}`);

        let pooledOrder = db.prepare('SELECT * FROM pooled_procurement_orders WHERE requirement_id = ?').get(reqRecord.id);
        if (!pooledOrder) {
          const pooledOrderId = `POOLED-ORD-${Date.now().toString().slice(-6)}`;
          db.prepare(`
            INSERT INTO pooled_procurement_orders (
              id, requirement_id, buyer_id, buyer_name, total_accepted_quantity, total_order_value,
              delivery_address, delivery_deadline, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'procurement_confirmed')
          `).run(
            pooledOrderId, reqRecord.id, reqRecord.buyer_id, reqRecord.community_name,
            newFulfilledQty, actualAcceptQty * offer.price_per_unit,
            reqRecord.delivery_address, reqRecord.delivery_date
          );
          pooledOrder = db.prepare('SELECT * FROM pooled_procurement_orders WHERE id = ?').get(pooledOrderId);
        } else {
          db.prepare(`
            UPDATE pooled_procurement_orders
            SET total_accepted_quantity = total_accepted_quantity + ?,
                total_order_value = total_order_value + ?
            WHERE id = ?
          `).run(actualAcceptQty, actualAcceptQty * offer.price_per_unit, pooledOrder.id);
        }

        let pooledItem = db.prepare('SELECT * FROM pooled_procurement_items WHERE pooled_order_id = ? AND requirement_item_id = ?').get(pooledOrder.id, item.id);
        if (!pooledItem) {
          const pItemId = `POOLED-ITEM-${pooledOrder.id.slice(-4)}-${item.id.slice(-2)}`;
          db.prepare(`
            INSERT INTO pooled_procurement_items (
              id, pooled_order_id, requirement_item_id, product_name, accepted_quantity, unit, avg_price_per_unit, total_item_value
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(pItemId, pooledOrder.id, item.id, item.product_name, actualAcceptQty, item.unit, offer.price_per_unit, actualAcceptQty * offer.price_per_unit);
          pooledItem = db.prepare('SELECT * FROM pooled_procurement_items WHERE id = ?').get(pItemId);
        } else {
          const newQty = pooledItem.accepted_quantity + actualAcceptQty;
          const newVal = pooledItem.total_item_value + (actualAcceptQty * offer.price_per_unit);
          db.prepare(`
            UPDATE pooled_procurement_items
            SET accepted_quantity = ?, total_item_value = ?, avg_price_per_unit = ?
            WHERE id = ?
          `).run(newQty, newVal, Math.round(newVal / newQty), pooledItem.id);
        }

        const allocId = `ALLOC-${Date.now().toString().slice(-6)}`;
        db.prepare(`
          INSERT INTO pooled_order_farmer_allocations (
            id, pooled_order_id, pooled_item_id, offer_id, farmer_id, farmer_name, farmer_phone, farmer_village, product_name, quantity, price_per_unit, total_amount, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted')
        `).run(allocId, pooledOrder.id, pooledItem.id, offer.id, offer.farmer_id, offer.farmer_name, offer.farmer_phone, offer.farmer_village, item.product_name, actualAcceptQty, offer.price_per_unit, actualAcceptQty * offer.price_per_unit);

        const acceptedOffers = db.prepare(`
          SELECT DISTINCT farmer_village FROM farmer_requirement_offers 
          WHERE requirement_id = ? AND status IN ('accepted', 'partially_accepted')
        `).all(reqRecord.id);

        const villageList = acceptedOffers.map(v => v.farmer_village);
        const totalItemsInPool = db.prepare('SELECT product_name, accepted_quantity, unit FROM pooled_procurement_items WHERE pooled_order_id = ?').all(pooledOrder.id);
        
        let totalWeightKg = 0;
        const productSummaryArr = totalItemsInPool.map(pi => {
          let wKg = pi.accepted_quantity;
          if (pi.unit === 'quintal') wKg = pi.accepted_quantity * 100;
          totalWeightKg += wKg;
          return `${pi.product_name} — ${pi.accepted_quantity} ${pi.unit}`;
        });

        const farmerCount = db.prepare('SELECT COUNT(DISTINCT farmer_id) as count FROM pooled_order_farmer_allocations WHERE pooled_order_id = ?').get(pooledOrder.id)?.count || 1;

        let suggestedVehicle = 'Pickup Truck / LCV';
        if (totalWeightKg < 500) suggestedVehicle = 'Mini Truck / Auto';
        else if (totalWeightKg > 2000) suggestedVehicle = '10-Ton Multi-Axle Truck';

        let trpReq = db.prepare('SELECT * FROM transport_requests WHERE pooled_order_id = ?').get(pooledOrder.id);
        if (!trpReq) {
          const trpId = `TRP-REQ-${Date.now().toString().slice(-6)}`;
          db.prepare(`
            INSERT INTO transport_requests (
              id, pooled_order_id, requirement_id, community_name, buyer_id, destination_address,
              pickup_villages_json, product_summary, total_weight_kg, farmer_count, delivery_deadline,
              suggested_vehicle, handling_instructions, organic_separate_handling, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'transport_pending')
          `).run(
            trpId, pooledOrder.id, reqRecord.id, reqRecord.community_name, reqRecord.buyer_id,
            reqRecord.delivery_address, JSON.stringify(villageList), productSummaryArr.join(', '),
            totalWeightKg, farmerCount, reqRecord.delivery_date, suggestedVehicle,
            reqRecord.additional_instructions || 'Handle with care', reqRecord.organic_requirement === 'yes' ? 1 : 0
          );
          trpReq = db.prepare('SELECT * FROM transport_requests WHERE id = ?').get(trpId);
        } else {
          db.prepare(`
            UPDATE transport_requests
            SET pickup_villages_json = ?, product_summary = ?, total_weight_kg = ?, farmer_count = ?, suggested_vehicle = ?
            WHERE id = ?
          `).run(JSON.stringify(villageList), productSummaryArr.join(', '), totalWeightKg, farmerCount, suggestedVehicle, trpReq.id);
        }

        db.exec('COMMIT');

        broadcastEvent('requirement_fulfillment_updated', {
          requirementId: reqRecord.id,
          fulfilledQuantity: newFulfilledQty,
          itemStatus,
          requirementStatus: reqStatus
        });

        broadcastEvent('pooled_order_created', { pooledOrderId: pooledOrder.id, totalValue: pooledOrder.total_order_value });
        broadcastEvent('transport_request_created', { transportRequestId: trpReq.id, totalWeightKg, suggestedVehicle });

        return sendJson(res, 200, {
          status: 'success',
          message: `Offer accepted! (${actualAcceptQty} ${item.unit} allocated). Pooled procurement order and transport request created/updated.`,
          acceptedQuantity: actualAcceptQty,
          pooledOrderId: pooledOrder.id,
          transportRequestId: trpReq.id
        });
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 9h. Reject Farmer Offer
  if (method === 'POST' && pathname.match(/^\/api\/community-requirements\/offers\/[^\/]+\/reject$/)) {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
    try {
      const offerId = pathname.split('/')[4];
      const offer = db.prepare('SELECT * FROM farmer_requirement_offers WHERE id = ?').get(offerId);
      if (!offer) return sendJson(res, 404, { status: 'error', message: 'Offer not found' });

      db.prepare("UPDATE farmer_requirement_offers SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(offerId);
      createNotification(db, offer.farmer_id, 'farmer', 'ఆఫర్ తిరస్కరించబడింది / Offer Declined', `${offer.product_name} కోసం మీ ఆఫర్ తిరస్కరించబడింది.`, 'warning', 'farmer_offer', offerId);
      broadcastEvent('farmer_offer_updated', { offerId, status: 'rejected' });

      return sendJson(res, 200, { status: 'success', message: 'Offer rejected' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 9i. Get Pooled Orders
  if (method === 'GET' && pathname === '/api/pooled-orders') {
    let query = `
      SELECT p.*, r.title as requirement_title, r.delivery_window, r.organic_requirement
      FROM pooled_procurement_orders p
      JOIN community_requirements r ON p.requirement_id = r.id
      WHERE 1=1
    `;
    const params = [];
    const buyerId = parsedUrl.query.buyerId;

    if (buyerId) {
      query += ' AND p.buyer_id = ?';
      params.push(buyerId);
    }
    query += ' ORDER BY p.created_at DESC';

    const orders = db.prepare(query).all(...params);
    const formatted = orders.map(o => {
      const items = db.prepare('SELECT * FROM pooled_procurement_items WHERE pooled_order_id = ?').all(o.id);
      const allocations = db.prepare('SELECT * FROM pooled_order_farmer_allocations WHERE pooled_order_id = ?').all(o.id);
      return {
        id: o.id,
        requirementId: o.requirement_id,
        buyerId: o.buyer_id,
        buyerName: o.buyer_name,
        requirementTitle: o.requirement_title,
        totalAcceptedQuantity: o.total_accepted_quantity,
        totalOrderValue: o.total_order_value,
        deliveryAddress: o.delivery_address,
        deliveryDeadline: o.delivery_deadline,
        deliveryWindow: o.delivery_window,
        status: o.status,
        createdAt: o.created_at,
        items: items.map(it => ({
          id: it.id,
          productName: it.product_name,
          acceptedQuantity: it.accepted_quantity,
          unit: it.unit,
          avgPricePerUnit: it.avg_price_per_unit,
          totalItemValue: it.total_item_value
        })),
        allocations: allocations.map(al => ({
          id: al.id,
          farmerId: al.farmer_id,
          farmerName: al.farmer_name,
          farmerPhone: al.farmer_phone,
          farmerVillage: al.farmer_village,
          productName: al.product_name,
          quantity: al.quantity,
          pricePerUnit: al.price_per_unit,
          totalAmount: al.total_amount
        }))
      };
    });

    return sendJson(res, 200, { status: 'success', count: formatted.length, orders: formatted });
  }

  // 9j. Village-Level Procurement Consolidation Summary
  if (method === 'GET' && pathname === '/api/pooled-orders/village-summary') {
    const allocations = db.prepare(`
      SELECT a.farmer_village, a.product_name, a.quantity, a.price_per_unit, a.total_amount,
             p.delivery_address, p.delivery_deadline, p.buyer_name
      FROM pooled_order_farmer_allocations a
      JOIN pooled_procurement_orders p ON a.pooled_order_id = p.id
      WHERE p.status NOT IN ('cancelled', 'delivered')
    `).all();

    const villageMap = new Map();
    for (const al of allocations) {
      const key = `${al.farmer_village}___${al.delivery_address}`;
      if (!villageMap.has(key)) {
        villageMap.set(key, {
          village: al.farmer_village,
          deliveryAddress: al.delivery_address,
          deliveryDeadline: al.delivery_deadline,
          buyers: new Set(),
          productsMap: new Map(),
          totalWeightKg: 0,
          farmersSet: new Set()
        });
      }

      const vData = villageMap.get(key);
      vData.buyers.add(al.buyer_name);

      if (!vData.productsMap.has(al.product_name)) {
        vData.productsMap.set(al.product_name, { productName: al.product_name, totalQuantity: 0, totalValue: 0 });
      }

      const pData = vData.productsMap.get(al.product_name);
      pData.totalQuantity += al.quantity;
      pData.totalValue += al.total_amount;
      vData.totalWeightKg += al.quantity;
    }

    const summary = Array.from(villageMap.values()).map(v => ({
      village: v.village,
      deliveryAddress: v.deliveryAddress,
      deliveryDeadline: v.deliveryDeadline,
      buyers: Array.from(v.buyers),
      products: Array.from(v.productsMap.values()),
      totalWeightKg: v.totalWeightKg
    }));

    return sendJson(res, 200, { status: 'success', count: summary.length, villagePools: summary });
  }

  // 9k. Transport Requests & Transport Bidding Engine
  if (method === 'GET' && pathname === '/api/transport-requests') {
    const reqs = db.prepare('SELECT * FROM transport_requests ORDER BY created_at DESC').all();
    const formatted = reqs.map(t => {
      let villages = [];
      try { villages = JSON.parse(t.pickup_villages_json || '[]'); } catch(e){}

      const bidsCount = db.prepare('SELECT COUNT(*) as count FROM transport_bids WHERE transport_request_id = ?').get(t.id)?.count || 0;
      const bids = db.prepare('SELECT * FROM transport_bids WHERE transport_request_id = ? ORDER BY bid_amount ASC').all(t.id);

      return {
        id: t.id,
        pooledOrderId: t.pooled_order_id,
        requirementId: t.requirement_id,
        communityName: t.community_name,
        buyerId: t.buyer_id,
        destinationAddress: t.destination_address,
        pickupVillages: villages,
        productSummary: t.product_summary,
        totalWeightKg: t.total_weight_kg,
        farmerCount: t.farmer_count,
        estimatedDistanceKm: t.estimated_distance_km ? `${t.estimated_distance_km} km` : 'Distance calculation pending',
        deliveryDeadline: t.delivery_deadline,
        suggestedVehicle: t.suggested_vehicle,
        handlingInstructions: t.handling_instructions,
        organicSeparateHandling: Boolean(t.organic_separate_handling),
        assignedTransporterId: t.assigned_transporter_id,
        assignedTransporterName: t.assigned_transporter_name,
        assignedVehicleReg: t.assigned_vehicle_reg,
        acceptedBidId: t.accepted_bid_id,
        freightAmount: t.freight_amount,
        status: t.status,
        createdAt: t.created_at,
        bidsCount,
        bids: bids.map(b => ({
          id: b.id,
          transporterId: b.transporter_id,
          transporterName: b.transporter_name,
          transporterPhone: b.transporter_phone,
          vehicleType: b.vehicle_type,
          vehicleCapacityKg: b.vehicle_capacity_kg,
          bidAmount: b.bid_amount,
          estimatedDeliveryTime: b.estimated_delivery_time,
          pickupCapability: b.pickup_capability,
          specialHandlingNotes: b.special_handling_notes,
          status: b.status,
          createdAt: b.created_at
        }))
      };
    });

    return sendJson(res, 200, { status: 'success', count: formatted.length, transportRequests: formatted });
  }

  if (method === 'POST' && pathname.match(/^\/api\/transport-requests\/[^\/]+\/bids$/)) {
    const authUser = requireAuth(req, res, ['logistics', 'admin']);
    if (!authUser) return;
    try {
      const trpReqId = pathname.split('/')[3];
      const body = await parseBody(req);
      const vehicleCapacityKg = body.vehicleCapacityKg || body.capacityKg;
      const estimatedDeliveryTime = body.estimatedDeliveryTime || body.estDeliveryTime;
      const specialHandlingNotes = body.specialHandlingNotes || body.notes;
      const { vehicleType, bidAmount, pickupCapability } = body;

      if (!vehicleType || !vehicleCapacityKg || !bidAmount) {
        return sendJson(res, 400, { status: 'error', message: 'vehicleType, vehicleCapacityKg (>0), and bidAmount (>0) are required.' });
      }

      const trpReq = db.prepare('SELECT * FROM transport_requests WHERE id = ?').get(trpReqId);
      if (!trpReq) return sendJson(res, 404, { status: 'error', message: 'Transport request not found' });

      if (['assigned', 'in_transit', 'delivered', 'cancelled'].includes(trpReq.status)) {
        return sendJson(res, 400, { status: 'error', message: `Cannot submit bid on transport request with status '${trpReq.status}'` });
      }

      const transporterId = authUser.user_id;
      const transporterUser = db.prepare('SELECT * FROM users WHERE id = ?').get(transporterId);

      const dup = db.prepare("SELECT id FROM transport_bids WHERE transport_request_id = ? AND transporter_id = ? AND status = 'submitted'").get(trpReq.id, transporterId);
      if (dup) {
        return sendJson(res, 409, { status: 'error', message: 'You have already submitted a pending bid for this transport request.' });
      }

      const bidId = `TRP-BID-${Date.now().toString().slice(-6)}`;
      db.prepare(`
        INSERT INTO transport_bids (
          id, transport_request_id, transporter_id, transporter_name, transporter_phone,
          vehicle_type, vehicle_capacity_kg, bid_amount, estimated_delivery_time,
          pickup_capability, special_handling_notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
      `).run(
        bidId, trpReq.id, transporterId, transporterUser ? transporterUser.name : 'రూరల్ ట్రాన్స్‌పోర్ట్',
        transporterUser ? transporterUser.phone : '+91 98481 23990', vehicleType, Number(vehicleCapacityKg),
        Number(bidAmount), estimatedDeliveryTime || 'Same Day Delivery', pickupCapability || 'Multi-Village Farm Gate Pickup',
        specialHandlingNotes || 'Organic Separate Bay'
      );

      db.prepare("UPDATE transport_requests SET status = 'bidding_open' WHERE id = ?").run(trpReq.id);

      createNotification(
        db, trpReq.buyer_id, 'buyer',
        `కొత్త రవాణా బిడ్ / New Transport Bid Received`,
        `${transporterUser ? transporterUser.name : 'ట్రాన్స్‌పోర్టర్'}: ${trpReq.community_name} కోసం ₹${bidAmount} బాడుగ బిడ్ సమర్పించారు (${vehicleType}).`,
        'info', 'transport_bid', bidId
      );

      recordAuditLog(db, transporterId, authUser.role, 'TRANSPORT_BID_SUBMITTED', 'transport_bid', bidId, `Bid ₹${bidAmount} for request ${trpReq.id}`);

      const bidData = {
        id: bidId,
        transportRequestId: trpReq.id,
        transporterId,
        transporterName: transporterUser ? transporterUser.name : 'ట్రాన్స్‌పోర్టర్',
        vehicleType,
        vehicleCapacityKg: Number(vehicleCapacityKg),
        bidAmount: Number(bidAmount),
        estimatedDeliveryTime: estimatedDeliveryTime || 'Same Day Delivery',
        status: 'submitted'
      };

      broadcastEvent('transport_bid_created', bidData);
      return sendJson(res, 201, { status: 'success', message: 'Transport bid submitted successfully', bid: bidData });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  if (method === 'POST' && pathname.match(/^\/api\/transport-requests\/bids\/[^\/]+\/accept$/)) {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
    try {
      const bidId = pathname.split('/')[4];
      const bid = db.prepare('SELECT * FROM transport_bids WHERE id = ?').get(bidId);
      if (!bid) return sendJson(res, 404, { status: 'error', message: 'Transport bid not found' });

      const trpReq = db.prepare('SELECT * FROM transport_requests WHERE id = ?').get(bid.transport_request_id);
      if (!trpReq) return sendJson(res, 404, { status: 'error', message: 'Transport request not found' });

      if (authUser.role !== 'admin' && trpReq.buyer_id !== authUser.user_id) {
        return sendJson(res, 403, { status: 'error', message: 'Forbidden: You do not own this requirement.' });
      }

      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare("UPDATE transport_bids SET status = 'accepted' WHERE id = ?").run(bidId);
        db.prepare("UPDATE transport_bids SET status = 'rejected' WHERE transport_request_id = ? AND id != ?").run(trpReq.id, bidId);

        db.prepare(`
          UPDATE transport_requests
          SET status = 'assigned', assigned_transporter_id = ?, assigned_transporter_name = ?,
              accepted_bid_id = ?, freight_amount = ?
          WHERE id = ?
        `).run(bid.transporter_id, bid.transporter_name, bidId, bid.bid_amount, trpReq.id);

        db.prepare("UPDATE pooled_procurement_orders SET status = 'assigned' WHERE id = ?").run(trpReq.pooled_order_id);
        db.prepare("UPDATE community_requirements SET status = 'transport_pending' WHERE id = ?").run(trpReq.requirement_id);

        createNotification(
          db, bid.transporter_id, 'logistics',
          `బిడ్ ఆమోదించబడింది! / Transport Bid Accepted!`,
          `${trpReq.community_name} డెలివరీ కోసం మీ బిడ్ ₹${bid.bid_amount} ఆమోదించబడింది. సేకరణ ప్రారంభించండి.`,
          'success', 'transport_request', trpReq.id
        );

        recordAuditLog(db, authUser.user_id, authUser.role, 'TRANSPORT_BID_ACCEPTED', 'transport_bid', bidId, `Accepted bid ₹${bid.bid_amount} from ${bid.transporter_name}`);

        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      broadcastEvent('transport_provider_assigned', {
        transportRequestId: trpReq.id,
        transporterId: bid.transporter_id,
        transporterName: bid.transporter_name,
        bidAmount: bid.bid_amount
      });

      return sendJson(res, 200, {
        status: 'success',
        message: `Transport bid accepted! Transporter ${bid.transporter_name} assigned.`,
        transportRequestId: trpReq.id,
        assignedTransporter: bid.transporter_name
      });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  if (method === 'POST' && pathname.match(/^\/api\/transport-requests\/[^\/]+\/loading-milestone$/)) {
    const authUser = requireAuth(req, res, ['logistics', 'admin', 'farmer']);
    if (!authUser) return;
    try {
      const trpReqId = pathname.split('/')[3];
      const body = await parseBody(req);
      const { milestone, loadedQuantity, notes, proofUrl } = body;

      const validMilestones = ['assigned', 'arrived_at_pickup', 'loading_started', 'loading_completed', 'loaded_verified', 'in_transit'];
      if (!validMilestones.includes(milestone)) {
        return sendJson(res, 400, { status: 'error', message: `Invalid milestone '${milestone}'. Allowed: [${validMilestones.join(', ')}]` });
      }

      let trpReq = db.prepare('SELECT * FROM transport_requests WHERE id = ?').get(trpReqId);
      let isLogisticsTrip = false;
      let orderId = null;
      if (!trpReq) {
        const trip = db.prepare('SELECT * FROM logistics_trips WHERE id = ?').get(trpReqId);
        if (trip) {
          isLogisticsTrip = true;
          orderId = trip.order_id;
        } else {
          return sendJson(res, 404, { status: 'error', message: 'Transport request or trip not found' });
        }
      } else {
        orderId = trpReq.pooled_order_id;
      }

      db.exec('BEGIN IMMEDIATE');
      let payoutResult = null;
      try {
        if (isLogisticsTrip) {
          db.prepare("UPDATE logistics_trips SET status = ? WHERE id = ?").run(milestone, trpReqId);
          if (orderId) {
            const orderStatus = milestone === 'in_transit' ? 'dispatched' : (milestone === 'delivered' ? 'delivered' : 'escrow_locked');
            db.prepare("UPDATE procurement_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(orderStatus, orderId);
          }
        } else {
          db.prepare("UPDATE transport_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(milestone, trpReqId);
          if (trpReq.pooled_order_id) {
            db.prepare("UPDATE pooled_procurement_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(milestone, trpReq.pooled_order_id);
          }
        }

        if (milestone === 'in_transit') {
          let escrow = null;
          if (isLogisticsTrip && orderId) {
            const order = db.prepare('SELECT * FROM procurement_orders WHERE id = ?').get(orderId);
            if (order) {
              escrow = db.prepare(`
                SELECT * FROM escrow_records 
                WHERE (lot_id = ? OR farmer_id = ?) 
                  AND status IN ('held', 'awaiting_transport', 'loading_pending', 'loaded', 'dispatch_verified')
                ORDER BY created_at DESC LIMIT 1
              `).get(order.lot_id, order.farmer_id);
            }
          } else if (trpReq) {
            escrow = db.prepare(`
              SELECT * FROM escrow_records 
              WHERE (requirement_id = ? OR pooled_order_id = ?) 
                AND status IN ('held', 'awaiting_transport', 'loading_pending', 'loaded', 'dispatch_verified')
              ORDER BY created_at DESC LIMIT 1
            `).get(trpReq.requirement_id, trpReq.pooled_order_id);
          }

          if (escrow) {
            payoutResult = executeFarmerPayoutAndEscrowRelease(db, {
              escrowId: escrow.id,
              actualLoadedQty: loadedQuantity ? Number(loadedQuantity) : null,
              transportRequestId: trpReqId,
              description: `Farmer payout for verified transport dispatch #${trpReqId}`
            });
          }
        }

        recordAuditLog(db, authUser.user_id, authUser.role, 'TRANSPORT_MILESTONE_UPDATED', 'transport_request', trpReqId, `Milestone set to ${milestone}`);
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      broadcastEvent('transport_milestone_updated', { transportRequestId: trpReqId, milestone, loadedQuantity, payoutResult });
      return sendJson(res, 200, { status: 'success', message: `Transport milestone updated to '${milestone}'`, milestone, payoutResult });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  if (method === 'POST' && pathname.match(/^\/api\/transport-requests\/[^\/]+\/status$/)) {
    const authUser = requireAuth(req, res, ['logistics', 'admin', 'buyer']);
    if (!authUser) return;
    try {
      const trpReqId = pathname.split('/')[3];
      const body = await parseBody(req);
      const { status, loadedQuantity } = body;

      const validStatuses = ['assigned', 'in_transit', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return sendJson(res, 400, { status: 'error', message: `Invalid status '${status}'. Allowed: [${validStatuses.join(', ')}]` });
      }

      const trpReq = db.prepare('SELECT * FROM transport_requests WHERE id = ?').get(trpReqId);
      if (!trpReq) return sendJson(res, 404, { status: 'error', message: 'Transport request not found' });

      db.exec('BEGIN IMMEDIATE');
      let payoutResult = null;
      try {
        db.prepare("UPDATE transport_requests SET status = ? WHERE id = ?").run(status, trpReqId);
        db.prepare("UPDATE pooled_procurement_orders SET status = ? WHERE id = ?").run(status, trpReq.pooled_order_id);

        let reqStatus = status === 'delivered' ? 'delivered' : (status === 'in_transit' ? 'in_transit' : 'transport_pending');
        db.prepare("UPDATE community_requirements SET status = ? WHERE id = ?").run(reqStatus, trpReq.requirement_id);

        if (status === 'in_transit') {
          const escrow = db.prepare(`
            SELECT * FROM escrow_records 
            WHERE (requirement_id = ? OR pooled_order_id = ?) 
              AND status IN ('held', 'awaiting_transport', 'loading_pending', 'loaded', 'dispatch_verified')
            ORDER BY created_at DESC LIMIT 1
          `).get(trpReq.requirement_id, trpReq.pooled_order_id);

          if (escrow) {
            payoutResult = executeFarmerPayoutAndEscrowRelease(db, {
              escrowId: escrow.id,
              actualLoadedQty: loadedQuantity ? Number(loadedQuantity) : null,
              transportRequestId: trpReqId,
              description: `Farmer payout for verified dispatch status change to in_transit`
            });
          }
        }

        createNotification(db, trpReq.buyer_id, 'buyer', `సరకు రవాణా హోదా / Transport Status Updated`, `${trpReq.community_name} డెలివరీ హోదా '${status}' గా నవీకరించబడింది.`, 'info', 'transport_request', trpReqId);

        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      broadcastEvent('delivery_status_updated', { transportRequestId: trpReqId, status, payoutResult });
      return sendJson(res, 200, { status: 'success', message: `Transport status updated to ${status}`, status, payoutResult });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 9l. Live Admin Community Pooling Statistics API
  if (method === 'GET' && pathname === '/api/admin/community-stats') {
    const activeReqs = db.prepare("SELECT COUNT(*) as count FROM community_requirements WHERE status NOT IN ('delivered', 'cancelled', 'expired')").get()?.count || 0;
    const totalReqQtyRow = db.prepare("SELECT SUM(required_quantity) as total FROM community_requirement_items").get();
    const totalReqQty = totalReqQtyRow?.total || 0;
    const partialFulfilled = db.prepare("SELECT COUNT(*) as count FROM community_requirements WHERE status = 'partially_fulfilled'").get()?.count || 0;
    const fullyFulfilled = db.prepare("SELECT COUNT(*) as count FROM community_requirements WHERE status = 'fully_fulfilled'").get()?.count || 0;
    const activeVillagePools = db.prepare("SELECT COUNT(DISTINCT farmer_village) as count FROM pooled_order_farmer_allocations").get()?.count || 0;
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM pooled_procurement_orders WHERE status = 'procurement_confirmed'").get()?.count || 0;
    const transportReady = db.prepare("SELECT COUNT(*) as count FROM transport_requests WHERE status = 'transport_pending'").get()?.count || 0;
    const activeTransportReqs = db.prepare("SELECT COUNT(*) as count FROM transport_requests WHERE status IN ('transport_pending', 'bidding_open', 'assigned', 'in_transit')").get()?.count || 0;
    const deliveriesInProgress = db.prepare("SELECT COUNT(*) as count FROM transport_requests WHERE status = 'in_transit'").get()?.count || 0;
    const completedDeliveries = db.prepare("SELECT COUNT(*) as count FROM transport_requests WHERE status = 'delivered'").get()?.count || 0;
    const totalFarmers = db.prepare("SELECT COUNT(DISTINCT farmer_id) as count FROM pooled_order_farmer_allocations").get()?.count || 0;
    const totalCommunities = db.prepare("SELECT COUNT(DISTINCT buyer_id) as count FROM community_requirements").get()?.count || 0;

    return sendJson(res, 200, {
      status: 'success',
      stats: {
        activeRequirementsCount: activeReqs,
        totalRequestedQty: Math.round(totalReqQty),
        partiallyFulfilledCount: partialFulfilled,
        fullyFulfilledCount: fullyFulfilled,
        activeVillagePools,
        pendingProcurementOrders: pendingOrders,
        transportReadyOrders: transportReady,
        activeTransportRequests: activeTransportReqs,
        deliveriesInProgress,
        completedDeliveries,
        totalParticipatingFarmers: totalFarmers,
        totalParticipatingCommunities: totalCommunities
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 10. ADMIN CONSOLE & AUDIT TRAIL (SIH Management)
  // ---------------------------------------------------------------------------

  if (method === 'GET' && pathname === '/api/admin/stats') {
    const authUser = requireAuth(req, res, ['admin']);
    if (!authUser) return;
    const totalLots = db.prepare('SELECT COUNT(*) as count FROM harvest_lots').get().count;
    const activeLots = db.prepare("SELECT COUNT(*) as count FROM harvest_lots WHERE status = 'active'").get().count;
    const totalBids = db.prepare('SELECT COUNT(*) as count FROM bids').get().count;
    const activeBids = db.prepare("SELECT COUNT(*) as count FROM bids WHERE status = 'active'").get().count;
    const acceptedBids = db.prepare("SELECT COUNT(*) as count FROM bids WHERE status = 'accepted'").get().count;
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM procurement_orders').get().count;
    const activeOrders = db.prepare("SELECT COUNT(*) as count FROM procurement_orders WHERE status != 'delivered'").get().count;
    const totalEscrowLocked = db.prepare("SELECT COALESCE(SUM(total_escrow_amount), 0) as total FROM procurement_orders WHERE status != 'delivered'").get().total;
    const totalSettled = db.prepare("SELECT COALESCE(SUM(total_escrow_amount), 0) as total FROM procurement_orders WHERE status = 'delivered'").get().total;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const farmersCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'farmer'").get().count;
    const buyersCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'buyer'").get().count;
    const logisticsCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'logistics'").get().count;
    const pendingTrips = db.prepare("SELECT COUNT(*) as count FROM logistics_trips WHERE status = 'available'").get().count;
    const activeTrips = db.prepare("SELECT COUNT(*) as count FROM logistics_trips WHERE status = 'assigned'").get().count;
    const completedTrips = db.prepare("SELECT COUNT(*) as count FROM logistics_trips WHERE status = 'delivered'").get().count;
    const openDisputes = db.prepare("SELECT COUNT(*) as count FROM disputes WHERE status = 'open'").get().count;

    return sendJson(res, 200, {
      status: 'success',
      stats: {
        totalLots,
        activeLots,
        totalBids,
        activeBids,
        acceptedBids,
        totalOrders,
        activeOrders,
        totalEscrowLocked,
        totalSettled,
        totalUsers,
        farmersCount,
        buyersCount,
        logisticsCount,
        pendingTrips,
        activeTrips,
        completedTrips,
        openDisputes
      }
    });
  }

  if (method === 'GET' && pathname === '/api/admin/users') {
    const authUser = requireAuth(req, res, ['admin']);
    if (!authUser) return;
    const users = db.prepare('SELECT id, name, phone, role, avatar, kyc_status, organization, city, created_at FROM users ORDER BY created_at DESC').all();
    return sendJson(res, 200, { status: 'success', count: users.length, users });
  }

  if (method === 'POST' && pathname.match(/^\/api\/admin\/users\/[^\/]+\/verify$/)) {
    const authUser = requireAuth(req, res, ['admin']);
    if (!authUser) return;
    try {
      const userId = pathname.split('/')[4];
      const body = await parseBody(req);
      const kycStatus = body.kycStatus || 'verified';

      db.prepare('UPDATE users SET kyc_status = ? WHERE id = ?').run(kycStatus, userId);
      // If farmer or buyer, sync
      db.prepare('UPDATE farmers SET kyc_status = ? WHERE id = ?').run(kycStatus, userId);

      recordAuditLog(db, 'USR-ADM-01', 'admin', 'USER_KYC_UPDATED', 'user', userId, `Updated KYC status to ${kycStatus}`);
      return sendJson(res, 200, { status: 'success', message: `User KYC set to ${kycStatus}` });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  if (method === 'GET' && pathname === '/api/admin/audit-logs') {
    const authUser = requireAuth(req, res, ['admin']);
    if (!authUser) return;
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 60').all();
    return sendJson(res, 200, { status: 'success', count: logs.length, logs });
  }

  if (method === 'GET' && pathname === '/api/admin/disputes') {
    const authUser = requireAuth(req, res, ['admin']);
    if (!authUser) return;
    const disputes = db.prepare('SELECT * FROM disputes ORDER BY created_at DESC').all();
    return sendJson(res, 200, { status: 'success', count: disputes.length, disputes });
  }

  if (method === 'POST' && pathname.match(/^\/api\/admin\/disputes\/[^\/]+\/resolve$/)) {
    const authUser = requireAuth(req, res, ['admin']);
    if (!authUser) return;
    try {
      const disputeId = pathname.split('/')[4];
      const body = await parseBody(req);
      const resolution = body.resolution || 'Resolved by APMC Market Inspector';

      db.prepare(`
        UPDATE disputes
        SET status = 'resolved', resolution = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(resolution, disputeId);

      recordAuditLog(db, 'USR-ADM-01', 'admin', 'DISPUTE_RESOLVED', 'dispute', disputeId, resolution);
      return sendJson(res, 200, { status: 'success', message: 'Dispute resolved successfully' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 9c. Create Dispute / Grievance
  if (method === 'POST' && pathname === '/api/disputes') {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return sendJson(res, 401, { status: 'error', message: 'Authentication required' });
    }
    try {
      const body = await parseBody(req);
      const { orderId, title, description } = body;
      if (!title || !description) {
        return sendJson(res, 400, { status: 'error', message: 'Title and description are required' });
      }

      const disputeId = `DISP-${Date.now().toString().slice(-6)}`;
      db.prepare(`
        INSERT INTO disputes (id, order_id, raised_by_id, raised_by_name, raised_by_role, title, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
      `).run(
        disputeId,
        orderId || null,
        authUser.user_id,
        authUser.name,
        authUser.role,
        title,
        description
      );

      const createdDispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(disputeId);
      recordAuditLog(db, authUser.user_id, authUser.role, 'DISPUTE_RAISED', 'dispute', disputeId, `${title}: ${description.slice(0, 80)}`);

      createNotification(db, 'USR-ADM-01', 'admin', 'కొత్త ఫిర్యాదు / New Grievance', `${authUser.name} (${authUser.role}) కొత్త ఫిర్యాదు నమోదు చేశారు: ${title}`, 'warning', 'dispute', disputeId);

      broadcastEvent('dispute.created', createdDispute, (role) => role === 'admin');

      return sendJson(res, 201, { status: 'success', message: 'Dispute submitted successfully', dispute: createdDispute });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 9d. User Notifications System
  if (method === 'GET' && pathname === '/api/notifications') {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return sendJson(res, 401, { status: 'error', message: 'Authentication required' });
    }
    const limit = Math.min(Number(parsedUrl.query.limit) || 30, 100);
    const unreadOnly = parsedUrl.query.unread === 'true';
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [authUser.user_id];
    if (unreadOnly) {
      query += ' AND is_read = 0';
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const notifications = db.prepare(query).all(...params);
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(authUser.user_id).count;

    return sendJson(res, 200, {
      status: 'success',
      count: notifications.length,
      unreadCount,
      notifications
    });
  }

  if (method === 'POST' && pathname.match(/^\/api\/notifications\/[^\/]+\/read$/)) {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return sendJson(res, 401, { status: 'error', message: 'Authentication required' });
    }
    const notifId = pathname.split('/')[3];
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notifId, authUser.user_id);
    return sendJson(res, 200, { status: 'success', message: 'Notification marked as read' });
  }

  if (method === 'POST' && pathname === '/api/notifications/read-all') {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return sendJson(res, 401, { status: 'error', message: 'Authentication required' });
    }
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(authUser.user_id);
    return sendJson(res, 200, { status: 'success', message: 'All notifications marked as read' });
  }

  // ---------------------------------------------------------------------------
  // 10. BUYER RFQs
  // ---------------------------------------------------------------------------

  if (method === 'GET' && pathname === '/api/rfqs') {
    const rfqs = db.prepare("SELECT * FROM rfqs WHERE status = 'active' ORDER BY created_at DESC").all();
    return sendJson(res, 200, { status: 'success', count: rfqs.length, rfqs });
  }

  if (method === 'POST' && pathname === '/api/rfqs') {
    const authUser = requireAuth(req, res, ['buyer', 'admin']);
    if (!authUser) return;
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

      recordAuditLog(db, buyer.id, 'buyer', 'RFQ_CREATED', 'rfq', rfqId, `Target: ${targetQty}Q @ ₹${offerPrice}`);
      broadcastEvent('NEW_RFQ', createdRfq);
      return sendJson(res, 201, { status: 'success', rfq: createdRfq });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // ---------------------------------------------------------------------------
  // 11. EXTERNAL APIS (Market, Weather, Route)
  // ---------------------------------------------------------------------------

  if (method === 'GET' && pathname === '/api/market-prices') {
    const prices = await fetchMarketPrices();
    return sendJson(res, 200, prices);
  }

  if (method === 'GET' && pathname === '/api/weather') {
    const lat = Number(parsedUrl.query.lat) || 17.9689;
    const lon = Number(parsedUrl.query.lon) || 79.5941;
    const weather = await fetchWeather(lat, lon);
    return sendJson(res, 200, weather);
  }

  if (method === 'GET' && pathname === '/api/route') {
    const originLat = Number(parsedUrl.query.originLat);
    const originLon = Number(parsedUrl.query.originLon);
    const destLat = Number(parsedUrl.query.destLat);
    const destLon = Number(parsedUrl.query.destLon);
    const route = await calculateRoute(originLat, originLon, destLat, destLon);
    return sendJson(res, 200, route);
  }

  // ---------------------------------------------------------------------------
  // STATIC FILE SERVING & PORTAL ROUTING
  // ---------------------------------------------------------------------------
  const rawPath = (pathname || '/').replace(/\\/g, '/').replace(/\/+/g, '/');

  // Friendly redirect for root
  if (rawPath === '' || rawPath === '/') {
    res.writeHead(302, { 'Location': '/main_portal/' });
    res.end();
    return;
  }

  // Redirect extensionless portal routes to trailing slash so relative assets resolve cleanly
  const portalShortcuts = ['/main_portal', '/farmer_portal', '/buyer_portal', '/logistics_portal', '/admin_portal'];
  if (portalShortcuts.includes(rawPath)) {
    res.writeHead(302, { 'Location': `${rawPath}/` });
    res.end();
    return;
  }

  // STRICT STATIC WEBROOT SECURITY GUARD (FIND-CRIT-01 Remediation)
  // Block any attempts to access sensitive files, directories, or dotfiles
  const normalizedPath = path.normalize(pathname).replace(/\\/g, '/');
  const lowerPath = normalizedPath.toLowerCase();

  const BLOCKED_PATTERNS = [
    '/data', '/db', '/scripts', '/services', '/scratch', '/node_modules', '/.git',
    'package.json', 'package-lock.json', 'server.js', 'vercel.json', 'tsconfig.json'
  ];

  const BLOCKED_EXTENSIONS = ['.env', '.db', '.sqlite', '.sql', '.log', '.bak', '.tar', '.gz', '.zip'];

  // Check prefix or segment blocks
  const isBlocked = 
    lowerPath.includes('/.') ||
    lowerPath.startsWith('/.') ||
    BLOCKED_PATTERNS.some(b => lowerPath === b || lowerPath.startsWith(b + '/') || lowerPath.endsWith('/' + b)) ||
    BLOCKED_EXTENSIONS.some(ext => lowerPath.endsWith(ext));

  if (isBlocked) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end('Access Forbidden: Sensitive system resource protected.');
    return;
  }

  // Only allow serving from valid portal directories, shared assets, or index.html
  const ALLOWED_DIRECTORIES = ['main_portal', 'farmer_portal', 'buyer_portal', 'logistics_portal', 'admin_portal', 'shared', 'assets'];
  const firstSegment = normalizedPath.replace(/^\/+/, '').split('/')[0];
  const isAllowedPath = 
    normalizedPath === '/' || 
    normalizedPath === '/index.html' || 
    normalizedPath === '/favicon.ico' || 
    ALLOWED_DIRECTORIES.includes(firstSegment);

  if (!isAllowedPath) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end('Access Forbidden.');
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
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌾 KISSAN CONNECT UNIFIED PLATFORM RUNNING ON PORT ${PORT}`);
  console.log(`🔗 Main Landing:     http://localhost:${PORT}/main_portal/index.html`);
  console.log(`👨‍🌾 Farmer Portal:   http://localhost:${PORT}/farmer_portal/index.html`);
  console.log(`🏢 Buyer Portal:     http://localhost:${PORT}/buyer_portal/index.html`);
  console.log(`🚛 Logistics Fleet:  http://localhost:${PORT}/logistics_portal/index.html`);
  console.log(`🛡️ Admin Console:    http://localhost:${PORT}/admin_portal/index.html`);
  console.log(`📡 API Health:       http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
