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
        harvestLots: [
          {
            id: 'LOT-TS-401',
            farmerId: 'USR-FARM-01',
            farmerName: 'మల్లారెడ్డి',
            cropKey: 'teja_chilli',
            cropNameTe: 'తేజ మిర్చి (Teja Red Chilli)',
            cropNameEn: 'Teja Red Chilli',
            varietyTe: 'తేజ స్పెషల్ ఎగుమతి రకం',
            varietyEn: 'Teja Special Export Grade',
            quantity: 40,
            grade: 'A',
            moisture: '9.2%',
            locationTe: 'జనగామ మండలం, వరంగల్ జిల్లా',
            locationEn: 'Jangaon Mandal, Warangal Dist',
            storageTe: 'పొలంలోనే ఉంది (Farm Gate)',
            storageEn: 'Farm Gate Pickup',
            reservePrice: 21000,
            highestBid: 21650,
            auctionEndsIn: '03h : 42m : 18s',
            image: '../shared/assets/crops/teja_chilli.jpg',
            bids: [
              {
                bidId: 'BID-901',
                buyerId: 'USR-BUY-01',
                buyerName: 'ITC Agri Business Hub',
                buyerRating: '4.9 ★ (84 డీల్స్)',
                buyerLocation: 'సికింద్రాబాద్ (Secunderabad)',
                pricePerQ: 21650,
                logisticsMode: 'buyer_vehicle',
                logisticsTextTe: '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
                logisticsTextEn: '🚛 Buyer will send their own truck (₹0 farmer cost)',
                status: 'active'
              },
              {
                bidId: 'BID-902',
                buyerId: 'USR-BUY-03',
                buyerName: 'ఖమ్మం స్పైసెస్ ఎక్స్‌పోర్టర్స్',
                buyerRating: '4.7 ★ (41 డీల్స్)',
                buyerLocation: 'ఖమ్మం (Khammam)',
                pricePerQ: 21400,
                logisticsMode: 'buyer_vehicle',
                logisticsTextTe: '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
                logisticsTextEn: '🚛 Buyer will send own vehicle (₹0 farmer cost)',
                status: 'active'
              }
            ]
          },
          {
            id: 'LOT-TS-402',
            farmerId: 'USR-FARM-01',
            farmerName: 'మల్లారెడ్డి',
            cropKey: 'paddy',
            cropNameTe: 'తెలంగాణ సోనా వరి (Telangana Sona Paddy)',
            cropNameEn: 'Telangana Sona Paddy (RNR)',
            varietyTe: 'RNR 15048 సూపర్ ఫైన్',
            varietyEn: 'RNR 15048 Super Fine Grain',
            quantity: 120,
            grade: 'A',
            moisture: '13.5%',
            locationTe: 'మిర్యాలగూడ పరిసరాలు, నల్గొండ జిల్లా',
            locationEn: 'Miryalaguda, Nalgonda Dist',
            storageTe: 'ఇంటి గోదాము (Village Shed)',
            storageEn: 'Village Shed',
            reservePrice: 2320,
            highestBid: 2440,
            auctionEndsIn: '08h : 15m : 00s',
            image: '../shared/assets/crops/paddy.jpg',
            bids: [
              {
                bidId: 'BID-881',
                buyerId: 'USR-BUY-02',
                buyerName: 'శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్',
                buyerRating: '4.9 ★ (120 డీల్స్)',
                buyerLocation: 'మిర్యాలగూడ (Miryalaguda)',
                pricePerQ: 2440,
                logisticsMode: 'buyer_vehicle',
                logisticsTextTe: '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
                logisticsTextEn: '🚛 Buyer arranges own truck (₹0 farmer cost)',
                status: 'active'
              }
            ]
          },
          {
            id: 'LOT-TS-403',
            farmerId: 'USR-FARM-01',
            farmerName: 'మల్లారెడ్డి',
            cropKey: 'cotton',
            cropNameTe: 'పత్తి (Raw White Cotton)',
            cropNameEn: 'Raw White Cotton',
            varietyTe: 'బ్రహ్మ / కావేరి పొడవు పింజ',
            varietyEn: 'Long Staple Brahma/Kaveri',
            quantity: 55,
            grade: 'A',
            moisture: '7.8%',
            locationTe: 'ఆదిలాబాద్ రూరల్',
            locationEn: 'Adilabad Rural',
            storageTe: 'పొలంలోనే ఉంది (Farm Gate)',
            storageEn: 'Farm Gate Pickup',
            reservePrice: 7400,
            highestBid: 7580,
            auctionEndsIn: '14h : 20m : 00s',
            image: '../shared/assets/crops/cotton.jpg',
            bids: []
          },
          {
            id: 'LOT-TS-404',
            farmerId: 'USR-FARM-01',
            farmerName: 'మల్లారెడ్డి',
            cropKey: 'turmeric',
            cropNameTe: 'నిజామాబాద్ పసుపు (Nizamabad Turmeric)',
            cropNameEn: 'Nizamabad Finger Turmeric',
            varietyTe: 'నిజామాబాద్ ఫింగర్ స్పెషల్ (కర్క్యుమిన్ 3.8%)',
            varietyEn: 'Nizamabad Finger Special (Curcumin 3.8%)',
            quantity: 30,
            grade: 'A',
            moisture: '8.5%',
            locationTe: 'ఆర్మూర్ మండలం, నిజామాబాద్',
            locationEn: 'Armoor Mandal, Nizamabad',
            storageTe: 'గ్రామ గోదాము (Village Storage)',
            storageEn: 'Village Storage',
            reservePrice: 15200,
            highestBid: 15800,
            auctionEndsIn: '05h : 10m : 30s',
            image: '../shared/assets/crops/turmeric.jpg',
            bids: []
          }
        ],
        orders: [
          {
            orderId: 'KC-TS-2026-091',
            lotId: 'LOT-TS-401',
            cropNameTe: 'తేజ మిర్చి (40 క్వింటాళ్లు)',
            cropNameEn: 'Teja Red Chilli (40 Quintals)',
            farmerName: 'మల్లారెడ్డి (Malla Reddy)',
            farmerPhone: '+91 98480 55210',
            buyerId: 'USR-BUY-01',
            buyerName: 'ITC Agri Business Hub',
            buyerPhone: '+91 94401 22891',
            agreedRate: 21650,
            quantity: 40,
            totalEscrowAmount: 866000,
            currentStep: 3, // 1: Accepted, 2: Escrow Locked, 3: Truck Dispatched, 4: OTP Verification, 5: Paid
            farmGateOtp: '4928',
            vehicleNumber: 'TS 03 UB 8192 (10-Ton Truck)',
            driverName: 'రాము యాదవ్ (Ramu Yadav)',
            driverPhone: '+91 98481 23990',
            estimatedArrival: 'ఈరోజు సాయంత్రం 4:30 గంటలకు',
            createdAt: '2026-09-17T08:30:00Z'
          }
        ],
        buyerRfqs: [
          {
            rfqId: 'RFQ-ITC-101',
            buyerName: 'ITC Agri Business Hub',
            cropKey: 'teja_chilli',
            cropNameTe: 'తేజ మిర్చి (Teja Chilli)',
            cropNameEn: 'Teja Red Chilli',
            targetQty: 500,
            offerPrice: 21800,
            deliveryMandi: 'వరంగల్ ప్రాసెసింగ్ ప్లాంట్ (Warangal Plant)',
            validUntil: '10 Days',
            status: 'active'
          },
          {
            rfqId: 'RFQ-SK-102',
            buyerName: 'శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్',
            cropKey: 'paddy',
            cropNameTe: 'తెలంగాణ సోనా వరి (Telangana Sona)',
            cropNameEn: 'Telangana Sona Paddy',
            targetQty: 1200,
            offerPrice: 2450,
            deliveryMandi: 'మిర్యాలగూడ సైలో హబ్ (Miryalaguda Silos)',
            validUntil: '15 Days',
            status: 'active'
          }
        ],
        haulageTrips: [
          {
            tripId: 'TRIP-TS-701',
            orderId: 'KC-TS-2026-091',
            cropName: 'తేజ మిర్చి (40 క్వింటాళ్లు)',
            origin: 'జనగామ మండలం, వరంగల్',
            destination: 'ITC సికింద్రాబాద్ హబ్',
            distanceKm: 85,
            freightOffer: 9500,
            vehicleType: '10-Ton DCM / Truck',
            status: 'in_transit',
            pickupOtp: '4928',
            deliveryOtp: '8120',
            assignedVehicle: 'TS 03 UB 8192',
            driverName: 'రాము యాదవ్ (9848123990)'
          },
          {
            tripId: 'TRIP-TS-702',
            orderId: 'KC-TS-2026-092',
            cropName: 'తెలంగాణ సోనా వరి (120 క్వింటాళ్లు)',
            origin: 'మిర్యాలగూడ రూరల్ పొలం',
            destination: 'శ్రీ కృష్ణ రైస్ మిల్, మిర్యాలగూడ',
            distanceKm: 18,
            freightOffer: 4200,
            vehicleType: 'ట్రాక్టర్ ట్రాలీ లేదా డీసీఎం',
            status: 'available',
            pickupOtp: '3910',
            deliveryOtp: '7741',
            assignedVehicle: null,
            driverName: null
          }
        ],
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
