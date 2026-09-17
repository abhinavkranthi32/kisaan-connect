-- KISSAN CONNECT - PRODUCTION SQLITE RELATIONAL SCHEMA
-- Real-Data Architecture for SIH Platform

CREATE TABLE IF NOT EXISTS buyers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  gstin TEXT NOT NULL UNIQUE,
  trade_license TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  lat REAL DEFAULT 17.3850,
  lon REAL DEFAULT 78.4867,
  escrow_balance INTEGER NOT NULL DEFAULT 0,
  rating TEXT DEFAULT '4.8 ★',
  avatar TEXT DEFAULT '🏢',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farmers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  village TEXT NOT NULL,
  district TEXT NOT NULL,
  lat REAL DEFAULT 17.8400,
  lon REAL DEFAULT 79.1100,
  wallet_balance INTEGER NOT NULL DEFAULT 0,
  kyc_status TEXT DEFAULT 'rythubandhu_verified',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS harvest_lots (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL,
  farmer_name TEXT NOT NULL,
  farmer_phone TEXT,
  crop_key TEXT NOT NULL,
  crop_name_te TEXT NOT NULL,
  crop_name_en TEXT NOT NULL,
  variety_te TEXT NOT NULL,
  variety_en TEXT NOT NULL,
  quantity_quintals INTEGER NOT NULL,
  grade TEXT NOT NULL DEFAULT 'A',
  moisture_pct TEXT DEFAULT '10%',
  location_te TEXT NOT NULL,
  location_en TEXT NOT NULL,
  lat REAL DEFAULT 17.8400,
  lon REAL DEFAULT 79.1100,
  storage_type_te TEXT DEFAULT 'పొలంలో ఉంది (Farm Gate)',
  storage_type_en TEXT DEFAULT 'Farm Gate Pickup',
  reserve_price INTEGER NOT NULL,
  highest_bid INTEGER NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, deal_accepted, completed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);

CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_rating TEXT,
  buyer_location TEXT,
  price_per_q INTEGER NOT NULL,
  total_deal_amount INTEGER NOT NULL,
  logistics_mode TEXT NOT NULL, -- buyer_vehicle, platform_transporter
  logistics_text_te TEXT,
  logistics_text_en TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, accepted, outbid, rejected
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lot_id) REFERENCES harvest_lots(id),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id)
);

CREATE TABLE IF NOT EXISTS procurement_orders (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  crop_name_te TEXT NOT NULL,
  crop_name_en TEXT NOT NULL,
  quantity_quintals INTEGER NOT NULL,
  agreed_rate INTEGER NOT NULL,
  total_escrow_amount INTEGER NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 2, -- 1: Deal Agreed, 2: Escrow Locked, 3: Lorry Dispatched, 4: OTP Weighed, 5: Released
  vehicle_reg TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  farm_gate_otp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'escrow_locked', -- escrow_locked, dispatched, delivered
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lot_id) REFERENCES harvest_lots(id),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id),
  FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);

CREATE TABLE IF NOT EXISTS rfqs (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  crop_key TEXT NOT NULL,
  crop_name_te TEXT NOT NULL,
  crop_name_en TEXT NOT NULL,
  target_qty INTEGER NOT NULL,
  offer_price INTEGER NOT NULL,
  delivery_mandi TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES buyers(id)
);

CREATE TABLE IF NOT EXISTS logistics_trips (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  crop_name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance_km REAL NOT NULL,
  vehicle_type TEXT NOT NULL,
  freight_offer INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available, assigned, delivered
  assigned_vehicle TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  pickup_otp TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_price_cache (
  id TEXT PRIMARY KEY,
  commodity TEXT NOT NULL,
  market TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Telangana',
  min_price INTEGER,
  max_price INTEGER,
  modal_price INTEGER NOT NULL,
  arrival_date TEXT,
  source TEXT NOT NULL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);
