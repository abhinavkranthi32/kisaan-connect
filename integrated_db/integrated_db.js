/**
 * KISSAN CONNECT - INTEGRATED MASTER DATABASE ENGINE
 * Unified Data Store & Cross-Portal Synchronization Layer
 */

const IntegratedDB = (function() {
  const STORAGE_KEY = 'kissan_connect_master_db_v1';

  // In-memory / initial state cache
  let db = null;

  function init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        db = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('LocalStorage unavailable or corrupt. Initializing fresh DB.', e);
    }

    if (!db) {
      // Default initial master seed
      db = {
        users: [
          { id: 'USR-FARM-01', phone: '9848055210', name: 'మల్లారెడ్డి (Malla Reddy)', role: 'farmer', village: 'జనగామ, వరంగల్', wallet: 148500 },
          { id: 'USR-BUY-01', phone: '9440122891', name: 'ITC Agri Business Hub', role: 'buyer', gstin: '36AAACI1234F1Z8', escrowBalance: 1550000, rating: '4.9 ★' },
          { id: 'USR-BUY-02', phone: '9848211090', name: 'శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్', role: 'buyer', gstin: '36ABCKR9812G2Z1', escrowBalance: 2400000, rating: '4.9 ★' },
          { id: 'USR-BUY-03', phone: '9848033211', name: 'ఖమ్మం స్పైసెస్ ఎక్స్‌పోర్టర్స్', role: 'buyer', gstin: '36AAXKS4412P1Z4', escrowBalance: 880000, rating: '4.7 ★' },
          { id: 'USR-LOG-01', phone: '9988112233', name: 'తెలంగాణ ఆగ్రో ట్రాన్స్‌పోర్ట్', role: 'logistics', fleetSize: 14, license: 'TS-TR-2024-881' }
        ],
        mandis: [
          { id: 'wgl_enumamula', nameTe: 'వరంగల్ (ఎనుమాముల)', nameEn: 'Warangal (Enumamula)', crop: 'తేజ మిర్చి (Teja Chilli)', price: 21400, trend: 'up', change: '+3.2%' },
          { id: 'khammam', nameTe: 'ఖమ్మం మార్కెట్', nameEn: 'Khammam Mandi Yard', crop: 'తేజ మిర్చి & మొక్కజొన్న', price: 21850, trend: 'up', change: '+4.1%' },
          { id: 'nizamabad', nameTe: 'నిజామాబాద్ మార్కెట్', nameEn: 'Nizamabad APMC', crop: 'పసుపు (Turmeric)', price: 14900, trend: 'up', change: '+1.8%' },
          { id: 'miryalaguda', nameTe: 'మిర్యాలగూడ యార్డ్', nameEn: 'Miryalaguda Hub', crop: 'తెలంగాణ సోనా వరి (Paddy)', price: 2380, trend: 'up', change: '+2.4%' },
          { id: 'suryapet', nameTe: 'సూర్యాపేట మార్కెట్', nameEn: 'Suryapet Yard', crop: 'కందులు (Red Gram)', price: 10450, trend: 'down', change: '-0.8%' },
          { id: 'adilabad', nameTe: 'ఆదిలాబాద్ కాటన్ మార్కెట్', nameEn: 'Adilabad Cotton Yard', crop: 'పత్తి (Raw Cotton)', price: 7450, trend: 'up', change: '+1.5%' }
        ],
        harvestLots: [],
        orders: [],
        buyerRfqs: [],
        haulageTrips: [],,
        disputes: []
      };
      save();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  init();

  return {
    // Mandi Rates
    getMandis: () => [...db.mandis],
    
    // Harvest Lots
    getLots: () => [...db.harvestLots],
    getLotById: (lotId) => db.harvestLots.find(l => l.id === lotId),
    addLot: (lot) => {
      db.harvestLots.unshift(lot);
      save();
      return lot;
    },
    removeLot: (lotId) => {
      db.harvestLots = db.harvestLots.filter(l => l.id !== lotId);
      save();
    },

    // Bids
    placeBid: (lotId, bid) => {
      const lot = db.harvestLots.find(l => l.id === lotId);
      if (!lot) return null;
      if (!lot.bids) lot.bids = [];
      lot.bids.unshift(bid);
      if (bid.pricePerQ > lot.highestBid) {
        lot.highestBid = bid.pricePerQ;
      }
      save();
      return { lot, bid };
    },
    rejectBid: (lotId, bidId) => {
      const lot = db.harvestLots.find(l => l.id === lotId);
      if (!lot) return false;
      lot.bids = lot.bids.filter(b => b.bidId !== bidId);
      save();
      return true;
    },
    counterBid: (lotId, bidId, counterPrice) => {
      const lot = db.harvestLots.find(l => l.id === lotId);
      if (!lot) return false;
      const bid = lot.bids.find(b => b.bidId === bidId);
      if (bid) {
        bid.pricePerQ = counterPrice;
        bid.isCounter = true;
        if (counterPrice > lot.highestBid) lot.highestBid = counterPrice;
        save();
        return true;
      }
      return false;
    },

    // Orders & Escrow
    getOrders: () => [...db.orders],
    createOrder: (order) => {
      db.orders.unshift(order);
      // Automatically create corresponding Haulage Trip in logistics
      const tripId = `TRIP-TS-${Math.floor(700 + Math.random() * 200)}`;
      db.haulageTrips.unshift({
        tripId: tripId,
        orderId: order.orderId,
        cropName: order.cropNameTe,
        origin: 'రైతు పొలం (Farm Gate)',
        destination: `${order.buyerName} ప్రాసెసింగ్ హబ్`,
        distanceKm: Math.floor(25 + Math.random() * 60),
        freightOffer: Math.floor(4500 + Math.random() * 4000),
        vehicleType: '10-Ton Truck / DCM',
        status: 'available',
        pickupOtp: order.farmGateOtp,
        deliveryOtp: String(Math.floor(1000 + Math.random() * 9000)),
        assignedVehicle: order.vehicleNumber || null,
        driverName: order.driverName || null
      });
      save();
      return order;
    },
    updateOrderStep: (orderId, step) => {
      const order = db.orders.find(o => o.orderId === orderId);
      if (order) {
        order.currentStep = step;
        save();
      }
      return order;
    },
    assignTruckToOrder: (orderId, vehicleNumber, driverName, driverPhone) => {
      const order = db.orders.find(o => o.orderId === orderId);
      if (order) {
        order.vehicleNumber = vehicleNumber;
        order.driverName = driverName;
        order.driverPhone = driverPhone;
        order.currentStep = 3; // Truck dispatched
      }
      const trip = db.haulageTrips.find(t => t.orderId === orderId);
      if (trip) {
        trip.assignedVehicle = vehicleNumber;
        trip.driverName = `${driverName} (${driverPhone})`;
        trip.status = 'assigned';
      }
      save();
      return order;
    },

    // Logistics Trips
    getTrips: () => [...db.haulageTrips],
    assignVehicleToTrip: (tripId, vehicleNumber, driverName, driverPhone) => {
      const trip = db.haulageTrips.find(t => t.tripId === tripId);
      if (trip) {
        trip.assignedVehicle = vehicleNumber;
        trip.driverName = `${driverName} (${driverPhone})`;
        trip.status = 'assigned';
        // Also update corresponding order
        const order = db.orders.find(o => o.orderId === trip.orderId);
        if (order) {
          order.vehicleNumber = vehicleNumber;
          order.driverName = driverName;
          order.driverPhone = driverPhone;
          order.currentStep = 3; // Truck en-route
        }
        save();
      }
      return trip;
    },
    verifyTripOtp: (tripId, otp) => {
      const trip = db.haulageTrips.find(t => t.tripId === tripId);
      if (trip && trip.pickupOtp === otp) {
        trip.status = 'delivered';
        const order = db.orders.find(o => o.orderId === trip.orderId);
        if (order) {
          order.currentStep = 5; // Paid
        }
        save();
        return true;
      }
      return false;
    },

    // Buyer RFQs
    getRfqs: () => [...db.buyerRfqs],
    addRfq: (rfq) => {
      db.buyerRfqs.unshift(rfq);
      save();
      return rfq;
    },

    // Disputes
    getDisputes: () => [...db.disputes],
    addDispute: (ticket) => {
      db.disputes.unshift(ticket);
      save();
      return ticket;
    },

    // User & Wallet
    getUserWallet: (userId = 'USR-FARM-01') => {
      const user = db.users.find(u => u.id === userId);
      return user ? user.wallet : 148500;
    },
    creditUserWallet: (amount, userId = 'USR-FARM-01') => {
      const user = db.users.find(u => u.id === userId);
      if (user) {
        user.wallet = (user.wallet || 0) + Number(amount);
        save();
        return user.wallet;
      }
      return 148500 + Number(amount);
    },

    // Reset to Seed
    resetDatabase: () => {
      localStorage.removeItem(STORAGE_KEY);
      init();
    }
  };
})();

// Export globally for script tags & modules
if (typeof window !== 'undefined') {
  window.IntegratedDB = IntegratedDB;
}
