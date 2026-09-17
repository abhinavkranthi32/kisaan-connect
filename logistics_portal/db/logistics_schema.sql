-- =============================================================================
-- KISSAN CONNECT - LOGISTICS FLEET PORTAL DATABASE SCHEMA (రవాణా వేదిక డేటాబేస్)
-- Domain: Transporter Profiles, Fleet Vehicles, Haulage Trips, Freight Payouts
-- =============================================================================

CREATE TABLE IF NOT EXISTS transporters (
    transporter_id VARCHAR(50) PRIMARY KEY,
    agency_name VARCHAR(150) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    base_mandi VARCHAR(100) NOT NULL,
    fleet_count INT DEFAULT 5,
    wallet_earnings DECIMAL(12, 2) DEFAULT 0.00,
    rating DECIMAL(3, 2) DEFAULT 4.70,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fleet_vehicles (
    vehicle_id VARCHAR(50) PRIMARY KEY,
    transporter_id VARCHAR(50) NOT NULL REFERENCES transporters(transporter_id),
    reg_number VARCHAR(30) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('tractor_trolley', 'dcm_14ft', 'truck_10ton', 'multi_axle')),
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(15) NOT NULL,
    capacity_quintals DECIMAL(10, 2) NOT NULL,
    current_status VARCHAR(20) DEFAULT 'idle' CHECK (current_status IN ('idle', 'en_route', 'loading', 'delivered'))
);

CREATE TABLE IF NOT EXISTS haulage_trips (
    trip_id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL,
    transporter_id VARCHAR(50) REFERENCES transporters(transporter_id),
    crop_name VARCHAR(100) NOT NULL,
    origin_farm VARCHAR(150) NOT NULL,
    destination_hub VARCHAR(150) NOT NULL,
    distance_km DECIMAL(6, 1) NOT NULL,
    freight_rate DECIMAL(10, 2) NOT NULL,
    assigned_vehicle VARCHAR(30),
    pickup_otp VARCHAR(10) NOT NULL,
    delivery_otp VARCHAR(10) NOT NULL,
    trip_status VARCHAR(20) DEFAULT 'available' CHECK (trip_status IN ('available', 'assigned', 'in_transit', 'delivered')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
