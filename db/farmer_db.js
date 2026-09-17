/**
 * KISSAN CONNECT - FARMER PORTAL DATABASE CLIENT (రైతు డేటాబేస్ ఇంటర్‌ఫేస్)
 * Communicates with IntegratedDB or backend API endpoints.
 */

const FarmerDB = (function() {
  return {
    getProfile: () => {
      const wallet = window.IntegratedDB ? window.IntegratedDB.getUserWallet('USR-FARM-01') : 148500;
      return {
        id: 'USR-FARM-01',
        name: 'మల్లారెడ్డి (Malla Reddy)',
        phone: '9848055210',
        village: 'జనగామ, వరంగల్ జిల్లా',
        walletBalance: wallet
      };
    },
    creditWallet: (amount) => {
      if (window.IntegratedDB) {
        return window.IntegratedDB.creditUserWallet(amount, 'USR-FARM-01');
      }
      return 148500 + Number(amount);
    },

    getLots: () => {
      if (window.IntegratedDB) {
        return window.IntegratedDB.getLots();
      }
      return [];
    },

    createLot: (lotData) => {
      if (window.IntegratedDB) {
        return window.IntegratedDB.addLot(lotData);
      }
      return lotData;
    },

    acceptBid: (lotId, bidId) => {
      if (!window.IntegratedDB) return null;
      const lot = window.IntegratedDB.getLotById(lotId);
      if (!lot) return null;
      const bid = (lot.bids || []).find(b => b.bidId === bidId);
      if (!bid) return null;

      const totalAmount = bid.pricePerQ * lot.quantity;
      const newOrder = {
        orderId: `KC-TS-2026-${Math.floor(100 + Math.random() * 900)}`,
        lotId: lot.id,
        cropNameTe: `${lot.cropNameTe} (${lot.quantity} క్వింటాళ్లు)`,
        cropNameEn: `${lot.cropNameEn} (${lot.quantity} Quintals)`,
        farmerName: 'మల్లారెడ్డి (Malla Reddy)',
        farmerPhone: '+91 98480 55210',
        buyerId: bid.buyerId || 'USR-BUY-01',
        buyerName: bid.buyerName,
        buyerPhone: '+91 98480 88291',
        agreedRate: bid.pricePerQ,
        quantity: lot.quantity,
        totalEscrowAmount: totalAmount,
        currentStep: 2, // Escrow Locked immediately!
        farmGateOtp: String(Math.floor(1000 + Math.random() * 9000)),
        vehicleNumber: 'TS 03 TA 4821 (ట్రక్ బయలుదేరింది)',
        driverName: 'సురేష్ కుమార్ (రవాణా డ్రైవర్)',
        driverPhone: '+91 98481 22910',
        estimatedArrival: 'రేపు ఉదయం 10:00 గంటలకు'
      };

      window.IntegratedDB.createOrder(newOrder);
      window.IntegratedDB.removeLot(lotId);
      return newOrder;
    },

    counterBid: (lotId, bidId, counterPrice) => {
      if (window.IntegratedDB) {
        return window.IntegratedDB.counterBid(lotId, bidId, counterPrice);
      }
      return false;
    },

    rejectBid: (lotId, bidId) => {
      if (window.IntegratedDB) {
        return window.IntegratedDB.rejectBid(lotId, bidId);
      }
      return false;
    },

    getOrders: () => {
      if (window.IntegratedDB) {
        return window.IntegratedDB.getOrders();
      }
      return [];
    },

    completeOtp: (orderId) => {
      if (window.IntegratedDB) {
        return window.IntegratedDB.updateOrderStep(orderId, 5);
      }
      return null;
    },

    submitDispute: (ticket) => {
      if (window.IntegratedDB) {
        return window.IntegratedDB.addDispute(ticket);
      }
      return ticket;
    }
  };
})();

if (typeof window !== 'undefined') {
  window.FarmerDB = FarmerDB;
}
