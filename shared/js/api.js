/**
 * KISSAN CONNECT - CENTRALIZED API CLIENT & REAL-TIME ENGINE
 * Unified REST client and Server-Sent Events subscriber for all portals
 */

(function(window) {
  'use strict';

  // Configurable base URL
  const DEFAULT_ORIGIN = (window.location.protocol.startsWith('http') && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? window.location.origin
    : '';

  const API_BASE_URL = window.KISSAN_API_BASE_URL ||
    localStorage.getItem('kissan_api_base_url') ||
    DEFAULT_ORIGIN;

  const TOKEN_KEY = 'kissan_auth_token';
  const USER_KEY = 'kissan_auth_user';

  const KissanAPI = {
    baseUrl: API_BASE_URL,

    setBaseUrl(url) {
      this.baseUrl = (url || '').replace(/\/+$/, '');
      localStorage.setItem('kissan_api_base_url', this.baseUrl);
    },

    getToken() {
      return localStorage.getItem(TOKEN_KEY) || '';
    },

    setSession(token, user) {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    getCurrentUser() {
      try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    clearSession() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },

    async request(endpoint, options = {}) {
      const headers = Object.assign({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }, options.headers || {});

      const token = this.getToken();
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const url = `${this.baseUrl}${endpoint}`;
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers,
          body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
        });

        const data = await response.json();
        if (!response.ok) {
          const errMsg = (data && data.message) || `HTTP error ${response.status}`;
          const err = new Error(errMsg);
          err.status = response.status;
          err.data = data;
          throw err;
        }
        return data;
      } catch (err) {
        console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err.message);
        throw err;
      }
    },

    get(endpoint, params) {
      let queryStr = '';
      if (params) {
        const q = new URLSearchParams();
        for (const k in params) {
          if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
            q.append(k, params[k]);
          }
        }
        const s = q.toString();
        if (s) queryStr = (endpoint.includes('?') ? '&' : '?') + s;
      }
      return this.request(`${endpoint}${queryStr}`, { method: 'GET' });
    },

    post(endpoint, data) {
      return this.request(endpoint, { method: 'POST', body: data });
    },

    put(endpoint, data) {
      return this.request(endpoint, { method: 'PUT', body: data });
    },

    // -------------------------------------------------------------------------
    // AUTHENTICATION
    // -------------------------------------------------------------------------
    async sendOtp(phone, role = null) {
      return this.post('/api/auth/otp/send', { phone, ...(role ? { role } : {}) });
    },

    async verifyOtp(phone, otp, role = null) {
      const res = await this.post('/api/auth/otp/verify', { phone, otp, ...(role ? { role } : {}) });
      if (res.token && res.user) {
        this.setSession(res.token, res.user);
      }
      return res;
    },

    async loginAsRole(role, userId) {
      const res = await this.post('/api/auth/login-role', { role, userId });
      if (res.token && res.user) {
        this.setSession(res.token, res.user);
      }
      return res;
    },

    async getMe() {
      try {
        const res = await this.get('/api/auth/me');
        if (res.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        }
        return res.user;
      } catch (e) {
        return null;
      }
    },

    async logout() {
      try {
        await this.post('/api/auth/logout');
      } catch (e) {}
      this.clearSession();
    },

    // -------------------------------------------------------------------------
    // HARVEST LOTS & BIDS
    // -------------------------------------------------------------------------
    async getLots(filters = {}) {
      return this.get('/api/lots', filters);
    },

    async getLot(lotId) {
      return this.get(`/api/lots/${lotId}`);
    },

    async createLot(lotData) {
      return this.post('/api/lots', lotData);
    },

    async submitBid(bidData) {
      return this.post('/api/bids', bidData);
    },

    async getBuyerBids(buyerId) {
      return this.get(`/api/bids/buyer/${buyerId}`);
    },

    // -------------------------------------------------------------------------
    // ORDERS & ESCROW
    // -------------------------------------------------------------------------
    async acceptBid(lotId, bidId) {
      return this.post('/api/orders/accept-bid', { lotId, bidId });
    },

    async getFarmerOrders(farmerId) {
      return this.get(`/api/orders/farmer/${farmerId}`);
    },

    async getBuyerOrders(buyerId) {
      return this.get(`/api/orders/buyer/${buyerId}`);
    },

    async assignTruck(orderId, details) {
      return this.post(`/api/orders/${orderId}/assign-truck`, details);
    },

    async verifyOrderOtp(orderId, otp) {
      return this.post(`/api/orders/${orderId}/verify-otp`, { otp });
    },

    // -------------------------------------------------------------------------
    // LOGISTICS FLEET HAULAGE
    // -------------------------------------------------------------------------
    async getTrips(status = 'all') {
      return this.get('/api/trips', { status });
    },

    async getTrip(tripId) {
      return this.get(`/api/trips/${tripId}`);
    },

    async acceptTrip(tripId, details) {
      return this.post(`/api/trips/${tripId}/accept`, details);
    },

    async verifyTripOtp(tripId, otp) {
      return this.post(`/api/trips/${tripId}/verify-otp`, { otp });
    },

    // -------------------------------------------------------------------------
    // RFQs & EXTERNAL DATA
    // -------------------------------------------------------------------------
    async getRfqs() {
      return this.get('/api/rfqs');
    },

    async createRfq(rfqData) {
      return this.post('/api/rfqs', rfqData);
    },

    async getMarketPrices() {
      return this.get('/api/market-prices');
    },

    async getWeather(lat, lon) {
      return this.get('/api/weather', { lat, lon });
    },

    async getRoute(originLat, originLon, destLat, destLon) {
      return this.get('/api/route', { originLat, originLon, destLat, destLon });
    },

    // -------------------------------------------------------------------------
    // ADMIN CONSOLE
    // -------------------------------------------------------------------------
    async getAdminStats() {
      return this.get('/api/admin/stats');
    },

    async getAdminUsers() {
      return this.get('/api/admin/users');
    },

    async verifyUserKyc(userId, kycStatus) {
      return this.post(`/api/admin/users/${userId}/verify`, { kycStatus });
    },

    async getAuditLogs() {
      return this.get('/api/admin/audit-logs');
    },

    async getDisputes() {
      return this.get('/api/admin/disputes');
    },

    async resolveDispute(disputeId, resolution) {
      return this.post(`/api/admin/disputes/${disputeId}/resolve`, { resolution });
    },

    async submitDispute(disputeData) {
      return this.post('/api/disputes', disputeData);
    },

    // -------------------------------------------------------------------------
    // NOTIFICATIONS
    // -------------------------------------------------------------------------
    async getNotifications(unreadOnly = false, limit = 30) {
      return this.get('/api/notifications', { unread: unreadOnly ? 'true' : undefined, limit });
    },

    async markNotificationRead(id) {
      return this.post(`/api/notifications/${id}/read`, {});
    },

    async markAllNotificationsRead() {
      return this.post('/api/notifications/read-all', {});
    },

    // -------------------------------------------------------------------------
    // COMMUNITY BULK PROCUREMENT & VILLAGE POOLING
    // -------------------------------------------------------------------------
    async getBuyerProfile(buyerId = null) {
      return this.get('/api/buyer/profile', buyerId ? { buyerId } : undefined);
    },

    async updateBuyerProfile(profileData) {
      return this.put('/api/buyer/profile', profileData);
    },

    async createCommunityRequirement(reqData) {
      return this.post('/api/community-requirements', reqData);
    },

    async getCommunityRequirements(filters = {}) {
      return this.get('/api/community-requirements', filters);
    },

    async getCommunityRequirementDetails(reqId) {
      return this.get(`/api/community-requirements/${reqId}`);
    },

    async updateCommunityRequirementStatus(reqId, targetStatus) {
      return this.post(`/api/community-requirements/${reqId}/status`, { targetStatus });
    },

    async submitFarmerOffer(offerData) {
      return this.post('/api/community-requirements/offers', offerData);
    },

    async acceptFarmerOffer(offerId, acceptedQuantity = null) {
      return this.post(`/api/community-requirements/offers/${offerId}/accept`, acceptedQuantity ? { acceptedQuantity } : {});
    },

    async rejectFarmerOffer(offerId) {
      return this.post(`/api/community-requirements/offers/${offerId}/reject`, {});
    },

    async getPooledOrders(buyerId = null) {
      return this.get('/api/pooled-orders', buyerId ? { buyerId } : undefined);
    },

    async getVillagePoolSummary() {
      return this.get('/api/pooled-orders/village-summary');
    },

    async getTransportRequests() {
      return this.get('/api/transport-requests');
    },

    async submitTransportBid(transportRequestId, bidData) {
      return this.post(`/api/transport-requests/${transportRequestId}/bids`, bidData);
    },

    async acceptTransportBid(bidId) {
      return this.post(`/api/transport-requests/bids/${bidId}/accept`, {});
    },

    async updateTransportRequestStatus(transportRequestId, status) {
      return this.post(`/api/transport-requests/${transportRequestId}/status`, { status });
    },

    async getAdminCommunityStats() {
      return this.get('/api/admin/community-stats');
    },

    // -------------------------------------------------------------------------
    // WALLET, ESCROW & PAYOUT APIS
    // -------------------------------------------------------------------------
    getWalletBalance() {
      return this.get('/api/wallet/balance');
    },

    getWalletLedger(limit = 50) {
      return this.get(`/api/wallet/ledger?limit=${limit}`);
    },

    initiateWalletTopup(amountRupees, paymentMethod = 'razorpay') {
      return this.request('/api/wallet/topup/initiate', {
        method: 'POST',
        body: { amountRupees, paymentMethod }
      });
    },

    verifyWalletTopup(razorpayPaymentId, razorpayOrderId, razorpaySignature) {
      return this.request('/api/wallet/topup/verify', {
        method: 'POST',
        body: { razorpayPaymentId, razorpayOrderId, razorpaySignature }
      });
    },

    sandboxWalletTopup(amountRupees, description = 'Sandbox Wallet Topup') {
      return this.request('/api/wallet/topup/sandbox', {
        method: 'POST',
        body: { amountRupees, description }
      });
    },

    rejectBid(bidId) {
      return this.request(`/api/bids/${bidId}/reject`, { method: 'POST' });
    },

    cancelBid(bidId) {
      return this.request(`/api/bids/${bidId}/cancel`, { method: 'POST' });
    },

    updateTransportLoadingMilestone(transportRequestId, { milestone, loadedQuantity, notes, proofUrl }) {
      return this.request(`/api/transport-requests/${transportRequestId}/loading-milestone`, {
        method: 'POST',
        body: { milestone, loadedQuantity, notes, proofUrl }
      });
    },

    getFarmerPayoutProfile() {
      return this.get('/api/farmer/payout-profile');
    },

    updateFarmerPayoutProfile(profileData) {
      return this.request('/api/farmer/payout-profile', {
        method: 'POST',
        body: profileData
      });
    },

    verifyFarmerPayoutProfile(farmerId) {
      return this.request(`/api/admin/farmers/${farmerId}/verify-payout`, { method: 'POST' });
    },

    getAdminFinancialStats() {
      return this.get('/api/admin/financial-stats');
    },

    getAdminFinancialLedger(limit = 100) {
      return this.get(`/api/admin/financial-ledger?limit=${limit}`);
    },

    // -------------------------------------------------------------------------
    // REAL-TIME SERVER-SENT EVENTS
    // -------------------------------------------------------------------------
    subscribeEvents(handlers = {}) {
      let eventSource = null;
      let reconnectTimer = null;

      const connect = () => {
        try {
          if (eventSource) eventSource.close();
          const token = this.getToken();
          const sseUrl = `${this.baseUrl}/api/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
          eventSource = new EventSource(sseUrl);

          const eventNames = [
            'listing.created', 'listing.updated', 'listing.cancelled',
            'bid.created', 'bid.updated', 'bid.accepted', 'bid.rejected',
            'order.created', 'order.updated', 'order.delivered',
            'transport.requested', 'transport.assigned', 'transport.delivered',
            'escrow.released', 'notification.created', 'dashboard.updated',
            'dispute.created', 'snapshot', 'connected',
            'community_requirement_created', 'community_requirement_updated',
            'farmer_offer_created', 'farmer_offer_updated',
            'requirement_fulfillment_updated', 'pooled_order_created',
            'transport_request_created', 'transport_bid_created',
            'transport_provider_assigned', 'delivery_status_updated',
            'wallet_balance_updated', 'wallet_topup_verified', 'bid_escrow_held',
            'bid_escrow_released', 'transport_milestone_updated',
            'farmer_payout_initiated', 'farmer_payout_completed', 'refund_processed',
            'NEW_LOT', 'NEW_BID', 'ORDER_CREATED', 'ORDER_UPDATED',
            'ORDER_DELIVERED', 'ESCROW_RELEASED', 'TRIP_ASSIGNED',
            'TRIP_DELIVERED', 'NEW_RFQ'
          ];

          eventNames.forEach(evtName => {
            eventSource.addEventListener(evtName, (event) => {
              try {
                const data = JSON.parse(event.data);
                if (typeof handlers[evtName] === 'function') {
                  handlers[evtName](data);
                }
                if (typeof handlers['ALL'] === 'function') {
                  handlers['ALL'](evtName, data);
                }
              } catch (e) {
                console.error(`[SSE ${evtName} Parse Error]`, e);
              }
            });
          });

          eventSource.onmessage = (event) => {
            try {
              const envelope = JSON.parse(event.data);
              const eventType = envelope.event;
              const payload = envelope.data;
              if (eventType && typeof handlers[eventType] === 'function') {
                handlers[eventType](payload);
              }
              if (typeof handlers['ALL'] === 'function') {
                handlers['ALL'](eventType || 'message', payload || envelope);
              }
            } catch (e) {}
          };

          eventSource.onopen = () => {
            console.log('⚡ Connected to Kissan Connect Real-Time SSE Stream');
            if (typeof handlers['ON_OPEN'] === 'function') handlers['ON_OPEN']();
          };

          eventSource.onerror = (err) => {
            console.warn('⚠️ SSE disconnected, reconnecting in 4s...', err);
            eventSource.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connect, 4000);
          };
        } catch (err) {
          console.warn('SSE not supported or server unavailable:', err);
        }
      };

      connect();

      return {
        close() {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          if (eventSource) eventSource.close();
        }
      };
    },

    // -------------------------------------------------------------------------
    // UI TOAST HELPER
    // -------------------------------------------------------------------------
    toast(message, duration = 3500) {
      let toastEl = document.getElementById('toastNotification');
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'toastNotification';
        toastEl.className = 'toast-popup';
        document.body.appendChild(toastEl);
      }
      toastEl.innerHTML = message;
      toastEl.classList.add('show');
      setTimeout(() => {
        toastEl.classList.remove('show');
      }, duration);
    }
  };

  window.KissanAPI = KissanAPI;

})(typeof window !== 'undefined' ? window : this);
