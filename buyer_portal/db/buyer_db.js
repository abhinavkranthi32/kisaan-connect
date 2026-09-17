/**
 * KISSAN CONNECT - BUYER PORTAL DATABASE CLIENT (కొనుగోలుదారు డేటాబేస్ ఇంటర్‌ఫేస్)
 * Handles Commercial Buyer state, bids, RFQs, escrow deposits, and truck assignments.
 */

const BuyerDB = (function() {
  const BUYER_PROFILES = [
    {
      id: 'USR-BUY-01',
      name: 'ITC Agri Business Hub',
      shortName: 'ITC Agri',
      gstin: '36AAACI1234F1Z8',
      license: 'APMC-WGL-2024-4091',
      phone: '+91 94401 22891',
      city: 'సికింద్రాబాద్ / వరంగల్',
      escrowBalance: 1550000,
      rating: '4.9 ★ (84 డీల్స్)',
      avatar: '🏢'
    },
    {
      id: 'USR-BUY-02',
      name: 'శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్',
      shortName: 'శ్రీ కృష్ణ రైస్ మిల్స్',
      gstin: '36ABCKR9812G2Z1',
      license: 'APMC-MRG-2023-1120',
      phone: '+91 98482 11090',
      city: 'మిర్యాలగూడ యార్డ్',
      escrowBalance: 2400000,
      rating: '4.9 ★ (120 డీల్స్)',
      avatar: '🌾'
    },
    {
      id: 'USR-BUY-03',
      name: 'ఖమ్మం స్పైసెస్ ఎక్స్‌పోర్టర్స్',
      shortName: 'ఖమ్మం స్పైసెస్',
      gstin: '36AAXKS4412P1Z4',
      license: 'APMC-KHM-2024-6721',
      phone: '+91 98480 33211',
      city: 'ఖమ్మం మార్కెట్ యార్డ్',
      escrowBalance: 880000,
      rating: '4.7 ★ (41 డీల్స్)',
      avatar: '🌶️'
    }
  ];

  let currentBuyer = BUYER_PROFILES[0];

  return {
    getProfiles: () => [...BUYER_PROFILES],
    
    getCurrentBuyer: () => ({ ...currentBuyer }),
    
    switchBuyer: (buyerId) => {
      const found = BUYER_PROFILES.find(b => b.id === buyerId);
      if (found) {
        currentBuyer = found;
        return true;
      }
      return false;
    },

    getLots: (filter = {}) => {
      if (!window.IntegratedDB) return [];
      let lots = window.IntegratedDB.getLots();

      if (filter.cropKey && filter.cropKey !== 'all') {
        lots = lots.filter(l => l.cropKey === filter.cropKey);
      }
      if (filter.grade && filter.grade !== 'all') {
        lots = lots.filter(l => l.grade === filter.grade);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        lots = lots.filter(l => 
          (l.cropNameTe && l.cropNameTe.toLowerCase().includes(q)) ||
          (l.cropNameEn && l.cropNameEn.toLowerCase().includes(q)) ||
          (l.locationTe && l.locationTe.toLowerCase().includes(q)) ||
          (l.id && l.id.toLowerCase().includes(q))
        );
      }
      return lots;
    },

    placeBid: (lotId, pricePerQ, logisticsMode) => {
      if (!window.IntegratedDB) return null;
      const lot = window.IntegratedDB.getLotById(lotId);
      if (!lot) return null;

      const bidId = `BID-${Math.floor(100 + Math.random() * 900)}`;
      const isBuyerVehicle = logisticsMode === 'buyer_vehicle';

      const newBid = {
        bidId: bidId,
        buyerId: currentBuyer.id,
        buyerName: currentBuyer.name,
        buyerRating: currentBuyer.rating,
        buyerLocation: currentBuyer.city,
        pricePerQ: Number(pricePerQ),
        logisticsMode: logisticsMode,
        logisticsTextTe: isBuyerVehicle 
          ? '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)'
          : '🚚 ప్లాట్‌ఫామ్ రవాణాదారుడు కావాలి',
        logisticsTextEn: isBuyerVehicle
          ? '🚛 Buyer arranges own truck (₹0 farmer cost)'
          : '🚚 Platform transporter requested',
        status: 'active'
      };

      return window.IntegratedDB.placeBid(lotId, newBid);
    },

    getMyBids: () => {
      if (!window.IntegratedDB) return [];
      const lots = window.IntegratedDB.getLots();
      const myBids = [];

      lots.forEach(lot => {
        (lot.bids || []).forEach(b => {
          if (b.buyerId === currentBuyer.id || b.buyerName.includes(currentBuyer.shortName) || b.buyerName.includes(currentBuyer.name)) {
            const isLeading = b.pricePerQ === lot.highestBid;
            let status = isLeading ? 'leading' : 'outbid';
            if (b.isCounter) status = 'counter_received';

            myBids.push({
              bidId: b.bidId,
              lotId: lot.id,
              cropNameTe: lot.cropNameTe,
              cropNameEn: lot.cropNameEn,
              quantity: lot.quantity,
              grade: lot.grade,
              farmerName: lot.farmerName || 'మల్లారెడ్డి',
              farmerLocation: lot.locationTe,
              myPrice: b.pricePerQ,
              highestPrice: lot.highestBid,
              totalValuation: b.pricePerQ * lot.quantity,
              logisticsMode: b.logisticsMode,
              status: status,
              endsIn: lot.auctionEndsIn || '08h : 15m'
            });
          }
        });
      });

      return myBids;
    },

    getProcurementOrders: () => {
      if (!window.IntegratedDB) return [];
      const orders = window.IntegratedDB.getOrders();
      // Return orders where this buyer is the party or all active for demo
      return orders;
    },

    assignTruck: (orderId, vehicleNumber, driverName, driverPhone) => {
      if (!window.IntegratedDB) return null;
      return window.IntegratedDB.assignTruckToOrder(orderId, vehicleNumber, driverName, driverPhone);
    },

    verifyOtp: (orderId, otp) => {
      if (!window.IntegratedDB) return false;
      const order = window.IntegratedDB.getOrders().find(o => o.orderId === orderId);
      if (order && order.farmGateOtp === otp) {
        window.IntegratedDB.updateOrderStep(orderId, 5);
        return true;
      }
      return false;
    },

    getRfqs: () => {
      if (!window.IntegratedDB) return [];
      return window.IntegratedDB.getRfqs();
    },

    postRfq: (rfqData) => {
      if (!window.IntegratedDB) return rfqData;
      const rfq = {
        rfqId: `RFQ-${Math.floor(100 + Math.random() * 900)}`,
        buyerName: currentBuyer.name,
        buyerId: currentBuyer.id,
        status: 'active',
        ...rfqData
      };
      return window.IntegratedDB.addRfq(rfq);
    }
  };
})();

if (typeof window !== 'undefined') {
  window.BuyerDB = BuyerDB;
}
