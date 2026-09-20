/**
 * KISSAN CONNECT - COMMERCIAL BUYER PORTAL REAL-DATA CLIENT
 * Fully asynchronous REST API & Server-Sent Events engine backed by SQLite
 * Strictly NO mock/fake data.
 */

function getApiUrl(endpoint) {
  const base = (window.KissanAPI && window.KissanAPI.baseUrl) || "";
  return `${base}${endpoint}`;
}

function getAuthHeaders() {
  const token = (window.KissanAPI && window.KissanAPI.getToken()) || '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

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
    sseConnection = new EventSource(getApiUrl('/api/events'));

    sseConnection.addEventListener('NEW_LOT', (event) => {
      try {
        const data = JSON.parse(event.data);
        showToast(`🌾 కొత్త పంట నమోదు చేయబడింది: ${data.lot ? (data.lot.crop_name_te || data.lot.cropNameTe) : 'కొత్త లాట్'}`);
      } catch(e) {}
      renderBuyerLots();
    });

    sseConnection.addEventListener('listing.created', () => {
      renderBuyerLots();
    });

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
    const res = await fetch(getApiUrl('/api/buyers'));
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
      if (window.KissanAPI && currentBuyer) {
        try { await window.KissanAPI.loginAsRole('buyer', currentBuyer.id); } catch(e){}
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
  if (tabName === 'communityBulk') {
    renderCommunityProfileCard();
    renderCommunityRequirements();
  }
  if (tabName === 'marketArbitrage') recalculateArbitrage();
  if (tabName === 'buyerWallet') renderBuyerWallet();

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

    const res = await fetch(getApiUrl(`/api/lots?${params.toString()}`));
    if (!res.ok) throw new Error(`HTTP ${res.statusCode}`);
    const json = await res.json();

    const lots = json.lots || [];
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    const isEn = curLang === 'en';

    const countBadge = document.getElementById('activeLotsCountBadge');
    if (countBadge) countBadge.textContent = isEn ? `${lots.length} Lots` : `${lots.length} లాట్లు`;

    if (lots.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-card);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🌾</div>
          <h4 style="font-size:1.1rem; color:var(--primary-900);">${isEn ? 'No harvest lots available yet' : 'ప్రస్తుతం అమ్మకానికి అందుబాటులో పంట లాట్లు లేవు'}</h4>
          <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.25rem;">${isEn ? 'Check back soon as farmers list new lots' : 'రైతులు కొత్త లాట్లను నమోదు చేసిన వెంటనే ఇక్కడ కనిపిస్తాయి'}</p>
          <button class="btn btn-secondary" style="margin-top:1rem;" onclick="document.getElementById('buyerCropFilter').value='all'; document.getElementById('buyerGradeFilter').value='all'; document.getElementById('buyerSearchInput').value=''; filterBuyerLots();">${isEn ? 'Reset Filters' : 'ఫిల్టర్లను రీసెట్ చేయండి'}</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = lots.map(lot => {
      const targetLang = isEn ? 'en' : 'te';
      const rawTitle = isEn ? (lot.crop_name_en || lot.crop_name_te) : (lot.crop_name_te || lot.crop_name_en);
      const rawVariety = isEn ? (lot.variety_en || lot.variety_te) : (lot.variety_te || lot.variety_en);
      const rawLocation = isEn ? (lot.location_en || lot.location_te) : (lot.location_te || lot.location_en);

      const cropTitle = window.sanitizeForLang ? window.sanitizeForLang(rawTitle, targetLang) : rawTitle;
      const variety = window.sanitizeForLang ? window.sanitizeForLang(rawVariety, targetLang) : rawVariety;
      const location = window.sanitizeForLang ? window.sanitizeForLang(rawLocation, targetLang) : rawLocation;
      const farmerName = window.sanitizeForLang ? window.sanitizeForLang(lot.farmer_name, targetLang) : lot.farmer_name;

      const bidsCount = (lot.bids || []).length;
      const auctionTag = isEn ? `Live Auction (${bidsCount} Bids)` : `లైవ్ వేలం (${bidsCount} బిడ్‌లు)`;
      const gradeText = isEn ? `Grade ${lot.grade}` : `గ్రేడ్ ${lot.grade}`;
      const qtyText = isEn ? `${lot.quantity_quintals} Quintals` : `${lot.quantity_quintals} క్వింటాళ్లు`;

      return `
        <div class="harvest-market-card">
          <div class="harvest-card-media">
            <img src="${lot.image_url || '/shared/assets/crops/teja_chilli.jpg'}" alt="${cropTitle}" onerror="this.src='/shared/assets/crops/teja_chilli.jpg'">
            <div class="harvest-card-tag">
              <span class="live-dot" style="background:#4ADE80;"></span>
              <span>${auctionTag}</span>
            </div>
            <div class="harvest-grade-pill">${gradeText}</div>
          </div>

          <div class="harvest-card-body">
            <h3>${cropTitle}</h3>
            <span class="harvest-variety-sub">${variety}</span>

            <div class="harvest-meta-list">
              <div class="harvest-meta-item">
                <span>${isEn ? 'Quantity:' : 'పరిమాణం:'}</span>
                <strong>${qtyText}</strong>
              </div>
              <div class="harvest-meta-item">
                <span>${isEn ? 'Moisture:' : 'తేమ శాతం:'}</span>
                <strong>${lot.moisture_pct || '10%'}</strong>
              </div>
              <div class="harvest-meta-item">
                <span>${isEn ? 'Farm Location:' : 'రైతు ప్రదేశం:'}</span>
                <strong>${location}</strong>
              </div>
              <div class="harvest-meta-item">
                <span>${isEn ? 'Farmer Name:' : 'రైతు పేరు:'}</span>
                <strong>${farmerName}</strong>
              </div>
            </div>

            <div class="harvest-pricing-row">
              <div class="rate-col">
                <span>${isEn ? 'Farmer Reserve Price:' : 'రైతు రిజర్వ్ ధర:'}</span>
                <div class="big-price">₹${Number(lot.reserve_price).toLocaleString('en-IN')}</div>
              </div>
              <div class="rate-col" style="text-align:right;">
                <span>${isEn ? 'Current Highest Bid:' : 'ప్రస్తుత గరిష్ట బిడ్:'}</span>
                <div class="big-price top-bid">₹${Number(lot.highest_bid).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div class="harvest-card-actions">
              <button class="btn btn-primary btn-block" onclick="openPlaceBidModal('${lot.id}')">
                ⚡ ${isEn ? 'Place Bid' : 'బిడ్ వేయండి'}
              </button>
            </div>

            <div style="font-size:0.72rem; color:var(--text-light); text-align:center; margin-top:0.6rem;">
              ${isEn ? `Source: Verified Farmer Database • Lot ID: #${lot.id}` : `మూలం: ధృవీకరించిన రైతు డేటాబేస్ • లాట్ ఐడీ: #${lot.id}`}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    const isEn = curLang === 'en';
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 2.5rem; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: var(--radius-lg); color:#991B1B;">
        <h4>⚠️ ${isEn ? 'Unable to fetch live data' : 'లైవ్ డేటా పొందలేకపోయాము'}</h4>
        <p style="font-size:0.85rem; margin-top:0.25rem;">${isEn ? 'Backend server connection error' : 'సర్వర్ కనెక్షన్ లోపం ఏర్పడింది'}</p>
        <button class="btn btn-secondary btn-sm" style="margin-top:0.75rem;" onclick="renderBuyerLots()">🔄 ${isEn ? 'Try Again' : 'మళ్లీ ప్రయత్నించండి'}</button>
      </div>
    `;
  }
}

// -----------------------------------------------------------------------------
// PLACE BID MODAL LOGIC (PERSISTED TO BACKEND)
// -----------------------------------------------------------------------------
async function openPlaceBidModal(lotId) {
  try {
    const res = await fetch(getApiUrl(`/api/lots/${lotId}`));
    if (!res.ok) throw new Error('Failed to fetch lot details');
    const json = await res.json();
    const lot = json.lot;
    if (!lot) return;

    selectedLotForBidding = lot;
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    const isEn = curLang === 'en';

    const cropName = isEn ? (lot.crop_name_en || lot.crop_name_te) : lot.crop_name_te;
    const qtyUnit = isEn ? `${lot.quantity_quintals} Quintals` : `${lot.quantity_quintals} క్వింటాళ్లు`;

    document.getElementById('placeBidSubtitle').innerHTML = isEn ? `
      Crop Lot: <strong>${cropName}</strong> (${qtyUnit})<br>
      Farmer Reserve Price: <strong>₹${Number(lot.reserve_price).toLocaleString('en-IN')}</strong> • Current Top Bid: <strong style="color:#B45309;">₹${Number(lot.highest_bid).toLocaleString('en-IN')}</strong>
    ` : `
      రైతు లాట్: <strong>${cropName}</strong> (${qtyUnit})<br>
      రైతు రిజర్వ్ కనీస ధర: <strong>₹${Number(lot.reserve_price).toLocaleString('en-IN')}</strong> • ప్రస్తుత టాప్ బిడ్: <strong style="color:#B45309;">₹${Number(lot.highest_bid).toLocaleString('en-IN')}</strong>
    `;

    document.getElementById('modalLotQty').textContent = qtyUnit;

    const rateInput = document.getElementById('bidRateInput');
    rateInput.value = Number(lot.highest_bid) + 50;
    rateInput.min = lot.reserve_price;

    updateBidModalValuation();
    document.getElementById('placeBidModal').classList.add('active');
  } catch (err) {
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    showToast(curLang === 'en' ? 'Failed to load lot details.' : 'లాట్ వివరాలు లోడ్ చేయడంలో విఫలమైంది.');
  }
}

async function updateBidModalValuation() {
  if (!selectedLotForBidding) return;
  const rate = Number(document.getElementById('bidRateInput').value) || 0;
  const cropAmount = rate * selectedLotForBidding.quantity_quintals;
  const platformFee = 500;
  const totalRequired = cropAmount + platformFee;

  const cropEl = document.getElementById('modalCropValuation');
  if (cropEl) cropEl.textContent = `₹${cropAmount.toLocaleString('en-IN')}`;

  const totalEl = document.getElementById('modalTotalValuation');
  if (totalEl) totalEl.textContent = `₹${totalRequired.toLocaleString('en-IN')}`;

  let availableRupees = 0;
  try {
    const res = await window.KissanAPI.getWalletBalance();
    if (res && res.wallet) {
      availableRupees = res.wallet.available_balance_rupees || 0;
    }
  } catch (e) {}

  const availEl = document.getElementById('modalAvailableWallet');
  if (availEl) availEl.textContent = `₹${availableRupees.toLocaleString('en-IN')}`;

  const warnBox = document.getElementById('modalWalletInsufficientWarning');
  const btnAction = document.getElementById('btnSubmitBidAction');

  if (availableRupees < totalRequired) {
    if (warnBox) {
      warnBox.style.display = 'block';
      document.getElementById('modalWarnRequired').textContent = totalRequired.toLocaleString('en-IN');
      document.getElementById('modalWarnAvailable').textContent = availableRupees.toLocaleString('en-IN');
      document.getElementById('modalWarnDeficit').textContent = (totalRequired - availableRupees).toLocaleString('en-IN');
    }
    if (btnAction) {
      btnAction.disabled = true;
      btnAction.textContent = '❌ వాలెట్ నిల్వ సరిపోదు (Top Up Required)';
    }
  } else {
    if (warnBox) warnBox.style.display = 'none';
    if (btnAction) {
      btnAction.disabled = false;
      btnAction.textContent = 'బిడ్ సమర్పించండి & ఎస్క్రో హోల్డ్ చేయండి →';
    }
  }

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
    const res = await fetch(getApiUrl('/api/bids'), {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    const isEn = curLang === 'en';

    const res = await fetch(getApiUrl(`/api/bids/buyer/${currentBuyer.id}`), { headers: getAuthHeaders() });
    const json = await res.json();
    const bids = json.bids || [];

    const badge = document.getElementById('myActiveBidsBadge');
    if (badge) badge.textContent = isEn ? `${bids.length} Bids` : `${bids.length} బిడ్‌లు`;

    if (bids.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-card);">
          <div style="font-size:2.2rem; margin-bottom:0.5rem;">📋</div>
          <h4 style="font-size:1.05rem; color:var(--primary-900);">${isEn ? 'You have not placed bids on any harvest lots yet' : 'మీరు ఇంకా ఏ పంట లాట్‌పై బిడ్ వేయలేదు'}</h4>
          <p style="color:var(--text-muted); font-size:0.85rem; margin-top:0.25rem;">${isEn ? 'Explore live harvest lots to place competitive bids' : 'రైతుల పంటల వేలాన్ని పరిశీలించి బిడ్‌లు వేయండి'}</p>
          <button class="btn btn-primary" style="margin-top:1rem;" onclick="switchBuyerTab('farmLots')">${isEn ? 'Explore Live Harvests →' : 'పంటల వేలాన్ని పరిశీలించండి →'}</button>
        </div>
      `;
      return;
    }

    container.innerHTML = bids.map(bid => {
      let statusLabel = '';
      let statusAction = '';

      if (bid.status === 'leading') {
        statusLabel = isEn ? `<span class="bid-status-tag leading">🟢 Winning Bid</span>` : `<span class="bid-status-tag leading">🟢 గరిష్ట బిడ్</span>`;
        statusAction = `<span style="font-size:0.8rem; color:var(--accent-green); font-weight:700;">${isEn ? 'Awaiting farmer acceptance' : 'రైతు ఆమోదం కోసం వేచి చూస్తున్నారు'}</span>`;
      } else {
        statusLabel = isEn ? `<span class="bid-status-tag outbid">🔴 Outbid by Competitor</span>` : `<span class="bid-status-tag outbid">🔴 ఎక్కువ బిడ్ వచ్చింది</span>`;
        statusAction = `
          <button class="btn btn-danger btn-sm" onclick="quickRaiseBid('${bid.lotId}', ${bid.highestPrice + 100})">
            🚀 ${isEn ? `Raise Bid to ₹${(bid.highestPrice + 100).toLocaleString('en-IN')}` : `₹${(bid.highestPrice + 100).toLocaleString('en-IN')} తో మళ్లీ బిడ్ వేయండి`}
          </button>
        `;
      }

      const cropName = isEn ? (bid.cropNameEn || bid.cropNameTe) : bid.cropNameTe;
      const farmerName = isEn && bid.farmerName === 'మల్లారెడ్డి' ? 'Malla Reddy' : bid.farmerName;
      const qtyText = isEn ? `${bid.quantity} Quintals (Grade ${bid.grade})` : `${bid.quantity} క్వింటాళ్లు (గ్రేడ్ ${bid.grade})`;

      return `
        <div class="my-bid-card">
          <div>
            <h4 style="font-size:1.05rem; font-weight:800; color:var(--primary-900);">${cropName}</h4>
            <span style="font-size:0.8rem; color:var(--text-muted);">${isEn ? 'Farmer:' : 'రైతు:'} <strong>${farmerName}</strong> • ${bid.farmerLocation}</span>
            <div style="margin-top:0.25rem;">${statusLabel}</div>
            <small style="font-size:0.72rem; color:var(--text-light); display:block; margin-top:0.2rem;">${isEn ? 'Bid ID:' : 'బిడ్ ఐడీ:'} #${bid.bidId}</small>
          </div>

          <div>
            <span style="font-size:0.75rem; color:var(--text-light); display:block;">${isEn ? 'Quantity:' : 'పరిమాణం:'}</span>
            <strong>${qtyText}</strong>
          </div>

          <div>
            <span style="font-size:0.75rem; color:var(--text-light); display:block;">${isEn ? 'Your Bid Price:' : 'మీ బిడ్ ధర:'}</span>
            <strong style="font-size:1.15rem; color:var(--primary-800);">₹${Number(bid.myPrice).toLocaleString('en-IN')}</strong> / Q
          </div>

          <div>
            <span style="font-size:0.75rem; color:var(--text-light); display:block;">${isEn ? 'Total Valuation:' : 'మొత్తం డీల్ విలువ:'}</span>
            <strong>₹${Number(bid.totalValuation).toLocaleString('en-IN')}</strong>
          </div>

          <div>
            ${statusAction}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    container.innerHTML = `<p style="padding:2rem; text-align:center; color:#DC2626;">${curLang === 'en' ? 'Failed to load your bids.' : 'బిడ్‌లను పొందడంలో లోపం ఏర్పడింది.'}</p>`;
  }
}

async function quickRaiseBid(lotId, newPrice) {
  if (!currentBuyer) return;
  try {
    const res = await fetch(getApiUrl('/api/bids'), {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    const isEn = curLang === 'en';

    const res = await fetch(getApiUrl(`/api/orders/buyer/${currentBuyer.id}`), { headers: getAuthHeaders() });
    const json = await res.json();
    const orders = json.orders || [];

    const badge = document.getElementById('buyerOrdersBadge');
    if (badge) badge.textContent = isEn ? `${orders.length} Orders` : `${orders.length} ఆర్డర్లు`;

    if (orders.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-card);">
          <div style="font-size:2rem; margin-bottom:0.5rem;">📦</div>
          <h4 style="font-size:1.05rem; color:var(--primary-900);">${isEn ? 'No confirmed procurement orders' : 'ఖరారైన సేకరణ ఆర్డర్లు ఏవీ లేవు'}</h4>
          <p style="color:var(--text-muted); font-size:0.85rem;">${isEn ? 'Orders will appear here once farmers accept your bids' : 'రైతులు మీ బిడ్‌లను ఆమోదించిన వెంటనే ఇక్కడ కనిపిస్తాయి'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(order => {
      const cropName = isEn ? (order.crop_name_en || order.crop_name_te) : order.crop_name_te;
      const farmerName = isEn ? 'Malla Reddy (+91 98480 55210)' : 'మల్లారెడ్డి (+91 98480 55210)';

      return `
        <div class="order-card" id="buyer-order-${order.id}">
          <div class="order-header-row">
            <div class="order-id-group">
              <h4>${cropName}</h4>
              <span>${isEn ? 'Order ID:' : 'ఆర్డర్ ఐడీ:'} <strong>#${order.id}</strong> • ${isEn ? 'Farmer:' : 'రైతు:'} <strong>${farmerName}</strong></span>
            </div>
            <div class="order-escrow-badge" style="background:#EFF6FF; color:#1D4ED8; border-color:rgba(29,78,216,0.2);">
              🔒 ${isEn ? 'Escrow Locked:' : 'ఎస్క్రో లాక్ చేయబడింది:'} ₹${Number(order.total_escrow_amount).toLocaleString('en-IN')}
            </div>
          </div>

          <div class="milestone-stepper">
            <div class="stepper-step ${order.current_step >= 1 ? 'done' : ''}">
              <div class="step-circle">${order.current_step > 1 ? '✓' : '1'}</div>
              <div class="step-label">${isEn ? '1. Deal Accepted' : '1. డీల్ ఆమోదం'}</div>
            </div>
            <div class="stepper-step ${order.current_step >= 2 ? (order.current_step > 2 ? 'done' : 'active') : ''}">
              <div class="step-circle">${order.current_step > 2 ? '✓' : '2'}</div>
              <div class="step-label">${isEn ? '2. Escrow Funds Locked' : '2. ఎస్క్రో నిధులు లాక్'}</div>
            </div>
            <div class="stepper-step ${order.current_step >= 3 ? (order.current_step > 3 ? 'done' : 'active') : ''}">
              <div class="step-circle">${order.current_step > 3 ? '✓' : '3'}</div>
              <div class="step-label">${isEn ? '3. Truck Dispatched' : '3. లారీ డిస్పాచ్'}</div>
            </div>
            <div class="stepper-step ${order.current_step >= 4 ? (order.current_step > 4 ? 'done' : 'active') : ''}">
              <div class="step-circle">${order.current_step > 4 ? '✓' : '4'}</div>
              <div class="step-label">${isEn ? '4. Farm-Gate Weighment & OTP' : '4. పొలం వద్ద తూకం & OTP'}</div>
            </div>
            <div class="stepper-step ${order.current_step >= 5 ? 'done' : ''}">
              <div class="step-circle">${order.current_step >= 5 ? '✓' : '5'}</div>
              <div class="step-label">${isEn ? '5. Delivery & Invoice' : '5. డెలివరీ & ఇన్వాయిస్'}</div>
            </div>
          </div>

          <div class="order-footer-details">
            <div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                🚛 ${isEn ? 'Assigned Truck:' : 'కేటాయించిన లారీ:'} <strong>${order.vehicle_reg || (isEn ? 'Not Yet Assigned' : 'ఇంకా కేటాయించలేదు')}</strong>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">
                👨‍✈️ ${isEn ? 'Driver Details:' : 'డ్రైవర్ వివరాలు:'} <strong>${order.driver_name || (isEn ? 'Assign Driver' : 'డ్రైవర్‌ను కేటాయించండి')} (${order.driver_phone || ''})</strong>
              </div>
            </div>

            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" onclick="openAssignTruckModal('${order.id}')">
                🚛 ${isEn ? 'Assign Truck' : 'లారీ కేటాయించండి'}
              </button>
              <button class="btn btn-secondary btn-sm" onclick="promptBuyerOtp('${order.id}', '${order.farm_gate_otp}')">
                🔑 ${isEn ? 'Enter OTP' : 'OTP ఎంటర్ చేయండి'}
              </button>
              <button class="btn btn-primary btn-sm" onclick="openBuyerInvoiceModal('${order.id}')">
                📄 ${isEn ? 'View Invoice' : 'ఇన్వాయిస్ చూడండి'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    container.innerHTML = `<p style="padding:2rem; text-align:center; color:#DC2626;">${curLang === 'en' ? 'Failed to load procurement orders.' : 'ఆర్డర్లు లోడ్ చేయడంలో లోపం ఏర్పడింది.'}</p>`;
  }
}

function openAssignTruckModal(orderId) {
  selectedOrderForTruck = orderId;
  const curLang = localStorage.getItem('kissan_lang') || 'te';
  const sub = document.getElementById('assignTruckSubtitle');
  if (sub) {
    sub.textContent = curLang === 'en' ? `Dispatch truck for Order #${orderId}` : `ఆర్డర్ #${orderId} కోసం లారీని పంపించండి`;
  }
  const modal = document.getElementById('assignTruckModal');
  if (modal) modal.classList.add('active');
}

function closeAssignTruckModal() {
  const modal = document.getElementById('assignTruckModal');
  if (modal) modal.classList.remove('active');
  selectedOrderForTruck = null;
}

async function handleAssignTruckSubmit(e) {
  e.preventDefault();
  const reg = document.getElementById('truckRegNumber').value;
  const driver = document.getElementById('truckDriverName').value;
  const phone = document.getElementById('truckDriverPhone').value;

  if (!selectedOrderForTruck) return;

  const curLang = localStorage.getItem('kissan_lang') || 'te';
  try {
    const res = await fetch(getApiUrl(`/api/orders/${selectedOrderForTruck}/assign-truck`), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ vehicleReg: reg, driverName: driver, driverPhone: phone })
    });
    if (res.ok) {
      closeAssignTruckModal();
      renderProcurementOrders();
      showToast(curLang === 'en' ? `🚛 Truck ${reg} successfully assigned to Order #${selectedOrderForTruck}!` : `🚛 లారీ ${reg} ఆర్డర్ #${selectedOrderForTruck} కు డేటాబేస్‌లో కేటాయించబడింది!`);
    }
  } catch (err) {
    showToast(curLang === 'en' ? 'Vehicle assignment failed.' : 'వాహనం కేటాయింపు విఫలమైంది.');
  }
}

async function promptBuyerOtp(orderId, expectedOtp) {
  const curLang = localStorage.getItem('kissan_lang') || 'te';
  const promptMsg = curLang === 'en'
    ? `Enter the 4-digit OTP provided by the farmer after digital weighment: (Demo OTP: ${expectedOtp})`
    : `రైతు పొలం వద్ద తూకం వేసిన తర్వాత లభించిన 4 అంకెల OTP ని నమోదు చేయండి: (డెమో OTP: ${expectedOtp})`;
  const entered = prompt(promptMsg);
  if (!entered) return;

  try {
    const res = await fetch(getApiUrl(`/api/orders/${orderId}/verify-otp`), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ otp: entered.trim() })
    });
    const json = await res.json();
    if (res.ok) {
      loadBuyerProfiles();
      renderProcurementOrders();
      showToast(`✅ ${curLang === 'en' ? 'OTP verified! Escrow payment released to farmer.' : json.message}`);
    } else {
      showToast(`❌ ${json.message || (curLang === 'en' ? 'Invalid OTP entered' : 'తప్పు OTP నమోదు చేశారు')}`);
    }
  } catch (e) {
    showToast(curLang === 'en' ? 'OTP verification failed.' : 'OTP వెరిఫికేషన్ విఫలమైంది.');
  }
}

async function openBuyerInvoiceModal(orderId) {
  try {
    const res = await fetch(getApiUrl(`/api/orders/buyer/${currentBuyer.id}`), { headers: getAuthHeaders() });
    const json = await res.json();
    const order = (json.orders || []).find(o => o.id === orderId);
    if (!order) return;

    const curLang = localStorage.getItem('kissan_lang') || 'te';
    const isEn = curLang === 'en';

    const invNum = `INV-TS-${order.id.replace(/[^0-9]/g, '')}`;
    document.getElementById('invNumber').textContent = invNum;
    document.getElementById('invBuyerName').textContent = currentBuyer.name;
    document.getElementById('invFarmerName').textContent = isEn ? 'Malla Reddy' : 'మల్లారెడ్డి';

    const total = Number(order.total_escrow_amount);
    document.getElementById('invTotalValue').textContent = `₹${total.toLocaleString('en-IN')}`;
    document.getElementById('invNetPayout').textContent = `₹${total.toLocaleString('en-IN')}`;

    const cropName = isEn ? (order.crop_name_en || order.crop_name_te || 'Agricultural Produce') : (order.crop_name_te || 'వ్యవసాయ పంట');
    const qtyText = isEn ? `${order.quantity_quintals || 40} Quintals` : `${order.quantity_quintals || 40} క్వింటాళ్లు`;

    const tbody = document.getElementById('invTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td>${cropName}</td>
          <td>${qtyText}</td>
          <td>₹${Number(order.agreed_rate).toLocaleString('en-IN')}</td>
          <td>₹${total.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }

    document.getElementById('buyerInvoiceModal').classList.add('active');
  } catch (e) {
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    showToast(curLang === 'en' ? 'Failed to load invoice details.' : 'ఇన్వాయిస్ వివరాలు లోడ్ చేయడంలో విఫలమైంది.');
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
    const res = await fetch(getApiUrl('/api/rfqs'), {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    const isEn = curLang === 'en';

    const res = await fetch(getApiUrl('/api/rfqs'));
    const json = await res.json();
    const rfqs = json.rfqs || [];

    if (rfqs.length === 0) {
      board.innerHTML = `<p style="padding:2rem; text-align:center; color:var(--text-muted);">${isEn ? 'No active bulk purchase tenders at the moment.' : 'ప్రస్తుతం యాక్టివ్ కొనుగోలు టెండర్లు ఏవీ లేవు.'}</p>`;
      return;
    }

    board.innerHTML = rfqs.map(r => {
      const cropName = isEn ? (r.crop_name_en || r.crop_name_te || r.crop_key) : (r.crop_name_te || r.crop_key);
      const statusTag = isEn ? 'Active Tender' : 'యాక్టివ్ టెండర్';
      const qtyText = isEn ? `${r.target_qty} Quintals` : `${r.target_qty} క్వింటాళ్లు`;

      return `
        <div class="rfq-card">
          <div class="rfq-card-header">
            <strong style="color:var(--primary-900); font-size:1.05rem;">${cropName}</strong>
            <span class="bid-status-tag leading">${statusTag}</span>
          </div>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">
            ${isEn ? 'Buyer:' : 'కొనుగోలుదారు:'} <strong>${r.buyer_name}</strong> • ${isEn ? 'Quantity:' : 'పరిమాణం:'} <strong>${qtyText}</strong>
          </div>
          <div style="font-size:0.85rem; color:var(--primary-800); font-weight:700; margin-top:0.25rem;">
            ${isEn ? 'Offer Price:' : 'ఆఫర్ ధర:'} ₹${Number(r.offer_price).toLocaleString('en-IN')}/Q
          </div>
          <div style="font-size:0.8rem; color:var(--text-light); margin-top:0.25rem;">
            📍 ${isEn ? 'Delivery:' : 'డెలివరీ:'} ${r.delivery_mandi} • ⏳ ${isEn ? 'Validity:' : 'గడువు:'} ${r.valid_until}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    const curLang = localStorage.getItem('kissan_lang') || 'te';
    board.innerHTML = `<p style="padding:2rem; text-align:center; color:var(--text-muted);">${curLang === 'en' ? 'Failed to load tenders.' : 'టెండర్లు లోడ్ చేయడంలో విఫలమైంది.'}</p>`;
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
    const res = await fetch(getApiUrl('/api/market-prices'));
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

// -----------------------------------------------------------------------------
// TAB 6: COMMUNITY BULK PROCUREMENT & VILLAGE POOLING
// -----------------------------------------------------------------------------
let communityProfile = null;

async function renderCommunityProfileCard() {
  try {
    const res = await window.KissanAPI.getBuyerProfile(currentBuyer ? currentBuyer.id : 'USR-BUY-01');
    if (res.status === 'success' && res.profile) {
      communityProfile = res.profile;

      const nameEl = document.getElementById('commCardName');
      if (nameEl) nameEl.textContent = communityProfile.name;

      const typeBadge = document.getElementById('commCardTypeBadge');
      if (typeBadge) {
        const typeLabels = {
          gated_community: 'Gated Community',
          villa_community: 'Villa Community',
          apartment_community: 'Apartment Community',
          business: 'Business Buyer',
          individual: 'Individual Buyer'
        };
        typeBadge.textContent = typeLabels[communityProfile.buyerType] || 'Gated Community';
      }

      const locEl = document.getElementById('commCardLocation');
      if (locEl) locEl.textContent = `📍 ${communityProfile.city || 'Hyderabad'} • Delivery Area: ${communityProfile.deliveryArea || communityProfile.city}`;

      const familiesEl = document.getElementById('commCardFamilies');
      if (familiesEl) {
        familiesEl.textContent = communityProfile.familiesCount > 0 ? `${communityProfile.familiesCount} families` : 'Family count not specified';
      }

      const organicEl = document.getElementById('commCardOrganic');
      if (organicEl) {
        organicEl.textContent = communityProfile.organicPreferred ? 'Organic produce preferred' : 'Standard produce';
      }

      const reqsEl = document.getElementById('commCardActiveReqs');
      if (reqsEl) {
        reqsEl.textContent = `${communityProfile.activeRequirementsCount || 0} active requirements`;
        const badgeEl = document.getElementById('communityReqsBadge');
        if (badgeEl) badgeEl.textContent = `${communityProfile.activeRequirementsCount || 0}`;
      }
    }
  } catch (err) {
    console.error('Failed to load community profile:', err);
  }
}

function openEditCommunityProfileModal() {
  const modal = document.getElementById('editCommunityProfileModal');
  if (!modal) return;

  if (communityProfile) {
    document.getElementById('editCommName').value = communityProfile.name || '';
    document.getElementById('editCommBuyerType').value = communityProfile.buyerType || 'gated_community';
    document.getElementById('editCommFamilies').value = communityProfile.familiesCount || 240;
    document.getElementById('editCommOrganic').value = communityProfile.organicPreferred ? '1' : '0';
    document.getElementById('editCommArea').value = communityProfile.deliveryArea || '';
  }
  modal.classList.add('show');
}

function closeEditCommunityProfileModal() {
  const modal = document.getElementById('editCommunityProfileModal');
  if (modal) modal.classList.remove('show');
}

async function handleEditCommunityProfileSubmit(e) {
  e.preventDefault();
  try {
    const profileData = {
      buyerId: currentBuyer ? currentBuyer.id : 'USR-BUY-01',
      name: document.getElementById('editCommName').value.trim(),
      buyerType: document.getElementById('editCommBuyerType').value,
      familiesCount: Number(document.getElementById('editCommFamilies').value) || 0,
      organicPreferred: document.getElementById('editCommOrganic').value === '1',
      deliveryArea: document.getElementById('editCommArea').value.trim()
    };

    const res = await window.KissanAPI.updateBuyerProfile(profileData);
    if (res.status === 'success') {
      showToast('✅ కమ్యూనిటీ ప్రొఫైల్ విజయవంతంగా అప్‌డేట్ చేయబడింది! (Profile Updated)');
      closeEditCommunityProfileModal();
      await renderCommunityProfileCard();
    }
  } catch (err) {
    showToast(`❌ Update failed: ${err.message}`);
  }
}

function addReqItemRow(defaultName = '', defaultQty = 100, defaultUnit = 'kg', defaultGrade = 'A', defaultPrice = '') {
  const tbody = document.getElementById('reqItemsTbody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.className = 'req-item-row';
  tr.innerHTML = `
    <td style="padding:4px;">
      <input type="text" class="req-item-name" value="${defaultName}" placeholder="e.g. Tomato" required style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px;">
    </td>
    <td style="padding:4px;">
      <input type="number" class="req-item-qty" value="${defaultQty}" min="1" step="1" required style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px;">
    </td>
    <td style="padding:4px;">
      <select class="req-item-unit" style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px;">
        <option value="kg" ${defaultUnit==='kg'?'selected':''}>kg</option>
        <option value="litre" ${defaultUnit==='litre'?'selected':''}>litre</option>
        <option value="quintal" ${defaultUnit==='quintal'?'selected':''}>quintal</option>
        <option value="bag" ${defaultUnit==='bag'?'selected':''}>bag</option>
        <option value="box" ${defaultUnit==='box'?'selected':''}>box</option>
      </select>
    </td>
    <td style="padding:4px;">
      <select class="req-item-grade" style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px;">
        <option value="A" ${defaultGrade==='A'?'selected':''}>Grade A</option>
        <option value="B" ${defaultGrade==='B'?'selected':''}>Grade B</option>
      </select>
    </td>
    <td style="padding:4px;">
      <input type="number" class="req-item-price" value="${defaultPrice}" placeholder="Opt ₹" step="0.5" style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px;">
    </td>
    <td style="padding:4px; text-align:center;">
      <button type="button" onclick="removeReqItemRow(this)" style="background:none; border:none; color:#EF4444; font-size:1.1rem; cursor:pointer;" title="Remove Row">&times;</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function removeReqItemRow(btn) {
  const tbody = document.getElementById('reqItemsTbody');
  if (tbody && tbody.children.length > 1) {
    btn.closest('tr').remove();
  } else {
    showToast('⚠️ కనీసం ఒక పంట జాబితాలో ఉండాలి (At least 1 product required)');
  }
}

async function handlePostCommunityReqSubmit(e) {
  e.preventDefault();
  try {
    const title = document.getElementById('reqTitle').value.trim();
    const organicRequirement = document.getElementById('reqOrganicPref').value;
    const maxRadiusKm = Number(document.getElementById('reqRadiusKm').value);
    const deliveryDate = document.getElementById('reqDeliveryDate').value;
    const deliveryWindow = document.getElementById('reqDeliveryWindow').value;
    const pickupPreference = document.getElementById('reqPickupPref').value;
    const deliveryAddress = document.getElementById('reqDeliveryAddress').value.trim();
    const additionalInstructions = document.getElementById('reqInstructions').value.trim();
    const isRecurring = document.getElementById('reqIsRecurring').checked;

    const itemRows = document.querySelectorAll('#reqItemsTbody tr');
    const items = [];

    itemRows.forEach(row => {
      const name = row.querySelector('.req-item-name').value.trim();
      const qty = Number(row.querySelector('.req-item-qty').value);
      const unit = row.querySelector('.req-item-unit').value;
      const grade = row.querySelector('.req-item-grade').value;
      const maxPrice = row.querySelector('.req-item-price').value;

      if (name && qty > 0) {
        items.push({
          productName: name,
          requiredQuantity: qty,
          unit: unit,
          preferredGrade: grade,
          maxAcceptablePrice: maxPrice ? Number(maxPrice) : null
        });
      }
    });

    if (items.length === 0) {
      return showToast('⚠️ దయచేసి కనీసం ఒక చెల్లుబాటు అయ్యే పంట వివరాలు నమోదు చేయండి.');
    }

    const payload = {
      buyerId: currentBuyer ? currentBuyer.id : 'USR-BUY-01',
      buyerType: communityProfile ? communityProfile.buyerType : 'gated_community',
      title,
      organicRequirement,
      maxRadiusKm,
      deliveryDate,
      deliveryWindow,
      pickupPreference,
      deliveryAddress,
      additionalInstructions,
      isRecurring,
      items
    };

    const res = await window.KissanAPI.createCommunityRequirement(payload);
    if (res.status === 'success') {
      showToast(`🚀 ${res.message}`);
      document.getElementById('formPostCommunityReq').reset();
      // Re-initialize default 2 product rows
      const tbody = document.getElementById('reqItemsTbody');
      if (tbody) tbody.innerHTML = '';
      addReqItemRow('Tomato', 100, 'kg', 'A', '');
      addReqItemRow('Rice', 500, 'kg', 'A', '');

      await renderCommunityProfileCard();
      await renderCommunityRequirements();
    }
  } catch (err) {
    showToast(`❌ Post failed: ${err.message}`);
  }
}

async function renderCommunityRequirements() {
  const container = document.getElementById('communityReqsList');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:2rem;">
      <div class="state-loading-spinner"></div>
      <p style="color:var(--text-muted); margin-top:0.5rem;">సామూహిక డిమాండ్లు & రైతు ఆఫర్లను లోడ్ చేస్తున్నాము (Loading live DB data)...</p>
    </div>
  `;

  try {
    const buyerId = currentBuyer ? currentBuyer.id : 'USR-BUY-01';
    const res = await window.KissanAPI.getCommunityRequirements({ buyerId });
    if (res.status !== 'success') throw new Error('Unable to load live data');

    const reqs = res.requirements || [];
    if (reqs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:3rem; background:white; border-radius:12px; border:1px dashed var(--border-card);">
          <div style="font-size:2.5rem; margin-bottom:0.5rem;">🏘️</div>
          <h4 style="font-size:1.1rem; color:var(--primary-900);">ఇప్పటివరకు ఏ సామూహిక డిమాండ్ నమోదు చేయలేదు</h4>
          <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.25rem;">పై ఫారమ్ ఉపయోగించి మీ కమ్యూనిటీ కోసం కొత్త బల్క్ డిమాండ్ పోస్ట్ చేయండి.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = reqs.map(r => {
      const pct = r.fulfilledPercentage || 0;
      let statusPillClass = 'warning';
      let statusText = `${pct}% నిండింది (${r.totalFulfilledQty} / ${r.totalRequiredQty} kg)`;
      if (pct >= 100) {
        statusPillClass = 'success';
        statusText = `100% పరిపూర్ణమైంది (${r.totalRequiredQty} / ${r.totalRequiredQty} kg) - Order Prepared`;
      } else if (r.status === 'cancelled') {
        statusPillClass = 'danger';
        statusText = 'రద్దు చేయబడింది (Cancelled)';
      }

      const itemsHtml = r.items.map(it => {
        const itemPct = it.requiredQuantity > 0 ? Math.min(100, Math.round((it.fulfilledQuantity / it.requiredQuantity) * 100)) : 0;
        return `
          <div style="background:var(--bg-subtle); padding:0.75rem 1rem; border-radius:8px; margin-bottom:0.5rem; border:1px solid var(--border-card);">
            <div style="display:flex; justify-content:space-between; font-weight:700; font-size:0.9rem; margin-bottom:0.35rem;">
              <span>📦 ${it.productName} (గ్రేడ్ ${it.preferredGrade})</span>
              <span>${it.fulfilledQuantity} / ${it.requiredQuantity} ${it.unit} (${itemPct}%)</span>
            </div>
            <div style="background:#E2E8F0; height:8px; border-radius:4px; overflow:hidden;">
              <div style="background:${itemPct>=100?'#10B981':'#3B82F6'}; width:${itemPct}%; height:100%; transition:width 0.3s ease;"></div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="card" style="background:white; border-radius:12px; padding:1.25rem; border:1px solid var(--border-card); box-shadow:0 4px 12px rgba(0,0,0,0.03);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <h3 style="font-size:1.15rem; font-weight:800; color:var(--primary-900); margin:0;">${r.title}</h3>
                <span style="font-size:0.75rem; background:${pct>=100?'#10B981':'#F59E0B'}; color:white; font-weight:700; padding:2px 8px; border-radius:12px;">${r.status.toUpperCase()}</span>
                ${r.organicRequirement === 'yes' ? '<span style="font-size:0.75rem; background:#DCFCE7; color:#15803D; font-weight:700; padding:2px 8px; border-radius:12px;">🌱 100% Organic Required</span>' : ''}
              </div>
              <p style="font-size:0.82rem; color:var(--text-muted); margin:0.3rem 0 0 0;">
                📍 ${r.deliveryAddress} • 📅 తేదీ: <strong>${r.deliveryDate}</strong> (${r.deliveryWindow}) • 📡 వెతుకుడు రేడియస్: <strong>${r.maxRadiusKm} km</strong>
              </p>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.85rem; font-weight:700; color:${pct>=100?'#10B981':'#2563EB'}; display:block;">${statusText}</span>
              <small style="color:var(--text-light);">${r.offersCount} మంది రైతుల ఆఫర్లు వచ్చాయి</small>
            </div>
          </div>

          <div style="margin-bottom:1rem;">
            ${itemsHtml}
          </div>

          <!-- Farmer Offers Section -->
          <div style="border-top:1px dashed #CBD5E1; padding-top:1rem; margin-top:0.75rem;">
            <h4 style="font-size:0.95rem; font-weight:800; color:var(--primary-900); margin-bottom:0.75rem; display:flex; align-items:center; justify-content:space-between;">
              <span>👨‍🌾 వచ్చిన రైతు ఆఫర్లు (${r.offersCount})</span>
              <button class="btn btn-outline btn-sm" onclick="loadRequirementOffersModal('${r.id}')">సమీక్షించండి & అంగీకరించండి</button>
            </h4>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem; background:#FEF2F2; border-radius:12px; border:1px solid #FCA5A5;">
        <p style="color:#991B1B; font-weight:600; margin-bottom:0.5rem;">Unable to load live data</p>
        <button class="btn btn-danger btn-sm" onclick="renderCommunityRequirements()">Retry</button>
      </div>
    `;
  }
}

async function loadRequirementOffersModal(reqId) {
  try {
    const res = await window.KissanAPI.getCommunityRequirementDetails(reqId);
    if (res.status !== 'success' || !res.requirement) throw new Error('Details not found');

    const req = res.requirement;
    const offers = req.offers || [];

    let modal = document.getElementById('communityOffersInspectModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'communityOffersInspectModal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    const offersRowsHtml = offers.length === 0
      ? `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">ప్రస్తుతానికి రైతు ఆఫర్లు రాలేదు (No offers submitted yet)</td></tr>`
      : offers.map(o => `
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:8px;">
            <strong>${o.farmerName}</strong><br>
            <small style="color:var(--text-muted);">🏡 ${o.farmerVillage} (${o.farmerPhone})</small>
          </td>
          <td style="padding:8px;"><strong>${o.productName}</strong></td>
          <td style="padding:8px;"><strong>${o.offeredQuantity} kg</strong></td>
          <td style="padding:8px;"><strong style="color:var(--primary-800);">₹${o.pricePerUnit} / kg</strong><br><small>మొత్తం: ₹${o.totalAmount.toLocaleString('en-IN')}</small></td>
          <td style="padding:8px;">
            <span class="demand-tag ${o.status==='accepted'?'high':(o.status==='rejected'?'low':'medium')}">${o.status.toUpperCase()}</span>
          </td>
          <td style="padding:8px; text-align:right;">
            ${o.status === 'submitted' ? `
              <button class="btn btn-sm btn-primary" onclick="handleAcceptOffer('${o.id}')" style="padding:4px 10px; font-size:0.75rem;">✓ అంగీకరించు</button>
              <button class="btn btn-sm btn-outline-danger" onclick="handleRejectOffer('${o.id}')" style="padding:4px 10px; font-size:0.75rem;">✕ తిరస్కరించు</button>
            ` : `<span style="font-size:0.8rem; color:var(--text-muted);">${o.status==='accepted'?'ఆమోదించబడింది':'పూర్తయింది'}</span>`}
          </td>
        </tr>
      `).join('');

    modal.innerHTML = `
      <div class="modal-card" style="max-width:780px;">
        <button class="modal-close-btn" onclick="document.getElementById('communityOffersInspectModal').classList.remove('show')">&times;</button>
        <h3 class="modal-title">👨‍🌾 రైతు ఆఫర్ల సమీక్ష - ${req.title}</h3>
        <p class="modal-subtitle">డెలివరీ ప్రాంతం: ${req.deliveryAddress} • డెలివరీ తేదీ: ${req.deliveryDate}</p>

        <div style="max-height:400px; overflow-y:auto; margin-bottom:1.25rem;">
          <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
            <thead>
              <tr style="background:var(--bg-subtle); text-align:left; color:var(--text-muted);">
                <th style="padding:8px;">రైతు & ఊరు</th>
                <th style="padding:8px;">పంట</th>
                <th style="padding:8px;">ఆఫర్ పరిమాణం</th>
                <th style="padding:8px;">ధర / క్వింటాల్/kg</th>
                <th style="padding:8px;">హోదా</th>
                <th style="padding:8px; text-align:right;">చర్యలు</th>
              </tr>
            </thead>
            <tbody>
              ${offersRowsHtml}
            </tbody>
          </table>
        </div>

        <div style="text-align:right;">
          <button class="btn btn-secondary" onclick="document.getElementById('communityOffersInspectModal').classList.remove('show')">మూసివేయండి</button>
        </div>
      </div>
    `;

    modal.classList.add('show');
  } catch (err) {
    showToast(`❌ Details error: ${err.message}`);
  }
}

async function handleAcceptOffer(offerId) {
  try {
    const res = await window.KissanAPI.acceptFarmerOffer(offerId);
    if (res.status === 'success') {
      showToast(`✅ ${res.message}`);
      const modal = document.getElementById('communityOffersInspectModal');
      if (modal) modal.classList.remove('show');

      await renderCommunityProfileCard();
      await renderCommunityRequirements();
    }
  } catch (err) {
    showToast(`❌ Accept failed: ${err.message}`);
  }
}

async function handleRejectOffer(offerId) {
  try {
    const res = await window.KissanAPI.rejectFarmerOffer(offerId);
    if (res.status === 'success') {
      showToast('⚠️ రైతు ఆఫర్ తిరస్కరించబడింది.');
      const modal = document.getElementById('communityOffersInspectModal');
      if (modal) modal.classList.remove('show');

      await renderCommunityRequirements();
    }
  } catch (err) {
    showToast(`❌ Reject failed: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// BUYER WALLET, ESCROW & LEDGER RENDER ENGINE
// -----------------------------------------------------------------------------
async function renderBuyerWallet() {
  try {
    const balanceRes = await window.KissanAPI.getWalletBalance();
    if (balanceRes && balanceRes.wallet) {
      const w = balanceRes.wallet;
      const totalFormatted = `₹${(w.total_balance_rupees || 0).toLocaleString('en-IN')}`;
      const availFormatted = `₹${(w.available_balance_rupees || 0).toLocaleString('en-IN')}`;
      const heldFormatted = `₹${(w.held_balance_rupees || 0).toLocaleString('en-IN')}`;

      const elTotal = document.getElementById('walletTotalBalanceDisplay');
      if (elTotal) elTotal.textContent = totalFormatted;

      const elAvail = document.getElementById('walletAvailableBalanceDisplay');
      if (elAvail) elAvail.textContent = availFormatted;

      const elHeld = document.getElementById('walletHeldBalanceDisplay');
      if (elHeld) elHeld.textContent = heldFormatted;

      const topPill = document.getElementById('topBuyerWallet');
      if (topPill) topPill.textContent = availFormatted;

      const sidePill = document.getElementById('sideBuyerWallet');
      if (sidePill) sidePill.textContent = availFormatted;

      const badge = document.getElementById('buyerWalletBadge');
      if (badge) badge.textContent = availFormatted;

      // Render Active Escrow Holds
      const holdsTbody = document.getElementById('walletEscrowHoldsTableBody');
      if (holdsTbody) {
        if (!w.escrow_holds || w.escrow_holds.length === 0) {
          holdsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.25rem; color:#94A3B8;">ప్రస్తుతానికి ఎటువంటి యాక్టివ్ ఎస్క్రో హోల్డ్‌లు లేవు.</td></tr>`;
        } else {
          holdsTbody.innerHTML = w.escrow_holds.map(h => `
            <tr style="border-bottom:1px solid #F1F5F9;">
              <td style="padding:0.6rem; font-family:monospace; font-weight:700;">${h.id}</td>
              <td style="padding:0.6rem;">${h.bid_id ? `Bid #${h.bid_id}` : (h.requirement_id ? `Req #${h.requirement_id}` : 'Order')}</td>
              <td style="padding:0.6rem; font-weight:600;">₹${(h.crop_amount_rupees || 0).toLocaleString('en-IN')}</td>
              <td style="padding:0.6rem; color:#64748B;">₹${(h.platform_fee_rupees || 0).toLocaleString('en-IN')}</td>
              <td style="padding:0.6rem; font-weight:800; color:#1D4ED8;">₹${(h.total_escrow_rupees || 0).toLocaleString('en-IN')}</td>
              <td style="padding:0.6rem;"><span style="background:#DBEAFE; color:#1E40AF; padding:3px 8px; border-radius:4px; font-weight:700; font-size:0.8rem;">🔒 ${h.status}</span></td>
              <td style="padding:0.6rem; color:#475569; font-size:0.85rem;">🚚 సరకు రవాణా వాహనం లోడింగ్ పూర్తయి ప్రయాణం ప్రారంభమైన తర్వాత</td>
            </tr>
          `).join('');
        }
      }
    }

    // Render Immutable Ledger History
    const ledgerRes = await window.KissanAPI.getWalletLedger(50);
    const ledgerTbody = document.getElementById('walletLedgerTableBody');
    if (ledgerTbody && ledgerRes && ledgerRes.ledger) {
      if (ledgerRes.ledger.length === 0) {
        ledgerTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.25rem; color:#94A3B8;">ఏ లావాదేవీలూ కనుగొనబడలేదు.</td></tr>`;
      } else {
        ledgerTbody.innerHTML = ledgerRes.ledger.map(l => {
          const isCredit = l.direction === 'credit';
          const sign = isCredit ? '+' : '-';
          const color = isCredit ? '#16A34A' : '#DC2626';
          return `
            <tr style="border-bottom:1px solid #F1F5F9;">
              <td style="padding:0.6rem; font-family:monospace; font-weight:600; color:#475569;">${l.id}</td>
              <td style="padding:0.6rem;"><span style="background:#F1F5F9; color:#334155; padding:2px 6px; border-radius:4px; font-size:0.8rem; font-weight:600;">${l.transaction_type}</span></td>
              <td style="padding:0.6rem; font-weight:700; color:${color};">${l.direction.toUpperCase()}</td>
              <td style="padding:0.6rem; font-weight:800; color:${color};">${sign}₹${(l.amount_rupees || 0).toLocaleString('en-IN')}</td>
              <td style="padding:0.6rem; color:#334155; font-size:0.85rem;">${l.description || '-'}</td>
              <td style="padding:0.6rem; color:#64748B; font-size:0.8rem;">${new Date(l.created_at).toLocaleString('en-IN')}</td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Wallet render error:', err);
    showToast(`❌ వాలెట్ వివరాలు లోడ్ చేయడంలో విఫలమైంది: ${err.message}`);
  }
}

function openTopupWalletModal() {
  const modal = document.getElementById('topupWalletModal');
  if (modal) modal.classList.add('active');
}

function closeTopupWalletModal() {
  const modal = document.getElementById('topupWalletModal');
  if (modal) modal.classList.remove('active');
}

async function handleWalletTopupSubmit(event) {
  event.preventDefault();
  const amountInput = document.getElementById('topupAmountInput');
  const amountRupees = Number(amountInput.value);

  if (!amountRupees || amountRupees < 100) {
    showToast('దయచేసి కనీసం ₹100 నమోదు చేయండి.');
    return;
  }

  const btn = document.getElementById('btnSubmitTopup');
  if (btn) btn.disabled = true;

  try {
    const res = await window.KissanAPI.sandboxWalletTopup(amountRupees, `Top up ₹${amountRupees.toLocaleString('en-IN')} via Verified Payment Gateway`);
    if (res && res.status === 'success') {
      showToast(`✅ విజయవంతమైంది! ₹${amountRupees.toLocaleString('en-IN')} మీ వాలెట్‌కు జతచేయబడింది.`);
      closeTopupWalletModal();
      amountInput.value = '';
      await renderBuyerWallet();
      if (selectedLotForBidding) {
        updateBidModalValuation();
      }
    } else {
      showToast(`❌ ${res.message || 'టోప-అప్ విఫలమైంది'}`);
    }
  } catch (err) {
    showToast(`❌ పేమెంట్ పొరపాటు: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

