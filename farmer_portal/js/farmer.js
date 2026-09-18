/**
 * KISSAN CONNECT - FARMER PORTAL JAVASCRIPT ENGINE
 * Handles Live Bidding Arena, Smart Ask Engine, Chart.js, Escrow, and Disputes
 */

let activeFarmerTab = 'biddingArena';
let activeChartCrop = 'teja_chilli';
let activeChartTimeframe = '15D';
let marketTrendsChartInstance = null;
let selectedLotForCounter = null;
let selectedBidForCounter = null;

const TAB_NAMES = {
  biddingArena: { te: 'లైవ్ బిడ్డింగ్ వార్', en: 'Live Bidding War' },
  createLot: { te: 'కొత్త పంట లిస్ట్ చేయండి', en: 'List Harvest Lot' },
  marketCharts: { te: 'మార్కెట్ చార్ట్‌లు & ట్రెండ్స్', en: 'Market Charts & Trends' },
  holdVsSell: { te: 'అమ్మాలా? నిల్వ చేయాలా?', en: 'Hold or Sell? (AI Advisor)' },
  ordersEscrow: { te: 'ఆర్డర్లు & ఎస్క్రో ట్రాకర్', en: 'Orders & Escrow Tracker' },
  aiQuality: { te: 'AI పంట నాణ్యత స్కాన్', en: 'AI Crop Quality Assessment' },
  weather: { te: 'వాతావరణం & వర్ష హెచ్చరికలు', en: 'Agri Weather & Rain Radar' },
  docVerification: { te: 'రైతు ధృవీకరణ పత్రాలు', en: 'Farmer Document Verification' },
  disputes: { te: 'సమస్య పరిష్కారం', en: 'Grievance Redressal' }
};

document.addEventListener('DOMContentLoaded', () => {
  renderMandiTicker();
  renderMandiSnapshot();
  calculateDemandAsk();
  renderBiddingArena();
  renderOrdersEscrow();
  updateHoldSellAdvice();
  updateTabBreadcrumb();

  // Initialize Real-Time Wallet Display
  updateWalletDisplay();

  // Initialize Real-Time Browser Geolocation & Weather
  initRealTimeLocationEngine();

  // Initialize 5-Document Real-Time KYC Status
  renderKycDocumentsStatus();

  // Start Real-Time Second-by-Second Auction Countdown Timers
  startAuctionCountdownTimers();

  // Connect to Backend Real-Time Event Stream (SSE)
  connectBackendEventStream();

  // Initialize Cross-Portal BroadcastChannel & Storage Sync
  initCrossPortalSync();

  // Start Continuous Real-Time Mandi Ticker Pulse
  startLiveMandiTickerPulse();

  // Initialize Chart.js
  setTimeout(() => {
    updateMarketCharts();
  }, 100);
});

function showToast(message, duration = 4000) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.innerHTML = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function navigateFarmerHome() {
  switchFarmerTab('biddingArena');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateTabBreadcrumb() {
  const el = document.getElementById('currentTabBreadcrumb');
  if (el && TAB_NAMES[activeFarmerTab]) {
    el.textContent = currentLang === 'te' ? TAB_NAMES[activeFarmerTab].te : TAB_NAMES[activeFarmerTab].en;
  }
}

// -----------------------------------------------------------------------------
// REAL-TIME AUDIO & WALLET ENGINE
// -----------------------------------------------------------------------------
function playBidChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

function updateWalletDisplay(explicitAmount = null) {
  let wallet = explicitAmount;
  if (wallet === null) {
    const profile = window.FarmerDB ? window.FarmerDB.getProfile() : { walletBalance: 148500 };
    wallet = profile.walletBalance || 148500;
  }
  const formatted = `₹${Number(wallet).toLocaleString('en-IN')}`;
  
  const displayWalletEl = document.getElementById('displayWalletAmount');
  if (displayWalletEl) displayWalletEl.textContent = formatted;

  const topDisplayWalletEl = document.getElementById('topDisplayWallet');
  if (topDisplayWalletEl) topDisplayWalletEl.textContent = formatted;
}

// -----------------------------------------------------------------------------
// REAL-TIME AUCTION COUNTDOWN TIMERS
// -----------------------------------------------------------------------------
function parseTimeStringToSeconds(timeStr) {
  if (!timeStr) return 43200;
  const parts = timeStr.match(/(\d+)h\s*:\s*(\d+)m\s*:\s*(\d+)s/);
  if (parts) {
    return parseInt(parts[1], 10) * 3600 + parseInt(parts[2], 10) * 60 + parseInt(parts[3], 10);
  }
  return 18000;
}

function formatSecondsToTimer(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, '0')}h : ${m.toString().padStart(2, '0')}m : ${s.toString().padStart(2, '0')}s`;
}

function startAuctionCountdownTimers() {
  setInterval(() => {
    const lots = window.FarmerDB ? window.FarmerDB.getLots() : [];
    lots.forEach(lot => {
      if (lot.remainingSeconds === undefined) {
        lot.remainingSeconds = parseTimeStringToSeconds(lot.auctionEndsIn);
      }
      if (lot.remainingSeconds > 0) {
        lot.remainingSeconds--;
        lot.auctionEndsIn = formatSecondsToTimer(lot.remainingSeconds);
        const timerEl = document.getElementById(`timer-${lot.id}`);
        if (timerEl) {
          timerEl.textContent = lot.auctionEndsIn;
          if (lot.remainingSeconds < 1800) {
            timerEl.parentElement.classList.add('urgent');
          }
        }
      } else if (lot.remainingSeconds === 0) {
        lot.remainingSeconds = -1;
        const timerEl = document.getElementById(`timer-${lot.id}`);
        if (timerEl) timerEl.textContent = 'ముగిసింది (Closed)';
      }
    });
  }, 1000);
}

// -----------------------------------------------------------------------------
// REAL-TIME SIMULATED COMPETITIVE BUYER BIDDING & CROSS-PORTAL SYNC
// -----------------------------------------------------------------------------
const SIMULATED_BUYERS = [
  { name: 'ITC Agri Business Hub', rating: '4.9 ★ (88 డీల్స్)', location: 'సికింద్రాబాద్' },
  { name: 'శ్రీ కృష్ణ మోడ్రన్ రైస్ మిల్స్', rating: '4.9 ★ (124 డీల్స్)', location: 'మిర్యాలగూడ' },
  { name: 'ఖమ్మం స్పైసెస్ ఎక్స్‌పోర్టర్స్', rating: '4.7 ★ (43 డీల్స్)', location: 'ఖమ్మం' },
  { name: 'ఆదిలాబాద్ కాటన్ జిన్నింగ్ మిల్స్', rating: '4.8 ★ (65 డీల్స్)', location: 'ఆదిలాబాద్' },
  { name: 'నిజామాబాద్ పసుపు ఎగుమతి మండలి', rating: '4.9 ★ (92 డీల్స్)', location: 'ఆర్మూర్, నిజామాబాద్' },
  { name: 'వరంగల్ కమర్షియల్ ఆగ్రో లిమిటెడ్', rating: '4.8 ★ (39 డీల్స్)', location: 'వరంగల్ (ఎనుమాముల)' }
];

// -----------------------------------------------------------------------------
// AUTHENTIC REAL-TIME BACKEND EVENT STREAM (SSE)
// Connects to /api/events for genuine real-time buyer bids & order events
// -----------------------------------------------------------------------------
let backendEventSource = null;

function connectBackendEventStream() {
  try {
    if (backendEventSource) backendEventSource.close();
    backendEventSource = new EventSource('/api/events');

    backendEventSource.addEventListener('NEW_BID', (event) => {
      const data = JSON.parse(event.data);
      const bid = data.bid;
      if (!bid) return;

      playBidChime();
      showToast(`⚡ <strong>కొత్త బిడ్ వచ్చింది!</strong> ${bid.buyerName} మీ పంటపై <strong>₹${Number(bid.pricePerQ).toLocaleString('en-IN')}/Q</strong> ఆఫర్ చేశారు!`);

      // Sync into local cache if integrated DB present
      if (window.IntegratedDB) {
        window.IntegratedDB.placeBid(data.lotId, bid);
      }

      if (activeFarmerTab === 'biddingArena') {
        renderBiddingArena();
      }
    });

    backendEventSource.addEventListener('ORDER_DELIVERED', (event) => {
      const data = JSON.parse(event.data);
      showToast(`💰 ఆర్డర్ #${data.orderId} OTP ధృవీకరించబడింది! ఎస్క్రో నిధులు మీ ఖాతాకు జమ చేయబడ్డాయి.`);
      updateWalletDisplay();
      if (activeFarmerTab === 'ordersEscrow') {
        renderOrdersEscrow();
      }
    });

    backendEventSource.onerror = () => {
      console.warn('[Farmer] SSE stream disconnected, reconnecting...');
    };
  } catch (err) {
    console.warn('SSE not supported or server unavailable:', err);
  }
}

let marketChannel = null;

function initCrossPortalSync() {
  try {
    marketChannel = new BroadcastChannel('kissan_market_channel');
    marketChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'NEW_BUYER_BID') {
        playBidChime();
        if (activeFarmerTab === 'biddingArena') renderBiddingArena();
      } else if (data.type === 'NEW_LOT_CREATED' || data.type === 'DEAL_ACCEPTED') {
        if (activeFarmerTab === 'biddingArena') renderBiddingArena();
        if (activeFarmerTab === 'ordersEscrow') renderOrdersEscrow();
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported in this environment');
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'kissan_connect_master_db_v1') {
      if (activeFarmerTab === 'biddingArena') renderBiddingArena();
      if (activeFarmerTab === 'ordersEscrow') renderOrdersEscrow();
      updateWalletDisplay();
    }
  });
}

function broadcastMarketEvent(eventObj) {
  if (marketChannel) {
    try {
      marketChannel.postMessage(eventObj);
    } catch (e) {}
  }
}

// -----------------------------------------------------------------------------
// REAL-TIME CONTINUOUS MANDI TICKER PULSE
// -----------------------------------------------------------------------------
function startLiveMandiTickerPulse() {
  setInterval(() => {
    const mandis = window.IntegratedDB ? window.IntegratedDB.getMandis() : TELANGANA_MANDIS;
    if (!mandis || mandis.length === 0) return;
    const idx = Math.floor(Math.random() * mandis.length);
    const m = mandis[idx];
    const delta = (Math.floor(Math.random() * 5) - 2) * 25;
    if (delta !== 0) {
      m.price = Math.max(1500, m.price + delta);
      m.trend = delta > 0 ? 'up' : 'down';
      m.change = (delta > 0 ? '+' : '') + ((delta / m.price) * 100).toFixed(1) + '%';
      renderMandiTicker();
      renderMandiSnapshot();
    }
  }, 7000);
}

// Tab navigation
function switchFarmerTab(tabName) {
  activeFarmerTab = tabName;

  document.querySelectorAll('.sidebar-nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.farmer-main-content .tab-pane').forEach(pane => pane.classList.remove('active'));

  const tabBtn = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  const tabPane = document.getElementById('pane' + tabName.charAt(0).toUpperCase() + tabName.slice(1));

  if (tabBtn) tabBtn.classList.add('active');
  if (tabPane) tabPane.classList.add('active');

  updateTabBreadcrumb();

  if (tabName === 'biddingArena') {
    renderBiddingArena();
  } else if (tabName === 'marketCharts') {
    setTimeout(() => {
      updateMarketCharts();
    }, 50);
  } else if (tabName === 'holdVsSell') {
    updateHoldSellAdvice();
  } else if (tabName === 'ordersEscrow') {
    renderOrdersEscrow();
  } else if (tabName === 'weather') {
    updateWeatherDistrictUI();
  } else if (tabName === 'aiQuality') {
    changeAiScannerSampleCrop();
  } else if (tabName === 'docVerification') {
    renderKycDocumentsStatus();
  }

  window.scrollTo({ top: 90, behavior: 'smooth' });
}

// -----------------------------------------------------------------------------
// TAB 1: BIDDING ARENA
// -----------------------------------------------------------------------------
function renderBiddingArena() {
  const container = document.getElementById('farmerLotsList');
  if (!container) return;

  const lots = window.FarmerDB ? window.FarmerDB.getLots() : [];

  if (lots.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-card);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🌾</div>
        <p>ప్రస్తుతం యాక్టివ్ లాట్లు లేవు. కొత్త పంటను లిస్ట్ చేయండి.</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="switchFarmerTab('createLot')">➕ పంటను లిస్ట్ చేయండి</button>
      </div>
    `;
    return;
  }

  container.innerHTML = lots.map(lot => {
    const cropTitle = currentLang === 'te' ? lot.cropNameTe : lot.cropNameEn;
    const variety = currentLang === 'te' ? lot.varietyTe : lot.varietyEn;
    const location = currentLang === 'te' ? lot.locationTe : lot.locationEn;
    const storage = currentLang === 'te' ? lot.storageTe : lot.storageEn;

    const bidsHtml = (lot.bids || []).map(bid => {
      const logisticsText = currentLang === 'te' ? bid.logisticsTextTe : bid.logisticsTextEn;
      const isBuyerVehicle = bid.logisticsMode === 'buyer_vehicle';
      const isTopBid = bid.pricePerQ === lot.highestBid;
      const totalPayout = bid.pricePerQ * lot.quantity;

      return `
        <div class="bid-item-row ${isTopBid ? 'highest-bid' : ''}">
          <div class="buyer-meta-info">
            <div class="buyer-name-line">
              <span class="buyer-name">${bid.buyerName}</span>
              <span class="buyer-rating-badge">${bid.buyerRating || '4.8 ★'}</span>
            </div>
            <span class="buyer-location">📍 ${bid.buyerLocation || (currentLang === 'te' ? 'తెలంగాణ' : 'Telangana')}</span>
          </div>

          <div>
            <span class="bid-logistics-badge ${isBuyerVehicle ? 'buyer-vehicle' : 'platform-transporter'}">
              ${logisticsText || (currentLang === 'te' ? '🚛 కొనుగోలుదారు రవాణా' : '🚛 Buyer Vehicle')}
            </span>
          </div>

          <div class="bid-pricing-summary">
            <span class="bid-rate-per-q">₹${Number(bid.pricePerQ).toLocaleString('en-IN')} <small style="font-size:0.75rem; font-weight:600; color:var(--text-light);">/ ${currentLang === 'te' ? 'క్వింటాల్' : 'Quintal'}</small></span>
            <span class="bid-total-payout">${currentLang === 'te' ? 'మొత్తం:' : 'Total:'} <strong>₹${totalPayout.toLocaleString('en-IN')}</strong></span>
          </div>

          <div class="bid-action-buttons">
            <button class="btn btn-primary btn-sm" onclick="acceptBuyerBid('${lot.id}', '${bid.bidId}')" title="${currentLang === 'te' ? 'రైతు ఈ బిడ్‌ను ఆమోదిస్తారు' : 'Accept this bid'}">
              ✓ ${currentLang === 'te' ? 'ఆమోదించు' : 'Accept'}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openCounterModal('${lot.id}', '${bid.bidId}', ${bid.pricePerQ})">
              💬 ${currentLang === 'te' ? 'కౌంటర్' : 'Counter'}
            </button>
            <button class="btn btn-outline btn-sm" onclick="rejectBuyerBid('${lot.id}', '${bid.bidId}')" title="${currentLang === 'te' ? 'తిరస్కరించు' : 'Reject'}">
              ✕
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="farmer-lot-card" id="card-${lot.id}">
        <!-- Visual Column -->
        <div class="lot-visual-sidebar">
          <div>
            <div class="lot-crop-image-container">
              <img src="${lot.image}" alt="${cropTitle}" onerror="this.src='../shared/assets/crops/teja_chilli.jpg'">
              <div class="lot-status-tag">
                <span class="live-dot" style="background:#fff; width:6px; height:6px;"></span>
                <span>${currentLang === 'te' ? 'లైవ్ బిడ్డింగ్ వార్' : 'Live Bidding War'}</span>
              </div>
            </div>

            <div class="lot-specs-summary">
              <div class="lot-spec-item">
                <span>${currentLang === 'te' ? 'పరిమాణం (Qty):' : 'Quantity:'}</span>
                <strong>${lot.quantity} ${currentLang === 'te' ? 'క్వింటాళ్లు' : 'Quintals'}</strong>
              </div>
              <div class="lot-spec-item">
                <span>${currentLang === 'te' ? 'గ్రేడ్ / నాణ్యత:' : 'Grade / Quality:'}</span>
                <strong>${currentLang === 'te' ? 'గ్రేడ్' : 'Grade'} ${lot.grade} (${currentLang === 'te' ? 'తేమ' : 'Moisture'} ${lot.moisture || '10%'})</strong>
              </div>
              <div class="lot-spec-item">
                <span>${currentLang === 'te' ? 'ప్రదేశం:' : 'Location:'}</span>
                <strong>${location}</strong>
              </div>
              <div class="lot-spec-item">
                <span>${currentLang === 'te' ? 'నిల్వ:' : 'Storage:'}</span>
                <strong>${storage}</strong>
              </div>
            </div>
          </div>

          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-card); font-size: 0.78rem; color: var(--text-muted);">
            ${currentLang === 'te' ? 'రైతు లాట్ ఐడీ:' : 'Lot ID:'} <strong>${lot.id}</strong>
          </div>
        </div>

        <!-- Main Bidding Arena Column -->
        <div class="lot-bidding-main">
          <div class="lot-header-row">
            <div class="lot-title-group">
              <h3>${cropTitle}</h3>
              <span class="lot-variety-pill">${variety}</span>
            </div>

            <div class="lot-financials-group">
              <div class="financial-col">
                <div class="fin-label">${currentLang === 'te' ? 'మీ రిజర్వ్ ధర (Ask)' : 'Reserve Price (Ask)'}</div>
                <div class="fin-val">₹${Number(lot.reservePrice).toLocaleString('en-IN')}</div>
              </div>
              <div class="financial-col">
                <div class="fin-label">${currentLang === 'te' ? 'ప్రస్తుత గరిష్ట బిడ్ (Top Bid)' : 'Current Top Bid'}</div>
                <div class="fin-val highlight">₹${Number(lot.highestBid).toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          <div class="bids-table-header">
            <div class="bids-table-title">
              <span>${currentLang === 'te' ? 'వచ్చిన బిడ్‌లు' : 'Incoming Bids'} (${(lot.bids || []).length})</span>
              <small style="color: var(--text-muted); font-weight: normal;">• ${currentLang === 'te' ? 'రైతుకు నచ్చిన బిడ్‌ను మాత్రమే ఎంచుకునే పూర్తి స్వేచ్ఛ ఉంది' : 'Farmer holds full autonomy to accept any bid'}</small>
            </div>
            <div class="auction-timer-badge">
              ⏳ ${currentLang === 'te' ? 'ముగింపు:' : 'Ends In:'} <strong id="timer-${lot.id}">${lot.auctionEndsIn || '12h : 00m : 00s'}</strong>
            </div>
          </div>

          <div class="incoming-bids-list">
            ${bidsHtml || '<p style="padding:1.5rem; text-align:center; color:var(--text-muted);">ఇంకా బిడ్‌లు రాలేదు. కొనుగోలుదారులు పరిశీలిస్తున్నారు...</p>'}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const totalBids = lots.reduce((sum, l) => sum + (l.bids ? l.bids.length : 0), 0);
  const badge = document.getElementById('activeBidsBadge');
  if (badge) badge.textContent = `${totalBids} బిడ్‌లు`;
}

let pendingDealAccept = null;

function acceptBuyerBid(lotId, bidId) {
  const lots = window.FarmerDB ? window.FarmerDB.getLots() : [];
  const lot = lots.find(l => l.id === lotId);
  if (!lot) return;
  const bid = (lot.bids || []).find(b => b.bidId === bidId);
  if (!bid) return;

  pendingDealAccept = { lotId, bidId, lot, bid };

  const modal = document.getElementById('acceptBidConfirmModal');
  const cropTitle = currentLang === 'te' ? lot.cropNameTe : lot.cropNameEn;
  const total = bid.pricePerQ * lot.quantity;

  const bNameEl = document.getElementById('acceptModalBuyerName');
  if (bNameEl) bNameEl.textContent = bid.buyerName;

  const cqEl = document.getElementById('acceptModalCropQty');
  if (cqEl) cqEl.textContent = currentLang === 'te' ? `${cropTitle} (${lot.quantity} క్వింటాళ్లు)` : `${cropTitle} (${lot.quantity} Quintals)`;

  const pqEl = document.getElementById('acceptModalPriceQ');
  if (pqEl) pqEl.textContent = currentLang === 'te' ? `₹${bid.pricePerQ.toLocaleString('en-IN')}/క్వింటాల్` : `₹${bid.pricePerQ.toLocaleString('en-IN')}/Q`;

  const logEl = document.getElementById('acceptModalLogistics');
  if (logEl) logEl.textContent = currentLang === 'te' ? (bid.logisticsTextTe || '🚛 కొనుగోలుదారు సొంత వాహనం') : (bid.logisticsTextEn || '🚛 Buyer Vehicle');

  const totEl = document.getElementById('acceptModalTotalPayout');
  if (totEl) totEl.textContent = `₹${total.toLocaleString('en-IN')}`;

  if (modal) modal.style.display = 'flex';
}

function closeAcceptBidConfirmModal() {
  const modal = document.getElementById('acceptBidConfirmModal');
  if (modal) modal.style.display = 'none';
  pendingDealAccept = null;
}

function confirmAcceptDealNow() {
  if (!pendingDealAccept || !window.FarmerDB) return;
  const { lotId, bidId } = pendingDealAccept;
  const newOrder = window.FarmerDB.acceptBid(lotId, bidId);
  closeAcceptBidConfirmModal();

  if (!newOrder) return;

  broadcastMarketEvent({
    type: 'DEAL_ACCEPTED',
    order: newOrder
  });

  renderBiddingArena();
  renderOrdersEscrow();

  showToast(currentLang === 'te'
    ? `🎉 అభినందనలు! ${newOrder.buyerName} తో డీల్ ఖరారైంది. ₹${newOrder.totalEscrowAmount.toLocaleString('en-IN')} మొత్తం ఎస్క్రో ఖాతాలో లాక్ చేయబడింది!`
    : `🎉 Deal Confirmed with ${newOrder.buyerName}! ₹${newOrder.totalEscrowAmount.toLocaleString('en-IN')} locked in digital escrow.`
  );

  playBidChime();

  setTimeout(() => {
    switchFarmerTab('ordersEscrow');
  }, 1200);
}

function rejectBuyerBid(lotId, bidId) {
  if (window.FarmerDB) {
    window.FarmerDB.rejectBid(lotId, bidId);
    renderBiddingArena();
    showToast(currentLang === 'te' ? '❌ బిడ్ తిరస్కరించబడింది.' : '❌ Bid rejected by farmer.');
  }
}

function openCounterModal(lotId, bidId, currentPrice) {
  selectedLotForCounter = lotId;
  selectedBidForCounter = bidId;

  document.getElementById('counterOfferModal').classList.add('active');
  document.getElementById('counterPriceInput').value = currentPrice + 500;
  document.getElementById('counterModalSubtitle').textContent = 
    currentLang === 'te' 
      ? `కొనుగోలుదారు ప్రస్తుత బిడ్: ₹${currentPrice.toLocaleString('en-IN')}/క్వింటాల్. మీ కౌంటర్ ధర ప్రతిపాదించండి.`
      : `Buyer current bid: ₹${currentPrice.toLocaleString('en-IN')}/Q. Enter your desired counter price.`;
}

function closeCounterModal() {
  document.getElementById('counterOfferModal').classList.remove('active');
  selectedLotForCounter = null;
  selectedBidForCounter = null;
}

function submitCounterOffer() {
  const counterPrice = Number(document.getElementById('counterPriceInput').value);
  if (!counterPrice || counterPrice <= 0) return;

  const lotId = selectedLotForCounter;
  const bidId = selectedBidForCounter;

  if (window.FarmerDB) {
    window.FarmerDB.counterBid(lotId, bidId, counterPrice);
  }

  closeCounterModal();
  renderBiddingArena();
  showToast(currentLang === 'te'
    ? `💬 కొనుగోలుదారుకు ₹${counterPrice.toLocaleString('en-IN')}/Q కౌంటర్ ఆఫర్ పంపబడింది. పరిశీలిస్తున్నారు...`
    : `💬 Counter offer of ₹${counterPrice.toLocaleString('en-IN')}/Q sent to buyer. Awaiting response...`);

  // Simulate real-time buyer evaluation after 6 seconds
  setTimeout(() => {
    const lots = window.FarmerDB ? window.FarmerDB.getLots() : [];
    const lot = lots.find(l => l.id === lotId);
    if (!lot) return;
    const bid = (lot.bids || []).find(b => b.bidId === bidId);
    if (!bid) return;

    if (Math.random() < 0.75) {
      bid.pricePerQ = counterPrice;
      lot.highestBid = Math.max(lot.highestBid, counterPrice);
      if (window.IntegratedDB) window.IntegratedDB.placeBid(lot.id, bid);
      playBidChime();
      renderBiddingArena();
      showToast(`🎉 <strong>కౌంటర్ ఆమోదం!</strong> ${bid.buyerName} మీ <strong>₹${counterPrice.toLocaleString('en-IN')}/Q</strong> కౌంటర్ ఆఫర్‌ను ఆమోదించారు!`);
    } else {
      const compromisePrice = Math.round((counterPrice - 100) / 50) * 50;
      bid.pricePerQ = compromisePrice;
      lot.highestBid = Math.max(lot.highestBid, compromisePrice);
      if (window.IntegratedDB) window.IntegratedDB.placeBid(lot.id, bid);
      playBidChime();
      renderBiddingArena();
      showToast(`💬 <strong>కొనుగోలుదారు సవరణ:</strong> ${bid.buyerName} ₹${compromisePrice.toLocaleString('en-IN')}/Q కి సవరించిన తుది బిడ్ పంపారు.`);
    }
  }, 6000);
}

// -----------------------------------------------------------------------------
// TAB 2: CREATE LOT & SMART ASK
// -----------------------------------------------------------------------------
function onCropSelected() {
  const cropKey = document.getElementById('cropSelect').value;
  const config = CROPS_CONFIG[cropKey];
  if (!config) return;

  document.getElementById('cropVariety').value = currentLang === 'te' ? config.defaultVarietyTe : config.defaultVarietyEn;
  document.getElementById('lotPreviewImg').src = `../${config.image}`;
  calculateDemandAsk();
}

function calculateDemandAsk() {
  const cropKey = document.getElementById('cropSelect').value;
  const config = CROPS_CONFIG[cropKey];
  if (!config) return;

  const grade = document.getElementById('cropGrade').value;
  let multiplier = 1.0;
  if (grade === 'A') multiplier = 1.05;
  if (grade === 'C') multiplier = 0.93;

  const minSuggested = Math.round((config.suggestedMin * multiplier) / 50) * 50;
  const maxSuggested = Math.round((config.suggestedMax * multiplier) / 50) * 50;

  const indicatorEl = document.getElementById('smartDemandIndicator');
  if (indicatorEl) {
    indicatorEl.innerHTML = currentLang === 'te'
      ? `డిమాండ్ స్థితి: <span class="demand-tag ${config.demandTag}">${config.demandStatusTe}</span>`
      : `Demand Status: <span class="demand-tag ${config.demandTag}">${config.demandStatusEn}</span>`;
  }

  const rangeEl = document.getElementById('suggestedPriceRange');
  if (rangeEl) rangeEl.textContent = `₹${minSuggested.toLocaleString('en-IN')} – ₹${maxSuggested.toLocaleString('en-IN')} / క్వింటాల్`;

  const reasonEl = document.getElementById('suggestedExplanation');
  if (reasonEl) reasonEl.textContent = currentLang === 'te' ? config.reasonTe : config.reasonEn;

  const askInput = document.getElementById('farmerAskPrice');
  if (askInput) askInput.value = minSuggested;
}

function handleImagePreview(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      document.getElementById('lotPreviewImg').src = evt.target.result;
      showToast(currentLang === 'te' ? '📸 పంట ఫోటో ఎంచుకోబడింది' : '📸 Crop photo selected');
    };
    reader.readAsDataURL(file);
  }
}

function handleCreateLotSubmit(e) {
  e.preventDefault();

  const cropKey = document.getElementById('cropSelect').value;
  const config = CROPS_CONFIG[cropKey];
  const variety = document.getElementById('cropVariety').value;
  const quantity = Number(document.getElementById('lotQuantity').value);
  const grade = document.getElementById('cropGrade').value;
  const location = document.getElementById('farmLocation').value;
  const askPrice = Number(document.getElementById('farmerAskPrice').value);
  const imgSrc = document.getElementById('lotPreviewImg').src;

  const newLot = {
    id: `LOT-TS-${Math.floor(500 + Math.random() * 400)}`,
    farmerId: 'USR-FARM-01',
    farmerName: 'మల్లారెడ్డి',
    cropKey: cropKey,
    cropNameTe: config.nameTe,
    cropNameEn: config.nameEn,
    varietyTe: variety,
    varietyEn: variety,
    quantity: quantity,
    grade: grade,
    moisture: grade === 'A' ? '9.5%' : (grade === 'B' ? '12.0%' : '14.5%'),
    locationTe: location,
    locationEn: location,
    storageTe: 'పొలంలోనే ఉంది (Farm Gate)',
    storageEn: 'Farm Gate Pickup',
    reservePrice: askPrice,
    highestBid: 0,
    auctionEndsIn: '23h : 59m : 59s',
    remainingSeconds: 86399,
    image: imgSrc,
    bids: []
  };

  if (window.FarmerDB) {
    window.FarmerDB.createLot(newLot);
  }

  // Also persist to SQLite backend
  try {
    fetch('/api/lots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLot)
    }).catch(() => {});
  } catch (e) {}

  broadcastMarketEvent({
    type: 'NEW_LOT_CREATED',
    lot: newLot
  });

  showToast(currentLang === 'te'
    ? `🚀 మీ ${config.nameTe} (${quantity} క్వింటాళ్లు) విజయవంతంగా లైవ్ బిడ్డింగ్ కోసం లిస్ట్ చేయబడింది!`
    : `🚀 Your ${config.nameEn} (${quantity} Q) is now LIVE for competitive buyer bidding!`
  );

  switchFarmerTab('biddingArena');

  // Trigger immediate buyer interest on the newly created lot in 3.5 seconds!
  setTimeout(() => {
    const buyer = SIMULATED_BUYERS[Math.floor(Math.random() * SIMULATED_BUYERS.length)];
    const initialBidPrice = askPrice + Math.floor(Math.random() * 4 + 1) * 50;
    const initialBid = {
      bidId: `BID-${Math.floor(1000 + Math.random() * 9000)}`,
      buyerId: 'USR-BUY-01',
      buyerName: buyer.name,
      buyerRating: buyer.rating,
      buyerLocation: buyer.location,
      pricePerQ: initialBidPrice,
      logisticsMode: 'buyer_vehicle',
      logisticsTextTe: '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
      logisticsTextEn: '🚛 Buyer will send own truck (₹0 farmer cost)',
      status: 'active',
      isNewArrival: true
    };
    if (window.IntegratedDB) {
      window.IntegratedDB.placeBid(newLot.id, initialBid);
    }
    playBidChime();
    renderBiddingArena();
    showToast(`⚡ <strong>మొదటి బిడ్ వచ్చింది!</strong> ${buyer.name} మీ కొత్త లాట్‌కు <strong>₹${initialBidPrice.toLocaleString('en-IN')}/Q</strong> బిడ్ వేశారు!`);
  }, 3500);
}

// -----------------------------------------------------------------------------
// TAB 3: CHART.JS MARKET CHARTS
// -----------------------------------------------------------------------------
function handleChartCropChange() {
  const select = document.getElementById('chartCropSelector');
  if (!select) return;
  activeChartCrop = select.value;
  updateMarketCharts();
}

function setChartTimeframe(tf) {
  activeChartTimeframe = tf;
  document.querySelectorAll('.chart-timeframe-toggles .timeframe-btn').forEach(btn => {
    if (btn.textContent.includes(tf === '15D' ? '15' : tf === '30D' ? '30' : '3')) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  updateMarketCharts();
}

function updateMarketCharts() {
  if (typeof Chart === 'undefined') return;
  if (typeof MARKET_TRENDS_DATA === 'undefined') return;

  const cropData = MARKET_TRENDS_DATA[activeChartCrop];
  if (!cropData) return;

  const tfData = cropData[activeChartTimeframe];
  if (!tfData) return;

  const isTe = currentLang === 'te';

  const curPriceEl = document.getElementById('metricCurrentPrice');
  if (curPriceEl) curPriceEl.textContent = `₹${cropData.currentPrice.toLocaleString('en-IN')}`;

  const priceChangeEl = document.getElementById('metricPriceChange');
  if (priceChangeEl) {
    priceChangeEl.textContent = cropData.priceChange;
    priceChangeEl.className = `kpi-change ${cropData.priceTrend === 'up' ? 'up' : 'down'}`;
  }

  const highPriceEl = document.getElementById('metricHighPrice');
  if (highPriceEl) highPriceEl.textContent = `₹${cropData.highPrice.toLocaleString('en-IN')}`;

  const highLocEl = document.getElementById('metricHighLocation');
  if (highLocEl) highLocEl.textContent = isTe ? cropData.highLocationTe : cropData.highLocationEn;

  const arrivalsEl = document.getElementById('metricArrivals');
  if (arrivalsEl) arrivalsEl.textContent = isTe ? cropData.arrivals : cropData.arrivalsEn;

  const arrivalsChangeEl = document.getElementById('metricArrivalsChange');
  if (arrivalsChangeEl) {
    arrivalsChangeEl.textContent = isTe ? cropData.arrivalsChangeTe.split(' ')[0] : cropData.arrivalsChangeEn.split(' ')[0];
    arrivalsChangeEl.className = `kpi-change ${cropData.arrivalsTrend === 'down' ? 'down' : 'up'}`;
  }

  const arrivalsStatusEl = document.getElementById('metricArrivalsStatus');
  if (arrivalsStatusEl) arrivalsStatusEl.textContent = isTe ? cropData.arrivalsChangeTe : cropData.arrivalsChangeEn;

  const actionEl = document.getElementById('metricActionAdvice');
  if (actionEl) actionEl.textContent = isTe ? cropData.actionAdviceTe : cropData.actionAdviceEn;

  const actionSubEl = document.getElementById('metricActionSub');
  if (actionSubEl) actionSubEl.textContent = isTe ? cropData.actionSubTe : cropData.actionSubEn;

  const canvas = document.getElementById('marketTrendsCanvas');
  if (!canvas) return;

  const labels = isTe ? tfData.labelsTe : tfData.labelsEn;

  if (marketTrendsChartInstance) {
    marketTrendsChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  marketTrendsChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: isTe ? 'రైతుల సగటు రిజర్వ్ ధర (Ask Price)' : 'Farmer Reserve Price (Ask)',
          data: tfData.reserveAsk,
          borderColor: '#2D6A4F',
          backgroundColor: 'rgba(45, 106, 79, 0.08)',
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#2D6A4F',
          yAxisID: 'y'
        },
        {
          label: isTe ? 'కొనుగోలుదారుల ముగింపు బిడ్ (Clearing Bid)' : 'Winning Buyer Bid',
          data: tfData.actualBid,
          borderColor: '#B45309',
          backgroundColor: 'rgba(180, 83, 9, 0.08)',
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#B45309',
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: isTe ? 'రోజువారీ మార్కెట్ రాకలు (Arrivals)' : 'Daily Arrivals (Bags)',
          data: tfData.arrivals,
          backgroundColor: 'rgba(148, 163, 184, 0.35)',
          borderRadius: 4,
          barThickness: 16,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { color: '#F1F5F9' } },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: '#F1F5F9' },
          ticks: {
            callback: value => '₹' + value.toLocaleString('en-IN')
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            callback: value => value >= 1000 ? (value / 1000) + 'k' : value
          }
        }
      }
    }
  });
}

// -----------------------------------------------------------------------------
// TAB 4: HOLD OR SELL ADVISOR
// -----------------------------------------------------------------------------
function updateHoldSellAdvice() {
  const cropSelect = document.getElementById('advisorCropSelect');
  if (!cropSelect) return;
  const cropKey = cropSelect.value;
  const data = HOLD_SELL_DATA[cropKey];
  if (!data) return;

  const decisionBox = document.getElementById('decisionBox');
  const comparisonGrid = document.getElementById('holdSellComparisonGrid');
  const warehouseGrid = document.getElementById('warehouseCardsGrid');

  if (decisionBox) {
    decisionBox.className = `decision-recommendation-box ${data.recommendation}`;
    decisionBox.innerHTML = `
      <div class="decision-verdict">${currentLang === 'te' ? data.verdictTe : data.verdictEn}</div>
      <div class="decision-detail">${currentLang === 'te' ? data.explanationTe : data.explanationEn}</div>
    `;
  }

  if (comparisonGrid) {
    const isEn = currentLang === 'en';
    comparisonGrid.innerHTML = `
      <div class="comparison-card">
        <div class="comparison-card-title">${isEn ? '1. If Sold in Market Today' : '1. ఇప్పుడే మార్కెట్లో అమ్మితే'}</div>
        <div class="comparison-big-rate">₹${data.currentMandiPrice.toLocaleString('en-IN')} <small style="font-size:0.8rem; font-weight:500;">/ ${isEn ? 'Quintal' : 'క్వింటాల్'}</small></div>
        <ul class="comparison-meta-list">
          <li>• ${isEn ? 'Instant Cash Realization' : 'తక్షణ నగదు లభ్యత'}</li>
          <li>• ${isEn ? 'Warehouse Storage Cost: ₹0' : 'వేర్‌హౌస్ నిల్వ చార్జీలు: ₹0'}</li>
          <li>• ${isEn ? 'Spoilage & Pest Risk: None' : 'వాతావరణం లేదా పురుగుల రిస్క్: లేదు'}</li>
        </ul>
      </div>

      <div class="comparison-card" style="border-color: var(--primary-600); background: #FAFDFB;">
        <div class="comparison-card-title">${isEn ? '2. If Held in TSWC Warehouse for 15 Days' : '2. TSWC గోదాములో 15 రోజులు నిల్వ చేస్తే'}</div>
        <div class="comparison-big-rate" style="color: var(--primary-700);">₹${data.projected15DayPrice.toLocaleString('en-IN')} <small style="font-size:0.8rem; font-weight:500;">/ ${isEn ? 'Quintal' : 'క్వింటాల్'}</small></div>
        <ul class="comparison-meta-list">
          <li>• ${isEn ? 'Projected Price Appreciation:' : 'అంచనా ధర పెరుగుదల:'} <strong>+₹${(data.projected15DayPrice - data.currentMandiPrice).toLocaleString('en-IN')}/Q</strong></li>
          <li>• ${isEn ? 'Govt Warehouse Tariff:' : 'ప్రభుత్వ గోదాము అద్దె:'} <strong>-₹${data.tswcRentPerQ}/Q</strong></li>
          <li style="color: var(--accent-green); font-weight: 700;">• ${isEn ? 'Net Additional Gain:' : 'అదనపు నికర లాభం:'} +₹${data.netGainPerQ.toLocaleString('en-IN')} / ${isEn ? 'Quintal' : 'క్వింటాల్'}</li>
        </ul>
      </div>
    `;
  }

  if (warehouseGrid) {
    const isEn = currentLang === 'en';
    warehouseGrid.innerHTML = data.nearbyTSWC.map(w => `
      <div class="warehouse-card">
        <div class="wh-name">🏛️ ${w.name}</div>
        <div class="wh-dist">📍 ${isEn ? 'Distance from Farm:' : 'మీ పొలం నుండి దూరం:'} <strong>${w.dist}</strong></div>
        <div class="wh-stat-row">
          <span>${isEn ? 'Availability:' : 'లభ్యత:'}</span>
          <strong style="color: #16A34A;">${w.capacity}</strong>
        </div>
        <div class="wh-stat-row">
          <span>${isEn ? 'Govt Storage Rate:' : 'ప్రభుత్వ అద్దె:'}</span>
          <strong>${w.rate}</strong>
        </div>
      </div>
    `).join('');
  }
}

// -----------------------------------------------------------------------------
// TAB 5: ORDERS & ESCROW TRACKER
// -----------------------------------------------------------------------------
function renderOrdersEscrow() {
  const container = document.getElementById('ordersEscrowContainer');
  if (!container) return;

  const orders = window.FarmerDB ? window.FarmerDB.getOrders() : [];
  const isEn = currentLang === 'en';

  if (orders.length === 0) {
    container.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--text-muted);">${isEn ? 'No active escrow orders found.' : 'యాక్టివ్ ఎస్క్రో ఆర్డర్లు ఏవీ లేవు.'}</p>`;
    return;
  }

  container.innerHTML = orders.map(order => {
    const cropTitle = isEn ? (order.cropNameEn || order.cropNameTe) : order.cropNameTe;
    return `
      <div class="order-card" id="order-${order.orderId}">
        <div class="order-header-row">
          <div class="order-id-group">
            <h4>${cropTitle}</h4>
            <span>${isEn ? 'Order ID:' : 'ఆర్డర్ ఐడీ:'} <strong>#${order.orderId}</strong> • ${isEn ? 'Buyer:' : 'కొనుగోలుదారు:'} <strong>${order.buyerName}</strong></span>
          </div>
          <div class="order-escrow-badge">
            🛡️ ${isEn ? 'Secured in Escrow:' : 'ఎస్క్రోలో భద్రంగా ఉంది:'} ₹${Number(order.totalEscrowAmount).toLocaleString('en-IN')}
          </div>
        </div>

        <div class="milestone-stepper">
          <div class="stepper-step ${order.currentStep >= 1 ? 'done' : ''}">
            <div class="step-circle">${order.currentStep > 1 ? '✓' : '1'}</div>
            <div class="step-label">${isEn ? '1. Deal Accepted' : '1. బిడ్ ఆమోదం'}</div>
          </div>
          <div class="stepper-step ${order.currentStep >= 2 ? (order.currentStep > 2 ? 'done' : 'active') : ''}">
            <div class="step-circle">${order.currentStep > 2 ? '✓' : '2'}</div>
            <div class="step-label">${isEn ? '2. Funds Locked' : '2. ఎస్క్రో డిపాజిట్'}</div>
          </div>
          <div class="stepper-step ${order.currentStep >= 3 ? (order.currentStep > 3 ? 'done' : 'active') : ''}">
            <div class="step-circle">${order.currentStep > 3 ? '✓' : '3'}</div>
            <div class="step-label">${isEn ? '3. Truck En Route' : '3. లారీ రాక'}</div>
          </div>
          <div class="stepper-step ${order.currentStep >= 4 ? (order.currentStep > 4 ? 'done' : 'active') : ''}">
            <div class="step-circle">${order.currentStep > 4 ? '✓' : '4'}</div>
            <div class="step-label">${isEn ? '4. Farm-Gate OTP' : '4. పొలం వద్ద OTP'}</div>
          </div>
          <div class="stepper-step ${order.currentStep >= 5 ? 'done' : ''}">
            <div class="step-circle">${order.currentStep >= 5 ? '✓' : '5'}</div>
            <div class="step-label">${isEn ? '5. Payment Released' : '5. బ్యాంక్ చెల్లింపు విడుదల'}</div>
          </div>
        </div>

        <div class="order-footer-details">
          <div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">
              🚛 ${isEn ? 'Assigned Vehicle:' : 'కేటాయించిన వాహనం:'} <strong>${order.vehicleNumber || (isEn ? 'Vehicle being assigned' : 'వాహనం కేటాయించబడుతోంది')}</strong> • ${isEn ? 'Driver:' : 'డ్రైవర్:'} <strong>${order.driverName || (isEn ? 'Nearby driver' : 'సమీప డ్రైవర్')}</strong>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              ⏱️ ${isEn ? 'Estimated Arrival:' : 'రాక సమయం:'} <strong>${order.estimatedArrival || (isEn ? 'To be updated shortly' : 'త్వరలో నిర్ణయించబడుతుంది')}</strong>
            </div>
          </div>

          <div class="order-otp-action-box">
            ${order.currentStep < 5 ? `
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${isEn ? 'Farm-Gate OTP for Driver:' : 'పొలం వద్ద డ్రైవర్‌కు చూపించాల్సిన OTP:'}</span>
                <span class="farm-otp-pill">${order.farmGateOtp}</span>
              </div>
              <button class="btn btn-primary btn-sm" onclick="openOtpVerifyModal('${order.orderId}', '${order.farmGateOtp}')">
                🔓 ${isEn ? 'Verify Loading & OTP' : 'లోడింగ్ ధృవీకరించండి'}
              </button>
            ` : `
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <span style="color: var(--accent-green); font-weight: 700; font-size: 0.95rem;">
                  ✅ ${isEn ? 'Payment Completed' : 'చెల్లింపు పూర్తయింది'}
                </span>
                <button class="btn btn-outline btn-sm" onclick="openEscrowReceiptModal('${order.orderId}')">
                  📄 ${isEn ? 'View Receipt' : 'రశీదు చూడండి'}
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const badge = document.getElementById('activeOrdersBadge');
  if (badge) badge.textContent = `${orders.length} యాక్టివ్`;
}

let pendingVerifyOrderId = null;
let pendingVerifyExpectedOtp = null;

function openOtpVerifyModal(orderId, expectedOtp) {
  pendingVerifyOrderId = orderId;
  pendingVerifyExpectedOtp = expectedOtp;

  const modal = document.getElementById('otpVerifyModal');
  if (!modal) return;

  const input = document.getElementById('inputVerifyOtpCode');
  if (input) {
    input.value = expectedOtp || '';
    input.focus();
  }

  const isEn = (localStorage.getItem('kissan_lang') === 'en');
  const hint = document.getElementById('otpValidationHint');
  if (hint) {
    hint.textContent = expectedOtp ? (isEn ? `Demo OTP: ${expectedOtp} (Auto-filled)` : `డెమో కోడ్: ${expectedOtp} (ఆటో-ఫిల్ చేయబడింది)`) : '';
    hint.style.color = '#166534';
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
}

function closeOtpVerifyModal() {
  const modal = document.getElementById('otpVerifyModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
  pendingVerifyOrderId = null;
  pendingVerifyExpectedOtp = null;
}

function submitOtpVerification() {
  const input = document.getElementById('inputVerifyOtpCode');
  const code = input ? input.value.trim() : '';
  const isEn = (localStorage.getItem('kissan_lang') === 'en');

  if (!code || code.length < 4) {
    const hint = document.getElementById('otpValidationHint');
    if (hint) {
      hint.textContent = isEn ? 'Please enter 4-digit OTP.' : 'దయచేసి 4 అంకెల కోడ్ నమోదు చేయండి.';
      hint.style.color = '#DC2626';
    }
    return;
  }

  if (pendingVerifyExpectedOtp && code !== pendingVerifyExpectedOtp) {
    const hint = document.getElementById('otpValidationHint');
    if (hint) {
      hint.textContent = isEn ? `Incorrect OTP. Correct OTP: ${pendingVerifyExpectedOtp}` : `తప్పు కోడ్. సరైన కోడ్: ${pendingVerifyExpectedOtp}`;
      hint.style.color = '#DC2626';
    }
    return;
  }

  const orderId = pendingVerifyOrderId;
  closeOtpVerifyModal();

  if (orderId) {
    completeDeliveryOtp(orderId);
    openEscrowReceiptModal(orderId);
  }
}

function openEscrowReceiptModal(orderId) {
  const order = window.IntegratedDB ? window.IntegratedDB.getOrders().find(o => o.orderId === orderId) : null;
  const modal = document.getElementById('escrowReceiptModal');
  if (!modal) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const tsEl = document.getElementById('receiptTimestamp');
  if (tsEl) tsEl.textContent = dateStr;

  const idEl = document.getElementById('receiptOrderId');
  if (idEl) idEl.textContent = order ? `#${order.orderId}` : `#${orderId}`;

  const utrEl = document.getElementById('receiptUtrNo');
  if (utrEl) utrEl.textContent = `UTR-RBI-202609-${Math.floor(10000 + Math.random() * 90000)}`;

  if (order) {
    const isEn = (localStorage.getItem('kissan_lang') === 'en');
    const buyerEl = document.getElementById('receiptBuyerName');
    if (buyerEl) buyerEl.textContent = order.buyerName || 'ITC Agri Business Hub';

    const cropEl = document.getElementById('receiptCropTitle');
    if (cropEl) cropEl.textContent = isEn ? (order.cropNameEn || order.cropName || 'Teja Chilli') : (order.cropNameTe || 'తేజ మిర్చి');

    const qtyEl = document.getElementById('receiptQty');
    if (qtyEl) qtyEl.textContent = `${order.quantity || 40} Q`;

    const rateEl = document.getElementById('receiptRate');
    if (rateEl) rateEl.textContent = `₹${Number(order.agreedRate || 21650).toLocaleString('en-IN')}`;

    const total = Number(order.totalEscrowAmount || 866000);
    const baseEl = document.getElementById('receiptBaseAmount');
    if (baseEl) baseEl.textContent = `₹${total.toLocaleString('en-IN')}`;

    const finalEl = document.getElementById('receiptFinalTotal');
    if (finalEl) finalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
}

function closeEscrowReceiptModal() {
  const modal = document.getElementById('escrowReceiptModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
}

function printEscrowReceipt() {
  window.print();
}

function completeDeliveryOtp(orderId) {
  if (window.FarmerDB) {
    window.FarmerDB.completeOtp(orderId);
  }
  renderOrdersEscrow();

  const currentWallet = 148500;
  const newWallet = currentWallet + 866000;
  const walletStr = `₹${newWallet.toLocaleString('en-IN')}`;
  
  const displayWalletEl = document.getElementById('displayWalletAmount');
  if (displayWalletEl) displayWalletEl.innerHTML = `${walletStr} <small>(జమ చేయబడింది)</small>`;
  
  const topDisplayWalletEl = document.getElementById('topDisplayWallet');
  if (topDisplayWalletEl) topDisplayWalletEl.textContent = walletStr;

  showToast(currentLang === 'te'
    ? `💰 అద్భుతం! OTP ధృవీకరించబడింది. డబ్బు తక్షణమే మీ SBI ఖాతాకు బదిలీ చేయబడింది!`
    : `💰 OTP Verified! Money credited into your bank account via instant escrow release!`
  );
}

// -----------------------------------------------------------------------------
// TAB 6: DISPUTE SUBMIT
// -----------------------------------------------------------------------------
function handleDisputeSubmit(e) {
  e.preventDefault();
  const orderId = document.getElementById('disputeOrderSelect').value;
  const type = document.getElementById('disputeType').value;
  const details = document.getElementById('disputeDetails').value;

  const ticket = {
    ticketId: `TS-GRV-${Math.floor(1000 + Math.random() * 9000)}`,
    orderId,
    type,
    details,
    date: new Date().toISOString()
  };

  if (window.FarmerDB) {
    window.FarmerDB.submitDispute(ticket);
  }

  showToast(currentLang === 'te'
    ? `🚨 మీ ఫిర్యాదు నమోదు చేయబడింది (టికెట్ #${ticket.ticketId}). ఎస్క్రో నిధులు సురక్షితంగా తాత్కాలికంగా హోల్డ్ చేయబడ్డాయి.`
    : `🚨 Grievance Ticket #${ticket.ticketId} logged! Escrow funds frozen safely pending review.`
  );

  document.getElementById('disputeDetails').value = '';
}

// Global helper renders
function renderMandiTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const mandis = window.IntegratedDB ? window.IntegratedDB.getMandis() : TELANGANA_MANDIS;

  const itemsHtml = mandis.map(m => `
    <span class="ticker-item">
      <strong>${currentLang === 'te' ? m.nameTe : m.nameEn}</strong>: ${m.crop} 
      <span class="ticker-price">₹${Number(m.price).toLocaleString('en-IN')}</span>
      <span class="ticker-trend ${m.trend}">${m.change}</span>
    </span>
  `).join('');

  track.innerHTML = itemsHtml + itemsHtml; // duplicate for infinite scroll
}

function renderMandiSnapshot() {
  const container = document.getElementById('mandiSnapshotList');
  if (!container) return;
  const mandis = window.IntegratedDB ? window.IntegratedDB.getMandis() : TELANGANA_MANDIS;

  container.innerHTML = mandis.slice(0, 4).map(m => `
    <div class="mandi-item-row">
      <div class="mandi-name-col">
        <strong>${currentLang === 'te' ? m.nameTe : m.nameEn}</strong>
        <small>${m.crop}</small>
      </div>
      <div class="mandi-price-col">
        <span class="mandi-rate">₹${Number(m.price).toLocaleString('en-IN')}</span>
        <span class="mandi-badge ${m.trend}">${m.change}</span>
      </div>
    </div>
  `).join('');
}

// -----------------------------------------------------------------------------
// FEATURE 1: AI CROP QUALITY ASSESSMENT ENGINE
// -----------------------------------------------------------------------------
const AI_CROP_BENCHMARKS = {
  teja_chilli: {
    name: 'తేజ మిర్చి',
    grade: 'A',
    gradeLabelTe: '✓ గ్రేడ్ A (ఎగుమతి ప్రీమియం)',
    moisture: '9.2%',
    moistureText: '9.2% (ఆప్టిమల్ ఎగుమతి రేంజ్ < 10%)',
    moistureBar: '28%',
    colorVal: '98.4%',
    colorText: '98.4% (తీవ్ర ఎరుపు రంగు, షైనింగ్ స్కిన్)',
    colorBar: '98%',
    cleanliness: '99.5%',
    cleanlinessText: '99.5% (మట్టి, తొడిమలు వేరుచేయబడ్డాయి)',
    cleanlinessBar: '99%',
    defectVal: '1.2%',
    defectText: '1.2% (మచ్చలు లేవు - స్వచ్ఛమైన కాయలు)',
    defectBar: '12%',
    premiumTextTe: 'ఈ గ్రేడ్ A సర్టిఫికేట్‌తో ITC మరియు ఎగుమతి వ్యాపారులు క్వింటాలుకు +₹1,150 అధిక ధర చెల్లిస్తారు.',
    premiumPrice: 1150,
    image: '../shared/assets/crops/teja_chilli.jpg'
  },
  paddy: {
    name: 'తెలంగాణ సోనా వరి',
    grade: 'A',
    gradeLabelTe: '✓ గ్రేడ్ A (సూపర్ ఫైన్ RNR)',
    moisture: '12.4%',
    moistureText: '12.4% (మిల్లింగ్ అనుకూల తేమ < 14%)',
    moistureBar: '42%',
    colorVal: '97.2%',
    colorText: '97.2% (బంగారు పసుపు రంగు గింజ)',
    colorBar: '97%',
    cleanliness: '99.1%',
    cleanlinessText: '99.1% (తాలు గింజలు లేవు)',
    cleanlinessBar: '99%',
    defectVal: '1.8%',
    defectText: '1.8% (నూక శాతం అతి తక్కువ)',
    defectBar: '18%',
    premiumTextTe: 'ఈ సూపర్ ఫైన్ సర్టిఫికేట్‌తో మిర్యాలగూడ రైస్ మిల్స్ క్వింటాలుకు +₹120 ప్రీమియం చెల్లిస్తాయి.',
    premiumPrice: 120,
    image: '../shared/assets/crops/paddy.jpg'
  },
  cotton: {
    name: 'పత్తి (Raw Cotton)',
    grade: 'A',
    gradeLabelTe: '✓ గ్రేడ్ A (పొడవు పింజ బ్రహ్మ)',
    moisture: '7.6%',
    moistureText: '7.6% (అత్యంత పొడి పత్తి - సూపర్ డ్రై)',
    moistureBar: '20%',
    colorVal: '99.0%',
    colorText: '99.0% (స్నో వైట్ స్వచ్ఛత)',
    colorBar: '99%',
    cleanliness: '98.6%',
    cleanlinessText: '98.6% (ఆకులు, చెత్త రహితం)',
    cleanlinessBar: '98%',
    defectVal: '1.4%',
    defectText: '1.4% (కాయ మచ్చలు లేవు)',
    defectBar: '14%',
    premiumTextTe: 'ఆదిలాబాద్ CCI మరియు ప్రైవేట్ జిన్నింగ్ మిల్లులు క్వింటాలుకు +₹350 అదనపు ధర చెల్లిస్తాయి.',
    premiumPrice: 350,
    image: '../shared/assets/crops/cotton.jpg'
  },
  turmeric: {
    name: 'నిజామాబాద్ పసుపు',
    grade: 'A',
    gradeLabelTe: '✓ గ్రేడ్ A (కర్క్యుమిన్ 3.8%+)',
    moisture: '8.4%',
    moistureText: '8.4% (బాగా ఎండిన కొమ్ములు)',
    moistureBar: '24%',
    colorVal: '98.8%',
    colorText: '98.8% (గాఢ పసుపు రంగు)',
    colorBar: '98%',
    cleanliness: '99.2%',
    cleanlinessText: '99.2% (మట్టి పూర్తిగా శుభ్రం చేయబడింది)',
    cleanlinessBar: '99%',
    defectVal: '0.8%',
    defectText: '0.8% (పురుగు తొలచని కొమ్ములు)',
    defectBar: '8%',
    premiumTextTe: 'మసాలా కంపెనీలు కర్క్యుమిన్ అధికంగా ఉండటం వల్ల క్వింటాలుకు +₹850 ప్రీమియం చెల్లిస్తాయి.',
    premiumPrice: 850,
    image: '../shared/assets/crops/turmeric.jpg'
  }
};

let lastScannedAiResult = AI_CROP_BENCHMARKS.teja_chilli;

function changeAiScannerSampleCrop() {
  const cropKey = document.getElementById('aiScannerCropSelect').value;
  const data = AI_CROP_BENCHMARKS[cropKey];
  if (!data) return;

  const imgEl = document.getElementById('aiScanImgPreview');
  if (imgEl) imgEl.src = data.image;

  triggerAiQualityScan(false);
}

function handleAiScannerCustomImage(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      document.getElementById('aiScanImgPreview').src = evt.target.result;
      triggerAiQualityScan(true);
    };
    reader.readAsDataURL(file);
  }
}

function triggerAiQualityScan(showSuccessToast = true) {
  const viewport = document.getElementById('aiScannerViewport');
  const btn = document.getElementById('btnTriggerAiScan');
  const cropKey = document.getElementById('aiScannerCropSelect').value;
  const benchmark = AI_CROP_BENCHMARKS[cropKey] || AI_CROP_BENCHMARKS.teja_chilli;

  if (viewport) viewport.classList.add('scanning');
  if (btn) btn.innerHTML = `⏳ <span>కంప్యూటర్ విజన్ స్కాన్ చేస్తోంది...</span>`;

  setTimeout(() => {
    if (viewport) viewport.classList.remove('scanning');
    if (btn) btn.innerHTML = `🔬 <span>AI స్కాన్ ప్రారంభించండి (Scan Now)</span>`;

    lastScannedAiResult = benchmark;

    // Update UI Scorecard
    const gradeBadge = document.getElementById('aiResultGradeBadge');
    if (gradeBadge) gradeBadge.textContent = benchmark.gradeLabelTe;

    const moistureVal = document.getElementById('aiMoistureVal');
    if (moistureVal) moistureVal.textContent = benchmark.moistureText;

    const moistureBar = document.getElementById('aiMoistureBar');
    if (moistureBar) moistureBar.style.width = benchmark.moistureBar;

    const colorVal = document.getElementById('aiColorVal');
    if (colorVal) colorVal.textContent = benchmark.colorText;

    const colorBar = document.getElementById('aiColorBar');
    if (colorBar) colorBar.style.width = benchmark.colorBar;

    const cleanVal = document.getElementById('aiCleanlinessVal');
    if (cleanVal) cleanVal.textContent = benchmark.cleanlinessText;

    const cleanBar = document.getElementById('aiCleanlinessBar');
    if (cleanBar) cleanBar.style.width = benchmark.cleanlinessBar;

    const defectVal = document.getElementById('aiDefectVal');
    if (defectVal) defectVal.textContent = benchmark.defectText;

    const defectBar = document.getElementById('aiDefectBar');
    if (defectBar) defectBar.style.width = benchmark.defectBar;

    const advVal = document.getElementById('aiValuationAdvantage');
    if (advVal) {
      advVal.innerHTML = `ఈ గ్రేడ్ A క్వాలిటీ సర్టిఫికేట్‌తో కొనుగోలుదారులు క్వింటాలుకు <strong>+₹${benchmark.premiumPrice.toLocaleString('en-IN')}</strong> వరకు అధిక ధర చెల్లిస్తారు.`;
    }

    const timeEl = document.getElementById('aiScanTimestamp');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = `స్కాన్ చేయబడిన సమయం: ${now.toLocaleTimeString()} • మోడల్ ఖచ్చితత్వం: 99.4%`;
    }

    if (showSuccessToast) {
      showToast(`✅ AI స్కాన్ విజయవంతం! ${benchmark.name} నాణ్యత: గ్రేడ్ A (${benchmark.moisture} తేమ)`);
    }
  }, 1400);
}

function exportAiQualityToCreateLot() {
  if (!lastScannedAiResult) return;

  const cropKey = document.getElementById('aiScannerCropSelect').value;
  const cropSelect = document.getElementById('cropSelect');
  if (cropSelect) {
    cropSelect.value = cropKey;
    onCropSelected();
  }

  const gradeSelect = document.getElementById('cropGrade');
  if (gradeSelect) gradeSelect.value = lastScannedAiResult.grade;

  calculateDemandAsk();

  switchFarmerTab('createLot');
  showToast(`🎯 AI సర్టిఫైడ్ గ్రేడ్ A & తేమ (${lastScannedAiResult.moisture}) వివరాలు ఫారంలో ఆటో-ఫిల్ చేయబడ్డాయి!`);
}

function runInlineAiQualityScan() {
  const cropKey = document.getElementById('cropSelect').value;
  const benchmark = AI_CROP_BENCHMARKS[cropKey] || AI_CROP_BENCHMARKS.teja_chilli;

  showToast(`🔬 ఫోటో విశ్లేషిస్తోంది... తేమ & గ్రేడ్ గుర్తింపు కొనసాగుతోంది...`, 2000);

  setTimeout(() => {
    const gradeSelect = document.getElementById('cropGrade');
    if (gradeSelect) gradeSelect.value = benchmark.grade;

    calculateDemandAsk();

    showToast(`✅ AI గుర్తింపు: గ్రేడ్ A (తేమ ${benchmark.moisture}). మార్కెట్ రిజర్వ్ ధర నవీకరించబడింది!`);
  }, 1800);
}

// -----------------------------------------------------------------------------
// FEATURE 2: WEATHER & HARVEST RAIN RADAR ENGINE
// -----------------------------------------------------------------------------
const TELANGANA_WEATHER_DATA = {
  warangal: {
    districtTe: 'వరంగల్ & జనగామ పరిసరాలు',
    districtEn: 'Warangal & Jangaon Region',
    temp: 32,
    conditionTe: 'పాక్షిక మేఘావృతం',
    conditionEn: 'Partly Cloudy',
    icon: '⛅',
    humidity: '64%',
    rainChance: '25%',
    dryingIndex: '85%',
    alarmActive: true,
    alarmTitleTe: 'అకాల వర్ష హెచ్చరిక: రాబోయే 36 గంటల్లో వర్ష సూచన!',
    alarmTitleEn: 'Unseasonal Rain Warning: Showers forecast in next 36 hours!',
    alarmDescTe: 'వరంగల్ మరియు జనగామ మండలాల్లో తేలికపాటి నుండి మోస్తరు వర్షాలు మరియు ఈదురుగాలులు వీచే అవకాశం ఉంది. కల్లాలలో ఆరబోసిన తేజ మిర్చి మరియు ధాన్యంపై టార్పాలిన్ పట్టాలు కప్పి భద్రపరచండి.',
    alarmDescEn: 'Light to moderate showers with gusty winds forecast across Warangal and Jangaon mandals. Cover drying chilli and grain heaps with tarpaulins immediately.',
    forecast: [
      { dayTe: 'ఈరోజు', dayEn: 'Today', icon: '⛅', tempMax: 33, tempMin: 23, rain: '20%', dryingClass: 'good', dryingTe: 'అనుకూలం', dryingEn: 'Favorable' },
      { dayTe: 'రేపు', dayEn: 'Tomorrow', icon: '🌧️', tempMax: 29, tempMin: 22, rain: '65%', dryingClass: 'poor', dryingTe: 'రిస్క్ - పట్టాలు కప్పండి', dryingEn: 'Risk - Cover Heaps' },
      { dayTe: 'శుక్రవారం', dayEn: 'Friday', icon: '🌦️', tempMax: 30, tempMin: 22, rain: '45%', dryingClass: 'moderate', dryingTe: 'మితం', dryingEn: 'Moderate' },
      { dayTe: 'శనివారం', dayEn: 'Saturday', icon: '☀️', tempMax: 34, tempMin: 24, rain: '10%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' },
      { dayTe: 'ఆదివారం', dayEn: 'Sunday', icon: '☀️', tempMax: 35, tempMin: 24, rain: '5%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' }
    ]
  },
  khammam: {
    districtTe: 'ఖమ్మం మిర్చి బెల్ట్',
    districtEn: 'Khammam Chilli Belt',
    temp: 34,
    conditionTe: 'ప్రకాశవంతమైన ఎండ',
    conditionEn: 'Sunny & Hot',
    icon: '☀️',
    humidity: '52%',
    rainChance: '10%',
    dryingIndex: '95%',
    alarmActive: false,
    alarmTitleTe: 'వాతావరణం అనుకూలం: అకాల వర్షాల రిస్క్ లేదు',
    alarmTitleEn: 'Optimal Weather: Zero rain risk for drying crops',
    alarmDescTe: 'ఖమ్మం మార్కెట్ యార్డ్ మరియు చుట్టుపక్కల మండలాల్లో పూర్తి ఎండ ఉంది. మిర్చిని కల్లాలలో ఎలాంటి భయం లేకుండా ఆరబోసుకోవచ్చు.',
    alarmDescEn: 'Full sunshine across Khammam market yard and surrounding mandals. Chilli can be dried on yards with zero risk.',
    forecast: [
      { dayTe: 'ఈరోజు', dayEn: 'Today', icon: '☀️', tempMax: 35, tempMin: 24, rain: '10%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' },
      { dayTe: 'రేపు', dayEn: 'Tomorrow', icon: '☀️', tempMax: 36, tempMin: 24, rain: '5%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' },
      { dayTe: 'శుక్రవారం', dayEn: 'Friday', icon: '⛅', tempMax: 34, tempMin: 23, rain: '15%', dryingClass: 'good', dryingTe: 'అనుకూలం', dryingEn: 'Favorable' },
      { dayTe: 'శనివారం', dayEn: 'Saturday', icon: '⛅', tempMax: 33, tempMin: 23, rain: '20%', dryingClass: 'good', dryingTe: 'అనుకూలం', dryingEn: 'Favorable' },
      { dayTe: 'ఆదివారం', dayEn: 'Sunday', icon: '☀️', tempMax: 35, tempMin: 24, rain: '10%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' }
    ]
  },
  nizamabad: {
    districtTe: 'నిజామాబాద్ పసుపు & సోయా హబ్',
    districtEn: 'Nizamabad Turmeric & Soya Hub',
    temp: 31,
    conditionTe: 'మేఘావృతం & తేమ',
    conditionEn: 'Humid Overcast',
    icon: '☁️',
    humidity: '72%',
    rainChance: '40%',
    dryingIndex: '60%',
    alarmActive: true,
    alarmTitleTe: 'తేమ హెచ్చరిక: పసుపు ఉడకబెట్టే ప్రక్రియలో జాగ్రత్తలు',
    alarmTitleEn: 'Moisture Alert: Exercise caution during turmeric curing',
    alarmDescTe: 'గాలిలో తేమ ఎక్కువగా ఉండటం వల్ల నిజామాబాద్ మరియు ఆర్మూర్ ప్రాంతాల్లో పసుపు ఆరడానికి సాధారణం కంటే ఎక్కువ సమయం పడుతుంది.',
    alarmDescEn: 'High humidity in Nizamabad and Armoor requires longer sun-drying durations for boiled turmeric bulbs.',
    forecast: [
      { dayTe: 'ఈరోజు', dayEn: 'Today', icon: '☁️', tempMax: 31, tempMin: 22, rain: '35%', dryingClass: 'moderate', dryingTe: 'మితం', dryingEn: 'Moderate' },
      { dayTe: 'రేపు', dayEn: 'Tomorrow', icon: '🌦️', tempMax: 29, tempMin: 21, rain: '50%', dryingClass: 'poor', dryingTe: 'రిస్క్', dryingEn: 'Risk' },
      { dayTe: 'శుక్రవారం', dayEn: 'Friday', icon: '⛅', tempMax: 32, tempMin: 22, rain: '25%', dryingClass: 'good', dryingTe: 'అనుకూలం', dryingEn: 'Favorable' },
      { dayTe: 'శనివారం', dayEn: 'Saturday', icon: '☀️', tempMax: 33, tempMin: 23, rain: '10%', dryingClass: 'good', dryingTe: 'మంచిది', dryingEn: 'Good' },
      { dayTe: 'ఆదివారం', dayEn: 'Sunday', icon: '☀️', tempMax: 34, tempMin: 23, rain: '10%', dryingClass: 'good', dryingTe: 'మంచిది', dryingEn: 'Good' }
    ]
  },
  nalgonda: {
    districtTe: 'మిర్యాలగూడ & సూర్యాపేట వరి ప్రాంతం',
    districtEn: 'Miryalaguda & Suryapet Paddy Belt',
    temp: 33,
    conditionTe: 'ఎండ & స్థిరమైన గాలి',
    conditionEn: 'Sunny & Breeze',
    icon: '☀️',
    humidity: '58%',
    rainChance: '15%',
    dryingIndex: '90%',
    alarmActive: false,
    alarmTitleTe: 'వరి కోతలకు అత్యంత అనుకూల వాతావరణం',
    alarmTitleEn: 'Ideal Weather for Paddy Harvesting & Threshing',
    alarmDescTe: 'మిర్యాలగూడ యార్డులో వరి కోత మరియు కల్లాలు ఆరబెట్టడానికి వాతావరణం చాలా అనుకూలంగా ఉంది. తేమ త్వరగా తగ్గుతుంది.',
    alarmDescEn: 'Dry breeze in Miryalaguda allows quick moisture reduction down to fair average quality standards.',
    forecast: [
      { dayTe: 'ఈరోజు', dayEn: 'Today', icon: '☀️', tempMax: 34, tempMin: 23, rain: '10%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' },
      { dayTe: 'రేపు', dayEn: 'Tomorrow', icon: '☀️', tempMax: 34, tempMin: 23, rain: '15%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' },
      { dayTe: 'శుక్రవారం', dayEn: 'Friday', icon: '⛅', tempMax: 33, tempMin: 22, rain: '20%', dryingClass: 'good', dryingTe: 'అనుకూలం', dryingEn: 'Favorable' },
      { dayTe: 'శనివారం', dayEn: 'Saturday', icon: '☀️', tempMax: 35, tempMin: 24, rain: '5%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' },
      { dayTe: 'ఆదివారం', dayEn: 'Sunday', icon: '☀️', tempMax: 35, tempMin: 24, rain: '5%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' }
    ]
  },
  adilabad: {
    districtTe: 'ఆదిలాబాద్ కాటన్ జోన్',
    districtEn: 'Adilabad Cotton Zone',
    temp: 30,
    conditionTe: 'పొడి వాతావరణం & ఆహ్లాదకరమైన గాలి',
    conditionEn: 'Dry & Pleasant Breeze',
    icon: '🌤️',
    humidity: '48%',
    rainChance: '10%',
    dryingIndex: '92%',
    alarmActive: false,
    alarmTitleTe: 'పత్తి తీతకు అత్యంత అనుకూలం',
    alarmTitleEn: 'Ideal Conditions for Cotton Picking',
    alarmDescTe: 'పత్తి కాయల్లో తేమ 8% లోపు ఉండటానికి పొడి వాతావరణం దోహదపడుతుంది. జిన్నింగ్ మిల్లులు ప్రీమియం చెల్లిస్తాయి.',
    alarmDescEn: 'Dry sunny atmosphere ensures cotton lint moisture remains strictly below 8% for top ginning premium.',
    forecast: [
      { dayTe: 'ఈరోజు', dayEn: 'Today', icon: '🌤️', tempMax: 31, tempMin: 20, rain: '5%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' },
      { dayTe: 'రేపు', dayEn: 'Tomorrow', icon: '☀️', tempMax: 32, tempMin: 21, rain: '5%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' },
      { dayTe: 'శుక్రవారం', dayEn: 'Friday', icon: '☀️', tempMax: 32, tempMin: 21, rain: '10%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' },
      { dayTe: 'శనివారం', dayEn: 'Saturday', icon: '⛅', tempMax: 31, tempMin: 20, rain: '15%', dryingClass: 'good', dryingTe: 'అనుకూలం', dryingEn: 'Favorable' },
      { dayTe: 'ఆదివారం', dayEn: 'Sunday', icon: '☀️', tempMax: 33, tempMin: 21, rain: '5%', dryingClass: 'good', dryingTe: 'చాలా మంచిది', dryingEn: 'Very Good' }
    ]
  }
};

let currentFarmerGpsLocation = null;
let tempKycUploads = {};
window.lastVerifiedIfscData = null;

const WMO_CODE_MAP = {
  0: { descTe: 'స్పష్టమైన ఆకాశం', descEn: 'Clear Sky', icon: '☀️', dryingTe: 'చాలా మంచిది (95%)', dryingEn: 'Very Good (95%)', dryClass: 'good' },
  1: { descTe: 'ప్రధానంగా నిర్మలమైన ఆకాశం', descEn: 'Mainly Clear', icon: '🌤️', dryingTe: 'అనుకూలం (90%)', dryingEn: 'Favorable (90%)', dryClass: 'good' },
  2: { descTe: 'పాక్షిక మేఘావృతం', descEn: 'Partly Cloudy', icon: '⛅', dryingTe: 'మంచిది (85%)', dryingEn: 'Good (85%)', dryClass: 'good' },
  3: { descTe: 'పూర్తి మేఘావృతం', descEn: 'Overcast', icon: '☁️', dryingTe: 'మితం (60%)', dryingEn: 'Moderate (60%)', dryClass: 'moderate' },
  45: { descTe: 'పొగమంచు', descEn: 'Foggy', icon: '🌫️', dryingTe: 'మితం (50%)', dryingEn: 'Moderate (50%)', dryClass: 'moderate' },
  48: { descTe: 'తేమతో కూడిన పొగమంచు', descEn: 'Depositing Rime Fog', icon: '🌫️', dryingTe: 'తక్కువ (45%)', dryingEn: 'Low (45%)', dryClass: 'poor' },
  51: { descTe: 'తేలికపాటి చిరుజల్లులు', descEn: 'Light Drizzle', icon: '🌦️', dryingTe: 'రిస్క్ - పట్టాలు కప్పండి', dryingEn: 'Risk - Cover Heaps', dryClass: 'poor' },
  53: { descTe: 'మోస్తరు చినుకులు', descEn: 'Moderate Drizzle', icon: '🌦️', dryingTe: 'రిస్క్ - పట్టాలు కప్పండి', dryingEn: 'Risk - Cover Heaps', dryClass: 'poor' },
  55: { descTe: 'దట్టమైన చిరుజల్లులు', descEn: 'Dense Drizzle', icon: '🌧️', dryingTe: 'రిస్క్ - పట్టాలు కప్పండి', dryingEn: 'Risk - Cover Heaps', dryClass: 'poor' },
  61: { descTe: 'తేలికపాటి వర్షం', descEn: 'Slight Rain', icon: '🌧️', dryingTe: 'ప్రమాదం - కల్లాలు కప్పండి', dryingEn: 'Danger - Cover Drying Yard', dryClass: 'poor' },
  63: { descTe: 'మోస్తరు వర్షం', descEn: 'Moderate Rain', icon: '🌧️', dryingTe: 'ప్రమాదం - కల్లాలు కప్పండి', dryingEn: 'Danger - Cover Drying Yard', dryClass: 'poor' },
  65: { descTe: 'భారీ వర్షం', descEn: 'Heavy Rain', icon: '⛈️', dryingTe: 'అత్యంత ప్రమాదం', dryingEn: 'Severe Risk - Evacuate Yard', dryClass: 'poor' },
  80: { descTe: 'వర్షపు జల్లులు', descEn: 'Rain Showers', icon: '🌦️', dryingTe: 'రిస్క్', dryingEn: 'Risk', dryClass: 'poor' },
  81: { descTe: 'మోస్తరు వర్షపు జల్లులు', descEn: 'Moderate Showers', icon: '🌧️', dryingTe: 'ప్రమాదం', dryingEn: 'Danger', dryClass: 'poor' },
  82: { descTe: 'ఈదురుగాలులతో భారీ వర్షం', descEn: 'Violent Showers', icon: '⛈️', dryingTe: 'అత్యంత ప్రమాదం', dryingEn: 'Severe Risk', dryClass: 'poor' },
  95: { descTe: 'ఉరుములు, మెరుపులతో కూడిన తుఫాను', descEn: 'Thunderstorm', icon: '⚡', dryingTe: 'కల్లాలు పూర్తిగా భద్రపరచండి', dryingEn: 'Secure Produce Completely', dryClass: 'poor' }
};

// -----------------------------------------------------------------------------
// REAL-TIME BROWSER GEOLOCATION ENGINE
// -----------------------------------------------------------------------------
function initRealTimeLocationEngine() {
  const banner = document.getElementById('realtimeLocationBanner');
  if (banner) banner.style.display = 'flex';

  // Ask for browser real-time GPS location immediately
  requestRealTimeLocation(false);
}

function requestRealTimeLocation(isUserInitiated = false) {
  const topLocText = document.getElementById('topLocationCleanText');
  if (topLocText && isUserInitiated) topLocText.textContent = '📍 GPS శోధిస్తోంది...';

  if (!navigator.geolocation) {
    if (topLocText) topLocText.textContent = 'జనగామ, వరంగల్';
    if (isUserInitiated) showToast('⚠️ మీ బ్రౌజర్ GPS లొకేషన్‌ను సపోర్ట్ చేయడం లేదు.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      await handleGeolocationSuccess(pos);
    },
    (err) => {
      handleGeolocationError(err, isUserInitiated);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}

async function handleGeolocationSuccess(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const accuracy = Math.round(position.coords.accuracy);

  console.log(`[GPS] Real-time browser location: ${lat}, ${lon} (±${accuracy}m)`);

  let town = 'వరంగల్ / జనగామ';
  let mandal = 'జనగామ రూరల్';
  let district = 'జనగామ';
  let state = 'తెలంగాణ';
  let postcode = '506167';

  // Reverse geocoding via OpenStreetMap Nominatim Live API
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        town = data.address.village || data.address.suburb || data.address.town || data.address.city_district || data.address.city || data.name || town;
        mandal = data.address.county || data.address.subdistrict || data.address.state_district || mandal;
        district = data.address.state_district || data.address.county || data.address.district || district;
        state = data.address.state || state;
        postcode = data.address.postcode || postcode;
      }
    }
  } catch (err) {
    console.warn('[GPS] Nominatim reverse geocoding fallback:', err);
  }

  currentFarmerGpsLocation = {
    lat,
    lon,
    accuracy,
    town,
    mandal,
    district,
    state,
    postcode
  };

  // Update Clean Top Navbar Location Pill
  const topLocClean = document.getElementById('topLocationCleanText');
  if (topLocClean) {
    topLocClean.textContent = `${town}, ${district}`;
  }

  // Update Clean Farmer Name Pill
  const topFarmerName = document.getElementById('topCleanFarmerName');
  if (topFarmerName) {
    topFarmerName.textContent = 'మల్లారెడ్డి (Farmer)';
  }

  // Update sidebar profile location
  const villageEl = document.querySelector('.sidebar-profile-text .farmer-village');
  if (villageEl) {
    villageEl.textContent = `📍 ${town}, ${district}`;
  }

  // Update Live GPS option in Weather dropdown
  const optLive = document.getElementById('optLiveGps');
  if (optLive) {
    optLive.textContent = `📍 నా ప్రత్యక్ష GPS లొకేషన్ (${town}, ${district})`;
  }

  // Automatically fetch live weather from Open-Meteo for these exact coordinates
  await fetchRealTimeWeather(lat, lon, town, district, accuracy);
}

function handleGeolocationError(err, isUserInitiated) {
  console.warn('[GPS] Geolocation error/declined:', err);
  const topLocClean = document.getElementById('topLocationCleanText');
  if (topLocClean && (!topLocClean.textContent || topLocClean.textContent.includes('...'))) {
    topLocClean.textContent = 'జనగామ, వరంగల్';
  }

  if (isUserInitiated) {
    showToast('⚠️ లొకేషన్ యాక్సెస్ తిరస్కరించబడింది లేదా అందుబాటులో లేదు. డిఫాల్ట్ తెలంగాణ వాతావరణం లోడ్ చేయబడింది.');
  }

  // Fallback to default district weather
  updateWeatherDistrictUI();
}

function toggleLocationDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('locationDropdownMenu');
  const notifMenu = document.getElementById('notifDropdownMenu');
  const profileMenu = document.getElementById('profileDropdownMenu');
  if (notifMenu) notifMenu.style.display = 'none';
  if (profileMenu) profileMenu.style.display = 'none';

  if (menu) {
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
}

function toggleNotifDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('notifDropdownMenu');
  const locMenu = document.getElementById('locationDropdownMenu');
  const profileMenu = document.getElementById('profileDropdownMenu');
  if (locMenu) locMenu.style.display = 'none';
  if (profileMenu) profileMenu.style.display = 'none';

  if (menu) {
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
}

function toggleProfileDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('profileDropdownMenu');
  const locMenu = document.getElementById('locationDropdownMenu');
  const notifMenu = document.getElementById('notifDropdownMenu');
  if (locMenu) locMenu.style.display = 'none';
  if (notifMenu) notifMenu.style.display = 'none';

  if (menu) {
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
}

function selectPresetDistrict(distKey, placeName, stateName) {
  const cityEl = document.getElementById('topLocationCity');
  const stateEl = document.getElementById('topLocationState');
  if (cityEl) cityEl.textContent = placeName;
  if (stateEl) stateEl.textContent = stateName || 'Telangana';

  const menu = document.getElementById('locationDropdownMenu');
  if (menu) menu.style.display = 'none';

  // Update weather district select if it matches
  const weatherSelect = document.getElementById('weatherDistrictSelect');
  if (weatherSelect) {
    weatherSelect.value = distKey;
    updateWeatherDistrictUI();
  }

  showToast(`📍 లొకేషన్ మార్చబడింది: ${placeName}`);
}

function togglePortalLanguage() {
  const nextLang = currentLang === 'te' ? 'en' : 'te';
  setLanguage(nextLang);
  const tag = document.getElementById('currentLangTag');
  if (tag) tag.textContent = nextLang === 'te' ? 'తెలుగు' : 'English';
}

// Close all header dropdowns when clicking anywhere outside
document.addEventListener('click', (e) => {
  const locMenu = document.getElementById('locationDropdownMenu');
  const notifMenu = document.getElementById('notifDropdownMenu');
  const profileMenu = document.getElementById('profileDropdownMenu');
  if (locMenu && !e.target.closest('#headerLocWidget')) locMenu.style.display = 'none';
  if (notifMenu && !e.target.closest('#headerNotifWidget')) notifMenu.style.display = 'none';
  if (profileMenu && !e.target.closest('#headerProfileWidget')) profileMenu.style.display = 'none';
});

// -----------------------------------------------------------------------------
// REAL-TIME WEATHER RADAR VIA OPEN-METEO
// -----------------------------------------------------------------------------
async function fetchRealTimeWeather(lat, lon, placeName, district, accuracy = 15) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();

    const current = data.current_weather;
    const weatherInfo = WMO_CODE_MAP[current.weathercode] || WMO_CODE_MAP[2];

    let humidity = 62;
    if (data.hourly && data.hourly.relativehumidity_2m && data.hourly.relativehumidity_2m.length > 0) {
      humidity = data.hourly.relativehumidity_2m[0];
    }

    let rainChance = 15;
    if (data.daily && data.daily.precipitation_probability_max && data.daily.precipitation_probability_max.length > 0) {
      rainChance = data.daily.precipitation_probability_max[0];
    }

    // Update Weather Hero UI
    const locNameEl = document.getElementById('weatherLocationName');
    if (locNameEl) locNameEl.textContent = `${placeName} (${district})`;

    const sourceEl = document.getElementById('weatherDataSourceText');
    if (sourceEl) sourceEl.textContent = `ప్రత్యక్ష GPS కేంద్రం (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E) • లైవ్ శాటిలైట్ డేటా`;

    const condEl = document.getElementById('weatherCondText');
    if (condEl) condEl.textContent = `${weatherInfo.icon} ${weatherInfo.desc}`;

    const iconEl = document.getElementById('weatherMainIcon');
    if (iconEl) iconEl.textContent = weatherInfo.icon;

    const tempEl = document.getElementById('weatherTempNum');
    if (tempEl) tempEl.textContent = Math.round(current.temperature);

    const humEl = document.getElementById('weatherHumidity');
    if (humEl) humEl.textContent = `${humidity}%`;

    const rainEl = document.getElementById('weatherRainChance');
    if (rainEl) rainEl.textContent = `${rainChance}% (${rainChance > 40 ? 'ఎక్కువ' : 'తక్కువ'})`;

    const dryEl = document.getElementById('weatherDryingIndex');
    if (dryEl) {
      dryEl.textContent = weatherInfo.drying;
      dryEl.style.color = weatherInfo.dryClass === 'good' ? '#86EFAC' : (weatherInfo.dryClass === 'moderate' ? '#FCD34D' : '#FCA5A5');
    }

    // Update GPS Station Meta Bar
    const coordsEl = document.getElementById('weatherGpsCoords');
    if (coordsEl) coordsEl.textContent = `${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`;

    const accEl = document.getElementById('weatherGpsAccuracy');
    if (accEl) accEl.textContent = `±${accuracy} మీటర్లు`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const syncEl = document.getElementById('weatherGpsSyncTime');
    if (syncEl) syncEl.textContent = `సమకాలీకరించబడింది: ${timeStr}`;

    // Rain Alarm Logic
    const alarmBanner = document.getElementById('rainAlarmBanner');
    const alarmTitle = document.getElementById('weatherAlarmTitle');
    const alarmDesc = document.getElementById('weatherAlarmDesc');
    if (alarmBanner && alarmTitle && alarmDesc) {
      if (rainChance >= 40) {
        alarmBanner.style.display = 'flex';
        alarmBanner.style.background = '#FEF2F2';
        alarmBanner.style.borderColor = '#FCA5A5';
        alarmTitle.textContent = `అకాల వర్ష హెచ్చరిక: ${placeName} పరిసరాల్లో ${rainChance}% వర్ష సూచన!`;
        alarmDesc.textContent = `రాబోయే 24-48 గంటల్లో చిరుజల్లులు లేదా మోస్తరు వర్షం పడే అవకాశం ఉంది. కల్లాలలో ఆరబోసిన పంటలపై వెంటనే టార్పాలిన్ పట్టాలు కప్పండి.`;
      } else {
        alarmBanner.style.display = 'flex';
        alarmBanner.style.background = '#F0FDF4';
        alarmBanner.style.borderColor = '#86EFAC';
        alarmTitle.style.color = '#166534';
        alarmDesc.style.color = '#14532D';
        alarmTitle.textContent = `వాతావరణం అనుకూలంగా ఉంది: ${placeName} కల్లాలలో ఎండ సమృద్ధిగా ఉంది`;
        alarmDesc.textContent = `వర్ష సూచన తక్కువ (${rainChance}%). మిర్చి, పసుపు, ధాన్యం ఎండబెట్టు ప్రక్రియకు వాతావరణం చాలా అనుకూలం.`;
      }
    }

    // 5-Day Forecast Grid from Live Daily Data
    const forecastGrid = document.getElementById('forecastDaysGrid');
    if (forecastGrid && data.daily && data.daily.time) {
      const daysTe = ['ఆదివారం', 'సోమవారం', 'మంగళవారం', 'బుధవారం', 'గురువారం', 'శుక్రవారం', 'శనివారం'];
      forecastGrid.innerHTML = data.daily.time.slice(0, 5).map((dateStr, idx) => {
        const dateObj = new Date(dateStr);
        const dayLabel = idx === 0 ? 'ఈరోజు' : (idx === 1 ? 'రేపు' : daysTe[dateObj.getDay()]);
        const wCode = data.daily.weathercode ? data.daily.weathercode[idx] : 1;
        const info = WMO_CODE_MAP[wCode] || WMO_CODE_MAP[1];
        const tMax = Math.round(data.daily.temperature_2m_max[idx]);
        const tMin = Math.round(data.daily.temperature_2m_min[idx]);
        const rProb = data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[idx] : 10;
        const curLang = localStorage.getItem('kissan_lang') || 'te';
        const isEn = curLang === 'en';

        return `
          <div class="forecast-day-card">
            <div class="forecast-day-name">${dayLabel}</div>
            <div class="forecast-day-icon">${info.icon}</div>
            <div class="forecast-temp-range">${tMax}° / ${tMin}°C</div>
            <div style="font-size:0.75rem; color:var(--text-light); margin-top:0.25rem;">${isEn ? 'Rain' : 'వర్షం'}: ${rProb}%</div>
            <span class="forecast-drying-pill ${info.dryClass}">${info.desc.split(' ')[0]}</span>
          </div>
        `;
      }).join('');
    }

    const curLang = localStorage.getItem('kissan_lang') || 'te';
    showToast(curLang === 'en' ? `🌦️ Live Weather: ${placeName} (${Math.round(current.temperature)}°C)` : `🌦️ ప్రత్యక్ష వాతావరణం: ${placeName} (${Math.round(current.temperature)}°C)`);
  } catch (err) {
    console.warn('[Weather] Open-Meteo fetch failed:', err);
  }
}

function updateWeatherDistrictUI() {
  const currentLang = localStorage.getItem('kissan_lang') || 'te';
  const isEn = currentLang === 'en';
  const select = document.getElementById('weatherDistrictSelect');
  if (!select) return;
  const distKey = select.value;

  if (distKey === 'live_gps') {
    if (currentFarmerGpsLocation) {
      fetchRealTimeWeather(
        currentFarmerGpsLocation.lat,
        currentFarmerGpsLocation.lon,
        currentFarmerGpsLocation.town,
        currentFarmerGpsLocation.district,
        currentFarmerGpsLocation.accuracy
      );
    } else {
      requestRealTimeLocation(true);
    }
    return;
  }

  const data = TELANGANA_WEATHER_DATA[distKey] || TELANGANA_WEATHER_DATA.warangal;

  const locEl = document.getElementById('weatherLocationName');
  if (locEl) locEl.textContent = isEn ? (data.districtEn || data.districtTe) : data.districtTe;

  const sourceEl = document.getElementById('weatherDataSourceText');
  if (sourceEl) sourceEl.textContent = isEn ? 'Telangana Agro-Weather Center • District Forecast' : 'తెలంగాణ వ్యవసాయ వాతావరణ కేంద్రం • జిల్లా స్థాయి సూచన';

  const condEl = document.getElementById('weatherCondText');
  if (condEl) condEl.textContent = `${data.icon} ${isEn ? (data.conditionEn || data.conditionTe) : data.conditionTe}`;

  const iconEl = document.getElementById('weatherMainIcon');
  if (iconEl) iconEl.textContent = data.icon;

  const tempEl = document.getElementById('weatherTempNum');
  if (tempEl) tempEl.textContent = `${data.temp}°`;

  const humEl = document.getElementById('weatherHumidity');
  if (humEl) humEl.textContent = data.humidity;

  const rainEl = document.getElementById('weatherRainChance');
  if (rainEl) rainEl.textContent = data.rainChance;

  const dryEl = document.getElementById('weatherDryingIndex');
  if (dryEl) dryEl.textContent = isEn ? (data.dryingIndexEn || data.dryingIndex) : data.dryingIndex;

  // Alarm Banner
  const alarmBanner = document.getElementById('rainAlarmBanner');
  const alarmTitle = document.getElementById('weatherAlarmTitle');
  const alarmDesc = document.getElementById('weatherAlarmDesc');
  if (alarmBanner && alarmTitle && alarmDesc) {
    if (data.alarmActive) {
      alarmBanner.style.display = 'flex';
      alarmBanner.style.background = '#FEF2F2';
      alarmBanner.style.borderColor = '#FCA5A5';
      alarmTitle.textContent = isEn ? (data.alarmTitleEn || data.alarmTitleTe) : data.alarmTitleTe;
      alarmDesc.textContent = isEn ? (data.alarmDescEn || data.alarmDescTe) : data.alarmDescTe;
    } else {
      alarmBanner.style.display = 'flex';
      alarmBanner.style.background = '#F0FDF4';
      alarmBanner.style.borderColor = '#86EFAC';
      alarmTitle.style.color = '#166534';
      alarmDesc.style.color = '#14532D';
      alarmTitle.textContent = isEn ? (data.alarmTitleEn || data.alarmTitleTe) : data.alarmTitleTe;
      alarmDesc.textContent = isEn ? (data.alarmDescEn || data.alarmDescTe) : data.alarmDescTe;
    }
  }

  // 5-Day Forecast Grid
  const forecastGrid = document.getElementById('forecastDaysGrid');
  if (forecastGrid) {
    forecastGrid.innerHTML = data.forecast.map(f => `
      <div class="forecast-day-card">
        <div class="forecast-day-name">${isEn ? (f.dayEn || f.dayTe) : f.dayTe}</div>
        <div class="forecast-day-icon">${f.icon}</div>
        <div class="forecast-temp-range">${f.tempMax}° / ${f.tempMin}°C</div>
        <div style="font-size:0.75rem; color:var(--text-light); margin-top:0.25rem;">${isEn ? 'Rain' : 'వర్షం'}: ${f.rain}</div>
        <span class="forecast-drying-pill ${f.dryingClass}">${isEn ? (f.dryingEn || f.dryingTe) : f.dryingTe}</span>
      </div>
    `).join('');
  }
}

// -----------------------------------------------------------------------------
// REAL-TIME LIVE IFSC API LOOKUP (RAZORPAY LIVE)
// -----------------------------------------------------------------------------
let ifscDebounceTimer = null;

function handleIfscInput(input) {
  input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const val = input.value;
  clearTimeout(ifscDebounceTimer);

  if (val.length === 11) {
    ifscDebounceTimer = setTimeout(() => {
      verifyIfscCodeRealTime(val);
    }, 250);
  } else {
    const hint = document.getElementById('ifscFetchStatusHint');
    if (hint) hint.textContent = `11 అక్షరాల IFSC కోడ్ నమోదు చేయండి (${val.length}/11)`;
    const box = document.getElementById('liveBankDetailsBox');
    if (box) box.style.display = 'none';
  }
}

function triggerManualIfscFetch() {
  const input = document.getElementById('inputBankIfsc');
  if (input && input.value) {
    verifyIfscCodeRealTime(input.value.trim().toUpperCase());
  }
}

async function verifyIfscCodeRealTime(ifsc) {
  const hint = document.getElementById('ifscFetchStatusHint');
  const box = document.getElementById('liveBankDetailsBox');

  if (!ifsc || ifsc.length !== 11) {
    if (hint) hint.textContent = 'దయచేసి సరైన 11 అంకెల IFSC కోడ్‌ను నమోదు చేయండి.';
    return;
  }

  if (hint) hint.innerHTML = '⏳ <em>Razorpay Live IFSC API నుండి బ్యాంకు వివరాలు శోధిస్తోంది...</em>';

  try {
    const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
    if (!res.ok) {
      throw new Error('IFSC Not Found');
    }
    const data = await res.json();

    if (box) box.style.display = 'block';
    const nameEl = document.getElementById('liveBankName');
    if (nameEl) nameEl.textContent = data.BANK || 'Bank';

    const branchEl = document.getElementById('liveBankBranch');
    if (branchEl) branchEl.textContent = data.BRANCH || '';

    const cityEl = document.getElementById('liveBankCity');
    if (cityEl) cityEl.textContent = `${data.CITY || data.CENTRE || ''}, ${data.DISTRICT || ''}`;

    const stateEl = document.getElementById('liveBankState');
    if (stateEl) stateEl.textContent = data.STATE || 'Telangana';

    const codeTagEl = document.getElementById('liveBankCodeTag');
    if (codeTagEl) codeTagEl.textContent = data.BANKCODE || ifsc.substring(0, 4);

    const impsEl = document.getElementById('liveModeImps');
    if (impsEl) impsEl.textContent = `IMPS: ${data.IMPS ? '✓' : '✗'}`;

    const neftEl = document.getElementById('liveModeNeft');
    if (neftEl) neftEl.textContent = `NEFT: ${data.NEFT ? '✓' : '✗'}`;

    const rtgsEl = document.getElementById('liveModeRtgs');
    if (rtgsEl) rtgsEl.textContent = `RTGS: ${data.RTGS ? '✓' : '✗'}`;

    const upiEl = document.getElementById('liveModeUpi');
    if (upiEl) upiEl.textContent = `UPI: ${data.UPI ? '✓' : '✗'}`;

    if (hint) hint.innerHTML = `✅ <strong style="color:#166534;">${data.BANK} (${data.BRANCH})</strong> ధృవీకరించబడింది!`;

    window.lastVerifiedIfscData = data;
    showToast(`✅ లైవ్ IFSC ధృవీకరణ: ${data.BANK} (${data.BRANCH})`);
  } catch (err) {
    if (box) box.style.display = 'none';
    if (hint) hint.innerHTML = `❌ <span style="color:#DC2626;">అపరిచిత IFSC కోడ్. దయచేసి సరైన కోడ్ నమోదు చేయండి.</span>`;
    window.lastVerifiedIfscData = null;
  }
}

// -----------------------------------------------------------------------------
// REAL-TIME DOCUMENT INPUT FORMATTERS
// -----------------------------------------------------------------------------
function formatAadhaarInput(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 12);
  let formatted = '';
  for (let i = 0; i < val.length; i++) {
    if (i > 0 && i % 4 === 0) formatted += ' ';
    formatted += val[i];
  }
  input.value = formatted;
  const hint = document.getElementById('aadhaarValidHint');
  if (hint) {
    if (val.length === 12) {
      hint.innerHTML = '<span style="color:#166534; font-weight:700;">✓ 12 అంకెల ఆధార్ ఫార్మాట్ సరైనది</span>';
    } else {
      hint.textContent = `UIDAI 12 అంకెల నంబర్ (${val.length}/12)`;
    }
  }
}

function formatPanInput(input) {
  let val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
  input.value = val;
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const hint = document.getElementById('panValidHint');
  if (hint) {
    if (regex.test(val)) {
      hint.innerHTML = '<span style="color:#166534; font-weight:700;">✓ సరైన వ్యక్తిగత PAN ఫార్మాట్ (Income Tax Valid)</span>';
    } else {
      hint.textContent = 'ఫార్మాట్: 5 అక్షరాలు + 4 అంకెలు + 1 అక్షరం (ఉదా: ABCDE1234F)';
    }
  }
}

function checkBankAccMatch() {
  const p1 = document.getElementById('inputBankAccNumber');
  const p2 = document.getElementById('inputBankAccConfirm');
  const hint = document.getElementById('accMatchHint');
  if (!p1 || !p2 || !hint) return;
  if (!p2.value) {
    hint.textContent = '';
    return;
  }
  if (p1.value === p2.value) {
    hint.innerHTML = '<span style="color:#166534; font-weight:700;">✓ ఖాతా నంబర్లు సరిపోలాయి</span>';
  } else {
    hint.innerHTML = '<span style="color:#DC2626;">⚠️ ఖాతా నంబర్లు సరిపోలలేదు</span>';
  }
}

// -----------------------------------------------------------------------------
// REAL-TIME 5-DOCUMENT KYC MANAGEMENT WITH LOCALSTORAGE PERSISTENCE
// -----------------------------------------------------------------------------
const KYC_STORAGE_KEY = 'kissan_farmer_kyc_docs';

function getStoredKycDocs() {
  try {
    const raw = localStorage.getItem(KYC_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  // Initial pre-loaded state for farmer Malla Reddy
  const initialDocs = {
    aadhaar: {
      number: '9848 5521 5210',
      fileName: 'aadhaar_malla_reddy.pdf',
      fileSize: '345 KB',
      date: '2026-09-10 11:30',
      fileData: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600',
      verified: true
    },
    dharani: {
      passbookNo: 'T19020149021',
      surveyNos: '284/A, 284/B',
      landExtent: '4 ఎకరాల 20 గుంటలు',
      location: 'జనగామ రూరల్, జనగామ జిల్లా',
      fileName: 'dharani_passbook_scan.pdf',
      fileSize: '1.4 MB',
      date: '2026-09-10 11:32',
      fileData: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600',
      verified: true
    },
    bank: {
      accHolder: 'మల్లారెడ్డి (Malla Reddy)',
      accNumber: '382910482910',
      ifsc: 'SBIN0020194',
      bankName: 'State Bank of India',
      branch: 'Jangaon Main',
      city: 'Jangaon, Warangal',
      fileName: 'sbi_passbook_page1.jpg',
      fileSize: '412 KB',
      date: '2026-09-10 11:35',
      fileData: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600',
      verified: true
    },
    pan: {
      panNumber: 'BMVPR4821K',
      fileName: 'pan_card_malla.jpg',
      fileSize: '280 KB',
      date: '2026-09-10 11:38',
      fileData: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
      verified: true
    },
    location_proof: {
      proofType: 'electricity',
      serviceNo: '1029482710',
      consumerName: 'మల్లారెడ్డి (Malla Reddy)',
      address: 'జనగామ రూరల్, వరంగల్/జనగామ జిల్లా',
      fileName: 'tsnpdcl_power_bill.pdf',
      fileSize: '490 KB',
      date: '2026-09-10 11:40',
      fileData: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=600',
      verified: true
    }
  };

  localStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(initialDocs));
  return initialDocs;
}

function saveStoredKycDocs(docs) {
  try {
    localStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error('Storage quota exceeded:', e);
  }
}

function handleDocFileChange(e, docType) {
  const file = e.target.files[0];
  if (!file) return;

  const label = document.getElementById(`labelFile${docType.charAt(0).toUpperCase() + docType.slice(1)}`);
  if (label) {
    label.innerHTML = `📄 <strong>${file.name}</strong> (${(file.size / 1024).toFixed(0)} KB)`;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    tempKycUploads[docType] = {
      fileData: evt.target.result,
      fileName: file.name,
      fileSize: (file.size / 1024 > 1024) ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`,
      fileType: file.type
    };
    showToast(`📎 "${file.name}" పత్రం అప్‌లోడ్ చేయడానికి సిద్ధంగా ఉంది!`);
  };
  reader.readAsDataURL(file);
}

function renderKycDocumentsStatus() {
  const currentLang = localStorage.getItem('kissan_lang') || 'te';
  const isEn = currentLang === 'en';
  const docs = getStoredKycDocs();
  const docTypes = ['aadhaar', 'dharani', 'bank', 'pan', 'location_proof'];
  let verifiedCount = 0;

  docTypes.forEach(type => {
    const doc = docs[type];
    const card = document.getElementById(`cardDoc${type.charAt(0).toUpperCase() + type.slice(1)}`);
    const statusTag = document.getElementById(`statusTag${type.charAt(0).toUpperCase() + type.slice(1)}`);
    const previewBar = document.getElementById(`previewBar${type.charAt(0).toUpperCase() + type.slice(1)}`);
    const nameEl = document.getElementById(`name${type.charAt(0).toUpperCase() + type.slice(1)}`);
    const sizeEl = document.getElementById(`size${type.charAt(0).toUpperCase() + type.slice(1)}`);

    if (doc && doc.verified) {
      verifiedCount++;
      if (card) {
        card.classList.add('is-verified');
      }
      if (statusTag) {
        statusTag.className = 'doc-status-tag verified';
        statusTag.textContent = isEn ? '✓ Verified' : '✓ ధృవీకరించబడింది';
      }
      if (previewBar) previewBar.style.display = 'flex';
      if (nameEl) nameEl.textContent = doc.fileName || `${type}.pdf`;
      if (sizeEl) sizeEl.textContent = `${doc.fileSize || '350 KB'} • ${doc.date || (isEn ? 'Recent' : 'ఇటీవల')}`;

      // Populate input values
      if (type === 'aadhaar') {
        const inp = document.getElementById('inputAadhaarNumber');
        if (inp && doc.number) inp.value = doc.number;
      } else if (type === 'dharani') {
        const pInp = document.getElementById('inputDharaniPassbook');
        const sInp = document.getElementById('inputSurveyNumbers');
        const lInp = document.getElementById('inputLandExtent');
        const locInp = document.getElementById('inputLandLocation');
        if (pInp && doc.passbookNo) pInp.value = doc.passbookNo;
        if (sInp && doc.surveyNos) sInp.value = doc.surveyNos;
        if (lInp && doc.landExtent) lInp.value = doc.landExtent;
        if (locInp && doc.location) locInp.value = doc.location;
      } else if (type === 'bank') {
        const hInp = document.getElementById('inputBankAccHolder');
        const ifscInp = document.getElementById('inputBankIfsc');
        const aInp = document.getElementById('inputBankAccNumber');
        const cInp = document.getElementById('inputBankAccConfirm');
        if (hInp && doc.accHolder) hInp.value = doc.accHolder;
        if (ifscInp && doc.ifsc) ifscInp.value = doc.ifsc;
        if (aInp && doc.accNumber) aInp.value = doc.accNumber;
        if (cInp && doc.accNumber) cInp.value = doc.accNumber;

        // Auto display bank details box
        const box = document.getElementById('liveBankDetailsBox');
        if (box) {
          box.style.display = 'block';
          const bName = document.getElementById('liveBankName');
          const bBranch = document.getElementById('liveBankBranch');
          const bCity = document.getElementById('liveBankCity');
          if (bName) bName.textContent = doc.bankName || 'State Bank of India';
          if (bBranch) bBranch.textContent = doc.branch || 'Jangaon Main';
          if (bCity) bCity.textContent = doc.city || 'Jangaon, Warangal';
        }
      } else if (type === 'pan') {
        const panInp = document.getElementById('inputPanNumber');
        if (panInp && doc.panNumber) panInp.value = doc.panNumber;
      } else if (type === 'location_proof') {
        const sInp = document.getElementById('inputServiceNumber');
        const cInp = document.getElementById('inputLocConsumerName');
        const aInp = document.getElementById('inputLocAddress');
        if (sInp && doc.serviceNo) sInp.value = doc.serviceNo;
        if (cInp && doc.consumerName) cInp.value = doc.consumerName;
        if (aInp && doc.address) aInp.value = doc.address;
      }
    } else {
      if (card) card.classList.remove('is-verified');
      if (statusTag) {
        statusTag.className = 'doc-status-tag pending';
        statusTag.textContent = isEn ? '⏳ Upload Required' : '⏳ అప్‌లోడ్ చేయండి';
      }
      if (previewBar) previewBar.style.display = 'none';
    }
  });

  // Calculate percentage
  const percent = verifiedCount * 20;
  const fill = document.getElementById('kycProgressBarFill');
  if (fill) fill.style.width = `${percent}%`;

  const num = document.getElementById('kycPercentNum');
  if (num) num.textContent = `${percent}%`;

  const countEl = document.getElementById('kycVerifiedCount');
  if (countEl) countEl.textContent = verifiedCount;

  const pill = document.getElementById('kycOverallBadgePill');
  const badgeIcon = document.getElementById('kycBadgeIcon');
  const badgeText = document.getElementById('kycBadgeText');

  if (percent === 100) {
    if (pill) pill.className = 'kyc-badge-pill verified';
    if (badgeIcon) badgeIcon.textContent = '🥇';
    if (badgeText) badgeText.textContent = isEn ? '100% Kissan Gold Verification Complete' : '100% కిసాన్ గోల్డ్ ధృవీకరణ పూర్తయింది';
  } else if (percent >= 60) {
    if (pill) pill.className = 'kyc-badge-pill';
    if (badgeIcon) badgeIcon.textContent = '🥈';
    if (badgeText) badgeText.textContent = isEn ? `Intermediate Verification (${percent}% Complete)` : `మధ్యంతర ధృవీకరణ (${percent}% పూర్తయింది)`;
  } else {
    if (pill) pill.className = 'kyc-badge-pill';
    if (badgeIcon) badgeIcon.textContent = '🟡';
    if (badgeText) badgeText.textContent = isEn ? `Basic Registration (${percent}% Complete)` : `ప్రాథమిక నమోదు (${percent}% పూర్తయింది)`;
  }
}

// Handlers for individual document saves
function handleSaveAadhaar(e) {
  e.preventDefault();
  const num = document.getElementById('inputAadhaarNumber').value.trim();
  const clean = num.replace(/\s/g, '');
  if (clean.length !== 12) {
    showToast('⚠️ దయచేసి సరైన 12 అంకెల ఆధార్ నంబర్ నమోదు చేయండి.');
    return;
  }

  const docs = getStoredKycDocs();
  const upload = tempKycUploads.aadhaar || (docs.aadhaar ? { fileName: docs.aadhaar.fileName, fileSize: docs.aadhaar.fileSize, fileData: docs.aadhaar.fileData } : null);

  if (!upload) {
    showToast('⚠️ దయచేసి ఆధార్ కార్డ్ ఫైల్ (PDF లేదా ఇమేజ్) ఎంచుకోండి.');
    return;
  }

  docs.aadhaar = {
    number: num,
    fileName: upload.fileName,
    fileSize: upload.fileSize,
    fileData: upload.fileData,
    date: new Date().toLocaleString(),
    verified: true
  };
  saveStoredKycDocs(docs);
  renderKycDocumentsStatus();
  showToast('✅ ఆధార్ కార్డ్ విజయవంతంగా ధృవీకరించబడింది!');
}

function handleSaveDharani(e) {
  e.preventDefault();
  const passbookNo = document.getElementById('inputDharaniPassbook').value.trim();
  const surveyNos = document.getElementById('inputSurveyNumbers').value.trim();
  const landExtent = document.getElementById('inputLandExtent').value.trim();
  const location = document.getElementById('inputLandLocation').value.trim();

  const docs = getStoredKycDocs();
  const upload = tempKycUploads.dharani || (docs.dharani ? { fileName: docs.dharani.fileName, fileSize: docs.dharani.fileSize, fileData: docs.dharani.fileData } : null);

  if (!upload) {
    showToast('⚠️ దయచేసి ధరణి పాస్‌బుక్ కాపీ ఫైల్ ఎంచుకోండి.');
    return;
  }

  docs.dharani = {
    passbookNo,
    surveyNos,
    landExtent,
    location,
    fileName: upload.fileName,
    fileSize: upload.fileSize,
    fileData: upload.fileData,
    date: new Date().toLocaleString(),
    verified: true
  };
  saveStoredKycDocs(docs);
  renderKycDocumentsStatus();
  showToast('✅ ధరణి పట్టాదారు పాస్‌బుక్ వివరాలు సేవ్ చేయబడ్డాయి!');
}

function handleSaveBank(e) {
  e.preventDefault();
  const accHolder = document.getElementById('inputBankAccHolder').value.trim();
  const ifsc = document.getElementById('inputBankIfsc').value.trim().toUpperCase();
  const accNumber = document.getElementById('inputBankAccNumber').value.trim();
  const accConfirm = document.getElementById('inputBankAccConfirm').value.trim();

  if (accNumber !== accConfirm) {
    showToast('⚠️ రెండు ఖాతా నంబర్లు సరిపోలలేదు. దయచేసి సరిచూసుకోండి.');
    return;
  }

  const docs = getStoredKycDocs();
  const upload = tempKycUploads.bank || (docs.bank ? { fileName: docs.bank.fileName, fileSize: docs.bank.fileSize, fileData: docs.bank.fileData } : null);

  if (!upload) {
    showToast('⚠️ దయచేసి బ్యాంక్ పాస్‌బుక్ లేదా చెక్ కాపీని అప్‌లోడ్ చేయండి.');
    return;
  }

  const liveInfo = window.lastVerifiedIfscData || {};

  docs.bank = {
    accHolder,
    accNumber,
    ifsc,
    bankName: liveInfo.BANK || 'State Bank of India',
    branch: liveInfo.BRANCH || 'Jangaon',
    city: `${liveInfo.CITY || liveInfo.CENTRE || 'Jangaon'}, ${liveInfo.DISTRICT || 'Warangal'}`,
    fileName: upload.fileName,
    fileSize: upload.fileSize,
    fileData: upload.fileData,
    date: new Date().toLocaleString(),
    verified: true
  };
  saveStoredKycDocs(docs);
  renderKycDocumentsStatus();
  showToast('✅ ఎస్క్రో బ్యాంక్ ఖాతా మరియు లైవ్ IFSC విజయవంతంగా సేవ్ చేయబడ్డాయి!');
}

function handleSavePan(e) {
  e.preventDefault();
  const panNumber = document.getElementById('inputPanNumber').value.trim().toUpperCase();
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!regex.test(panNumber)) {
    showToast('⚠️ దయచేసి సరైన 10 అంకెల పాన్ నంబర్ నమోదు చేయండి (ఉదా: ABCDE1234F).');
    return;
  }

  const docs = getStoredKycDocs();
  const upload = tempKycUploads.pan || (docs.pan ? { fileName: docs.pan.fileName, fileSize: docs.pan.fileSize, fileData: docs.pan.fileData } : null);

  if (!upload) {
    showToast('⚠️ దయచేసి పాన్ కార్డ్ ఫైల్ (PDF లేదా ఇమేజ్) ఎంచుకోండి.');
    return;
  }

  docs.pan = {
    panNumber,
    fileName: upload.fileName,
    fileSize: upload.fileSize,
    fileData: upload.fileData,
    date: new Date().toLocaleString(),
    verified: true
  };
  saveStoredKycDocs(docs);
  renderKycDocumentsStatus();
  showToast('✅ పాన్ కార్డ్ విజయవంతంగా ధృవీకరించబడింది!');
}

function handleSaveLocationProof(e) {
  e.preventDefault();
  const proofType = document.getElementById('inputLocProofType').value;
  const serviceNo = document.getElementById('inputServiceNumber').value.trim();
  const consumerName = document.getElementById('inputLocConsumerName').value.trim();
  const address = document.getElementById('inputLocAddress').value.trim();

  const docs = getStoredKycDocs();
  const upload = tempKycUploads.location_proof || (docs.location_proof ? { fileName: docs.location_proof.fileName, fileSize: docs.location_proof.fileSize, fileData: docs.location_proof.fileData } : null);

  if (!upload) {
    showToast('⚠️ దయచేసి విద్యుత్ బిల్లు / నివాస పత్రం కాపీని ఎంచుకోండి.');
    return;
  }

  docs.location_proof = {
    proofType,
    serviceNo,
    consumerName,
    address,
    fileName: upload.fileName,
    fileSize: upload.fileSize,
    fileData: upload.fileData,
    date: new Date().toLocaleString(),
    verified: true
  };
  saveStoredKycDocs(docs);
  renderKycDocumentsStatus();
  showToast('✅ లొకేషన్ & నివాస ధృవీకరణ పత్రం భద్రపరచబడింది!');
}

function removeKycDoc(type) {
  const docs = getStoredKycDocs();
  if (docs[type]) {
    delete docs[type];
    delete tempKycUploads[type];
    saveStoredKycDocs(docs);
    renderKycDocumentsStatus();
    showToast(`🗑️ పత్రం తొలగించబడింది. మీరు కొత్త పత్రాన్ని అప్‌లోడ్ చేయవచ్చు.`);
  }
}

// Document Preview Modal
function openDocPreviewModal(docType) {
  const docs = getStoredKycDocs();
  const doc = docs[docType] || tempKycUploads[docType];
  if (!doc || !doc.fileData) {
    showToast('⚠️ ప్రివ్యూ చేయడానికి పత్రం ఫైల్ అందుబాటులో లేదు.');
    return;
  }

  const modal = document.getElementById('docPreviewModal');
  const titleEl = document.getElementById('previewModalTitle');
  const viewport = document.getElementById('docPreviewViewport');
  const infoEl = document.getElementById('previewModalFileInfo');
  const dlBtn = document.getElementById('btnDownloadPreviewDoc');

  const isEn = (localStorage.getItem('kissan_lang') === 'en');
  const titles = isEn ? {
    aadhaar: 'Aadhaar Card Document',
    dharani: 'Dharani Land Title Passbook',
    bank: 'Bank Passbook / Cancelled Cheque',
    pan: 'PAN Card Document',
    location_proof: 'Location / Electricity Bill'
  } : {
    aadhaar: 'ఆధార్ కార్డ్ పత్రం',
    dharani: 'ధరణి పట్టాదారు పాస్‌బుక్',
    bank: 'బ్యాంక్ పాస్‌బుక్ / రద్దు చేసిన చెక్',
    pan: 'పాన్ కార్డ్ పత్రం',
    location_proof: 'లొకేషన్ / విద్యుత్ బిల్లు'
  };

  if (titleEl) titleEl.textContent = `📄 ${titles[docType] || (isEn ? 'Document Preview' : 'పత్రం పరిశీలన')}`;
  if (infoEl) infoEl.textContent = isEn ? `File: ${doc.fileName || 'document'} • Size: ${doc.fileSize || 'Unknown'}` : `ఫైల్ పేరు: ${doc.fileName || 'document'} • పరిమాణం: ${doc.fileSize || 'తెలియదు'}`;
  if (dlBtn) {
    dlBtn.href = doc.fileData;
    dlBtn.download = doc.fileName || `${docType}_document`;
  }

  if (viewport) {
    if (doc.fileData.startsWith('data:application/pdf')) {
      viewport.innerHTML = `<iframe src="${doc.fileData}"></iframe>`;
    } else {
      viewport.innerHTML = `<img src="${doc.fileData}" alt="${doc.fileName || 'Doc Preview'}">`;
    }
  }

  if (modal) modal.style.display = 'flex';
}

function closeDocPreviewModal() {
  const modal = document.getElementById('docPreviewModal');
  if (modal) modal.style.display = 'none';
}

// Custom API Keys Modal
function openApiKeysModal() {
  const modal = document.getElementById('apiKeysModal');
  if (!modal) return;
  try {
    const raw = localStorage.getItem('kissan_custom_api_keys');
    if (raw) {
      const keys = JSON.parse(raw);
      const wInput = document.getElementById('customWeatherApiKey');
      const mInput = document.getElementById('customMapsApiKey');
      if (wInput && keys.weather) wInput.value = keys.weather;
      if (mInput && keys.maps) mInput.value = keys.maps;
    }
  } catch(e) {}
  modal.style.display = 'flex';
}

function closeApiKeysModal() {
  const modal = document.getElementById('apiKeysModal');
  if (modal) modal.style.display = 'none';
}

function handleSaveCustomApiKeys(e) {
  e.preventDefault();
  const wKey = document.getElementById('customWeatherApiKey').value.trim();
  const mKey = document.getElementById('customMapsApiKey').value.trim();

  localStorage.setItem('kissan_custom_api_keys', JSON.stringify({
    weather: wKey,
    maps: mKey
  }));

  closeApiKeysModal();
  showToast('💾 కస్టమ్ API కీలు భద్రపరచబడ్డాయి!');
}

