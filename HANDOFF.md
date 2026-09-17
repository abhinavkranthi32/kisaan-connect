# Kissan Connect — Developer Handoff

## 1. Project Overview

**Kissan Connect (కిసాన్ కనెక్ట్)** is a real-time digital agricultural market linkage and direct procurement platform built for the **Smart India Hackathon (SIH-26132)**.

- **Problem Solved**: Smallholder farmers in Telangana face severe price exploitation, non-transparent mandi fees (5% commission charges), delayed payments, and cartelization by local middlemen. Kissan Connect eliminates intermediaries by establishing a verified direct procurement channel between farmers, APMC-licensed commercial buyers, and rural logistics haulage fleets.
- **Target Users**:
  1. **Farmers**: Small and marginal farmers selling paddy, chilli, cotton, and turmeric with Rythubandhu verification.
  2. **Commercial Buyers**: Food processors, modern rice mills, spice exporters, and institutional buyers with valid Telangana APMC trade licenses and GSTINs.
  3. **Logistics Fleet Transporters**: Rural transport operators and truck drivers moving produce from farm gates to processing hubs.
- **Core Technology Stack**:
  - **Frontend**: Vanilla HTML5, modern CSS3 (custom design token system), JavaScript (ES6+), Chart.js (Trends). Bilingual (Telugu & English).
  - **Backend**: Node.js native HTTP server (`server.js`) with REST API and Server-Sent Events (SSE).
  - **Database**: SQLite relational engine using Node 24 native `node:sqlite` (`DatabaseSync`), schema in `db/schema.sql`, file in `data/kissan.db`.
  - **External Services**: data.gov.in (AGMARKNET), Open-Meteo (WMO Standard Weather), OSRM (Driving Route & Distance).

---

## 2. Current Architecture

```
                 ┌─────────────────────────────────────────┐
                 │       Frontend Portals (Web / Mobile)    │
                 │  - Main Portal (Auth & Role Chooser)    │
                 │  - Farmer Portal (Bidding Arena & Advice)│
                 │  - Buyer Portal (Discovery & Escrow)    │
                 │  - Logistics Portal (Haulage Trips)     │
                 └────────────────────┬────────────────────┘
                                      │ HTTP REST / Server-Sent Events (SSE)
                                      ▼
                 ┌─────────────────────────────────────────┐
                 │       Backend Server (Node.js)          │
                 │              server.js                  │
                 │  - REST API Routing & Input Validation  │
                 │  - Real-Time Event Broadcaster (SSE)    │
                 │  - Static Asset File Server (MIME-safe) │
                 └──────────┬───────────────────┬──────────┘
                            │                   │
                            ▼                   ▼
    ┌───────────────────────────────┐   ┌────────────────────────────────┐
    │  SQLite Database Engine       │   │  External API Service Proxies  │
    │  data/kissan.db (node:sqlite) │   │  - data.gov.in (AGMARKNET)     │
    │  - buyers, farmers, lots,     │   │  - Open-Meteo (Live Weather)   │
    │    bids, orders, trips, rfqs  │   │  - OSRM (Road Distance & ETA)  │
    └───────────────────────────────┘   └────────────────────────────────┘
```

### Frontend Architecture
- **Framework**: Semantic Vanilla HTML5, Vanilla CSS3 (CSS Variables for typography, elevation, and tactile colors), Native JavaScript.
- **Language**: Bilingual — Telugu (తెలుగు) as default locale, English toggle on all screens (`shared/js/lang.js`).
- **Directory Structure**:
  - `/main_portal`: Role entry screen, phone OTP authentication modal, mandi rates ticker.
  - `/farmer_portal`: Farmer dashboard, live bidding arena, crop lot listing, market price charts, AI advisor, orders & escrow milestone tracker, dispute redressal.
  - `/buyer_portal`: Commercial buyer discovery marketplace, live bidding engine, active bids negotiations, procurement orders with truck assignment, RFQ tender board, APMC arbitrage calculator.
  - `/logistics_portal`: Rural haulage trip board, trip acceptance modal, driver assignment, OTP delivery verification.
  - `/shared`: Common design system (`shared/css/main.css`, `shared/css/components.css`), crop dictionary (`shared/js/data.js`), translation dictionary (`shared/js/lang.js`).
- **Navigation & Routing**: Clean root-absolute routing (`/farmer_portal/index.html`, `/buyer_portal/index.html`, `/logistics_portal/index.html`, `/main_portal/index.html`) guarded with `<base>` tags to prevent trailing-slash 404s.

### Backend Architecture
- **Runtime**: Node.js (v20+ / v24.14.1 LTS).
- **Server**: Native HTTP server implementation in `server.js` with zero mandatory external runtime dependencies.
- **API Structure**: Standard REST API under `/api/*` returning `application/json` with CORS preflight support.
- **Real-Time Layer**: Native Server-Sent Events (`GET /api/events`). Connected portals automatically receive `NEW_BID`, `ORDER_UPDATED`, `ORDER_DELIVERED`, and `NEW_RFQ` notifications without polling.

### Database Architecture
- **Technology**: Relational SQLite database using Node 24 native `node:sqlite` (`DatabaseSync`).
- **Database File**: `data/kissan.db` (git-ignored for security and state isolation).
- **Schema**: `db/schema.sql` defining 8 relational tables with foreign keys and cascade rules.
- **Seeding**: `db/init_db.js` creates and seeds verified Telangana APMC buyers, registered farmers, and active harvest lots.

### External Services
1. **AGMARKNET / data.gov.in**: Government daily mandi arrival rates proxy in `services/marketService.js`.
2. **Open-Meteo**: High-accuracy WMO meteorological service proxy in `services/weatherService.js` (No API key required, 100% free & open).
3. **OSRM (Open Source Routing Machine)**: Public road routing proxy in `services/routingService.js` computing real driving distances in kilometers and driving duration.

---

## 3. Current Features — ACTUALLY WORKING

### Authentication & Role Selection
- ✅ **Role Selection Entry Screen**: Fully implemented (`/main_portal/index.html`). Allows users to select Farmer, Commercial Buyer, or Logistics Fleet.
- ✅ **Farmer Phone OTP Modal**: Fully implemented. Validates 10-digit Indian phone format, supports auto-fill for demo testing (`842109`), automatic digit advancing, backspace handling, and clipboard paste.
- 🟡 **Session Management**: Partially implemented. The app uses client-side persona switching backed by SQLite records. JWT/cookie-based bearer session token generation is not yet connected.
- ✅ **User Profiles**: Fully implemented. Displays verified APMC license, GSTIN, and Rythubandhu credentials.

### Farmer Portal (`/farmer_portal/index.html`)
- ✅ **Farmer Profile Display**: Fully implemented. Shows farmer name, village, district, Rythubandhu verification tag, and wallet balance.
- ✅ **Live Bidding Arena**: Fully implemented. Displays active lots with real incoming bids from registered buyers. Accepts bids, launches counter-offer modal, and plays real-time audio chime upon receiving new bids.
- ✅ **Real-Time Cross-Portal Sync**: Fully implemented via SSE (`/api/events`). When a buyer submits a bid in the Buyer Portal, it appears instantly on the Farmer Portal.
- ✅ **Smart Crop Listing Form**: Fully implemented. Form to list harvest lots with reserve price calculation based on grade, moisture %, and storage type.
- ✅ **Market Price Fluctuation Charts**: Fully implemented using Chart.js. Supports 15-day, 1-month, and 3-month price history trends for Teja Chilli, Paddy, Cotton, and Turmeric.
- 🟡 **AI Hold vs Sell Advisor**: Partially implemented. Calculates warehouse storage viability and breakeven based on mandi trend, crop moisture, and storage costs. LLM integration with Google Gemini is ready for `GEMINI_API_KEY`.
- ✅ **Orders & Escrow Tracker**: Fully implemented. 5-step milestone stepper (Deal Agreed -> Escrow Locked -> Truck Dispatched -> Weighment & OTP -> Payment Released).
- ✅ **Physical Weighment OTP Verification**: Fully implemented. Verifies farm gate OTP, releases escrow funds, and prints official receipt.
- 🟡 **AI Crop Quality Assessment**: Partially implemented. Interactive camera capture and image upload UI with grade analysis parameters; automated computer-vision backend pipeline is pending.
- ✅ **Live Agri Weather Widget**: Fully implemented. Uses real-time Open-Meteo meteorological API with live temperature, humidity, wind, and rain probability.
- ✅ **Grievance Redressal / Disputes**: Fully implemented. Form to lodge trade disputes with ticket generation.

### Buyer Portal (`/buyer_portal/index.html`)
- ✅ **Buyer Persona Switcher**: Fully implemented. Dynamically loads APMC-licensed buyers (`ITC Agri Business Hub`, `శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్`, `ఖమ్మం స్పైసెస్ ఎక్స్‌పోర్టర్స్`) from SQLite via `GET /api/buyers`.
- ✅ **Live Harvest Lots Discovery**: Fully implemented. Fetches verified lots from SQLite (`GET /api/lots`), with filter dropdowns (All Crops, Grades, Text Search).
- ✅ **Live Bidding Engine**: Fully implemented. Modal validates bid against farmer reserve price, issues `POST /api/bids`, writes real bid record to SQLite, and broadcasts event.
- ✅ **My Bids & Negotiations**: Fully implemented. Queries `/api/bids/buyer/:buyerId`. Displays active bids, leading/outbid status tags, and quick re-bid action.
- ✅ **Procurement Orders & Logistics**: Fully implemented. Displays orders, escrow lock amounts, and lorry assignment modal.
- ✅ **Vehicle & Driver Assignment**: Fully implemented. Submits vehicle registration number, driver name, and phone via `POST /api/orders/:id/assign-truck`.
- ✅ **Buyer Farm-Gate OTP Entry**: Fully implemented. Submits OTP to `POST /api/orders/:id/verify-otp`, debiting buyer escrow and crediting farmer wallet in SQLite.
- ✅ **Post Purchase Request (RFQ Board)**: Fully implemented. Form submits bulk purchase tenders to SQLite `rfqs` table via `POST /api/rfqs` and renders active tenders.
- ✅ **Mandi Arbitrage & Savings Calculator**: Fully implemented. Calculates direct trade savings based on statutory APMC rules (5% middleman commission + 1% market fee waiver).
- 🟡 **Live Mandi Rates Ticker**: Partially implemented. Connects to `/api/market-prices`. If `DATA_GOV_IN_API_KEY` is not set, displays a transparent notice (`⚠️ Live market data currently unavailable (Govt API Key required) (మూలం: AGMARKNET / data.gov.in)`). **No fake fallback prices**.

### Logistics Fleet Portal (`/logistics_portal/index.html`)
- ✅ **Transporter Earnings Summary**: Fully implemented. Calculates earnings and total completed trips.
- ✅ **Haulage Trips Board**: Fully implemented. Filters trips by status (`all`, `available`, `assigned`, `delivered`).
- ✅ **Accept Trip Modal**: Fully implemented. Assigns fleet vehicle registration, driver name, and phone.
- ✅ **Driver Pickup OTP Verification**: Fully implemented. Verifies 4-digit pickup OTP to mark trip delivered and credit transporter freight fees.

---

## 4. REAL DATA vs MOCK DATA

| Feature | Current Data Source | Real / Mock | What Needs To Be Done |
| :--- | :--- | :--- | :--- |
| **Buyer Accounts** | SQLite (`buyers` table in `data/kissan.db`) | **Real** | Add self-service buyer registration endpoint with GSTIN verification API. |
| **Harvest Lots** | SQLite (`harvest_lots` table in `data/kissan.db`) | **Real** | Production-ready. Can link to digital land records (Dharani portal) in Phase 2. |
| **Buyer Bids** | SQLite (`bids` table in `data/kissan.db`) | **Real** | Production-ready. Uses `POST /api/bids` with strict validation. |
| **Procurement Orders** | SQLite (`procurement_orders` table in `data/kissan.db`) | **Real** | Production-ready. Linked to OTP verification and escrow accounting. |
| **Buyer RFQs** | SQLite (`rfqs` table in `data/kissan.db`) | **Real** | Production-ready. Saved and retrieved via `/api/rfqs`. |
| **Weather Forecast** | `Open-Meteo` Live API (`api.open-meteo.com`) | **Real** | Production-ready. Real temperature, humidity, wind, and rain probability. |
| **Distance & ETA** | `OSRM` Driving Route API (`router.project-osrm.org`) | **Real** | Production-ready with fallback message (`"Route estimate unavailable"`). |
| **Market Mandi Prices** | `data.gov.in` AGMARKNET Daily Prices API | **Real** (Proxy Active) | Obtain and insert active `DATA_GOV_IN_API_KEY` into `.env`. (Displays transparent unavailable message without fake numbers). |
| **AI Advisor & Scanner** | Client-side rule engine in `farmer.js` / `buyer.js` | **Rule-Based** | Connect backend `/api/ai/advisor` to Google Gemini API (`GEMINI_API_KEY`). |
| **Live GPS Vehicle Tracking** | Static origin & destination coordinates | **Mock/Static** | Connect mobile driver app with HTML5 Geolocation tracking or GPS fleet telematics API. |

---

## 5. API STATUS

| API / Service | Purpose | Integrated? | API Key Required? | Environment Variable | Status |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Open-Meteo API** | Real-time weather, humidity, and rainfall probability | Yes | **No** | None | ✅ **Live & Operational** |
| **OSRM Routing Engine** | Road distance (km) and driving duration (ETA) | Yes | **No** | None | ✅ **Live & Operational** |
| **data.gov.in (AGMARKNET)** | Daily commodity arrival rates in Telangana mandis | Yes | **Yes** | `DATA_GOV_IN_API_KEY` | 🟡 Proxy active; needs valid API key in `.env` |
| **Google Gemini API** | AI Market Advisor & Crop Quality Scanner | Staged | **Yes** | `GEMINI_API_KEY` | 🟡 Staged for key |
| **Google Maps / Mapbox** | Optional fallback for routing and reverse geocoding | Staged | **Yes** | `MAPS_API_KEY` | 🟢 Optional (OSRM active) |
| **OpenWeatherMap** | Optional secondary weather provider | Staged | **Yes** | `WEATHER_API_KEY` | 🟢 Optional (Open-Meteo active) |

> [!NOTE]
> No production secrets, tokens, or private credentials exist in the tracked source code.

---

## 6. Environment Variables

All environment variables are declared in `.env.example` and read server-side by `server.js`. **Never write actual secrets in this document.**

```ini
PORT=3000
DATA_GOV_IN_API_KEY=
WEATHER_API_KEY=
MAPS_API_KEY=
GEMINI_API_KEY=
```

### Purpose of Each Variable:
- `PORT`: TCP port for the Node.js server (Default: `3000`).
- `DATA_GOV_IN_API_KEY`: API key from [data.gov.in](https://data.gov.in/) to fetch live AGMARKNET daily mandi commodity arrival records.
- `WEATHER_API_KEY`: Optional secondary key for OpenWeatherMap if Open-Meteo is unavailable.
- `MAPS_API_KEY`: Optional key for Google Maps Platform Distance Matrix or Geocoding API.
- `GEMINI_API_KEY`: Google AI Studio key for powering the AI Agri Advisor and Crop Quality scan.

---

## 7. Backend API Endpoints

### 1. Health & Real-Time Events
- **`GET /api/health`**
  - **Purpose**: System health, SQLite status, connected SSE clients, and external API status.
  - **Auth**: No.
  - **Response**: `{ status: "healthy", database: "SQLite (node:sqlite)", connectedClients: N, configuredApis: {...} }`
- **`GET /api/events`**
  - **Purpose**: Server-Sent Events (SSE) stream for real-time live synchronization.
  - **Auth**: No.
  - **Events Emitted**: `NEW_BID`, `ORDER_UPDATED`, `ORDER_DELIVERED`, `NEW_RFQ`.

### 2. Commercial Buyers
- **`GET /api/buyers`**
  - **Purpose**: Returns all registered commercial buyers from SQLite.
  - **Auth**: No.
- **`GET /api/buyers/:id`**
  - **Purpose**: Returns details and escrow balance for a specific buyer.
  - **Auth**: No.

### 3. Harvest Lots
- **`GET /api/lots`**
  - **Purpose**: Returns active harvest lots with attached bids.
  - **Query Params**: `crop` (string), `grade` (string), `search` (string).
  - **Auth**: No.
- **`GET /api/lots/:id`**
  - **Purpose**: Returns single lot details with complete bid history.
  - **Auth**: No.

### 4. Bidding
- **`POST /api/bids`**
  - **Purpose**: Submits a real bid from buyer, validates price >= reserve, inserts into `bids` table, updates `highest_bid`, and broadcasts via SSE.
  - **Auth**: No (Buyer ID in payload).
  - **Body**: `{ "lotId": "LOT-TS-401", "buyerId": "USR-BUY-01", "pricePerQ": 21800, "logisticsMode": "buyer_vehicle" }`
  - **Response**: `201 Created` with created bid record.
- **`GET /api/bids/buyer/:buyerId`**
  - **Purpose**: Returns all bids submitted by a specific buyer with leading/outbid status.
  - **Auth**: No.

### 5. Procurement Orders & Logistics
- **`GET /api/orders/buyer/:buyerId`**
  - **Purpose**: Returns all procurement contracts for a buyer.
  - **Auth**: No.
- **`POST /api/orders/:id/assign-truck`**
  - **Purpose**: Assigns vehicle registration, driver name, and driver phone to an order.
  - **Body**: `{ "vehicleReg": "TS 03 UB 8192", "driverName": "రాము యాదవ్", "driverPhone": "+91 98481 23990" }`
  - **Response**: `200 OK`.
- **`POST /api/orders/:id/verify-otp`**
  - **Purpose**: Verifies 4-digit farm-gate weighment OTP, marks order delivered, debits buyer escrow, and credits farmer wallet in SQLite.
  - **Body**: `{ "otp": "4819" }`
  - **Response**: `200 OK`.

### 6. Bulk Demands (RFQs)
- **`GET /api/rfqs`**
  - **Purpose**: Lists all active RFQ tenders from SQLite.
  - **Auth**: No.
- **`POST /api/rfqs`**
  - **Purpose**: Creates a new buyer RFQ tender in SQLite and broadcasts via SSE.
  - **Body**: `{ "buyerId": "...", "cropKey": "teja_chilli", "targetQty": 250, "offerPrice": 21800, "deliveryMandi": "...", "validUntil": "15 Days" }`

### 7. External Proxies
- **`GET /api/market-prices`**
  - **Purpose**: Fetches Telangana mandi rates from data.gov.in. Returns transparent status if key missing.
- **`GET /api/weather?lat=17.7214&lon=79.1834`**
  - **Purpose**: Returns live temperature, humidity, wind, and forecast from Open-Meteo.
- **`GET /api/route?originLat=...&originLon=...&destLat=...&destLon=...`**
  - **Purpose**: Computes driving distance and ETA via OSRM.

---

## 8. Database Specification

- **Engine**: SQLite 3 (Node 24 native `node:sqlite`).
- **Path**: `data/kissan.db`.
- **Initialization Script**: `db/init_db.js`.
- **DDL Schema**: `db/schema.sql`.

### Relational Schema Summary
1. **`buyers`**: `id` (PK), `name`, `short_name`, `gstin`, `trade_license`, `phone`, `city`, `lat`, `lon`, `escrow_balance`, `rating`, `avatar`, `created_at`.
2. **`farmers`**: `id` (PK), `name`, `phone`, `village`, `district`, `lat`, `lon`, `wallet_balance`, `kyc_status`, `created_at`.
3. **`harvest_lots`**: `id` (PK), `farmer_id` (FK), `crop_key`, `crop_name_te`, `crop_name_en`, `variety_te`, `variety_en`, `quantity_quintals`, `grade`, `moisture_pct`, `location_te`, `storage_type_te`, `reserve_price`, `highest_bid`, `image_url`, `status`, `created_at`.
4. **`bids`**: `id` (PK), `lot_id` (FK), `buyer_id` (FK), `buyer_name`, `price_per_q`, `total_deal_amount`, `logistics_mode`, `logistics_text_te`, `status`, `created_at`.
5. **`procurement_orders`**: `id` (PK), `lot_id` (FK), `buyer_id` (FK), `farmer_id` (FK), `quantity_quintals`, `agreed_rate`, `total_escrow_amount`, `current_step`, `vehicle_reg`, `driver_name`, `driver_phone`, `farm_gate_otp`, `status`, `created_at`, `updated_at`.
6. **`rfqs`**: `id` (PK), `buyer_id` (FK), `crop_key`, `target_qty`, `offer_price`, `delivery_mandi`, `valid_until`, `status`, `created_at`.
7. **`logistics_trips`**: `id` (PK), `order_id`, `crop_name`, `origin`, `destination`, `distance_km`, `vehicle_type`, `freight_offer`, `status`, `assigned_vehicle`, `driver_name`, `driver_phone`, `pickup_otp`, `created_at`.
8. **`market_price_cache`**: `id` (PK), `commodity`, `market`, `district`, `min_price`, `max_price`, `modal_price`, `arrival_date`, `source`, `last_updated`.

---

## 9. Current Project Structure

```
KISSAN-CONNECT/
├── .env.example               # Environment variables template
├── .gitignore                  # Excludes .env, *.db, node_modules
├── HANDOFF.md                 # Developer handoff documentation (this file)
├── README.md                  # Project overview & SIH problem statement
├── package.json               # Scripts: start, init-db, test
├── server.js                  # Unified Node.js backend (REST + SSE + Static)
│
├── buyer_portal/              # Dedicated Commercial Buyer Portal
│   ├── index.html             # Buyer dashboard (5 tabs: Lots, Bids, Orders, RFQ, Arbitrage)
│   ├── css/buyer.css          # Navy/indigo industrial buyer styles
│   └── js/buyer.js            # REST API & SSE client engine
│
├── farmer_portal/             # Dedicated Farmer Portal
│   ├── index.html             # Farmer dashboard (Bidding arena, listing, charts, escrow)
│   ├── css/farmer.css         # Agricultural green tactile theme
│   ├── js/farmer.js           # Real-time SSE listener & dashboard controller
│   └── db/                    # Local helper schema & seed reference
│
├── logistics_portal/          # Rural Haulage Transporter Portal
│   ├── index.html             # Trips board & vehicle assignment interface
│   ├── css/logistics.css      # Logistics theme styles
│   └── js/logistics.js        # Trip filters, truck assignment & OTP handler
│
├── main_portal/               # Main Landing & Authentication Screen
│   ├── index.html             # Persona chooser & phone OTP login
│   ├── css/main_portal.css    # Landing screen styling
│   └── js/main_portal.js      # Role redirector & OTP verification
│
├── shared/                    # Shared Design System & Localization
│   ├── css/
│   │   ├── main.css           # Core typography, color tokens, reset
│   │   └── components.css     # Buttons, modals, badges, pills, alerts
│   ├── js/
│   │   ├── data.js            # Crops dictionary & Telangana mandi coordinates
│   │   └── lang.js            # Bilingual localization engine (Telugu / English)
│   └── assets/                # Crop photography & branding assets
│
├── db/                        # Database Management
│   ├── schema.sql             # Relational DDL definitions
│   └── init_db.js             # SQLite initialization & seeding script
│
├── services/                  # External API Proxies
│   ├── marketService.js       # data.gov.in AGMARKNET price proxy
│   ├── weatherService.js      # Open-Meteo live weather client
│   └── routingService.js      # OSRM road distance & ETA client
│
└── scratch/                   # Automated Verification Test Suites
    └── test_real_api.js       # End-to-end REST API & DB verification script
```

---

## 10. Known Bugs / Issues

### Issue 1: AGMARKNET API Key Required for Live Mandi Rates Ticker
- **Description**: The Mandi Ticker displays `"Live market data currently unavailable (Govt API Key required)"`.
- **Impact**: Ticker and market charts currently show the transparent fallback message instead of live daily government prices.
- **Where**: `services/marketService.js` and `server.js` (`GET /api/market-prices`).
- **Possible Cause**: Government API key has not yet been registered on data.gov.in.
- **Suggested Next Step**: Register at [data.gov.in](https://data.gov.in/), generate an API key for the AGMARKNET dataset, and add `DATA_GOV_IN_API_KEY=your_key` to `.env`.

### Issue 2: OSRM Public Routing Server Rate Limiting
- **Description**: The free public OSRM server (`router.project-osrm.org`) occasionally throttles or returns non-200 responses under heavy bursts.
- **Impact**: Route calculations fall back cleanly to `"Route estimate unavailable"`.
- **Where**: `services/routingService.js`.
- **Suggested Next Step**: Configure an optional Google Maps Distance Matrix API or Mapbox Directions API key in `.env` (`MAPS_API_KEY`) for production reliability.

### Issue 3: Farmer Portal Lot Creation Not Yet Migrated to POST /api/lots
- **Description**: While the Buyer Portal is 100% migrated to backend REST APIs (`/api/lots`, `/api/bids`, `/api/orders`), the Farmer lot creation form in `farmer_portal/js/farmer.js` currently inserts into `FarmerDB` / `localStorage` rather than issuing `POST /api/lots`.
- **Impact**: Lots created directly in the Farmer Portal UI require a manual backend insert or page refresh to synchronize with SQLite.
- **Suggested Next Step**: Add a `POST /api/lots` endpoint in `server.js` and wire `handleCreateLotSubmit` in `farmer.js` to call it.

---

## 11. Incomplete Work (Prioritized TODO)

### 🔴 Critical (Required for Core Production Functionality)
1. **Wire Farmer Lot Creation to Backend**: Add `POST /api/lots` in `server.js` and connect `farmer_portal/js/farmer.js` to persist farmer-created lots directly to SQLite.
2. **Add `DATA_GOV_IN_API_KEY`**: Obtain an active API key from data.gov.in to populate live Telangana mandi rates across Warangal, Nizamabad, and Khammam.
3. **Session State Persistence**: Implement session authentication (JWT or secure HTTP-only cookies) so a logged-in farmer or buyer maintains identity across page reloads without persona dropdowns.

### 🟠 Important (Needed for Strong Evaluation / Demo)
4. **Wire Logistics Trip Creation to Backend**: Connect `/logistics_portal/js/logistics.js` to fetch and update trips from the SQLite `logistics_trips` table via REST endpoints.
5. **Integrate Google Gemini API**: Wire `/api/ai/advisor` in `server.js` using `GEMINI_API_KEY` to feed actual live SQLite market and weather context into Google Gemini for AI crop advice.
6. **Live Driver GPS Tracking**: Add an HTML5 `navigator.geolocation.watchPosition` endpoint so drivers can transmit real GPS coordinates during transit.

### 🟢 Optional (Nice-to-Have Polish)
7. **SMS Gateway Integration**: Connect Fast2SMS or Twilio for real mobile OTP delivery instead of the current testing modal.
8. **Direct Payment Gateway Integration**: Connect Razorpay Route or Cashfree Escrow Sandbox for real automated bank transfers upon OTP verification.

---

## 12. Deployment Status

- **Frontend Deployment**: Self-hosted statically by `server.js` with MIME handling and root-absolute routing.
- **Backend Deployment**: Ready to run on any Node.js host (Render, Railway, AWS EC2, DigitalOcean, or Azure App Service).
- **Database Deployment**: SQLite file `data/kissan.db`. In containerized environments, attach a persistent volume to `/data` so database records survive restarts.
- **Expo / React Native**: This repository is currently built as a responsive Progressive Web Application (PWA) / web portal stack. An Expo mobile app shell can consume the existing `/api/*` endpoints directly.
- **Git Status**: Clean working tree on `main` branch.

---

## 13. How To Run Locally

### Prerequisites
- Node.js version **20.0.0** or higher (tested on Node.js **v24.14.1**).

### 1. Clone & Install
```bash
git clone https://github.com/dummy-batman/kisaan-connect-project.git
cd kisaan-connect-project
npm install
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env
# Open .env and add API keys if available
```

### 3. Initialize Database
```bash
npm run init-db
```
*This creates `data/kissan.db` and seeds initial verified APMC buyers, farmers, harvest lots, bids, and orders.*

### 4. Start Server
```bash
npm start
```
*The server starts on `http://localhost:3000`.*

### 5. Access Portals
- **Main Portal**: `http://localhost:3000/main_portal/index.html`
- **Farmer Portal**: `http://localhost:3000/farmer_portal/index.html`
- **Buyer Portal**: `http://localhost:3000/buyer_portal/index.html`
- **Logistics Portal**: `http://localhost:3000/logistics_portal/index.html`
- **API Health**: `http://localhost:3000/api/health`

### 6. Run Automated Test Suite
```bash
npm test
```

---

## 14. Recommended Development Order

For the incoming developer, follow this sequential execution path:

1. **Step 1: Set up `.env`**: Add `DATA_GOV_IN_API_KEY` to enable live daily commodity rates on the mandi ticker.
2. **Step 2: Add `POST /api/lots`**: In `server.js`, add the lot creation route and update `farmer_portal/js/farmer.js` (`handleCreateLotSubmit`) to post directly to the backend.
3. **Step 3: Connect Logistics to SQLite**: Add `GET /api/trips` and `POST /api/trips/:id/accept` in `server.js` and connect `logistics_portal/js/logistics.js`.
4. **Step 4: Connect Google Gemini LLM**: In `services/aiService.js`, use the official `@google/genai` or standard REST API with `GEMINI_API_KEY` to answer farmer queries using verified SQLite context.
5. **Step 5: Add Real Driver GPS**: Implement client-side `navigator.geolocation.watchPosition` in a mobile-friendly driver view.

---

## 15. Handoff Notes

- **Strict Real-Data Policy**: The project has strict rules against mock/simulated data. Never re-introduce `setInterval` random bid generators or hardcoded fallback prices. If an external API is down, display transparent unavailable states (`"Data unavailable"`).
- **Zero Heavy Dependencies**: `server.js` is intentionally crafted using native Node.js libraries (`http`, `node:sqlite`, `fs`, `path`, `url`). It runs fast, starts in milliseconds, and avoids dependency bloat.
- **Server-Sent Events**: Keep `GET /api/events` open. It is what connects the Buyer Portal's bids to the Farmer Portal's live bidding arena in real time.
