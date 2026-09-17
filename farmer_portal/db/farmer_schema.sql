-- =============================================================================
-- KISSAN CONNECT - FARMER PORTAL DATABASE SCHEMA (రైతు డేటాబేస్)
-- Domain: Farmer Profiles, Harvest Lots, Demand Reserve Price, Bids Received, Escrow
-- =============================================================================

CREATE TABLE IF NOT EXISTS farmer_profiles (
    farmer_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    village VARCHAR(100) NOT NULL,
    mandal VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    rythu_bandhu_id VARCHAR(50),
    bank_account_number VARCHAR(30),
    bank_ifsc VARCHAR(20),
    escrow_wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farmer_harvest_lots (
    lot_id VARCHAR(50) PRIMARY KEY,
    farmer_id VARCHAR(50) NOT NULL REFERENCES farmer_profiles(farmer_id),
    crop_key VARCHAR(50) NOT NULL,
    variety VARCHAR(100) NOT NULL,
    quantity_quintals DECIMAL(10, 2) NOT NULL,
    grade VARCHAR(5) NOT NULL CHECK (grade IN ('A', 'B', 'C')),
    moisture_percentage VARCHAR(10),
    location VARCHAR(150) NOT NULL,
    storage_type VARCHAR(100) NOT NULL,
    reserve_price_ask DECIMAL(10, 2) NOT NULL,
    current_highest_bid DECIMAL(10, 2) DEFAULT 0.00,
    auction_ends_at TIMESTAMP,
    image_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'accepted', 'sold', 'expired'))
);

CREATE TABLE IF NOT EXISTS farmer_received_bids (
    bid_id VARCHAR(50) PRIMARY KEY,
    lot_id VARCHAR(50) NOT NULL REFERENCES farmer_harvest_lots(lot_id) ON DELETE CASCADE,
    buyer_name VARCHAR(100) NOT NULL,
    buyer_rating VARCHAR(30),
    buyer_location VARCHAR(100),
    price_per_quintal DECIMAL(10, 2) NOT NULL,
    logistics_mode VARCHAR(30) NOT NULL,
    logistics_text VARCHAR(255),
    bid_status VARCHAR(20) DEFAULT 'active' CHECK (bid_status IN ('active', 'accepted', 'countered', 'rejected')),
    counter_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farmer_orders_escrow (
    order_id VARCHAR(50) PRIMARY KEY,
    lot_id VARCHAR(50) NOT NULL,
    farmer_id VARCHAR(50) NOT NULL REFERENCES farmer_profiles(farmer_id),
    crop_name VARCHAR(100) NOT NULL,
    buyer_name VARCHAR(100) NOT NULL,
    buyer_phone VARCHAR(20),
    agreed_rate DECIMAL(10, 2) NOT NULL,
    total_escrow_amount DECIMAL(12, 2) NOT NULL,
    current_step INT DEFAULT 2, -- 1: Accepted, 2: Escrow Locked, 3: Truck Dispatched, 4: OTP Verification, 5: Paid
    farm_gate_otp VARCHAR(10) NOT NULL,
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(100),
    estimated_arrival VARCHAR(100),
    released_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farmer_disputes (
    ticket_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    farmer_id VARCHAR(50) NOT NULL REFERENCES farmer_profiles(farmer_id),
    category VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
