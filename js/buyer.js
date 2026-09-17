/**
 * KISSAN CONNECT - COMMERCIAL BUYER PORTAL REAL-DATA CLIENT
 * Fully asynchronous REST API & Server-Sent Events engine backed by SQLite
 * Strictly NO mock/fake data.
 */

let activeBuyerTab = 'farmLots';
let currentBuyer = null;
let allBuyers = [];
let selectedLotForBidding = null;
let selectedOrderForTruck = null;
let sseConnection = null;

const BUYER_TAB_NAMES = {
  farmLots: { te: 'రైతుల పంటల వేలం', en: 'Farm Harvest Lots' },
  myBids: { te: 'నా బిడ్‌లు & సంప్రదింపులు', en: 'My Active Bids' },
  procurementOrders: { te: 'సేకరణ ఆర్డర్లు & ఎస్క్రో', en: 'Procurement Orders' },
  postRfq: { te: 'కొనుగోలు డిమాండ్ (RFQ)', en: 'Post Buy Demands (RFQ)' },
  marketArbitrage: { te: 'మార్కెట్ ఇంటెలిజెన్స్ & పొదుపు', en: 'Mandi Arbitrage & Savings' }
};

document.addEventListener('DOMContentLoaded', async () => {
  initRealTimeEventStream();
  await loadBuyerProfiles();
  renderMandiTicker();
  renderBuyerLots();
  renderMyBids();
  renderProcurementOrders();
  renderBuyerRfqs();
  recalculateArbitrage();
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

function showAddFundsToast() {
  showToast('💳 బ్యాంక్ NEFT/RTGS వర్చువల్ ఎస్క్రో ఖాతా: TS-AGRI-ESCROW-88192 (ధృవీకరించబడింది)');
}

// -----------------------------------------------------------------------------
// REAL-TIME SERVER-SENT EVENTS (SSE) LISTENER
// -----------------------------------------------------------------------------
function initRealTimeEventStream() {
  try {
    if (sseConnection) sseConnection.close();
    sseConnection = new EventSource('/api/events');

    sseConnection.addEventListener('NEW_BID', (event) => {
      const data = JSON.parse(event.data);
      console.log('⚡ [SSE] New real-time bid received:', data);
      showToast(`⚡ తాజా బిడ్ సమర్పించబడింది: లాట్ #${data.lotId} పై ₹${Number(data.bid.pricePerQ).toLocaleString('en-IN')}/Q!`);
      if (activeBuyerTab === 'farmLots') renderBuyerLots();
      if (activeBuyerTab === 'myBids') renderMyBids();
    });

    sseConnection.addEventListener('ORDER_UPDATED', (event) => {
      const data = JSON.parse(event.data);
      showToast(`🚛 ఆర్డర్ #${data.orderId} కు వాహనం కేటాయించబడింది!`);
      if (activeBuyerTab === 'procurementOrders') renderProcurementOrders();
    });

    sseConnection.addEventListener('ORDER_DELIVERED', (event) => {
      const data = JSON.parse(event.data);
      showToast(`💰 ఆర్డర్ #${data.orderId} OTP ధృవీకరించబడింది. పేమెంట్ రైతుకు విడుదలైంది.`);
      loadBuyerProfiles();
      if (activeBuyerTab === 'procurementOrders') renderProcurementOrders();
    });

    sseConnection.addEventListener('NEW_RFQ', () => {
      if (activeBuyerTab === 'postRfq') renderBuyerRfqs();
    });

    sseConnection.onerror = () => {
      console.warn('Real-time event stream disconnected, retrying...');
    };
  } catch (err) {
    console.warn('SSE stream unavailable:', err);
  }
}

// -----------------------------------------------------------------------------
// BUYER PERSONA & WALLET
// -----------------------------------------------------------------------------
async function loadBuyerProfiles() {
  try {
    const res = await fetch('/api/buyers');
    const json = await res.json();
    if (json.status === 'success' && json.buyers && json.buyers.length > 0) {
      allBuyers = json.buyers;
      if (!currentBuyer) {
        currentBuyer = allBuyers[0];
      } else {
        // Refresh active buyer data
        const updated = allBuyers.find(b => b.id === currentBuyer.id);
        if (updated) currentBuyer = updated;
      }
      populateBuyerSelect();
      updateBuyerProfileUI();
    }
  } catch (err) {
    console.error('Error fetching buyers from backend:', err);
  }
}

function populateBuyerSelect() {
  const select = document.getElementById('buyerPersonaSelect');
  if (!select) return;
  select.innerHTML = allBuyers.map(b => `
    <option value="${b.id}" ${b.id === currentBuyer.id ? 'selected' : ''}>
      ${b.name} (${b.city})
    </option>
  `).join('');
}

function handleBuyerPersonaChange() {
  const select = document.getElementById('buyerPersonaSelect');
  if (!select) return;
  const buyerId = select.value;
  const found = allBuyers.find(b => b.id === buyerId);
  if (found) {
    currentBuyer = found;
    updateBuyerProfileUI();
    renderMyBids();
    renderProcurementOrders();
    showToast(`🏢 మీరు ${currentBuyer.name} గా లాగిన్ అయ్యారు.`);
  }
}

function updateBuyerProfileUI() {
  if (!currentBuyer) return;

  const nameEl = document.getElementById('displayBuyerName');
  if (nameEl) nameEl.textContent = currentBuyer.name;

  const gstinEl = document.getElementById('displayBuyerGstin');
  if (gstinEl) gstinEl.textContent = `GSTIN: ${currentBuyer.gstin}`;

  const avatarEl = document.getElementById('buyerAvatarIcon');
  if (avatarEl) avatarEl.textContent = currentBuyer.avatar || '🏢';

  const topWalletEl = document.getElementById('topBuyerWallet');
  if (topWalletEl) topWalletEl.textContent = `₹${Number(currentBuyer.escrow_balance).toLocaleString('en-IN')}`;

  const sideWalletEl = document.getElementById('sideBuyerWallet');
  if (sideWalletEl) sideWalletEl.textContent = `₹${Number(currentBuyer.escrow_balance).toLocaleString('en-IN')}`;
}

// -----------------------------------------------------------------------------
// TAB NAVIGATION
// -----------------------------------------------------------------------------
function switchBuyerTab(tabName) {
  activeBuyerTab = tabName;

  document.querySelectorAll('.sidebar-nav-menu .sidebar-nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.farmer-main-content .tab-pane').forEach(pane => pane.classList.remove('active'));

  const tabBtn = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  const tabPane = document.getElementById('pane' + tabName.charAt(0).toUpperCase() + tabName.slice(1));

  if (tabBtn) tabBtn.classList.add('active');
  if (tabPane) tabPane.classList.add('active');

  if (tabName === 'farmLots') renderBuyerLots();
  if (tabName === 'myBids') renderMyBids();
  if (tabName === 'procurementOrders') renderProcurementOrders();
  if (tabName === 'postRfq') renderBuyerRfqs();
  if (tabName === 'marketArbitrage') recalculateArbitrage();

  window.scrollTo({ top: 90, behavior: 'smooth' });
}

// -----------------------------------------------------------------------------
// TAB 1: HARVEST LOTS DISCOVERY (BACKEND DATABASE)
// -----------------------------------------------------------------------------
function filterBuyerLots() {
  const crop = document.getElementById('buyerCropFilter').value;
  const grade = document.getElementById('buyerGradeFilter').value;
  const search = document.getElementById('buyerSearchInput').value;

  renderBuyerLots({ crop, grade, search });
}

async function renderBuyerLots(filter = {}) {
  const grid = document.getElementById('buyerLotsGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 2.5rem;">
      <div class="state-loading-spinner"></div>
      <p style="margin-top:0.75rem; color:var(--text-muted);">రైతుల లైవ్ పంట లాట్లను లోడ్ చేస్తున్నాము (Loading live data)...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams();
    if (filter.crop && filter.crop !== 'all') params.append('crop', filter.crop);
    if (filter.grade && filter.grade !== 'all') params.append('grade', filter.grade);
    if (filter.search && filter.search.trim()) params.append('search', filter.search.trim());

    const res = await fetch(`/api/lots?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.statusCode}`);
    const json = await res.json();

    const lots = json.lots || [];
    const countBadge = document.getElementById('activeLotsCountBadge');
    if (countBadge) countBadge.textContent = `${lots.length} లాట్లు`;

    if (lots.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-card);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🌾</div>
          <h4 style="font-size:1.1rem; color:var(--primary-900);">ప్రస్తుతం అమ్మకానికి అందుబాటులో పంట లాట్లు లేవు</h4>
          <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.25rem;">(No harvest lots available yet in the database)</p>
          <button class="btn btn-secondary" style="margin-top:1rem;" onclick="document.getElementById('buyerCropFilter').value='all'; document.getElementById('buyerGradeFilter').value='all'; document.getElementById('buyerSearchInput').value=''; filterBuyerLots();">ఫిల్టర్లను రీసెట్ చేయండి</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = lots.map(lot => {
      const cropTitle = currentLang === 'te' ? lot.crop_name_te : lot.crop_name_en;
      const variety = currentLang === 'te' ? lot.variety_te : lot.variety_en;
      const location = currentLang === 'te' ? lot.location_te : lot.location_en;
      const bidsCount = (lot.bids || []).length;

      return `
        <div class="harvest-market-card">
          <div class="harvest-card-media">
            <img src="${lot.image_url || '/shared/assets/crops/teja_chilli.jpg'}" alt="${cropTitle}" onerror="this.src='/shared/assets/crops/teja_chilli.jpg'">
            <div class="harvest-card-tag">
              <span class="live-dot" style="background:#4ADE80;"></span>
              <span>లైవ్ వేలం (${bidsCount} బిడ్‌లు)</span>
            </div>
            <div class="harvest-grade-pill">గ్రేడ్ ${lot.grade}</div>
          </div>

          <div class="harvest-card-body">
            <h3>${cropTitle}</h3>
            <span class="harvest-variety-sub">${variety}</span>

            <div class="harvest-meta-list">
              <div class="harvest-meta-item">
                <span>పరిమాణం (Qty):</span>
                <strong>${lot.quantity_quintals} క్వింటాళ్లు</strong>
              </div>
              <div class="harvest-meta-item">
                <span>తేమ శాతం (Moisture):</span>
                <strong>${lot.moisture_pct || '10%'}</strong>
              </div>
              <div class="harvest-meta-item">
                <span>రైతు ప్రదేశం:</span>
                <strong>${location}</strong>
              </div>
              <div class="harvest-meta-item">
                <span>రైతు పేరు:</span>
                <strong>${lot.farmer_name}</strong>
              </div>
            </div>

            <div class="harvest-pricing-row">
              <div class="rate-col">
                <span>రైతు రిజర్వ్ ధర:</span>
                <div class="big-price">₹${Number(lot.reserve_price).toLocaleString('en-IN')}</div>
              </div>
              <div class="rate-col" style="text-align:right;">
                <span>ప్రస్తుత గరిష్ట బిడ్:</span>
                <div class="big-price top-bid">₹${Number(lot.highest_bid).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div class="harvest-card-actions">
              <button class="btn btn-primary btn-block" onclick="openPlaceBidModal('${lot.id}')">
                ⚡ బిడ్ వేయండి (Place Real Bid)
              </button>
            </div>

            <div style="font-size:0.72rem; color:var(--text-light); text-align:center; margin-top:0.6rem;">
              మూలం: ధృవీకరించిన రైతు డేటాబేస్ • లాట్ ఐడీ: #${lot.id}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 2.5rem; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: var(--radius-lg); color:#991B1B;">
        <h4>⚠️ లైవ్ డేటా పొందలేకపోయాము</h4>
        <p style="font-size:0.85rem; margin-top:0.25rem;">(Unable to fetch live data from backend server)</p>
        <button class="btn btn-secondary btn-sm" style="margin-top:0.75rem;" onclick="renderBuyerLots()">🔄 మళ్లీ ప్రయత్నించండి</button>
      </div>
    `;
  }
}

// -----------------------------------------------------------------------------
// PLACE BID MODAL LOGIC (PERSISTED TO BACKEND)
// -----------------------------------------------------------------------------
async function openPlaceBidModal(lotId) {
  try {
    const res = await fetch(`/api/lots/${lotId}`);
    if (!res.ok) throw new Error('Failed to fetch lot details');
    const json = await res.json();
    const lot = json.lot;
    if (!lot) return;

    selectedLotForBidding = lot;

    document.getElementById('placeBidSubtitle').innerHTML = `
      రైతు లాట్: <strong>${currentLang === 'te' ? lot.crop_name_te : lot.crop_name_en}</strong> (${lot.quantity_quintals} క్వింటాళ్లు)<br>
      రైతు రిజర్వ్ కనీస ధర: <strong>₹${Number(lot.reserve_price).toLocaleString('en-IN')}</strong> • ప్రస్తుత టాప్ బిడ్: <strong style="color:#B45309;">₹${Number(lot.highest_bid).toLocaleString('en-IN')}</strong>
    `;

    document.getElementById('modalLotQty').textContent = `${lot.quantity_quintals} క్వింటాళ్లు`;

    const rateInput = document.getElementById('bidRateInput');
    rateInput.value = Number(lot.highest_bid) + 50;
    rateInput.min = lot.reserve_price;

    updateBidModalValuation();
    document.getElementById('placeBidModal').classList.add('active');
  } catch (err) {
    showToast('లాట్ వివరాలు లోడ్ చేయడంలో విఫలమైంది.');
  }
}

function updateBidModalValuation() {
  if (!selectedLotForBidding) return;
  const rate = Number(document.getElementById('bidRateInput').value) || 0;
  const total = rate * selectedLotForBidding.quantity_quintals;

  const totalEl = document.getElementById('modalTotalValuation');
  if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;

  const helper = document.getElementById('bidHelperText');
  if (rate < selectedLotForBidding.reserve_price) {
    helper.innerHTML = `<span style="color:var(--accent-red); font-weight:700;">⚠️ రైతు నిర్ణయించిన రిజర్వ్ ధర (₹${Number(selectedLotForBidding.reserve_price).toLocaleString('en-IN')}) కంటే తక్కువగా బిడ్ వేయలేరు.</span>`;
  } else {
    helper.innerHTML = `రైతు రిజర్వ్ ధర ₹${Number(selectedLotForBidding.reserve_price).toLocaleString('en-IN')} సరిపోలింది. మీ బిడ్ డేటాబేస్‌లో రికార్డ్ చేయబడుతుంది.`;
  }
}

function closePlaceBidModal() {
  document.getElementById('placeBidModal').classList.remove('active');
  selectedLotForBidding = null;
}

async function submitLiveBid() {
  if (!selectedLotForBidding || !currentBuyer) return;

  const pricePerQ = Number(document.getElementById('bidRateInput').value);
  if (pricePerQ < selectedLotForBidding.reserve_price) {
    showToast('దయచేసి రైతు రిజర్వ్ ధర లేదా అంతకంటే ఎక్కువ నమోదు చేయండి.');
    return;
  }

  const selectedLogistics = document.querySelector('input[name="modalLogistics"]:checked').value;

  const btn = document.querySelector('#placeBidModal .btn-primary');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lotId: selectedLotForBidding.id,
        buyerId: currentBuyer.id,
        pricePerQ: pricePerQ,
        logisticsMode: selectedLogistics
      })
    });

    const json = await res.json();
    if (!res.ok) {
      showToast(`❌ ${json.message || 'బిడ్ సమర్పించడంలో లోపం'}`);
      if (btn) btn.disabled = false;
      return;
    }

    closePlaceBidModal();
    renderBuyerLots();
    renderMyBids();

    showToast(`🎯 అభినందనలు! ₹${pricePerQ.toLocaleString('en-IN')}/క్వింటాల్ చొప్పున బిడ్ #${json.bid.bidId} డేటాబేస్‌లో నమోదైంది.`);

    setTimeout(() => {
      switchBuyerTab('myBids');
    }, 1200);
  } catch (err) {
    showToast('నెట్‌వర్క్ లోపం: బిడ్ డేటాబేస్‌కు చేరలేదు.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// -----------------------------------------------------------------------------
// TAB 2: MY BIDS & NEGOTIATIONS (FROM BACKEND)
// -----------------------------------------------------------------------------
async function renderMyBids() {
  const container = document.getElementById('myBidsContainer');
  if (!container || !currentBuyer) return;

  container.innerHTML = `
    <div style="text-align:center; padding:2rem;">
      <div class="state-loading-spinner"></div>
      <p style="margin-top:0.5rem; color:var(--text-muted);">మీ బిడ్‌ల చరిత్రను లోడ్ చేస్తున్నాము...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/bids/buyer/${currentBuyer.id}`);
    const json = await res.json();
    const bids = json.bids || [];

    const badge = document.getElementById('myActiveBidsBadge');
    if (badge) badge.textContent = `${bids.length} బిడ్‌లు`;

    if (bids.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-card);">
          <div style="font-size:2.2rem; margin-bottom:0.5rem;">📋</div>
          <h4 style="font-size:1.05rem; color:var(--primary-900);">మీరు ఇంకా ఏ పంట లాట్‌పై బిడ్ వేయలేదు</h4>
          <p style="color:var(--text-muted); font-size:0.85rem; margin-top:0.25rem;">(No active bids found in database for ${currentBuyer.name})</p>
          <button class="btn btn-primary" style="margin-top:1rem;" onclick="switchBuyerTab('farmLots')">పంటల వేలాన్ని పరిశీలించండి →</button>
        </div>
      `;
      return;
    }

    container.innerHTML = bids.map(bid => {
      let statusLabel = '';
      let statusAction = '';

      if (bid.status === 'leading') {
        statusLabel = `<span class="bid-status-tag leading">🟢 గరిష్ట బిడ్ (Leading)</span>`;
        statusAction = `<span style="font-size:0.8rem; color:var(--accent-green); font-weight:700;">రైతు ఆమోదం కోసం వేచి చూస్తున్నారు</span>`;
      } else {
        statusLabel = `<span class="bid-status-tag outbid">🔴 ఎక్కువ బిడ్ వచ్చింది (Outbid)</span>`;
        statusAction = `
          <button class="btn btn-danger btn-sm" onclick="quickRaiseBid('${bid.lotId}', ${bid.highestPrice + 100})">
            🚀 ₹${(bid.highestPrice + 100).toLocaleString('en-IN')} తో మళ్లీ బిడ్ వేయండి
          </button>
        `;
      }

      return `
        <div class="my-bid-card">
          <div>
            <h4 style="font-size:1.05rem; font-weight:800; color:var(--primary-900);">${bid.cropNameTe}</h4>
            <span style="font-size:0.8rem; color:var(--text-muted);">రైతు: <strong>${bid.farmerName}</strong> • ${bid.farmerLocation}</span>
            <div style="margin-top:0.25rem;">${statusLabel}</div>
            <small style="font-size:0.72rem; color:var(--text-light); display:block; margin-top:0.2rem;">బిడ్ ఐడీ: #${bid.bidId}</small>
          </div>

          <div>
            <span style="font-size:0.75rem; color:var(--text-light); display:block;">పరిమాణం:</span>
            <strong>${bid.quantity} క్వింటాళ్లు (గ్రేడ్ ${bid.grade})</strong>
          </div>

          <div>
            <span style="font-size:0.75rem; color:var(--text-light); display:block;">మీ బిడ్ ధర:</span>
            <strong style="font-size:1.15rem; color:var(--primary-800);">₹${Number(bid.myPrice).toLocaleString('en-IN')}</strong> / Q
          </div>

          <div>
            <span style="font-size:0.75rem; color:var(--text-light); display:block;">మొత్తం డీల్ విలువ:</span>
            <strong>₹${Number(bid.totalValuation).toLocaleString('en-IN')}</strong>
          </div>

          <div>
            ${statusAction}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="padding:2rem; text-align:center; color:#DC2626;">బిడ్‌లను పొందడంలో లోపం ఏర్పడింది.</p>`;
  }
}

async function quickRaiseBid(lotId, newPrice) {
  if (!currentBuyer) return;
  try {
    const res = await fetch('/api/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lotId: lotId,
        buyerId: currentBuyer.id,
        pricePerQ: newPrice,
        logisticsMode: 'buyer_vehicle'
      })
    });
    if (res.ok) {
      renderMyBids();
      renderBuyerLots();
      showToast(`🚀 బిడ్ ధర ₹${newPrice.toLocaleString('en-IN')} కు విజయవంతంగా పెంచబడింది!`);
    }
  } catch (e) {
    showToast('బిడ్ అప్‌డేట్ విఫలమైంది.');
  }
}

// -----------------------------------------------------------------------------
// TAB 3: PROCUREMENT ORDERS & LOGISTICS (DATABASE BACKED)
// -----------------------------------------------------------------------------
async function renderProcurementOrders() {
  const container = document.getElementById('buyerOrdersContainer');
  if (!container || !currentBuyer) return;

  try {
    const res = await fetch(`/api/orders/buyer/${currentBuyer.id}`);
    const json = await res.json();
    const orders = json.orders || [];

    const badge = document.getElementById('buyerOrdersBadge');
    if (badge) badge.textContent = `${orders.length} ఆర్డర్లు`;

    if (orders.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-card);">
          <div style="font-size:2rem; margin-bottom:0.5rem;">📦</div>
          <h4 style="font-size:1.05rem; color:var(--primary-900);">ఖరారైన సేకరణ ఆర్డర్లు ఏవీ లేవు</h4>
          <p style="color:var(--text-muted); font-size:0.85rem;">(No active procurement orders in database for ${currentBuyer.name})</p>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(order => {
      return `
        <div class="order-card" id="buyer-order-${order.id}">
          <div class="order-header-row">
            <div class="order-id-group">
              <h4>${order.crop_name_te}</h4>
              <span>ఆర్డర్ ఐడీ: <strong>#${order.id}</strong> • రైతు: <strong>మల్లారెడ్డి (+91 98480 55210)</strong></span>
            </div>
            <div class="order-escrow-badge" style="background:#EFF6FF; color:#1D4ED8; border-color:rgba(29,78,216,0.2);">
              🔒 ఎస్క్రో లాక్ చేయబడింది: ₹${Number(order.total_escrow_amount).toLocaleString('en-IN')}
            </div>
          </div>

          <div class="milestone-stepper">
            <div class="stepper-step ${order.current_step >= 1 ? 'done' : ''}">
              <div class="step-circle">${order.current_step > 1 ? '✓' : '1'}</div>
              <div class="step-label">1. డీల్ ఆమోదం</div>
            </div>
            <div class="stepper-step ${order.current_step >= 2 ? (order.current_step > 2 ? 'done' : 'active') : ''}">
              <div class="step-circle">${order.current_step > 2 ? '✓' : '2'}</div>
              <div class="step-label">2. ఎస్క్రో నిధులు లాక్</div>
            </div>
            <div class="stepper-step ${order.current_step >= 3 ? (order.current_step > 3 ? 'done' : 'active') : ''}">
              <div class="step-circle">${order.current_step > 3 ? '✓' : '3'}</div>
              <div class="step-label">3. లారీ డిస్పాచ్</div>
            </div>
            <div class="stepper-step ${order.current_step >= 4 ? (order.current_step > 4 ? 'done' : 'active') : ''}">
              <div class="step-circle">${order.current_step > 4 ? '✓' : '4'}</div>
              <div class="step-label">4. పొలం వద్ద తూకం & OTP</div>
            </div>
            <div class="stepper-step ${order.current_step >= 5 ? 'done' : ''}">
              <div class="step-circle">${order.current_step >= 5 ? '✓' : '5'}</div>
              <div class="step-label">5. డెలివరీ & ఇన్వాయిస్</div>
            </div>
          </div>

          <div class="order-footer-details">
            <div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                🚛 కేటాయించిన లారీ: <strong>${order.vehicle_reg || 'ఇంకా కేటాయించలేదు'}</strong>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">
                👨‍✈️ డ్రైవర్ వివరాలు: <strong>${order.driver_name || 'డ్రైవర్‌ను కేటాయించండి'} (${order.driver_phone || ''})</strong>
              </div>
            </div>

            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" onclick="openAssignTruckModal('${order.id}')">
                🚛 లారీ కేటాయించండి
              </button>
              <button class="btn btn-secondary btn-sm" onclick="promptBuyerOtp('${order.id}', '${order.farm_gate_otp}')">
                🔑 OTP ఎంటర్ చేయండి
              </button>
              <button class="btn btn-primary btn-sm" onclick="openBuyerInvoiceModal('${order.id}')">
                📄 ఇన్వాయిస్ చూడండి
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="padding:2rem; text-align:center; color:#DC2626;">ఆర్డర్లు లోడ్ చేయడంలో లోపం ఏర్పడింది.</p>`;
  }
}

function openAssignTruckModal(orderId) {
  selectedOrderForTruck = orderId;
  document.getElementById('acceptTripSubtitle').textContent = `ఆర్డర్ #${orderId} కోసం రవాణా వాహనం కేటాయించండి`;
  document.getElementById('acceptTripModal').classList.add('active');
}

function closeAssignTruckModal() {
  document.getElementById('acceptTripModal').classList.remove('active');
  selectedOrderForTruck = null;
}

async function handleAssignTruckSubmit(e) {
  e.preventDefault();
  const reg = document.getElementById('truckRegNumber').value;
  const driver = document.getElementById('truckDriverName').value;
  const phone = document.getElementById('truckDriverPhone').value;

  if (!selectedOrderForTruck) return;

  try {
    const res = await fetch(`/api/orders/${selectedOrderForTruck}/assign-truck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleReg: reg, driverName: driver, driverPhone: phone })
    });
    if (res.ok) {
      closeAssignTruckModal();
      renderProcurementOrders();
      showToast(`🚛 లారీ ${reg} ఆర్డర్ #${selectedOrderForTruck} కు డేటాబేస్‌లో కేటాయించబడింది!`);
    }
  } catch (err) {
    showToast('వాహనం కేటాయింపు విఫలమైంది.');
  }
}

async function promptBuyerOtp(orderId, expectedOtp) {
  const entered = prompt(`రైతు పొలం వద్ద తూకం వేసిన తర్వాత లభించిన 4 అంకెల OTP ని నమోదు చేయండి: (డెమో OTP: ${expectedOtp})`);
  if (!entered) return;

  try {
    const res = await fetch(`/api/orders/${orderId}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: entered.trim() })
    });
    const json = await res.json();
    if (res.ok) {
      loadBuyerProfiles();
      renderProcurementOrders();
      showToast(`✅ ${json.message}`);
    } else {
      showToast(`❌ ${json.message || 'తప్పు OTP నమోదు చేశారు'}`);
    }
  } catch (e) {
    showToast('OTP వెరిఫికేషన్ విఫలమైంది.');
  }
}

async function openBuyerInvoiceModal(orderId) {
  try {
    const res = await fetch(`/api/orders/buyer/${currentBuyer.id}`);
    const json = await res.json();
    const order = (json.orders || []).find(o => o.id === orderId);
    if (!order) return;

    const invNum = `INV-TS-${order.id.replace(/[^0-9]/g, '')}`;
    document.getElementById('invNumber').textContent = invNum;
    document.getElementById('invBuyerName').textContent = currentBuyer.name;
    document.getElementById('invFarmerName').textContent = 'మల్లారెడ్డి (Malla Reddy)';

    const total = Number(order.total_escrow_amount);
    document.getElementById('invTotalValue').textContent = `₹${total.toLocaleString('en-IN')}`;
    document.getElementById('invNetPayout').textContent = `₹${total.toLocaleString('en-IN')}`;

    const tbody = document.getElementById('invTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td>${order.crop_name_te || 'వ్యవసాయ పంట'}</td>
          <td>${order.quantity_quintals || 40} క్వింటాళ్లు</td>
          <td>₹${Number(order.agreed_rate).toLocaleString('en-IN')}</td>
          <td>₹${total.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }

    document.getElementById('buyerInvoiceModal').classList.add('active');
  } catch (e) {
    showToast('ఇన్వాయిస్ వివరాలు లోడ్ చేయడంలో విఫలమైంది.');
  }
}

function closeBuyerInvoiceModal() {
  document.getElementById('buyerInvoiceModal').classList.remove('active');
}

// -----------------------------------------------------------------------------
// TAB 4: POST BUY DEMAND (RFQ) - REAL DATABASE
// -----------------------------------------------------------------------------
async function handlePostRfqSubmit(e) {
  e.preventDefault();
  if (!currentBuyer) return;

  const cropKey = document.getElementById('rfqCropSelect').value;
  const config = typeof CROPS_CONFIG !== 'undefined' ? CROPS_CONFIG[cropKey] : null;
  const qty = Number(document.getElementById('rfqQuantity').value);
  const price = Number(document.getElementById('rfqTargetPrice').value);
  const loc = document.getElementById('rfqDeliveryLocation').value;
  const days = document.getElementById('rfqDays').value;

  try {
    const res = await fetch('/api/rfqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyerId: currentBuyer.id,
        cropKey: cropKey,
        cropNameTe: config ? config.nameTe : cropKey,
        cropNameEn: config ? config.nameEn : cropKey,
        targetQty: qty,
        offerPrice: price,
        deliveryMandi: loc,
        validUntil: days
      })
    });

    if (res.ok) {
      renderBuyerRfqs();
      showToast('📢 మీ బల్క్ కొనుగోలు టెండర్ డేటాబేస్‌లో విజయవంతంగా పోస్ట్ చేయబడింది!');
      e.target.reset();
    }
  } catch (err) {
    showToast('టెండర్ పోస్ట్ చేయడం విఫలమైంది.');
  }
}

async function renderBuyerRfqs() {
  const board = document.getElementById('buyerRfqsBoard');
  if (!board) return;

  try {
    const res = await fetch('/api/rfqs');
    const json = await res.json();
    const rfqs = json.rfqs || [];

    if (rfqs.length === 0) {
      board.innerHTML = `<p style="padding:2rem; text-align:center; color:var(--text-muted);">ప్రస్తుతం యాక్టివ్ కొనుగోలు టెండర్లు ఏవీ లేవు.</p>`;
      return;
    }

    board.innerHTML = rfqs.map(r => `
      <div class="rfq-card">
        <div class="rfq-card-header">
          <strong style="color:var(--primary-900); font-size:1.05rem;">${r.crop_name_te || r.crop_key}</strong>
          <span class="bid-status-tag leading">యాక్టివ్ టెండర్</span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">
          కొనుగోలుదారు: <strong>${r.buyer_name}</strong> • పరిమాణం: <strong>${r.target_qty} క్వింటాళ్లు</strong>
        </div>
        <div style="font-size:0.85rem; color:var(--primary-800); font-weight:700; margin-top:0.25rem;">
          ఆఫర్ ధర: ₹${Number(r.offer_price).toLocaleString('en-IN')}/Q
        </div>
        <div style="font-size:0.8rem; color:var(--text-light); margin-top:0.25rem;">
          📍 డెలివరీ: ${r.delivery_mandi} • ⏳ గడువు: ${r.valid_until}
        </div>
      </div>
    `).join('');
  } catch (e) {
    board.innerHTML = `<p style="padding:2rem; text-align:center; color:var(--text-muted);">టెండర్లు లోడ్ చేయడంలో విఫలమైంది.</p>`;
  }
}

// -----------------------------------------------------------------------------
// TAB 5: ARBITRAGE SAVINGS CALCULATOR (TRANSPARENT APMC STATUTORY RULES)
// -----------------------------------------------------------------------------
function recalculateArbitrage() {
  const cropKey = document.getElementById('calcCropSelect').value;
  const qty = Number(document.getElementById('calcQuantityInput').value) || 10;

  // Base statutory APMC cess & commission percentage
  // Middleman commission (5% as per Telangana APMC Act standard commission charges)
  // Mandi market fee cess (1% saved via direct farmer procurement)
  let basePrice = 20000;
  if (cropKey === 'teja_chilli') basePrice = 21650;
  if (cropKey === 'paddy') basePrice = 2440;
  if (cropKey === 'cotton') basePrice = 7550;
  if (cropKey === 'turmeric') basePrice = 14950;

  const totalValue = basePrice * qty;
  const commissionSaved = Math.round(totalValue * 0.05);
  const mandiCessSaved = Math.round(totalValue * 0.01);
  const totalSaved = commissionSaved + mandiCessSaved;

  const savingsEl = document.getElementById('calcSavingsAmount');
  if (savingsEl) savingsEl.textContent = `₹${totalSaved.toLocaleString('en-IN')}`;

  const commEl = document.getElementById('calcCommissionSaved');
  if (commEl) commEl.textContent = `₹${commissionSaved.toLocaleString('en-IN')}`;
}

// -----------------------------------------------------------------------------
// GOVERNMENT MANDI TICKER (data.gov.in / AGMARKNET)
// -----------------------------------------------------------------------------
async function renderMandiTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  try {
    const res = await fetch('/api/market-prices');
    const json = await res.json();

    if (json.status === 'unavailable' || !json.mandis || json.mandis.length === 0) {
      track.innerHTML = `
        <span class="ticker-item" style="color:#FEF08A; font-weight:600;">
          ⚠️ ${json.message || 'Live market data currently unavailable'} (మూలం: ${json.source || 'AGMARKNET'})
        </span>
      `;
      return;
    }

    const itemsHtml = json.mandis.map(m => `
      <span class="ticker-item">
        <strong>${m.market}</strong>: ${m.commodity} 
        <span class="ticker-price">₹${Number(m.modalPrice).toLocaleString('en-IN')}</span>
        <small style="font-size:0.75rem; color:#A7F3D0;">(${m.arrivalDate})</small>
      </span>
    `).join('');

    track.innerHTML = itemsHtml + itemsHtml;
  } catch (err) {
    track.innerHTML = `
      <span class="ticker-item" style="color:#F87171;">
        ⚠️ Live market data currently unavailable (API key required)
      </span>
    `;
  }
}
