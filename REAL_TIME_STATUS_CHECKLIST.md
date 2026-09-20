# Kissan Connect — Real-Time Architecture Status & Roadmap

**Platform:** Telangana Agricultural Market Linkage Platform (SIH Platform)  
**Date:** September 20, 2026  
**Document Type:** Technical Status Report & Implementation Checklist  

---

## Executive Summary

Kissan Connect currently features a high-performance **Server-Sent Events (SSE)** real-time push engine built natively into Node.js (`/api/events`). The core agricultural procurement lifecycle (Farmer listing $\rightarrow$ Buyer bidding $\rightarrow$ Order acceptance $\rightarrow$ Haulage assignment $\rightarrow$ OTP-based delivery $\rightarrow$ Instant escrow payout) runs end-to-end with live push synchronization across active browser tabs.

This document breaks down:
1. **What is already completed and running in real time.**
2. **What is remaining to make it work seamlessly in real-world production.**
3. **A phased action plan with effort estimates.**

---

## 1. Completed & Working in Real Time

### A. Central Real-Time Engine (`server.js`)
- [x] **SSE Hub (`GET /api/events`)**: Native HTTP streaming with `Content-Type: text/event-stream` and zero external npm server dependencies.
- [x] **25-Second Heartbeat Ping**: Periodic keep-alive ping (`: ping\n\n`) preventing carrier NAT and mobile proxies from closing idle connections.
- [x] **Session Authentication & Role Mapping**: Connections via `?token=...` or Bearer header are mapped to genuine user identities and roles (`farmer`, `buyer`, `logistics`, `admin`).
- [x] **Instant Snapshot Sync**: On initial SSE handshake, the server sends a fresh snapshot of active harvest lots and available logistics trips.
- [x] **Dual-Protocol Event Dispatching**: Transmits both structured JSON envelopes (`{ event, timestamp, data }`) and legacy action codes for backward compatibility.
- [x] **Targeted Privacy Filtering**: Sensitive events (e.g. private bids, order details) are routed strictly to authorized parties (specific farmer, bidding buyer, admin).

### B. Core Procurement Lifecycle Sync
- [x] **Live Lot Creation**: Farmer submits a crop lot (`POST /api/lots`) $\rightarrow$ Emits `listing.created` & `NEW_LOT` $\rightarrow$ Instantly appears on Buyer marketplace without page reload.
- [x] **Real-Time Bidding**: Buyer places a bid (`POST /api/bids`) $\rightarrow$ Emits `bid.created` & `NEW_BID` $\rightarrow$ Farmer portal plays an audio chime, displays a Telugu toast, and refreshes incoming offers. Emits `listing.updated` to update the highest bid.
- [x] **Deal Acceptance & Escrow Lock**: Farmer accepts a winning bid (`POST /api/orders/accept-bid`) $\rightarrow$ Emits `order.created`, locks buyer escrow, cancels competing bids, generates a 4-digit pickup OTP, and broadcasts `transport.requested`.
- [x] **Fleet Assignment & Dispatch**: Transporter accepts haulage (`POST /api/trips/:id/accept`) $\rightarrow$ Emits `transport.assigned` and `order.updated` $\rightarrow$ Buyer & farmer see driver name and vehicle registration live.
- [x] **OTP Delivery & Instant Settlement**: Transporter verifies pickup OTP (`POST /api/trips/:id/verify-otp`) $\rightarrow$ Emits `transport.delivered`, `order.delivered`, and `escrow.released` $\rightarrow$ Escrow settles instantly to farmer wallet with automated ledger accounting.
- [x] **Community Bulk Purchasing**: Emits real-time events for pooled demands (`community_requirement_created`, `farmer_offer_created`, `pooled_order_created`).

### C. Portal-Specific Implementations
- [x] **Farmer Portal (`farmer_portal/js/farmer.js`)**: Connected via `window.KissanAPI.subscribeEvents` with auth token; reacts to bids, order status changes, and escrow releases.
- [x] **Logistics Portal (`logistics_portal/js/logistics.js`)**: Subscribed to new orders, haulage requests, driver assignments, and delivery updates.
- [x] **Admin Regulatory Desk (`admin_portal/js/admin.js`)**: Subscribed to platform events to update aggregate KPIs (escrow locked, volume settled, active lots) live.
- [x] **Live Weather**: Integrated with Open-Meteo REST API (`GET /api/weather`) for real-time agricultural weather conditions.

---

## 2. What is Left to Do (Production Readiness Gaps)

### Priority 1: Client-Side Fixes & Ticker Updates (Quick Wins)
- [ ] **Pass Session Token in Buyer SSE Connection**:
  - *Current issue:* `buyer_portal/js/buyer.js` calls `new EventSource('/api/events')` without `?token=...`, causing the server to classify it as `guest` (`userId: null`).
  - *Fix:* Use `window.KissanAPI.subscribeEvents({...})` so buyers receive targeted private notifications and order events.
- [ ] **Real-Time Competing Bid Updates on Buyer Cards**:
  - *Current issue:* When Buyer A places a bid, Buyer B's screen does not update the highest bid until manual refresh.
  - *Fix:* Register listener for `listing.updated` in `buyer.js` to update lot price badges dynamically.
- [ ] **Dynamic Wallet Balance Updates**:
  - *Fix:* Listen to `wallet_balance_updated` across both buyer and farmer portals to reflect credits/debits immediately.
- [ ] **Live SSE Connection Pulse Indicator**:
  - *Fix:* Add a visual status indicator (`🟢 Live Sync Active` / `🟠 Reconnecting...`) in the header of all portals.

### Priority 2: Real-Time Logistics & GPS Tracking
- [ ] **Driver Telemetry Endpoint (`POST /api/trips/:id/telemetry`)**:
  - Accept GPS coordinates (`latitude`, `longitude`, `speed`, `heading`, `timestamp`) from driver devices.
  - Broadcast `transport.location_updated` to buyer, farmer, and admin tracking maps.
- [ ] **Driver Mobile Geo-Beacon**:
  - Use `navigator.geolocation.watchPosition` on mobile browser in `logistics_portal` to stream coordinates every 10–15 seconds while en route.
- [ ] **Live Moving Truck Marker on Map**:
  - Add Leaflet/OpenStreetMap animated truck markers on buyer and farmer tracking screens showing live ETA and position.

### Priority 3: Rural Network Resilience
- [ ] **Missed Events Replay (`Last-Event-ID`)**:
  - Rural cellular connections (3G/4G) drop frequently.
  - Maintain an in-memory ring buffer (last 100 events) on the server.
  - Replay missed events upon reconnection when the browser sends the `Last-Event-ID` header.

### Priority 4: Real-World Alerts & External Channels
- [ ] **SMS Gateway Integration (Fast2SMS / Twilio / MSG91)**:
  - In real farming environments, farmers do not keep desktop tabs open all day.
  - Send instant SMS alerts for:
    1. Login OTP codes.
    2. Incoming bids above reserve price.
    3. Truck arrival notifications at the farm gate.
- [ ] **Web Push API (Service Worker)**:
  - Implement standard Web Push so farmers and buyers receive smartphone push notifications even when the browser is closed.
- [ ] **Live Agmarknet Mandi Pricing**:
  - Add `DATA_GOV_IN_API_KEY` in `.env` to enable real-time wholesale price feeds from Data.gov.in.
- [ ] **Production Routing Provider**:
  - Replace public OSRM demo server with self-hosted OSRM container or Mapbox/Google Maps API for reliable driving ETAs.

### Priority 5: Multi-Instance Clustering (Scale)
- [ ] **Pub/Sub Message Bus**:
  - The current in-memory connection map (`sseClients`) works for a single VPS/container.
  - For horizontal scaling across multiple servers, integrate Redis Pub/Sub or Supabase Realtime CDC to sync events between server instances.

---

## 3. Recommended Phased Implementation Matrix

| Phase | Tasks | Target | Est. Effort |
| :--- | :--- | :--- | :---: |
| **Phase 1** | • Buyer portal SSE token fix<br>• `listing.updated` competing bid updates<br>• Real-time wallet balance sync<br>• Visual connection pulse indicator | Portals & UI | 30 mins |
| **Phase 2** | • Driver telemetry endpoint (`POST /api/trips/:id/telemetry`)<br>• Driver GPS watcher in `logistics.js`<br>• Real-time map marker movement | Logistics & Tracking | 1 hour |
| **Phase 3** | • `Last-Event-ID` ring buffer in `server.js`<br>• Auto-replay missed events on reconnect | Network Resilience | 45 mins |
| **Phase 4** | • Commercial SMS gateway for phone alerts<br>• Government Agmarknet API key integration<br>• Dedicated routing instance | External Services | 45 mins |

---

*Generated for Kissan Connect Technical Coordination.*
