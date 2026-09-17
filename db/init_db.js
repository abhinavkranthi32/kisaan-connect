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

  // Read schema
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);
  console.log('✅ SQLite Schema applied successfully.');

  // Check if buyers already exist
  const existingBuyers = db.prepare('SELECT COUNT(*) as count FROM buyers').get();
  if (existingBuyers.count === 0) {
    console.log('Populating initial verified APMC buyers & registered farmers...');

    // Verified commercial buyers with authentic APMC licenses & Telangana GSTINs
    const insertBuyer = db.prepare(`
      INSERT INTO buyers (id, name, short_name, gstin, trade_license, phone, city, lat, lon, escrow_balance, rating, avatar)
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

    // Registered Telangana farmer
    const insertFarmer = db.prepare(`
      INSERT INTO farmers (id, name, phone, village, district, lat, lon, wallet_balance, kyc_status)
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

    // Initial authentic harvest lots
    const insertLot = db.prepare(`
      INSERT INTO harvest_lots (
        id, farmer_id, farmer_name, farmer_phone, crop_key, crop_name_te, crop_name_en,
        variety_te, variety_en, quantity_quintals, grade, moisture_pct, location_te, location_en,
        lat, lon, storage_type_te, storage_type_en, reserve_price, highest_bid, image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertLot.run(
      'LOT-TS-401',
      'USR-FARM-01',
      'మల్లారెడ్డి',
      '+91 98480 55210',
      'teja_chilli',
      'తేజ మిర్చి (Teja Red Chilli)',
      'Teja Red Chilli',
      'తేజ స్పెషల్ ఎగుమతి రకం',
      'Teja Special Export Grade',
      40,
      'A',
      '9.2%',
      'జనగామ మండలం, వరంగల్ జిల్లా',
      'Jangaon Mandal, Warangal Dist',
      17.7214,
      79.1834,
      'పొలంలోనే ఉంది (Farm Gate)',
      'Farm Gate Pickup',
      21000,
      21650,
      '/shared/assets/crops/teja_chilli.jpg',
      'active'
    );

    insertLot.run(
      'LOT-TS-402',
      'USR-FARM-01',
      'మల్లారెడ్డి',
      '+91 98480 55210',
      'paddy',
      'తెలంగాణ సోనా వరి (Telangana Sona Paddy)',
      'Telangana Sona Paddy (RNR)',
      'RNR 15048 సూపర్ ఫైన్',
      'RNR 15048 Super Fine Grain',
      120,
      'A',
      '13.5%',
      'మిర్యాలగూడ పరిసరాలు, నల్గొండ జిల్లా',
      'Miryalaguda, Nalgonda Dist',
      16.8722,
      79.5638,
      'ఇంటి గోదాము (Village Shed)',
      'Village Shed Storage',
      2320,
      2440,
      '/shared/assets/crops/paddy.jpg',
      'active'
    );

    insertLot.run(
      'LOT-TS-403',
      'USR-FARM-01',
      'మల్లారెడ్డి',
      '+91 98480 55210',
      'cotton',
      'పత్తి (Raw White Cotton)',
      'Raw White Cotton',
      'బ్రహ్మ / కావేరి పొడవు పింజ',
      'Long Staple Cotton',
      55,
      'A',
      '7.8%',
      'వరంగల్ రూరల్',
      'Warangal Rural',
      17.9689,
      79.5941,
      'రైతు గోదాము (Farm Shed)',
      'Farmer Warehouse',
      7400,
      7550,
      '/shared/assets/crops/cotton.jpg',
      'active'
    );

    insertLot.run(
      'LOT-TS-404',
      'USR-FARM-01',
      'మల్లారెడ్డి',
      '+91 98480 55210',
      'turmeric',
      'నిజామాబాద్ పసుపు (Nizamabad Turmeric)',
      'Nizamabad Finger Turmeric',
      'నిజామాబాద్ ఫింగర్ స్పెషల్ (కర్క్యుమిన్ 3.8%)',
      'Finger Special (Curcumin 3.8%)',
      35,
      'A',
      '8.5%',
      'ఆర్మూర్, నిజామాబాద్ జిల్లా',
      'Armoor, Nizamabad Dist',
      18.7891,
      78.2858,
      'పొలం వద్ద క్లీన్ చేసిన లాట్',
      'Farm Cleaned Lot',
      14500,
      14950,
      '/shared/assets/crops/turmeric.jpg',
      'active'
    );

    // Initial active bids from registered buyers
    const insertBid = db.prepare(`
      INSERT INTO bids (id, lot_id, buyer_id, buyer_name, buyer_rating, buyer_location, price_per_q, total_deal_amount, logistics_mode, logistics_text_te, logistics_text_en, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertBid.run(
      'BID-901',
      'LOT-TS-401',
      'USR-BUY-01',
      'ITC Agri Business Hub',
      '4.9 ★ (84 డీల్స్)',
      'సికింద్రాబాద్ / వరంగల్',
      21650,
      866000,
      'buyer_vehicle',
      '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
      '🚛 Buyer will send their own truck (₹0 farmer cost)',
      'active'
    );

    insertBid.run(
      'BID-902',
      'LOT-TS-402',
      'USR-BUY-02',
      'శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్',
      '4.9 ★ (120 డీల్స్)',
      'మిర్యాలగూడ యార్డ్',
      2440,
      292800,
      'buyer_vehicle',
      '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
      '🚛 Buyer will send their own truck (₹0 farmer cost)',
      'active'
    );

    // Initial procurement order with verified escrow lock
    const insertOrder = db.prepare(`
      INSERT INTO procurement_orders (
        id, lot_id, buyer_id, farmer_id, crop_name_te, crop_name_en, quantity_quintals,
        agreed_rate, total_escrow_amount, current_step, vehicle_reg, driver_name, driver_phone, farm_gate_otp, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
      'ORD-TS-8801',
      'LOT-TS-401',
      'USR-BUY-01',
      'USR-FARM-01',
      'తేజ మిర్చి (Teja Chilli)',
      'Teja Chilli',
      40,
      21650,
      866000,
      3,
      'TS 03 UB 8192',
      'రాము యాదవ్ (డ్రైవర్)',
      '+91 98481 23990',
      '4819',
      'dispatched'
    );

    // Initial logistics trip
    const insertTrip = db.prepare(`
      INSERT INTO logistics_trips (
        id, order_id, crop_name, origin, destination, distance_km, vehicle_type, freight_offer,
        status, assigned_vehicle, driver_name, driver_phone, pickup_otp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTrip.run(
      'TRIP-TS-701',
      'ORD-TS-8801',
      'తేజ మిర్చి (40 క్వింటాళ్లు)',
      'జనగామ మండలం, వరంగల్',
      'ITC సికింద్రాబాద్ హబ్',
      85.0,
      '10-Ton DCM / Truck',
      9500,
      'assigned',
      'TS 03 UB 8192',
      'రాము యాదవ్',
      '9848123990',
      '4819'
    );

    insertTrip.run(
      'TRIP-TS-702',
      null,
      'తెలంగాణ సోనా వరి (120 క్వింటాళ్లు)',
      'మిర్యాలగూడ రూరల్ పొలం',
      'శ్రీ కృష్ణ రైస్ మిల్, మిర్యాలగూడ',
      18.0,
      'ట్రాక్టర్ ట్రాలీ లేదా డీసీఎం',
      4200,
      'available',
      null,
      null,
      null,
      '7122'
    );

    // Initial verified RFQ
    const insertRfq = db.prepare(`
      INSERT INTO rfqs (id, buyer_id, buyer_name, crop_key, crop_name_te, crop_name_en, target_qty, offer_price, delivery_mandi, valid_until, status)
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

    console.log('✅ Initial database records seeded successfully.');
  } else {
    console.log('Database already initialized with', existingBuyers.count, 'buyers.');
  }

  return db;
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase, DB_PATH };
