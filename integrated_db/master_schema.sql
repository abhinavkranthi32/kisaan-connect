-- =============================================================================
-- KISSAN CONNECT (కిసాన్ కనెక్ట్) - MASTER INTEGRATED DATABASE SCHEMA
-- Telangana Agri Market Linkage Platform (Production Relational DDL)
-- Compatible with PostgreSQL, MySQL 8+, SQLite 3
-- =============================================================================

-- 1. USERS & IDENTITY
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('farmer', 'buyer', 'logistics', 'admin')),
    language_pref VARCHAR(5) DEFAULT 'te' CHECK (language_pref IN ('te', 'en')),
    is_phone_verified BOOLEAN DEFAULT FALSE,
    kyc_status VARCHAR(20) DEFAULT 'verified',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TELANGANA APMC MANDI LIVE RATES
CREATE TABLE IF NOT EXISTS mandi_prices (
    mandi_id VARCHAR(50) PRIMARY KEY,
    mandi_name_te VARCHAR(100) NOT NULL,
    mandi_name_en VARCHAR(100) NOT NULL,
    district VARCHAR(50) NOT NULL,
    crop_name_te VARCHAR(100) NOT NULL,
    crop_name_en VARCHAR(100) NOT NULL,
    modal_price DECIMAL(10, 2) NOT NULL,
    min_price DECIMAL(10, 2),
    max_price DECIMAL(10, 2),
    daily_arrival_bags INT DEFAULT 0,
    price_trend VARCHAR(10) DEFAULT 'up' CHECK (price_trend IN ('up', 'down', 'stable')),
    trend_percentage VARCHAR(10) DEFAULT '+0.0%',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. FARMER HARVEST LOTS (COMMODITY INVENTORY)
CREATE TABLE IF NOT EXISTS harvest_lots (
    lot_id VARCHAR(50) PRIMARY KEY,
    farmer_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crop_key VARCHAR(50) NOT NULL,
    crop_name_te VARCHAR(100) NOT NULL,
    crop_name_en VARCHAR(100) NOT NULL,
    variety_te VARCHAR(100),
    variety_en VARCHAR(100),
    quantity_quintals DECIMAL(10, 2) NOT NULL,
    grade VARCHAR(5) NOT NULL CHECK (grade IN ('A', 'B', 'C')),
    moisture_percentage VARCHAR(10),
    location_te VARCHAR(150) NOT NULL,
    location_en VARCHAR(150) NOT NULL,
    storage_type_te VARCHAR(100) DEFAULT 'పొలంలోనే ఉంది (Farm Gate)',
    storage_type_en VARCHAR(100) DEFAULT 'Farm Gate Pickup',
    reserve_ask_price DECIMAL(10, 2) NOT NULL,
    highest_bid_price DECIMAL(10, 2) DEFAULT 0,
    image_url VARCHAR(255),
    auction_status VARCHAR(20) DEFAULT 'active' CHECK (auction_status IN ('active', 'accepted', 'sold', 'expired')),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. BUYER BIDDING WAR ARENA (OFFERS & COUNTERS)
CREATE TABLE IF NOT EXISTS bids (
    bid_id VARCHAR(50) PRIMARY KEY,
    lot_id VARCHAR(50) NOT NULL REFERENCES harvest_lots(lot_id) ON DELETE CASCADE,
    buyer_id VARCHAR(50) NOT NULL REFERENCES users(id),
    buyer_name VARCHAR(100) NOT NULL,
    buyer_rating VARCHAR(30),
    buyer_location VARCHAR(100),
    bid_price_per_q DECIMAL(10, 2) NOT NULL,
    logistics_mode VARCHAR(30) DEFAULT 'buyer_vehicle' CHECK (logistics_mode IN ('buyer_vehicle', 'platform_transport')),
    logistics_text_te VARCHAR(255),
    logistics_text_en VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'countered', 'rejected', 'outbid')),
    counter_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. COMMERCIAL ORDERS & ESCROW TRANSACTIONS
CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(50) PRIMARY KEY,
    lot_id VARCHAR(50) NOT NULL REFERENCES harvest_lots(lot_id),
    farmer_id VARCHAR(50) NOT NULL REFERENCES users(id),
    buyer_id VARCHAR(50) NOT NULL REFERENCES users(id),
    agreed_rate_per_q DECIMAL(10, 2) NOT NULL,
    quantity_quintals DECIMAL(10, 2) NOT NULL,
    total_escrow_amount DECIMAL(12, 2) NOT NULL,
    current_milestone_step INT DEFAULT 2 CHECK (current_milestone_step BETWEEN 1 AND 5),
    -- 1: Accepted, 2: Escrow Locked, 3: Truck Dispatched, 4: Farm-Gate OTP Loading, 5: Paid
    farm_gate_otp VARCHAR(10) NOT NULL,
    assigned_vehicle_number VARCHAR(50),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    estimated_arrival VARCHAR(100),
    payment_release_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. IMMUTABLE ESCROW LEDGER
CREATE TABLE IF NOT EXISTS escrow_ledger (
    transaction_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(order_id),
    sender_user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    receiver_user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    amount DECIMAL(12, 2) NOT NULL,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('deposit_lock', 'farmer_payout', 'logistics_payout', 'refund_dispute')),
    balance_after DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'frozen', 'reversed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. HAULAGE TRIPS (LOGISTICS FLEET)
CREATE TABLE IF NOT EXISTS haulage_trips (
    trip_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(order_id),
    transporter_id VARCHAR(50) REFERENCES users(id),
    pickup_location VARCHAR(200) NOT NULL,
    delivery_location VARCHAR(200) NOT NULL,
    crop_quantity_q DECIMAL(10, 2) NOT NULL,
    freight_charges DECIMAL(10, 2) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    trip_status VARCHAR(20) DEFAULT 'available' CHECK (trip_status IN ('available', 'assigned', 'in_transit', 'delivered')),
    pickup_otp VARCHAR(10) NOT NULL,
    delivery_otp VARCHAR(10) NOT NULL,
    dispatched_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- 8. BUYER DEMAND TENDERS (RFQs)
CREATE TABLE IF NOT EXISTS buyer_rfqs (
    rfq_id VARCHAR(50) PRIMARY KEY,
    buyer_id VARCHAR(50) NOT NULL REFERENCES users(id),
    crop_key VARCHAR(50) NOT NULL,
    crop_name_te VARCHAR(100) NOT NULL,
    crop_name_en VARCHAR(100) NOT NULL,
    target_quantity_q DECIMAL(10, 2) NOT NULL,
    offer_price_per_q DECIMAL(10, 2) NOT NULL,
    delivery_mandi_te VARCHAR(100) NOT NULL,
    delivery_mandi_en VARCHAR(100) NOT NULL,
    valid_until TIMESTAMP,
    rfq_status VARCHAR(20) DEFAULT 'open' CHECK (rfq_status IN ('open', 'fulfilled', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. GRIEVANCE & DISPUTE TICKETS
CREATE TABLE IF NOT EXISTS grievance_tickets (
    ticket_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(order_id),
    raised_by_user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    ticket_status VARCHAR(20) DEFAULT 'open' CHECK (ticket_status IN ('open', 'under_investigation', 'resolved', 'dismissed')),
    escrow_frozen BOOLEAN DEFAULT TRUE,
    nodal_officer_assigned VARCHAR(100) DEFAULT 'వరంగల్ జిల్లా వ్యవసాయ అధికారి (DAO)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_harvest_crop ON harvest_lots(crop_key, auction_status);
CREATE INDEX IF NOT EXISTS idx_bids_lot ON bids(lot_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_farmer ON orders(farmer_id, current_milestone_step);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, current_milestone_step);
CREATE INDEX IF NOT EXISTS idx_escrow_order ON escrow_ledger(order_id);
