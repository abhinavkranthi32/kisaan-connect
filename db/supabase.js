/**
 * KISSAN CONNECT - SUPABASE DATABASE SERVICE
 * Cloud PostgreSQL Integration Layer via @supabase/supabase-js
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseInstance = null;

function isSupabaseConfigured() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('your-project-id') && !key.includes('your-supabase'));
}

function getSupabase() {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('your-project-id')) {
    return null;
  }

  supabaseInstance = createClient(url, key, {
    auth: { persistSession: false }
  });
  return supabaseInstance;
}

// -----------------------------------------------------------------------------
// HARVEST LOTS CRUD (REAL-TIME CROP LISTINGS)
// -----------------------------------------------------------------------------
async function getLotsFromSupabase(filters = {}) {
  const client = getSupabase();
  if (!client) return null;

  let query = client.from('harvest_lots').select('*').order('created_at', { ascending: false });

  if (filters.farmerId) query = query.eq('farmer_id', filters.farmerId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.cropKey) query = query.eq('crop_key', filters.cropKey);

  const { data, error } = await query;
  if (error) {
    console.error('[Supabase getLots Error]', error);
    return null;
  }
  return data;
}

async function createLotInSupabase(lot) {
  const client = getSupabase();
  if (!client) return null;

  const row = {
    id: lot.id || `LOT-TS-${Date.now()}`,
    farmer_id: lot.farmerId || 'USR-FARM-01',
    farmer_name: lot.farmerName || 'మల్లారెడ్డి',
    farmer_phone: lot.farmerPhone || '9848055210',
    crop_key: lot.cropKey || 'crop',
    crop_name_te: lot.cropNameTe || 'వరి',
    crop_name_en: lot.cropNameEn || 'Paddy',
    variety_te: lot.varietyTe || 'రకం A',
    variety_en: lot.varietyEn || 'Grade A',
    quantity_quintals: Number(lot.quantity || lot.quantityQuintals || 10),
    grade: lot.grade || 'A',
    moisture_pct: lot.moisture || '10%',
    location_te: lot.locationTe || 'జనగామ',
    location_en: lot.locationEn || 'Jangaon',
    lat: Number(lot.lat || 17.84),
    lon: Number(lot.lon || 79.11),
    storage_type_te: lot.storageTe || 'పొలంలోనే ఉంది (Farm Gate)',
    storage_type_en: lot.storageEn || 'Farm Gate Pickup',
    reserve_price: Number(lot.reservePrice || 1000),
    highest_bid: Number(lot.highestBid || 0),
    image_url: lot.image || lot.imageUrl || '../shared/assets/crops/paddy.jpg',
    status: 'active'
  };

  const { data, error } = await client.from('harvest_lots').insert([row]).select().single();
  if (error) {
    console.error('[Supabase createLot Error]', error);
    throw error;
  }
  return data;
}

// -----------------------------------------------------------------------------
// BIDS CRUD
// -----------------------------------------------------------------------------
async function createBidInSupabase(bid) {
  const client = getSupabase();
  if (!client) return null;

  const row = {
    id: bid.id || `BID-${Date.now()}`,
    lot_id: bid.lotId,
    buyer_id: bid.buyerId,
    buyer_name: bid.buyerName,
    buyer_rating: bid.buyerRating || '4.8 ★',
    buyer_location: bid.buyerLocation || 'హైదరాబాద్',
    price_per_q: Number(bid.pricePerQ),
    total_deal_amount: Number(bid.totalDealAmount || (bid.pricePerQ * (bid.quantity || 1))),
    logistics_mode: bid.logisticsMode || 'buyer_vehicle',
    logistics_text_te: bid.logisticsTextTe || 'కొనుగోలుదారు వాహనం',
    logistics_text_en: bid.logisticsTextEn || 'Buyer Vehicle',
    status: 'active'
  };

  const { data, error } = await client.from('bids').insert([row]).select().single();
  if (error) {
    console.error('[Supabase createBid Error]', error);
    throw error;
  }

  // Update highest bid on lot
  await client.from('harvest_lots').update({ highest_bid: Number(bid.pricePerQ) }).eq('id', bid.lotId);

  return data;
}

// -----------------------------------------------------------------------------
// ORDERS & LOGISTICS TRIPS INTEGRATION
// -----------------------------------------------------------------------------
async function createOrderInSupabase(orderData) {
  const client = getSupabase();
  if (!client) return null;

  const { data: order, error: orderErr } = await client.from('procurement_orders').insert([{
    id: orderData.id || `KC-TS-2026-${Math.floor(100 + Math.random() * 900)}`,
    lot_id: orderData.lotId,
    buyer_id: orderData.buyerId,
    farmer_id: orderData.farmerId || 'USR-FARM-01',
    crop_name_te: orderData.cropNameTe,
    crop_name_en: orderData.cropNameEn,
    quantity_quintals: Number(orderData.quantity),
    agreed_rate: Number(orderData.agreedRate),
    total_escrow_amount: Number(orderData.totalEscrowAmount),
    current_step: 2,
    farm_gate_otp: String(Math.floor(1000 + Math.random() * 9000)),
    status: 'escrow_locked'
  }]).select().single();

  if (orderErr) {
    console.error('[Supabase createOrder Error]', orderErr);
    throw orderErr;
  }

  // Mark Lot deal_accepted
  await client.from('harvest_lots').update({ status: 'deal_accepted' }).eq('id', orderData.lotId);

  // Automatically Create Logistics Trip for Logistics Portal!
  const { data: trip, error: tripErr } = await client.from('logistics_trips').insert([{
    id: `TRIP-${Math.floor(100 + Math.random() * 900)}`,
    order_id: order.id,
    crop_name: `${orderData.cropNameEn} (${orderData.quantity} Q)`,
    origin: orderData.origin || 'Jangaon Farm Gate',
    destination: orderData.destination || 'Miryalaguda APMC Yard',
    distance_km: 68.5,
    vehicle_type: '10-Ton Multi-Axle Truck',
    freight_offer: Math.round(orderData.totalEscrowAmount * 0.05),
    status: 'available'
  }]).select().single();

  if (tripErr) {
    console.warn('[Supabase trip creation warning]', tripErr);
  }

  return { order, trip };
}

async function getTripsFromSupabase(status = 'all') {
  const client = getSupabase();
  if (!client) return null;

  let q = client.from('logistics_trips').select('*').order('created_at', { ascending: false });
  if (status !== 'all') {
    q = q.eq('status', status);
  }

  const { data, error } = await q;
  if (error) {
    console.error('[Supabase getTrips Error]', error);
    return null;
  }
  return data;
}

module.exports = {
  isSupabaseConfigured,
  getSupabase,
  getLotsFromSupabase,
  createLotInSupabase,
  createBidInSupabase,
  createOrderInSupabase,
  getTripsFromSupabase
};
