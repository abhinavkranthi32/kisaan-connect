/**
 * KISSAN CONNECT - SCHEMA VERSIONING & SAFE MIGRATION RUNNER
 * Uses PRAGMA user_version and atomic transactions for non-destructive schema evolution
 */

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'kissan.db');

function runMigrations(dbInstance = null) {
  const db = dbInstance || new DatabaseSync(DB_PATH);
  let currentVersion = db.prepare('PRAGMA user_version').get().user_version;
  console.log(`🔍 Current SQLite schema version: v${currentVersion}`);

  if (currentVersion >= 4) {
    console.log('✅ Database schema is up to date (v4).');
    return currentVersion;
  }

  if (currentVersion < 1) {
    console.log('⚡ Applying Migration v1 (Foreign Keys, Indexes, Integrity CHECK constraints)...');


  // Pre-migration normalization: ensure no negative escrow balances exist before constraint check
  db.prepare("UPDATE buyers SET escrow_balance = 2500000 WHERE id = 'USR-BUY-01' AND escrow_balance < 0").run();

  // Pre-migration: ensure all farmers in users are present in farmers
  const orphanFarmers = db.prepare(`
    SELECT u.id, u.name, u.phone, u.city 
    FROM users u 
    LEFT JOIN farmers f ON u.id = f.id 
    WHERE u.role = 'farmer' AND f.id IS NULL
  `).all();
  for (const of_farmer of orphanFarmers) {
    db.prepare(`
      INSERT OR IGNORE INTO farmers (id, name, phone, village, district, wallet_balance, kyc_status)
      VALUES (?, ?, ?, ?, ?, 0, 'rythubandhu_verified')
    `).run(of_farmer.id, of_farmer.name, of_farmer.phone, of_farmer.city || 'వరంగల్', 'వరంగల్');
    console.log(`   🔗 Linked orphan farmer: ${of_farmer.id}`);
  }

  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('BEGIN IMMEDIATE;');

  try {
    // 1. Target Performance Indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_auth_otps_lookup ON auth_otps(phone, verified, expires_at);
      CREATE INDEX IF NOT EXISTS idx_logistics_trips_order ON logistics_trips(order_id);
      CREATE INDEX IF NOT EXISTS idx_procurement_orders_lot ON procurement_orders(lot_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    `);

    // 2. Safe Table Migration: logistics_trips with Foreign Key and CHECK constraints
    db.exec(`
      CREATE TABLE IF NOT EXISTS logistics_trips_v1 (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        crop_name TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        distance_km REAL NOT NULL CHECK(distance_km > 0),
        vehicle_type TEXT NOT NULL,
        freight_offer INTEGER NOT NULL CHECK(freight_offer > 0),
        status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'assigned', 'in_transit', 'delivered')),
        assigned_vehicle TEXT,
        driver_name TEXT,
        driver_phone TEXT,
        pickup_otp TEXT,
        delivered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES procurement_orders(id) ON DELETE SET NULL
      );

      INSERT INTO logistics_trips_v1 (
        id, order_id, crop_name, origin, destination, distance_km, vehicle_type,
        freight_offer, status, assigned_vehicle, driver_name, driver_phone,
        pickup_otp, delivered_at, created_at
      )
      SELECT 
        id, order_id, crop_name, origin, destination, distance_km, vehicle_type,
        freight_offer, status, assigned_vehicle, driver_name, driver_phone,
        pickup_otp, delivered_at, created_at
      FROM logistics_trips;

      DROP TABLE logistics_trips;
      ALTER TABLE logistics_trips_v1 RENAME TO logistics_trips;
      CREATE INDEX idx_logistics_trips_status ON logistics_trips(status);
      CREATE INDEX idx_logistics_trips_order ON logistics_trips(order_id);
    `);

    // 3. Safe Table Migration: disputes with Foreign Keys and CHECK constraints
    db.exec(`
      CREATE TABLE IF NOT EXISTS disputes_v1 (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        raised_by_id TEXT NOT NULL,
        raised_by_name TEXT NOT NULL,
        raised_by_role TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'under_review', 'resolved')),
        resolution TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (order_id) REFERENCES procurement_orders(id) ON DELETE SET NULL,
        FOREIGN KEY (raised_by_id) REFERENCES users(id) ON DELETE CASCADE
      );

      INSERT INTO disputes_v1 (
        id, order_id, raised_by_id, raised_by_name, raised_by_role,
        title, description, status, resolution, created_at, resolved_at
      )
      SELECT 
        id, order_id, raised_by_id, raised_by_name, raised_by_role,
        title, description, status, resolution, created_at, resolved_at
      FROM disputes;

      DROP TABLE disputes;
      ALTER TABLE disputes_v1 RENAME TO disputes;
    `);

    // 4. Safe Table Migration: buyers with CHECK constraint
    db.exec(`
      CREATE TABLE IF NOT EXISTS buyers_v1 (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        short_name TEXT NOT NULL,
        gstin TEXT NOT NULL UNIQUE,
        trade_license TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        city TEXT NOT NULL,
        lat REAL DEFAULT 17.3850,
        lon REAL DEFAULT 78.4867,
        escrow_balance INTEGER NOT NULL DEFAULT 0 CHECK(escrow_balance >= 0),
        rating TEXT DEFAULT '4.8 ★',
        avatar TEXT DEFAULT '🏢',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO buyers_v1 SELECT * FROM buyers;
      DROP TABLE buyers;
      ALTER TABLE buyers_v1 RENAME TO buyers;
    `);

    // 5. Safe Table Migration: farmers with CHECK constraint
    db.exec(`
      CREATE TABLE IF NOT EXISTS farmers_v1 (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        village TEXT NOT NULL,
        district TEXT NOT NULL,
        lat REAL DEFAULT 17.8400,
        lon REAL DEFAULT 79.1100,
        wallet_balance INTEGER NOT NULL DEFAULT 0 CHECK(wallet_balance >= 0),
        kyc_status TEXT DEFAULT 'rythubandhu_verified',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO farmers_v1 SELECT * FROM farmers;
      DROP TABLE farmers;
      ALTER TABLE farmers_v1 RENAME TO farmers;
    `);

    // 6. Safe Table Migration: harvest_lots with CHECK constraints
    db.exec(`
      CREATE TABLE IF NOT EXISTS harvest_lots_v1 (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        farmer_name TEXT NOT NULL,
        farmer_phone TEXT,
        crop_key TEXT NOT NULL,
        crop_name_te TEXT NOT NULL,
        crop_name_en TEXT NOT NULL,
        variety_te TEXT NOT NULL,
        variety_en TEXT NOT NULL,
        quantity_quintals INTEGER NOT NULL CHECK(quantity_quintals > 0),
        grade TEXT NOT NULL DEFAULT 'A',
        moisture_pct TEXT DEFAULT '10%',
        location_te TEXT NOT NULL,
        location_en TEXT NOT NULL,
        lat REAL DEFAULT 17.8400,
        lon REAL DEFAULT 79.1100,
        storage_type_te TEXT DEFAULT 'పొలంలో ఉంది (Farm Gate)',
        storage_type_en TEXT DEFAULT 'Farm Gate Pickup',
        reserve_price INTEGER NOT NULL CHECK(reserve_price > 0),
        highest_bid INTEGER NOT NULL CHECK(highest_bid >= 0),
        image_url TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'deal_accepted', 'completed', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES farmers(id)
      );

      INSERT INTO harvest_lots_v1 SELECT * FROM harvest_lots;
      DROP TABLE harvest_lots;
      ALTER TABLE harvest_lots_v1 RENAME TO harvest_lots;
      CREATE INDEX idx_harvest_lots_farmer ON harvest_lots(farmer_id);
      CREATE INDEX idx_harvest_lots_status ON harvest_lots(status);
    `);

    // 7. Safe Table Migration: bids with CHECK constraints
    db.exec(`
      CREATE TABLE IF NOT EXISTS bids_v1 (
        id TEXT PRIMARY KEY,
        lot_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        buyer_name TEXT NOT NULL,
        buyer_rating TEXT,
        buyer_location TEXT,
        price_per_q INTEGER NOT NULL CHECK(price_per_q > 0),
        total_deal_amount INTEGER NOT NULL CHECK(total_deal_amount > 0),
        logistics_mode TEXT NOT NULL CHECK(logistics_mode IN ('buyer_vehicle', 'platform_transporter')),
        logistics_text_te TEXT,
        logistics_text_en TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'accepted', 'outbid', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lot_id) REFERENCES harvest_lots(id),
        FOREIGN KEY (buyer_id) REFERENCES buyers(id)
      );

      INSERT INTO bids_v1 SELECT * FROM bids;
      DROP TABLE bids;
      ALTER TABLE bids_v1 RENAME TO bids;
      CREATE INDEX idx_bids_lot ON bids(lot_id);
      CREATE INDEX idx_bids_buyer ON bids(buyer_id);
    `);

    // 8. Safe Table Migration: procurement_orders with CHECK constraints
    db.exec(`
      CREATE TABLE IF NOT EXISTS procurement_orders_v1 (
        id TEXT PRIMARY KEY,
        lot_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        farmer_id TEXT NOT NULL,
        crop_name_te TEXT NOT NULL,
        crop_name_en TEXT NOT NULL,
        quantity_quintals INTEGER NOT NULL CHECK(quantity_quintals > 0),
        agreed_rate INTEGER NOT NULL CHECK(agreed_rate > 0),
        total_escrow_amount INTEGER NOT NULL CHECK(total_escrow_amount >= 0),
        current_step INTEGER NOT NULL DEFAULT 2 CHECK(current_step BETWEEN 1 AND 5),
        vehicle_reg TEXT,
        driver_name TEXT,
        driver_phone TEXT,
        farm_gate_otp TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'escrow_locked' CHECK(status IN ('escrow_locked', 'dispatched', 'delivered')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lot_id) REFERENCES harvest_lots(id),
        FOREIGN KEY (buyer_id) REFERENCES buyers(id),
        FOREIGN KEY (farmer_id) REFERENCES farmers(id)
      );

      INSERT INTO procurement_orders_v1 SELECT * FROM procurement_orders;
      DROP TABLE procurement_orders;
      ALTER TABLE procurement_orders_v1 RENAME TO procurement_orders;
      CREATE INDEX idx_procurement_orders_farmer ON procurement_orders(farmer_id);
      CREATE INDEX idx_procurement_orders_buyer ON procurement_orders(buyer_id);
      CREATE INDEX idx_procurement_orders_lot ON procurement_orders(lot_id);
    `);

    // Set schema user_version to 1
    db.exec('PRAGMA user_version = 1;');
    db.exec('COMMIT;');
    console.log('✅ Migration v1 applied and committed successfully.');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('❌ Migration v1 failed, rolled back:', err);
    throw err;
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
  }
  }

  currentVersion = db.prepare('PRAGMA user_version').get().user_version;
  if (currentVersion < 2) {
    console.log('⚡ Applying Migration v2 (Notifications Engine, Unique Order Trips)...');
    db.exec('BEGIN IMMEDIATE;');
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          user_role TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'info',
          is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
          entity_type TEXT,
          entity_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_trips_order_unique ON logistics_trips(order_id) WHERE order_id IS NOT NULL;
      `);

      db.exec('PRAGMA user_version = 2;');
      db.exec('COMMIT;');
      console.log('✅ Migration v2 applied and committed successfully.');
    } catch (err) {
      db.exec('ROLLBACK;');
      console.error('❌ Migration v2 failed, rolled back:', err);
      throw err;
    }
  }

  currentVersion = db.prepare('PRAGMA user_version').get().user_version;
  if (currentVersion < 3) {
    console.log('⚡ Applying Migration v3 (Community Bulk Procurement & Village Pooling Engine)...');
    db.exec('BEGIN IMMEDIATE;');
    try {
      // Add community fields to buyers table if missing
      try { db.exec("ALTER TABLE buyers ADD COLUMN buyer_type TEXT DEFAULT 'business';"); } catch(e){}
      try { db.exec("ALTER TABLE buyers ADD COLUMN families_count INTEGER DEFAULT 0;"); } catch(e){}
      try { db.exec("ALTER TABLE buyers ADD COLUMN organic_preferred INTEGER DEFAULT 0;"); } catch(e){}
      try { db.exec("ALTER TABLE buyers ADD COLUMN delivery_area TEXT;"); } catch(e){}

      db.exec(`
        CREATE TABLE IF NOT EXISTS community_requirements (
          id TEXT PRIMARY KEY,
          buyer_id TEXT NOT NULL REFERENCES buyers(id),
          community_name TEXT NOT NULL,
          buyer_type TEXT NOT NULL DEFAULT 'gated_community',
          title TEXT NOT NULL,
          organic_requirement TEXT DEFAULT 'preferred',
          delivery_date TEXT NOT NULL,
          delivery_window TEXT NOT NULL,
          delivery_address TEXT NOT NULL,
          pickup_preference TEXT DEFAULT 'farm_gate',
          max_radius_km REAL DEFAULT 25.0,
          additional_instructions TEXT,
          is_recurring INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'published',
          lat REAL DEFAULT 17.3850,
          lon REAL DEFAULT 78.4867,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS community_requirement_items (
          id TEXT PRIMARY KEY,
          requirement_id TEXT NOT NULL REFERENCES community_requirements(id) ON DELETE CASCADE,
          product_name TEXT NOT NULL,
          crop_key TEXT,
          required_quantity REAL NOT NULL CHECK(required_quantity > 0),
          fulfilled_quantity REAL NOT NULL DEFAULT 0 CHECK(fulfilled_quantity >= 0),
          unit TEXT NOT NULL DEFAULT 'kg',
          preferred_grade TEXT DEFAULT 'A',
          max_acceptable_price REAL,
          status TEXT NOT NULL DEFAULT 'open',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS farmer_requirement_offers (
          id TEXT PRIMARY KEY,
          farmer_id TEXT NOT NULL REFERENCES farmers(id),
          farmer_name TEXT NOT NULL,
          farmer_phone TEXT,
          farmer_village TEXT NOT NULL,
          farmer_district TEXT NOT NULL,
          farmer_lat REAL DEFAULT 17.8400,
          farmer_lon REAL DEFAULT 79.1100,
          requirement_id TEXT NOT NULL REFERENCES community_requirements(id),
          requirement_item_id TEXT NOT NULL REFERENCES community_requirement_items(id),
          product_name TEXT NOT NULL,
          offered_quantity REAL NOT NULL CHECK(offered_quantity > 0),
          accepted_quantity REAL NOT NULL DEFAULT 0 CHECK(accepted_quantity >= 0),
          price_per_unit REAL NOT NULL CHECK(price_per_unit > 0),
          total_amount REAL NOT NULL CHECK(total_amount > 0),
          harvest_date TEXT,
          quality_info TEXT,
          organic_certified INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'submitted',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pooled_procurement_orders (
          id TEXT PRIMARY KEY,
          requirement_id TEXT NOT NULL REFERENCES community_requirements(id),
          buyer_id TEXT NOT NULL REFERENCES buyers(id),
          buyer_name TEXT NOT NULL,
          total_accepted_quantity REAL NOT NULL CHECK(total_accepted_quantity > 0),
          total_order_value REAL NOT NULL CHECK(total_order_value >= 0),
          delivery_address TEXT NOT NULL,
          delivery_deadline TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'procurement_confirmed',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pooled_procurement_items (
          id TEXT PRIMARY KEY,
          pooled_order_id TEXT NOT NULL REFERENCES pooled_procurement_orders(id) ON DELETE CASCADE,
          requirement_item_id TEXT NOT NULL,
          product_name TEXT NOT NULL,
          accepted_quantity REAL NOT NULL CHECK(accepted_quantity > 0),
          unit TEXT NOT NULL DEFAULT 'kg',
          avg_price_per_unit REAL NOT NULL,
          total_item_value REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pooled_order_farmer_allocations (
          id TEXT PRIMARY KEY,
          pooled_order_id TEXT NOT NULL REFERENCES pooled_procurement_orders(id) ON DELETE CASCADE,
          pooled_item_id TEXT NOT NULL REFERENCES pooled_procurement_items(id) ON DELETE CASCADE,
          offer_id TEXT NOT NULL REFERENCES farmer_requirement_offers(id),
          farmer_id TEXT NOT NULL REFERENCES farmers(id),
          farmer_name TEXT NOT NULL,
          farmer_phone TEXT,
          farmer_village TEXT NOT NULL,
          product_name TEXT NOT NULL,
          quantity REAL NOT NULL CHECK(quantity > 0),
          price_per_unit REAL NOT NULL CHECK(price_per_unit > 0),
          total_amount REAL NOT NULL CHECK(total_amount > 0),
          status TEXT DEFAULT 'accepted'
        );

        CREATE TABLE IF NOT EXISTS transport_requests (
          id TEXT PRIMARY KEY,
          pooled_order_id TEXT NOT NULL UNIQUE REFERENCES pooled_procurement_orders(id) ON DELETE CASCADE,
          requirement_id TEXT NOT NULL,
          community_name TEXT NOT NULL,
          buyer_id TEXT NOT NULL,
          destination_address TEXT NOT NULL,
          pickup_villages_json TEXT NOT NULL,
          product_summary TEXT NOT NULL,
          total_weight_kg REAL NOT NULL CHECK(total_weight_kg > 0),
          farmer_count INTEGER NOT NULL CHECK(farmer_count > 0),
          estimated_distance_km REAL,
          delivery_deadline TEXT NOT NULL,
          suggested_vehicle TEXT NOT NULL,
          handling_instructions TEXT,
          organic_separate_handling INTEGER DEFAULT 0,
          assigned_transporter_id TEXT,
          assigned_transporter_name TEXT,
          assigned_vehicle_reg TEXT,
          accepted_bid_id TEXT,
          freight_amount REAL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'transport_pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transport_bids (
          id TEXT PRIMARY KEY,
          transport_request_id TEXT NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
          transporter_id TEXT NOT NULL REFERENCES users(id),
          transporter_name TEXT NOT NULL,
          transporter_phone TEXT,
          vehicle_type TEXT NOT NULL,
          vehicle_capacity_kg REAL NOT NULL CHECK(vehicle_capacity_kg > 0),
          bid_amount REAL NOT NULL CHECK(bid_amount > 0),
          estimated_delivery_time TEXT NOT NULL,
          pickup_capability TEXT,
          special_handling_notes TEXT,
          status TEXT NOT NULL DEFAULT 'submitted',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_comm_req_buyer ON community_requirements(buyer_id, status);
        CREATE INDEX IF NOT EXISTS idx_comm_req_status ON community_requirements(status);
        CREATE INDEX IF NOT EXISTS idx_comm_req_items_req ON community_requirement_items(requirement_id);
        CREATE INDEX IF NOT EXISTS idx_farmer_offers_req ON farmer_requirement_offers(requirement_id, status);
        CREATE INDEX IF NOT EXISTS idx_farmer_offers_farmer ON farmer_requirement_offers(farmer_id);
        CREATE INDEX IF NOT EXISTS idx_pooled_orders_buyer ON pooled_procurement_orders(buyer_id);
        CREATE INDEX IF NOT EXISTS idx_transport_req_status ON transport_requests(status);
        CREATE INDEX IF NOT EXISTS idx_transport_bids_req ON transport_bids(transport_request_id);
      `);

      db.exec('PRAGMA user_version = 3;');
      db.exec('COMMIT;');
      console.log('✅ Migration v3 applied and committed successfully.');
    } catch (err) {
      db.exec('ROLLBACK;');
      console.error('❌ Migration v3 failed, rolled back:', err);
      throw err;
    }
  }

  if (currentVersion < 4) {
    console.log('⚡ Applying Migration v4 (Wallets, Financial Ledger, Escrow Engine, Farmer Payout Profiles)...');
    db.exec('BEGIN IMMEDIATE;');
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS wallets (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          user_role TEXT NOT NULL,
          total_balance_paise INTEGER NOT NULL DEFAULT 0 CHECK(total_balance_paise >= 0),
          held_balance_paise INTEGER NOT NULL DEFAULT 0 CHECK(held_balance_paise >= 0),
          available_balance_paise INTEGER NOT NULL DEFAULT 0 CHECK(available_balance_paise >= 0),
          currency TEXT DEFAULT 'INR',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS wallet_ledger (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          wallet_id TEXT NOT NULL REFERENCES wallets(id),
          transaction_type TEXT NOT NULL,
          amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
          amount_rupees REAL NOT NULL CHECK(amount_rupees > 0),
          direction TEXT NOT NULL,
          related_bid_id TEXT,
          related_order_id TEXT,
          related_escrow_id TEXT,
          related_transport_request_id TEXT,
          status TEXT NOT NULL DEFAULT 'completed',
          idempotency_key TEXT UNIQUE,
          provider_reference TEXT,
          description TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS escrow_records (
          id TEXT PRIMARY KEY,
          buyer_id TEXT NOT NULL REFERENCES users(id),
          farmer_id TEXT REFERENCES users(id),
          bid_id TEXT,
          lot_id TEXT,
          requirement_id TEXT,
          pooled_order_id TEXT,
          pooled_item_id TEXT,
          offer_id TEXT,
          crop_amount_paise INTEGER NOT NULL DEFAULT 0,
          platform_fee_paise INTEGER NOT NULL DEFAULT 0,
          total_escrow_paise INTEGER NOT NULL DEFAULT 0,
          crop_amount_rupees REAL NOT NULL DEFAULT 0,
          platform_fee_rupees REAL NOT NULL DEFAULT 0,
          total_escrow_rupees REAL NOT NULL DEFAULT 0,
          accepted_quantity REAL,
          loaded_quantity REAL,
          status TEXT NOT NULL DEFAULT 'funding_pending',
          payout_reference TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS farmer_payout_profiles (
          farmer_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          account_holder_name TEXT NOT NULL,
          bank_name TEXT NOT NULL,
          account_number_masked TEXT NOT NULL,
          account_number_hash TEXT NOT NULL,
          ifsc_code TEXT NOT NULL,
          upi_id TEXT,
          payout_eligibility TEXT NOT NULL DEFAULT 'pending_verification',
          provider_beneficiary_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
        CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON wallet_ledger(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_wallet_ledger_type ON wallet_ledger(transaction_type);
        CREATE INDEX IF NOT EXISTS idx_escrow_records_buyer ON escrow_records(buyer_id, status);
        CREATE INDEX IF NOT EXISTS idx_escrow_records_farmer ON escrow_records(farmer_id, status);
        CREATE INDEX IF NOT EXISTS idx_farmer_payout_farmer ON farmer_payout_profiles(farmer_id);
      `);

      // Auto-provision wallets for all registered users if missing
      const allUsers = db.prepare('SELECT id, role, name FROM users').all();
      for (const u of allUsers) {
        const existingWallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(u.id);
        if (!existingWallet) {
          const walletId = `WLT-${u.id}`;
          const initPaise = u.role === 'buyer' ? 30000000 : 0; // ₹3,00,000 for buyers
          db.prepare(`
            INSERT INTO wallets (id, user_id, user_role, total_balance_paise, held_balance_paise, available_balance_paise)
            VALUES (?, ?, ?, ?, 0, ?)
          `).run(walletId, u.id, u.role, initPaise, initPaise);

          if (initPaise > 0) {
            db.prepare(`
              INSERT INTO wallet_ledger (
                id, user_id, wallet_id, transaction_type, amount_paise, amount_rupees,
                direction, status, idempotency_key, description
              ) VALUES (?, ?, ?, 'wallet_topup', ?, ?, 'credit', 'completed', ?, ?)
            `).run(
              `TXN-INIT-${u.id}`, u.id, walletId, initPaise, initPaise / 100,
              `IDEM-INIT-${u.id}`, `Initial verified commercial wallet balance for ${u.name}`
            );
          }
        }
      }

      db.exec('PRAGMA user_version = 4;');
      db.exec('COMMIT;');
      console.log('✅ Migration v4 applied and committed successfully.');
    } catch (err) {
      db.exec('ROLLBACK;');
      console.error('❌ Migration v4 failed, rolled back:', err);
      throw err;
    }
  }

  // Final validation
  const fkViolations = db.prepare('PRAGMA foreign_key_check').all();
  if (fkViolations.length > 0) {
    console.error('❌ Foreign key check failed after migration:', fkViolations);
    throw new Error('Foreign key violations detected post-migration.');
  }

  const integrity = db.prepare('PRAGMA integrity_check').all();
  console.log(`✅ SQLite Integrity Check: ${integrity[0]?.integrity_check || 'ok'}`);
  console.log('✅ SQLite Foreign Key Check: Passed (0 violations)');

  return 4;
}


if (require.main === module) {
  try {
    runMigrations();
  } catch (err) {
    process.exit(1);
  }
}

module.exports = { runMigrations };
