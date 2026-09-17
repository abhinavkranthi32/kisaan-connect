-- =============================================================================
-- KISSAN CONNECT - COMMERCIAL BUYER PORTAL DATABASE SCHEMA (కొనుగోలుదారు డేటాబేస్)
-- Domain: Buyer Profiles, Live Harvest Lots, Bid Management, Procurement Orders, RFQs
-- =============================================================================

CREATE TABLE IF NOT EXISTS commercial_buyers (
    buyer_id VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    trade_license_number VARCHAR(50) NOT NULL,
    gstin VARCHAR(20) UNIQUE NOT NULL,
    authorized_phone VARCHAR(15) NOT NULL,
    city VARCHAR(100) NOT NULL,
    apmc_mandi_jurisdiction VARCHAR(100) NOT NULL,
    escrow_deposit_balance DECIMAL(14, 2) DEFAULT 0.00,
    trust_score DECIMAL(3, 2) DEFAULT 4.80,
    deals_completed INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buyer_placed_bids (
    bid_id VARCHAR(50) PRIMARY KEY,
    lot_id VARCHAR(50) NOT NULL,
    buyer_id VARCHAR(50) NOT NULL REFERENCES commercial_buyers(buyer_id),
    crop_name VARCHAR(100) NOT NULL,
    farmer_name VARCHAR(100) NOT NULL,
    farmer_location VARCHAR(150) NOT NULL,
    quantity_quintals DECIMAL(10, 2) NOT NULL,
    bid_price_per_q DECIMAL(10, 2) NOT NULL,
    total_bid_valuation DECIMAL(12, 2) NOT NULL,
    logistics_type VARCHAR(30) DEFAULT 'buyer_vehicle' CHECK (logistics_type IN ('buyer_vehicle', 'platform_transport')),
    bid_rank_status VARCHAR(20) DEFAULT 'leading' CHECK (bid_rank_status IN ('leading', 'outbid', 'accepted', 'counter_received', 'rejected')),
    farmer_counter_price DECIMAL(10, 2),
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buyer_procurement_orders (
    order_id VARCHAR(50) PRIMARY KEY,
    lot_id VARCHAR(50) NOT NULL,
    buyer_id VARCHAR(50) NOT NULL REFERENCES commercial_buyers(buyer_id),
    farmer_name VARCHAR(100) NOT NULL,
    farmer_phone VARCHAR(20) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    quantity_quintals DECIMAL(10, 2) NOT NULL,
    settlement_rate_per_q DECIMAL(10, 2) NOT NULL,
    gross_order_value DECIMAL(12, 2) NOT NULL,
    escrow_locked_amount DECIMAL(12, 2) NOT NULL,
    milestone_step INT DEFAULT 2, -- 1: Accepted, 2: Escrow Locked, 3: Truck Dispatched, 4: OTP Loading, 5: Paid
    assigned_truck_reg VARCHAR(30),
    assigned_driver_name VARCHAR(100),
    assigned_driver_phone VARCHAR(20),
    estimated_pickup_time TIMESTAMP,
    farm_gate_otp VARCHAR(10) NOT NULL,
    invoice_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buyer_rfq_tenders (
    rfq_id VARCHAR(50) PRIMARY KEY,
    buyer_id VARCHAR(50) NOT NULL REFERENCES commercial_buyers(buyer_id),
    crop_key VARCHAR(50) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    required_quantity_q DECIMAL(10, 2) NOT NULL,
    offer_price_per_q DECIMAL(10, 2) NOT NULL,
    delivery_hub_location VARCHAR(150) NOT NULL,
    quality_grade_required VARCHAR(5) DEFAULT 'A',
    max_moisture_percentage VARCHAR(10),
    valid_until TIMESTAMP,
    rfq_status VARCHAR(20) DEFAULT 'active' CHECK (rfq_status IN ('active', 'fulfilled', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
