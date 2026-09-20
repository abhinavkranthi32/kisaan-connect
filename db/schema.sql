-- KISSAN CONNECT - PRODUCTION SQLITE RELATIONAL SCHEMA
-- Real-Data Architecture for SIH Platform

-- 1. USERS & IDENTITY
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL, -- farmer, buyer, logistics, admin
  avatar TEXT,
  kyc_status TEXT DEFAULT 'verified', -- verified, pending, rejected
  organization TEXT,
  city TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. AUTHENTICATION OTP ENGINE
CREATE TABLE IF NOT EXISTS auth_otps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at DATETIME NOT NULL,
  verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. USER SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. VERIFIED COMMERCIAL BUYERS
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
  buyer_type TEXT DEFAULT 'business', -- individual, business, gated_community, villa_community, apartment_community
  families_count INTEGER DEFAULT 0,
  organic_preferred INTEGER DEFAULT 0,
  delivery_area TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. REGISTERED TELANGANA FARMERS
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

-- 6. HARVEST LOTS
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
  status TEXT NOT NULL DEFAULT 'active', -- active, deal_accepted, completed, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);

-- 7. LIVE BIDS
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

-- 8. PROCUREMENT ORDERS & ESCROW LIFECYCLE
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

-- 9. BUYER RFQs
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

-- 10. LOGISTICS FLEET HAULAGE TRIPS
CREATE TABLE IF NOT EXISTS logistics_trips (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  crop_name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance_km REAL NOT NULL,
  vehicle_type TEXT NOT NULL,
  freight_offer INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available, assigned, in_transit, delivered
  assigned_vehicle TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  pickup_otp TEXT,
  delivered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. IMMUTABLE AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. GRIEVANCE & DISPUTE TRACKING
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  raised_by_id TEXT NOT NULL,
  raised_by_name TEXT NOT NULL,
  raised_by_role TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- open, under_review, resolved
  resolution TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- 13. MARKET PRICE CACHE
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

-- 14. IN-APP REAL-TIME NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, order, bid, transport, dispute
  is_read INTEGER NOT NULL DEFAULT 0,
  entity_type TEXT,
  entity_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 15. COMMUNITY BULK REQUIREMENTS
CREATE TABLE IF NOT EXISTS community_requirements (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL REFERENCES buyers(id),
  community_name TEXT NOT NULL,
  buyer_type TEXT NOT NULL DEFAULT 'gated_community',
  title TEXT NOT NULL,
  organic_requirement TEXT DEFAULT 'preferred', -- yes, no, preferred
  delivery_date TEXT NOT NULL,
  delivery_window TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  pickup_preference TEXT DEFAULT 'farm_gate',
  max_radius_km REAL DEFAULT 25.0,
  additional_instructions TEXT,
  is_recurring INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published', -- draft, published, matching_farmers, partially_fulfilled, fully_fulfilled, procurement_confirmed, transport_pending, in_transit, delivered, cancelled, expired
  lat REAL DEFAULT 17.3850,
  lon REAL DEFAULT 78.4867,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 16. COMMUNITY REQUIREMENT ITEMS (MULTI-PRODUCT)
CREATE TABLE IF NOT EXISTS community_requirement_items (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES community_requirements(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  crop_key TEXT,
  required_quantity REAL NOT NULL CHECK(required_quantity > 0),
  fulfilled_quantity REAL NOT NULL DEFAULT 0 CHECK(fulfilled_quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'kg', -- kg, litre, quintal, bag, box
  preferred_grade TEXT DEFAULT 'A',
  max_acceptable_price REAL,
  status TEXT NOT NULL DEFAULT 'open', -- open, partially_fulfilled, fulfilled, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 17. FARMER REQUIREMENT OFFERS
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
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted, under_review, accepted, partially_accepted, rejected, withdrawn, fulfilled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 18. POOLED PROCUREMENT ORDERS
CREATE TABLE IF NOT EXISTS pooled_procurement_orders (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES community_requirements(id),
  buyer_id TEXT NOT NULL REFERENCES buyers(id),
  buyer_name TEXT NOT NULL,
  total_accepted_quantity REAL NOT NULL CHECK(total_accepted_quantity > 0),
  total_order_value REAL NOT NULL CHECK(total_order_value >= 0),
  delivery_address TEXT NOT NULL,
  delivery_deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'procurement_confirmed', -- procurement_confirmed, transport_pending, assigned, in_transit, delivered, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 19. POOLED PROCUREMENT ITEMS
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

-- 20. POOLED ORDER FARMER ALLOCATIONS
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

-- 21. TRANSPORT REQUESTS FOR POOLED DELIVERIES
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
  status TEXT NOT NULL DEFAULT 'transport_pending', -- transport_pending, bidding_open, assigned, in_transit, delivered, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 22. TRANSPORT BIDS
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
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted, accepted, rejected, withdrawn
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 23. USER WALLETS
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

-- 24. IMMUTABLE FINANCIAL WALLET LEDGER
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  transaction_type TEXT NOT NULL, -- wallet_topup, bid_escrow_hold, escrow_release_to_farmer, escrow_refund_to_buyer, platform_fee, transport_payment, manual_adjustment, withdrawal
  amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
  amount_rupees REAL NOT NULL CHECK(amount_rupees > 0),
  direction TEXT NOT NULL, -- credit, debit
  related_bid_id TEXT,
  related_order_id TEXT,
  related_escrow_id TEXT,
  related_transport_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- pending, completed, failed, reversed
  idempotency_key TEXT UNIQUE,
  provider_reference TEXT, -- Razorpay payment_id / payout_id
  description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 25. ESCROW RECORDS
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
  status TEXT NOT NULL DEFAULT 'funding_pending', -- not_required, funding_pending, held, bid_rejected, bid_cancelled, awaiting_transport, loading_pending, loaded, dispatch_verified, payout_processing, farmer_paid, partially_refunded, fully_refunded, disputed, frozen, failed
  payout_reference TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 26. FARMER BANK PAYOUT PROFILES
CREATE TABLE IF NOT EXISTS farmer_payout_profiles (
  farmer_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number_masked TEXT NOT NULL,
  account_number_hash TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  upi_id TEXT,
  payout_eligibility TEXT NOT NULL DEFAULT 'pending_verification', -- not_submitted, pending_verification, verified, rejected, blocked
  provider_beneficiary_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_harvest_lots_farmer ON harvest_lots(farmer_id);
CREATE INDEX IF NOT EXISTS idx_harvest_lots_status ON harvest_lots(status);
CREATE INDEX IF NOT EXISTS idx_bids_lot ON bids(lot_id);
CREATE INDEX IF NOT EXISTS idx_bids_buyer ON bids(buyer_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_farmer ON procurement_orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_buyer ON procurement_orders(buyer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_procurement_orders_lot ON procurement_orders(lot_id);
CREATE INDEX IF NOT EXISTS idx_logistics_trips_status ON logistics_trips(status);
CREATE INDEX IF NOT EXISTS idx_logistics_trips_order ON logistics_trips(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_trips_order_unique ON logistics_trips(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_otps_lookup ON auth_otps(phone, verified, expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);

CREATE INDEX IF NOT EXISTS idx_comm_req_buyer ON community_requirements(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_comm_req_status ON community_requirements(status);
CREATE INDEX IF NOT EXISTS idx_comm_req_items_req ON community_requirement_items(requirement_id);
CREATE INDEX IF NOT EXISTS idx_farmer_offers_req ON farmer_requirement_offers(requirement_id, status);
CREATE INDEX IF NOT EXISTS idx_farmer_offers_farmer ON farmer_requirement_offers(farmer_id);
CREATE INDEX IF NOT EXISTS idx_pooled_orders_buyer ON pooled_procurement_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transport_req_status ON transport_requests(status);
CREATE INDEX IF NOT EXISTS idx_transport_bids_req ON transport_bids(transport_request_id);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON wallet_ledger(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_type ON wallet_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_escrow_records_buyer ON escrow_records(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_escrow_records_farmer ON escrow_records(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_farmer_payout_farmer ON farmer_payout_profiles(farmer_id);



