/**
 * KISSAN CONNECT - SQLITE DATABASE INITIALIZER
 * Creates SQLite schema and populates authentic initial business records
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'kissan.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initDatabase() {
  console.log('Connecting to SQLite database:', DB_PATH);
  const db = new DatabaseSync(DB_PATH);

  // Configure SQLite Engine Pragmas for Production Concurrency & Safety
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');

  // Read schema
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);
  try {
    db.exec('ALTER TABLE logistics_trips ADD COLUMN delivered_at DATETIME;');
  } catch (e) {}

  // Automatically ensure all migrations are applied idempotently
  const { runMigrations } = require('./migrate');
  runMigrations(db);

  console.log('✅ SQLite Schema and migrations applied successfully.');

  // Check if users already exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count === 0) {
    console.log('Populating authentic users, buyers, farmers, lots, bids, orders, trips, and audit logs...');

    // 1. Unified Users
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, phone, role, avatar, kyc_status, organization, city)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'USR-FARM-01',
      'మల్లారెడ్డి (Malla Reddy)',
      '+91 98480 55210',
      'farmer',
      '👨‍🌾',
      'verified',
      'తెలంగాణ రైతు వేదిక',
      'జనగామ, వరంగల్'
    );

    insertUser.run(
      'USR-BUY-01',
      'ITC Agri Business Hub',
      '+91 94401 22891',
      'buyer',
      '🏢',
      'verified',
      'ITC Agri Business Division',
      'సికింద్రాబాద్ / వరంగల్'
    );

    insertUser.run(
      'USR-BUY-02',
      'శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్',
      '+91 98482 11090',
      'buyer',
      '🌾',
      'verified',
      'శ్రీ కృష్ణ ఆగ్రో ప్రోడక్ట్స్',
      'మిర్యాలగూడ'
    );

    insertUser.run(
      'USR-BUY-03',
      'ఖమ్మం స్పైసెస్ ఎక్స్‌పోర్టర్స్',
      '+91 98480 33211',
      'buyer',
      '🌶️',
      'verified',
      'తెలంగాణ స్పైస్ ఎక్స్‌పోర్ట్స్ కార్పొరేషన్',
      'ఖమ్మం'
    );

    insertUser.run(
      'USR-LOG-01',
      'రాము యాదవ్ (రూరల్ ఫ్లీట్ లారీ)',
      '+91 98481 23990',
      'logistics',
      '🚛',
      'verified',
      'వరంగల్ రూరల్ ఆగ్రో ట్రాన్స్‌పోర్ట్',
      'వరంగల్'
    );

    insertUser.run(
      'USR-ADM-01',
      'తెలంగాణ APMC మార్కెట్ అడ్మిన్',
      '+91 94400 11223',
      'admin',
      '🛡️',
      'verified',
      'తెలంగాణ వ్యవసాయ మార్కెటింగ్ శాఖ',
      'హైదరాబాద్'
    );

    // 2. Verified APMC Buyers
    const insertBuyer = db.prepare(`
      INSERT OR REPLACE INTO buyers (id, name, short_name, gstin, trade_license, phone, city, lat, lon, escrow_balance, rating, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertBuyer.run(
      'USR-BUY-01',
      'ITC Agri Business Hub',
      'ITC Agri',
      '36AAACI1234F1Z8',
      'APMC-WGL-2024-4091',
      '+91 94401 22891',
      'సికింద్రాబాద్ / వరంగల్',
      17.4399,
      78.4983,
      1550000,
      '4.9 ★ (84 డీల్స్)',
      '🏢'
    );

    insertBuyer.run(
      'USR-BUY-02',
      'శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్',
      'శ్రీ కృష్ణ రైస్ మిల్స్',
      '36ABCKR9812G2Z1',
      'APMC-MRG-2023-1120',
      '+91 98482 11090',
      'మిర్యాలగూడ యార్డ్',
      16.8722,
      79.5638,
      2400000,
      '4.9 ★ (120 డీల్స్)',
      '🌾'
    );

    insertBuyer.run(
      'USR-BUY-03',
      'ఖమ్మం స్పైసెస్ ఎక్స్‌పోర్టర్స్',
      'ఖమ్మం స్పైసెస్',
      '36AAXKS4412P1Z4',
      'APMC-KHM-2024-6721',
      '+91 98480 33211',
      'ఖమ్మం మార్కెట్ యార్డ్',
      17.2473,
      80.1514,
      880000,
      '4.7 ★ (41 డీల్స్)',
      '🌶️'
    );

    // 3. Registered Farmers
    const insertFarmer = db.prepare(`
      INSERT OR REPLACE INTO farmers (id, name, phone, village, district, lat, lon, wallet_balance, kyc_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertFarmer.run(
      'USR-FARM-01',
      'మల్లారెడ్డి (Malla Reddy)',
      '+91 98480 55210',
      'జనగామ మండలం',
      'వరంగల్ జిల్లా',
      17.7214,
      79.1834,
      148500,
      'rythubandhu_verified'
    );

    console.log('✅ Base users and buyers initialized with 0 crop listings (Clean Slate).');



    // 8. Buyer RFQs
    const insertRfq = db.prepare(`
      INSERT OR REPLACE INTO rfqs (id, buyer_id, buyer_name, crop_key, crop_name_te, crop_name_en, target_qty, offer_price, delivery_mandi, valid_until, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRfq.run(
      'RFQ-TS-201',
      'USR-BUY-01',
      'ITC Agri Business Hub',
      'teja_chilli',
      'తేజ ఎర్ర మిర్చి (A గ్రేడ్)',
      'Teja Red Chilli (Grade A)',
      250,
      21800,
      'వరంగల్ ఎనుమాముల మార్కెట్ యార్డ్',
      '15 రోజులు (15 Days)',
      'active'
    );

    // 9. Initial Audit Logs
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (user_id, user_role, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertAudit.run('USR-SYS', 'system', 'PLATFORM_INITIALIZED', 'system', 'SIH-26132', 'SQLite Central Database initialized with verified Telangana accounts.');
    insertAudit.run('USR-BUY-01', 'buyer', 'ESCROW_LOCKED', 'order', 'ORD-TS-8801', 'Escrow locked for ₹8,66,000 for Teja Chilli harvest lot LOT-TS-401.');
    insertAudit.run('USR-LOG-01', 'logistics', 'TRIP_ACCEPTED', 'trip', 'TRIP-TS-701', 'Vehicle TS 03 UB 8192 assigned by Ramu Yadav for direct farm haulage.');

    // 10. Sample Grievance / Dispute
    const insertDispute = db.prepare(`
      INSERT INTO disputes (id, order_id, raised_by_id, raised_by_name, raised_by_role, title, description, status, resolution, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDispute.run(
      'DISP-TS-101',
      null,
      'USR-BUY-01',
      'ITC Agri Business Hub',
      'buyer',
      'తేమ శాతం ధృవీకరణ (Moisture verification query)',
      'పొలం వద్ద తేమ శాతం 9.2% ఉన్నట్లు నివేదించబడింది, డిజిటల్ మీటర్ రీడింగ్ స్కాన్ ధృవీకరించబడింది.',
      'resolved',
      'APMC అధికారి ద్వారా డిజిటల్ నాణ్యత ధృవీకరణ ఆమోదించబడింది. (Approved by APMC Inspector)',
      new Date().toISOString()
    );

    console.log('✅ Initial database records seeded successfully.');
  } else {
    console.log('Database already initialized with', existingUsers.count, 'users.');
  }

  return db;
}

function recordAuditLog(db, userId, userRole, action, entityType, entityId, details) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_id, user_role, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId || 'anonymous', userRole || 'guest', action, entityType, String(entityId), String(details || ''));
  } catch (err) {
    console.warn('[Audit Log Error]', err.message);
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase, recordAuditLog, DB_PATH };
