# Kissan Connect (కిసాన్ కనెక్ట్)
### Telangana Agri Market Linkage Platform (SIH-26132)

Kissan Connect is a farmer-first agricultural market linkage and direct procurement platform tailored for Telangana mandis (Enumamula Warangal, Khammam, Nizamabad, Miryalaguda, Suryapet, Adilabad). It connects farmers directly with commercial buyers and rural logistics fleets with real-time bidding, demand intelligence, and 100% secured digital escrow.

---

## 📂 Project Architecture (Four Portals + Multi-DB)

```
KISSAN-CONNECT/
├── main_portal/               # Role selection & landing gateway
│   ├── index.html
│   ├── css/main_portal.css
│   └── js/main_portal.js
│
├── farmer_portal/             # Dedicated Farmer Dashboard & Bidding Arena
│   ├── index.html
│   ├── css/farmer.css
│   ├── js/farmer.js
│   └── db/
│       ├── farmer_schema.sql  # Farmer domain SQL table definitions
│       ├── farmer_db.js       # Farmer database client interface
│       └── farmer_seed.json   # Seed data for farmer lots and bids
│
├── buyer_portal/              # Dedicated Commercial Buyer Portal
│   ├── index.html
│   ├── css/buyer.css
│   ├── js/buyer.js
│   └── db/
│       ├── buyer_schema.sql   # Buyer domain SQL table definitions
│       ├── buyer_db.js        # Buyer database client interface
│       └── buyer_seed.json    # Preloaded commercial buyers (ITC, Sri Krishna, Khammam Spices)
│
├── logistics_portal/          # Dedicated Transport Fleet Portal
│   ├── index.html
│   ├── css/logistics.css
│   ├── js/logistics.js
│   └── db/
│       ├── logistics_schema.sql # Transport domain SQL table definitions
│       ├── logistics_db.js    # Logistics database client interface
│       └── logistics_seed.json # Fleet and haulage trips seed data
│
├── integrated_db/             # Master Relational Database & Sync Engine
│   ├── master_schema.sql      # Full PostgreSQL/SQLite/MySQL schema DDL
│   ├── integrated_db.js       # Central data layer with cross-portal event syncing
│   ├── master_seed.json       # Consolidated seed database
│   └── DB_DOCUMENTATION.md    # Developer guide for backend APIs and database integration
│
├── shared/                    # Reusable assets across all portals
│   ├── assets/crops/          # Crop images (chilli, paddy, cotton, turmeric)
│   ├── css/
│   │   ├── main.css           # Design tokens, reset, typography
│   │   └── components.css     # Buttons, modals, badges, inputs
│   └── js/
│       ├── data.js            # Telangana mandis & crop configurations
│       └── lang.js            # Bilingual localization (Telugu & English)
│
└── index.html                 # Root gateway routing to main_portal/index.html
```

---

## 🌟 Portals Overview

1. **Main User Selection Gateway (`main_portal/`)**:
   - Welcome screen, SIH badges, live Mandi rates ticker, platform escrow statistics.
   - Routes to Farmer (via OTP auth), Commercial Buyer, or Logistics.

2. **Farmer Portal (`farmer_portal/`)**:
   - Live Bidding Arena with incoming bids from commercial buyers.
   - Smart Ask Engine (market demand-based price recommendations).
   - Interactive Chart.js price trends (Clearing Bid vs Farmer Ask vs Daily Mandi Arrivals).
   - Hold or Sell? AI Warehouse Advisor with nearby TSWC government cold storages.
   - Orders & Escrow Tracker with Farm-Gate OTP verification.
   - Grievance Redressal ticket logger (immediate escrow freeze on disputes).

3. **Commercial Buyer Portal (`buyer_portal/`)**:
   - Farm Harvest Lots Discovery with search, crop filtering, and grade specs.
   - Place Bid modal with instant valuation, logistics mode selection, and reserve price checks.
   - My Bids & Negotiations (Leading, Outbid with 1-click raise, and Farmer Counter offers).
   - Procurement Orders & Escrow (milestone tracker, truck dispatch, OTP verification).
   - Post Buy Demands (RFQs) for bulk procurement tenders.
   - Mandi Arbitrage & Savings Calculator (demonstrates 6-12% middleman savings).
   - Digital Tax Invoice generator (compliant with Telangana APMC & GST direct trade).

4. **Logistics Fleet Portal (`logistics_portal/`)**:
   - Available farm-to-mandi/mill haulage trip board with upfront freight rates.
   - Truck and driver assignment.
   - Farm-Gate loading OTP verification to unlock freight payment.

5. **Integrated Database (`integrated_db/`)**:
   - Master schema DDL for PostgreSQL / MySQL / SQLite.
   - Sync engine bridging transactions between farmer, buyer, and logistics.
   - Complete documentation in `integrated_db/DB_DOCUMENTATION.md` for backend API and database integration.

---

## 🚀 How to Run Locally

Serve the repository with any HTTP server:

```bash
# Using Python
python -m http.server 3000

# Or using npx serve
npx serve .
```

Open `http://localhost:3000` to launch the platform.
