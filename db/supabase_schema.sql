-- =============================================================================
-- KISSAN CONNECT - SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Telangana Agricultural Market Linkage Platform (SIH)
-- 100% CLEAN SLATE SCHEMA - ZERO HARDCODED SEED DATA OR PROFILES
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DROP OLD TABLES FOR CLEAN SLATE RE-CREATION
DROP TABLE IF EXISTS market_price_cache CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS logistics_trips CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
DROP TABLE IF EXISTS procurement_orders CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS harvest_lots CASCADE;
DROP TABLE IF EXISTS farmers CASCADE;
DROP TABLE IF EXISTS buyers CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS auth_otps CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'buyer', 'logistics', 'admin')),
  avatar TEXT,
  kyc_status TEXT DEFAULT 'verified',
  organization TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUTHENTICATION OTPS
CREATE TABLE IF NOT EXISTS auth_otps (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  attempts INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
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
  lat DOUBLE PRECISION DEFAULT 17.3850,
  lon DOUBLE PRECISION DEFAULT 78.4867,
  escrow_balance INT NOT NULL DEFAULT 0,
  rating TEXT DEFAULT '4.8 ★',
  avatar TEXT DEFAULT '🏢',
  buyer_type TEXT DEFAULT 'business',
  families_count INT DEFAULT 0,
  organic_preferred INT DEFAULT 0,
  delivery_area TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REGISTERED TELANGANA FARMERS
CREATE TABLE IF NOT EXISTS farmers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  village TEXT NOT NULL,
  district TEXT NOT NULL,
  lat DOUBLE PRECISION DEFAULT 17.8400,
  lon DOUBLE PRECISION DEFAULT 79.1100,
  wallet_balance INT NOT NULL DEFAULT 0,
  kyc_status TEXT DEFAULT 'rythubandhu_verified',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REAL HARVEST LOTS (START WITH 0 RECORDS)
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
  quantity_quintals INT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'A',
  moisture_pct TEXT DEFAULT '10%',
  location_te TEXT NOT NULL,
  location_en TEXT NOT NULL,
  lat DOUBLE PRECISION DEFAULT 17.8400,
  lon DOUBLE PRECISION DEFAULT 79.1100,
  storage_type_te TEXT DEFAULT 'పొలంలో ఉంది (Farm Gate)',
  storage_type_en TEXT DEFAULT 'Farm Gate Pickup',
  reserve_price INT NOT NULL,
  highest_bid INT NOT NULL DEFAULT 0,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deal_accepted', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. LIVE BIDS
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES harvest_lots(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_rating TEXT,
  buyer_location TEXT,
  price_per_q INT NOT NULL,
  total_deal_amount INT NOT NULL,
  logistics_mode TEXT NOT NULL,
  logistics_text_te TEXT,
  logistics_text_en TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'outbid', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PROCUREMENT ORDERS & ESCROW LIFECYCLE
CREATE TABLE IF NOT EXISTS procurement_orders (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES harvest_lots(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  crop_name_te TEXT NOT NULL,
  crop_name_en TEXT NOT NULL,
  quantity_quintals INT NOT NULL,
  agreed_rate INT NOT NULL,
  total_escrow_amount INT NOT NULL,
  current_step INT NOT NULL DEFAULT 2,
  vehicle_reg TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  farm_gate_otp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'escrow_locked' CHECK (status IN ('escrow_locked', 'dispatched', 'delivered')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BUYER RFQS
CREATE TABLE IF NOT EXISTS rfqs (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  crop_key TEXT NOT NULL,
  crop_name_te TEXT NOT NULL,
  crop_name_en TEXT NOT NULL,
  target_qty INT NOT NULL,
  offer_price INT NOT NULL,
  delivery_mandi TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. LOGISTICS FLEET HAULAGE TRIPS
CREATE TABLE IF NOT EXISTS logistics_trips (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES procurement_orders(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL,
  vehicle_type TEXT NOT NULL,
  freight_offer INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'in_transit', 'delivered')),
  assigned_vehicle TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  pickup_otp TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. GRIEVANCES & DISPUTES
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES procurement_orders(id) ON DELETE CASCADE,
  raised_by_id TEXT NOT NULL,
  raised_by_name TEXT NOT NULL,
  raised_by_role TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved')),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 13. MARKET PRICE CACHE
CREATE TABLE IF NOT EXISTS market_price_cache (
  id TEXT PRIMARY KEY,
  commodity TEXT NOT NULL,
  market TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Telangana',
  min_price INT,
  max_price INT,
  modal_price INT NOT NULL,
  arrival_date TEXT,
  source TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 14. IN-APP NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read INT NOT NULL DEFAULT 0,
  entity_type TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. COMMUNITY BULK REQUIREMENTS
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
  max_radius_km DOUBLE PRECISION DEFAULT 25.0,
  additional_instructions TEXT,
  is_recurring INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  lat DOUBLE PRECISION DEFAULT 17.3850,
  lon DOUBLE PRECISION DEFAULT 78.4867,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. COMMUNITY REQUIREMENT ITEMS
CREATE TABLE IF NOT EXISTS community_requirement_items (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES community_requirements(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  crop_key TEXT,
  required_quantity DOUBLE PRECISION NOT NULL CHECK(required_quantity > 0),
  fulfilled_quantity DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK(fulfilled_quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  preferred_grade TEXT DEFAULT 'A',
  max_acceptable_price DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. FARMER REQUIREMENT OFFERS
CREATE TABLE IF NOT EXISTS farmer_requirement_offers (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL REFERENCES farmers(id),
  farmer_name TEXT NOT NULL,
  farmer_phone TEXT,
  farmer_village TEXT NOT NULL,
  farmer_district TEXT NOT NULL,
  farmer_lat DOUBLE PRECISION DEFAULT 17.8400,
  farmer_lon DOUBLE PRECISION DEFAULT 79.1100,
  requirement_id TEXT NOT NULL REFERENCES community_requirements(id),
  requirement_item_id TEXT NOT NULL REFERENCES community_requirement_items(id),
  product_name TEXT NOT NULL,
  offered_quantity DOUBLE PRECISION NOT NULL CHECK(offered_quantity > 0),
  accepted_quantity DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK(accepted_quantity >= 0),
  price_per_unit DOUBLE PRECISION NOT NULL CHECK(price_per_unit > 0),
  total_amount DOUBLE PRECISION NOT NULL CHECK(total_amount > 0),
  harvest_date TEXT,
  quality_info TEXT,
  organic_certified INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. POOLED PROCUREMENT ORDERS
CREATE TABLE IF NOT EXISTS pooled_procurement_orders (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES community_requirements(id),
  buyer_id TEXT NOT NULL REFERENCES buyers(id),
  buyer_name TEXT NOT NULL,
  total_accepted_quantity DOUBLE PRECISION NOT NULL CHECK(total_accepted_quantity > 0),
  total_order_value DOUBLE PRECISION NOT NULL CHECK(total_order_value >= 0),
  delivery_address TEXT NOT NULL,
  delivery_deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'procurement_confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. POOLED PROCUREMENT ITEMS
CREATE TABLE IF NOT EXISTS pooled_procurement_items (
  id TEXT PRIMARY KEY,
  pooled_order_id TEXT NOT NULL REFERENCES pooled_procurement_orders(id) ON DELETE CASCADE,
  requirement_item_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  accepted_quantity DOUBLE PRECISION NOT NULL CHECK(accepted_quantity > 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  avg_price_per_unit DOUBLE PRECISION NOT NULL,
  total_item_value DOUBLE PRECISION NOT NULL
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
  quantity DOUBLE PRECISION NOT NULL CHECK(quantity > 0),
  price_per_unit DOUBLE PRECISION NOT NULL CHECK(price_per_unit > 0),
  total_amount DOUBLE PRECISION NOT NULL CHECK(total_amount > 0),
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
  total_weight_kg DOUBLE PRECISION NOT NULL CHECK(total_weight_kg > 0),
  farmer_count INT NOT NULL CHECK(farmer_count > 0),
  estimated_distance_km DOUBLE PRECISION,
  delivery_deadline TEXT NOT NULL,
  suggested_vehicle TEXT NOT NULL,
  handling_instructions TEXT,
  organic_separate_handling INT DEFAULT 0,
  assigned_transporter_id TEXT,
  assigned_transporter_name TEXT,
  assigned_vehicle_reg TEXT,
  accepted_bid_id TEXT,
  freight_amount DOUBLE PRECISION DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'transport_pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. TRANSPORT BIDS
CREATE TABLE IF NOT EXISTS transport_bids (
  id TEXT PRIMARY KEY,
  transport_request_id TEXT NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
  transporter_id TEXT NOT NULL REFERENCES users(id),
  transporter_name TEXT NOT NULL,
  transporter_phone TEXT,
  vehicle_type TEXT NOT NULL,
  vehicle_capacity_kg DOUBLE PRECISION NOT NULL CHECK(vehicle_capacity_kg > 0),
  bid_amount DOUBLE PRECISION NOT NULL CHECK(bid_amount > 0),
  estimated_delivery_time TEXT NOT NULL,
  pickup_capability TEXT,
  special_handling_notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR SPEED
CREATE INDEX IF NOT EXISTS idx_harvest_lots_farmer ON harvest_lots(farmer_id);
CREATE INDEX IF NOT EXISTS idx_harvest_lots_status ON harvest_lots(status);
CREATE INDEX IF NOT EXISTS idx_bids_lot ON bids(lot_id);
CREATE INDEX IF NOT EXISTS idx_bids_buyer ON bids(buyer_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_farmer ON procurement_orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_buyer ON procurement_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_logistics_trips_status ON logistics_trips(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);

CREATE INDEX IF NOT EXISTS idx_comm_req_buyer ON community_requirements(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_comm_req_status ON community_requirements(status);
CREATE INDEX IF NOT EXISTS idx_farmer_offers_req ON farmer_requirement_offers(requirement_id, status);
CREATE INDEX IF NOT EXISTS idx_transport_req_status ON transport_requests(status);

-- ROW LEVEL SECURITY (RLS) DISABLED FOR FULL API ACCESS
ALTER TABLE harvest_lots DISABLE ROW LEVEL SECURITY;
ALTER TABLE bids DISABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE farmers DISABLE ROW LEVEL SECURITY;
ALTER TABLE buyers DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_requirement_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_requirement_offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE pooled_procurement_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE pooled_procurement_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE pooled_order_farmer_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE transport_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE transport_bids DISABLE ROW LEVEL SECURITY;

