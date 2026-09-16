/**
 * KISSAN CONNECT (కిసాన్ కనెక్ట్) - MAIN APPLICATION LOGIC
 * Phase 1: Human-Made Clean UI & Complete Farmer Portal
 */

let activeFarmerTab = 'biddingArena';
let selectedLotForCounter = null;
let selectedBidForCounter = null;
let otpResendInterval = null;

// Chart instances & controls
let priceChartInstance = null;
let volumeChartInstance = null;
let activeChartCrop = 'teja_chilli';
let activeChartTimeframe = '15D';

const TAB_NAMES = {
  biddingArena: { te: 'లైవ్ బిడ్డింగ్ వార్', en: 'Live Bidding War' },
  createLot:    { te: 'కొత్త పంట లిస్ట్ చేయండి', en: 'List New Crop Lot' },
  marketCharts: { te: 'మార్కెట్ చార్ట్‌లు & ట్రెండ్స్', en: 'Market Charts & Trends' },
  holdVsSell:   { te: 'అమ్మాలా? నిల్వ చేయాలా?', en: 'Hold or Sell? (AI Advisor)' },
  ordersEscrow: { te: 'ఆర్డర్లు & ఎస్క్రో ట్రాకర్', en: 'Orders & Escrow Tracker' },
  disputes:     { te: 'సమస్య పరిష్కారం', en: 'Dispute Redressal' }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  renderMandiTicker();
  renderMandiSnapshot();
  renderBiddingArena();
  updateHoldSellAdvice();
  renderOrdersEscrow();
  calculateDemandAsk();
  updateTabBreadcrumb();
  updateMarketCharts();
  setLanguage(currentLang);
});

// Toast Notification Helper
function showToast(message, duration = 4000) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.innerHTML = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// -----------------------------------------------------------------------------
// VIEW NAVIGATION & ROLE SELECTOR
// -----------------------------------------------------------------------------
function openFarmerAuth() {
  const modal = document.getElementById('farmerAuthModal');
  modal.classList.add('active');
  document.getElementById('authStepPhone').classList.add('active');
  document.getElementById('authStepOtp').classList.remove('active');
  document.getElementById('farmerPhoneInput').focus();
}

function closeFarmerAuth() {
  document.getElementById('farmerAuthModal').classList.remove('active');
  clearInterval(otpResendInterval);
}

function handleRoleClick(role) {
  if (role === 'buyer') {
    showToast(currentLang === 'te' 
      ? '🏢 కొనుగోలుదారు పోర్టల్ (Phase 2): ప్రస్తుతం రైతు పోర్టల్ (Phase 1) పరిశీలించండి.' 
      : '🏢 Buyer Portal (Phase 2): Currently focusing on Farmer Portal (Phase 1).');
  } else if (role === 'logistics') {
    showToast(currentLang === 'te' 
      ? '🚛 రవాణా పోర్టల్ (Phase 3): తదుపరి దశలో ప్రారంభమవుతుంది.' 
      : '🚛 Logistics Portal (Phase 3): Will be activated in the next phase.');
  }
}

function backToRoleSelect() {
  confirmSwitchRole();
}

function confirmSwitchRole() {
  document.getElementById('farmerPortalView').classList.remove('active');
  document.getElementById('roleSelectView').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(currentLang === 'te' 
    ? '🏠 మీరు ప్రధాన పాత్ర ఎంపిక స్క్రీన్‌కు వచ్చారు.' 
    : '🏠 Returned to role selection screen.');
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
// FARMER AUTHENTICATION (MOBILE + OTP FLOW)
// -----------------------------------------------------------------------------
function handleSendOtp(e) {
  if (e) e.preventDefault();
  const phone = document.getElementById('farmerPhoneInput').value;
  if (!phone || phone.length < 10) {
    showToast('దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.');
    return;
  }

  document.getElementById('displayTargetPhone').textContent = `+91 ${phone}`;
  document.getElementById('authStepPhone').classList.remove('active');
  document.getElementById('authStepOtp').classList.add('active');

  // Start 30s countdown timer
  let timeLeft = 30;
  const timerEl = document.getElementById('timerSecs');
  const timerTextEl = document.getElementById('resendTimerText');
  const resendBtn = document.getElementById('btnResendOtp');

  timerTextEl.style.display = 'inline';
  resendBtn.style.display = 'none';

  clearInterval(otpResendInterval);
  otpResendInterval = setInterval(() => {
    timeLeft--;
    if (timerEl) timerEl.textContent = `${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(otpResendInterval);
      timerTextEl.style.display = 'none';
      resendBtn.style.display = 'inline-block';
    }
  }, 1000);

  showToast(currentLang === 'te' ? `📲 OTP పంపబడింది: ${phone}` : `📲 OTP sent to +91 ${phone}`);
  document.getElementById('otp1').focus();
}

function focusNextOtp(index) {
  const currentInput = document.getElementById(`otp${index}`);
  if (currentInput.value.length === 1 && index < 6) {
    document.getElementById(`otp${index + 1}`).focus();
  }
}

function autoFillDemoOtp() {
  const demoOtp = "842109";
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`otp${i}`);
    if (input) input.value = demoOtp[i - 1];
  }
  showToast(currentLang === 'te' ? '✅ డెమో OTP 842109 నింపబడింది' : '✅ Demo OTP 842109 auto-filled');
}

function handleVerifyOtp(e) {
  if (e) e.preventDefault();
  let enteredOtp = '';
  for (let i = 1; i <= 6; i++) {
    enteredOtp += document.getElementById(`otp${i}`).value;
  }

  if (enteredOtp.length < 6) {
    showToast(currentLang === 'te' ? 'దయచేసి 6 అంకెల OTP పూర్తి చేయండి.' : 'Please enter all 6 digits of the OTP.');
    return;
  }

  closeFarmerAuth();
  // Transition to Farmer Portal
  document.getElementById('roleSelectView').classList.remove('active');
  document.getElementById('farmerPortalView').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  showToast(currentLang === 'te' 
    ? '🌾 స్వాగతం మల్లారెడ్డి గారు! మీ రైతు డాష్‌బోర్డ్ సిద్ధంగా ఉంది.' 
    : '🌾 Welcome Sri Malla Reddy! Your Farmer Dashboard is ready.');
}

// -----------------------------------------------------------------------------
// FARMER TAB NAVIGATION
// -----------------------------------------------------------------------------
function switchFarmerTab(tabName) {
  activeFarmerTab = tabName;

  // Remove active from all sidebar nav buttons
  document.querySelectorAll('.sidebar-nav-item').forEach(btn => btn.classList.remove('active'));
  // Remove active from all tab panes
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
  }

  window.scrollTo({ top: 90, behavior: 'smooth' });
}

// -----------------------------------------------------------------------------
// TAB 3: CHART.JS INTERACTIVE MARKET CHARTS & TRENDS
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

  // 1. Update KPI Metric Cards
  const curPriceEl = document.getElementById('metricCurrentPrice');
  const priceChangeEl = document.getElementById('metricPriceChange');
  const highPriceEl = document.getElementById('metricHighPrice');
  const arrivalsEl = document.getElementById('metricArrivals');
  const arrivalsChangeEl = document.getElementById('metricArrivalsChange');
  const actionAdviceEl = document.getElementById('metricActionAdvice');

  if (curPriceEl) curPriceEl.textContent = `₹${cropData.currentPrice.toLocaleString('en-IN')} / Q`;
  if (priceChangeEl) {
    const arrow = cropData.priceTrend === 'up' ? '▲' : '▼';
    priceChangeEl.textContent = `${arrow} ${cropData.priceChange} (${isTe ? `గత ${activeChartTimeframe}` : `in ${activeChartTimeframe}`})`;
    priceChangeEl.className = `metric-change ${cropData.priceTrend === 'up' ? 'up' : 'down'}`;
  }
  if (highPriceEl) {
    highPriceEl.textContent = `₹${cropData.highPrice.toLocaleString('en-IN')} / Q`;
    const sub = highPriceEl.nextElementSibling;
    if (sub) sub.textContent = isTe ? cropData.highLocationTe : cropData.highLocationEn;
  }
  if (arrivalsEl) {
    arrivalsEl.textContent = isTe ? cropData.arrivals : cropData.arrivalsEn;
  }
  if (arrivalsChangeEl) {
    arrivalsChangeEl.textContent = isTe ? cropData.arrivalsChangeTe : cropData.arrivalsChangeEn;
    arrivalsChangeEl.className = `metric-change ${cropData.arrivalsTrend === 'up' ? 'up' : 'down'}`;
  }
  if (actionAdviceEl) {
    actionAdviceEl.textContent = isTe ? cropData.actionAdviceTe : cropData.actionAdviceEn;
    const sub = actionAdviceEl.nextElementSibling;
    if (sub) sub.textContent = isTe ? cropData.actionSubTe : cropData.actionSubEn;
  }

  const labels = isTe ? tfData.labelsTe : tfData.labelsEn;

  // 2. Render or Update Price Trend Line Chart
  const priceCanvas = document.getElementById('priceTrendCanvas');
  if (priceCanvas) {
    const ctxPrice = priceCanvas.getContext('2d');
    if (priceChartInstance) {
      priceChartInstance.destroy();
    }

    const gradient = ctxPrice.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(45, 106, 79, 0.28)');
    gradient.addColorStop(1, 'rgba(45, 106, 79, 0.01)');

    priceChartInstance = new Chart(ctxPrice, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: isTe ? 'వాస్తవ సగటు బిడ్ (Clearing Bid)' : 'Market Clearing Bid',
            data: tfData.actualBid,
            borderColor: '#2D6A4F',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: '#1B4332',
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: isTe ? 'రైతు కనీస రిజర్వ్ ధర (Ask)' : 'Farmer Reserve Ask',
            data: tfData.reserveAsk,
            borderColor: '#D97706',
            borderDash: [5, 4],
            borderWidth: 2,
            pointRadius: 3,
            fill: false,
            tension: 0.3
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
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { family: isTe ? 'Noto Sans Telugu, Inter' : 'Inter', size: 12, weight: '600' }
            }
          },
          tooltip: {
            backgroundColor: '#123524',
            titleFont: { size: 13, weight: '700' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ₹${context.parsed.y.toLocaleString('en-IN')}/Q`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(val) {
                return '₹' + val.toLocaleString('en-IN');
              },
              font: { family: 'Inter', size: 11 }
            },
            grid: {
              color: '#E5E7EB'
            }
          },
          x: {
            ticks: {
              font: { family: isTe ? 'Noto Sans Telugu, Inter' : 'Inter', size: 11 }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  // 3. Render or Update Volume Trend Bar Chart
  const volumeCanvas = document.getElementById('volumeTrendCanvas');
  if (volumeCanvas) {
    const ctxVol = volumeCanvas.getContext('2d');
    if (volumeChartInstance) {
      volumeChartInstance.destroy();
    }

    volumeChartInstance = new Chart(ctxVol, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: isTe ? 'మార్కెట్ రాకల పరిమాణం (Arrival Volume)' : 'Arrival Volume',
            data: tfData.arrivals,
            backgroundColor: '#52B788',
            hoverBackgroundColor: '#2D6A4F',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { family: isTe ? 'Noto Sans Telugu, Inter' : 'Inter', size: 12, weight: '600' }
            }
          },
          tooltip: {
            backgroundColor: '#123524',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${context.parsed.y.toLocaleString('en-IN')} ${isTe ? 'బస్తాలు' : 'Bags'}`;
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(val) {
                return val >= 1000 ? (val / 1000) + 'k' : val;
              },
              font: { family: 'Inter', size: 11 }
            },
            grid: {
              color: '#E5E7EB'
            }
          },
          x: {
            ticks: {
              font: { family: isTe ? 'Noto Sans Telugu, Inter' : 'Inter', size: 11 }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
}

// -----------------------------------------------------------------------------
// MANDI TICKER & SNAPSHOT
// -----------------------------------------------------------------------------
function renderMandiTicker() {
  const tickerTrack = document.getElementById('tickerTrack');
  if (!tickerTrack) return;

  let itemsHtml = '';
  // Repeat list twice for seamless infinite slide
  const list = [...TELANGANA_MANDIS, ...TELANGANA_MANDIS];

  list.forEach(m => {
    const mandiName = currentLang === 'te' ? m.nameTe : m.nameEn;
    const arrow = m.trend === 'up' ? '▲' : '▼';
    const trendClass = m.trend === 'up' ? 'up' : 'down';

    itemsHtml += `
      <div class="ticker-item">
        <strong>${mandiName}</strong>
        <span>(${m.crop}):</span>
        <span class="rate">₹${m.price.toLocaleString('en-IN')}/Q</span>
        <span class="trend ${trendClass}">${arrow} ${m.change}</span>
      </div>
    `;
  });

  tickerTrack.innerHTML = itemsHtml;
}

function renderMandiSnapshot() {
  const container = document.getElementById('mandiSnapshotList');
  if (!container) return;

  container.innerHTML = TELANGANA_MANDIS.slice(0, 4).map(m => {
    const name = currentLang === 'te' ? m.nameTe : m.nameEn;
    const arrow = m.trend === 'up' ? '▲' : '▼';
    const color = m.trend === 'up' ? '#16A34A' : '#DC2626';
    return `
      <div class="mandi-snapshot-item">
        <div>
          <strong>${name}</strong><br>
          <small style="color: var(--text-muted);">${m.crop}</small>
        </div>
        <div style="text-align: right;">
          <strong style="color: var(--primary-900);">₹${m.price.toLocaleString('en-IN')}</strong><br>
          <small style="color: ${color}; font-weight: 700;">${arrow} ${m.change}</small>
        </div>
      </div>
    `;
  }).join('');
}

// -----------------------------------------------------------------------------
// TAB 1: BIDDING WAR ARENA (FARMER IN DRIVER'S SEAT)
// -----------------------------------------------------------------------------
function renderBiddingArena() {
  const container = document.getElementById('farmerLotsList');
  if (!container) return;

  if (INITIAL_FARMER_LOTS.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-card);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🌾</div>
        <p>ప్రస్తుతం యాక్టివ్ లాట్లు లేవు. కొత్త పంటను లిస్ట్ చేయండి.</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="switchFarmerTab('createLot')">➕ పంటను లిస్ట్ చేయండి</button>
      </div>
    `;
    return;
  }

  container.innerHTML = INITIAL_FARMER_LOTS.map(lot => {
    const cropTitle = currentLang === 'te' ? lot.cropNameTe : lot.cropNameEn;
    const variety = currentLang === 'te' ? lot.varietyTe : lot.varietyEn;
    const location = currentLang === 'te' ? lot.locationTe : lot.locationEn;
    const storage = currentLang === 'te' ? lot.storageTe : lot.storageEn;

    // Build bids list
    const bidsHtml = lot.bids.map(bid => {
      const logisticsText = currentLang === 'te' ? bid.logisticsTextTe : bid.logisticsTextEn;
      const isBuyerVehicle = bid.logisticsMode === 'buyer_vehicle';
      const isTopBid = bid.pricePerQ === lot.highestBid;
      const totalPayout = bid.pricePerQ * lot.quantity;

      return `
        <div class="bid-item-row ${isTopBid ? 'highest-bid' : ''}">
          <div class="buyer-meta-info">
            <div class="buyer-name-line">
              <span class="buyer-name">${bid.buyerName}</span>
              <span class="buyer-rating-badge">${bid.buyerRating}</span>
            </div>
            <span class="buyer-location">📍 ${bid.buyerLocation}</span>
          </div>

          <div>
            <span class="bid-logistics-badge ${isBuyerVehicle ? 'buyer-vehicle' : 'platform-transporter'}">
              ${logisticsText}
            </span>
          </div>

          <div class="bid-pricing-summary">
            <span class="bid-rate-per-q">₹${bid.pricePerQ.toLocaleString('en-IN')} <small style="font-size:0.75rem; font-weight:600; color:var(--text-light);">/ క్వింటాల్</small></span>
            <span class="bid-total-payout">మొత్తం: <strong>₹${totalPayout.toLocaleString('en-IN')}</strong></span>
          </div>

          <div class="bid-action-buttons">
            <button class="btn btn-primary btn-sm" onclick="acceptBuyerBid('${lot.id}', '${bid.bidId}')" title="రైతు ఈ బిడ్‌ను ఆమోదిస్తారు">
              ✓ ${currentLang === 'te' ? 'ఆమోదించు' : 'Accept'}
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openCounterModal('${lot.id}', '${bid.bidId}', ${bid.pricePerQ})">
              💬 ${currentLang === 'te' ? 'కౌంటర్' : 'Counter'}
            </button>
            <button class="btn btn-outline btn-sm" onclick="rejectBuyerBid('${lot.id}', '${bid.bidId}')" title="తిరస్కరించు">
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
              <img src="${lot.image}" alt="${cropTitle}" onerror="this.src='assets/crops/teja_chilli.jpg'">
              <div class="lot-status-tag">
                <span class="live-dot" style="background:#fff; width:6px; height:6px;"></span>
                <span>లైవ్ బిడ్డింగ్ వార్</span>
              </div>
            </div>

            <div class="lot-specs-summary">
              <div class="lot-spec-item">
                <span>పరిమాణం (Qty):</span>
                <strong>${lot.quantity} క్వింటాళ్లు</strong>
              </div>
              <div class="lot-spec-item">
                <span>గ్రేడ్ / నాణ్యత:</span>
                <strong>గ్రేడ్ ${lot.grade} (తేమ ${lot.moisture})</strong>
              </div>
              <div class="lot-spec-item">
                <span>ప్రదేశం:</span>
                <strong>${location}</strong>
              </div>
              <div class="lot-spec-item">
                <span>నిల్వ:</span>
                <strong>${storage}</strong>
              </div>
            </div>
          </div>

          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-card); font-size: 0.78rem; color: var(--text-muted);">
            రైతు లాట్ ఐడీ: <strong>${lot.id}</strong>
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
                <div class="fin-label">మీ రిజర్వ్ ధర (Ask)</div>
                <div class="fin-val">₹${lot.reservePrice.toLocaleString('en-IN')}</div>
              </div>
              <div class="financial-col">
                <div class="fin-label">ప్రస్తుత గరిష్ట బిడ్ (Top Bid)</div>
                <div class="fin-val highlight">₹${lot.highestBid.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          <div class="bids-table-header">
            <div class="bids-table-title">
              <span>వచ్చిన బిడ్‌లు (${lot.bids.length})</span>
              <small style="color: var(--text-muted); font-weight: normal;">• రైతుకు నచ్చిన బిడ్‌ను మాత్రమే ఎంచుకునే పూర్తి స్వేచ్ఛ ఉంది</small>
            </div>
            <div class="auction-timer-badge">
              ⏳ ముగింపు: <strong>${lot.auctionEndsIn}</strong>
            </div>
          </div>

          <div class="incoming-bids-list">
            ${bidsHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Update badge
  const totalBids = INITIAL_FARMER_LOTS.reduce((sum, l) => sum + l.bids.length, 0);
  document.getElementById('activeBidsBadge').textContent = `${totalBids} బిడ్‌లు`;
}

// -----------------------------------------------------------------------------
// FARMER BID ACTIONS (ACCEPT, COUNTER, REJECT)
// -----------------------------------------------------------------------------
function acceptBuyerBid(lotId, bidId) {
  const lot = INITIAL_FARMER_LOTS.find(l => l.id === lotId);
  if (!lot) return;
  const bid = lot.bids.find(b => b.bidId === bidId);
  if (!bid) return;

  const totalAmount = bid.pricePerQ * lot.quantity;

  // Create new active escrow order
  const newOrder = {
    orderId: `KC-TS-2026-${Math.floor(100 + Math.random() * 900)}`,
    lotId: lot.id,
    cropNameTe: `${lot.cropNameTe} (${lot.quantity} క్వింటాళ్లు)`,
    cropNameEn: `${lot.cropNameEn} (${lot.quantity} Quintals)`,
    buyerName: bid.buyerName,
    buyerPhone: '+91 98480 88291',
    agreedRate: bid.pricePerQ,
    totalEscrowAmount: totalAmount,
    currentStep: 2, // Escrow Locked immediately!
    farmGateOtp: String(Math.floor(1000 + Math.random() * 9000)),
    vehicleNumber: 'TS 03 TA 4821 (ట్రక్ బయలుదేరింది)',
    driverName: 'సురేష్ కుమార్ (రవాణా డ్రైవర్)',
    estimatedArrival: 'రేపు ఉదయం 10:00 గంటలకు'
  };

  ACTIVE_ORDERS.unshift(newOrder);

  // Remove lot from active bidding
  INITIAL_FARMER_LOTS = INITIAL_FARMER_LOTS.filter(l => l.id !== lotId);

  // Update UI
  renderBiddingArena();
  renderOrdersEscrow();
  document.getElementById('activeOrdersBadge').textContent = `${ACTIVE_ORDERS.length} యాక్టివ్`;

  showToast(currentLang === 'te'
    ? `🎉 అభినందనలు! ${bid.buyerName} తో డీల్ ఖరారైంది. ₹${totalAmount.toLocaleString('en-IN')} మొత్తం ఎస్క్రో ఖాతాలో లాక్ చేయబడింది!`
    : `🎉 Deal Confirmed with ${bid.buyerName}! ₹${totalAmount.toLocaleString('en-IN')} locked in digital escrow.`
  );

  // Switch to orders tab after 1.5s so farmer sees the escrow progress
  setTimeout(() => {
    switchFarmerTab('ordersEscrow');
  }, 1600);
}

function rejectBuyerBid(lotId, bidId) {
  const lot = INITIAL_FARMER_LOTS.find(l => l.id === lotId);
  if (!lot) return;
  lot.bids = lot.bids.filter(b => b.bidId !== bidId);
  renderBiddingArena();
  showToast(currentLang === 'te' ? '❌ బిడ్ తిరస్కరించబడింది.' : '❌ Bid rejected by farmer.');
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

  const lot = INITIAL_FARMER_LOTS.find(l => l.id === selectedLotForCounter);
  if (lot) {
    const bid = lot.bids.find(b => b.bidId === selectedBidForCounter);
    if (bid) {
      bid.pricePerQ = counterPrice;
      if (counterPrice > lot.highestBid) {
        lot.highestBid = counterPrice;
      }
    }
  }

  closeCounterModal();
  renderBiddingArena();
  showToast(currentLang === 'te'
    ? `💬 కొనుగోలుదారుకు ₹${counterPrice.toLocaleString('en-IN')} కౌంటర్ ఆఫర్ పంపబడింది. రైతు షరతులకు అంగీకారం కోసం ఎదురుచూస్తున్నారు.`
    : `💬 Counter offer of ₹${counterPrice.toLocaleString('en-IN')} sent to buyer.`);
}

// -----------------------------------------------------------------------------
// TAB 2: CREATE LOT & DEMAND-BASED SMART ASK
// -----------------------------------------------------------------------------
function onCropSelected() {
  const cropKey = document.getElementById('cropSelect').value;
  const config = CROPS_CONFIG[cropKey];
  if (!config) return;

  // Update variety text
  document.getElementById('cropVariety').value = currentLang === 'te' ? config.defaultVarietyTe : config.defaultVarietyEn;

  // Update image preview
  document.getElementById('lotPreviewImg').src = config.image;

  calculateDemandAsk();
}

function calculateDemandAsk() {
  const cropKey = document.getElementById('cropSelect').value;
  const config = CROPS_CONFIG[cropKey];
  if (!config) return;

  const qty = Number(document.getElementById('lotQuantity').value) || 10;
  const grade = document.getElementById('cropGrade').value;

  // Multiplier by grade
  let multiplier = 1.0;
  if (grade === 'A') multiplier = 1.05;
  if (grade === 'C') multiplier = 0.93;

  const minSuggested = Math.round((config.suggestedMin * multiplier) / 50) * 50;
  const maxSuggested = Math.round((config.suggestedMax * multiplier) / 50) * 50;

  // Update Demand indicator
  const indicatorEl = document.getElementById('smartDemandIndicator');
  indicatorEl.innerHTML = currentLang === 'te'
    ? `డిమాండ్ స్థితి: <span class="demand-tag ${config.demandTag}">${config.demandStatusTe}</span>`
    : `Demand Status: <span class="demand-tag ${config.demandTag}">${config.demandStatusEn}</span>`;

  document.getElementById('suggestedPriceRange').textContent = `₹${minSuggested.toLocaleString('en-IN')} – ₹${maxSuggested.toLocaleString('en-IN')} / క్వింటాల్`;
  document.getElementById('suggestedExplanation').textContent = currentLang === 'te' ? config.reasonTe : config.reasonEn;

  // Set default ask price to fair suggested min
  document.getElementById('farmerAskPrice').value = minSuggested;
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
    cropKey: cropKey,
    cropNameTe: config.nameTe,
    cropNameEn: config.nameEn,
    varietyTe: variety,
    varietyEn: variety,
    quantity: quantity,
    grade: grade,
    moisture: grade === 'A' ? '9.5%' : '12.0%',
    locationTe: location,
    locationEn: location,
    storageTe: 'పొలంలోనే ఉంది (Farm Gate)',
    storageEn: 'Farm Gate Pickup',
    reservePrice: askPrice,
    highestBid: askPrice + 350,
    auctionEndsIn: '23h : 59m : 59s',
    image: imgSrc,
    bids: [
      {
        bidId: `BID-${Math.floor(100 + Math.random() * 900)}`,
        buyerName: 'వరంగల్ కమర్షియల్ ఆగ్రో ప్రైవేట్ లిమిటెడ్',
        buyerRating: '4.8 ★ (32 డీల్స్)',
        buyerLocation: 'వరంగల్ (Enumamula)',
        pricePerQ: askPrice + 350,
        logisticsMode: 'buyer_vehicle',
        logisticsTextTe: '🚛 కొనుగోలుదారుడే సొంత లారీ పంపుతారు (రైతుకు ఖర్చు ₹0)',
        logisticsTextEn: '🚛 Buyer will send own truck (₹0 farmer cost)',
        status: 'active'
      },
      {
        bidId: `BID-${Math.floor(100 + Math.random() * 900)}`,
        buyerName: 'హైదరాబాద్ రిటైల్ సూపర్ మార్కెట్స్ కార్పొరేషన్',
        buyerRating: '4.6 ★ (26 డీల్స్)',
        buyerLocation: 'హైదరాబాద్ (Bowenpally)',
        pricePerQ: askPrice + 100,
        logisticsMode: 'platform_transport',
        logisticsTextTe: '🚚 ప్లాట్‌ఫామ్ రవాణాదారుడు కావాలి',
        logisticsTextEn: '🚚 Platform transporter required',
        status: 'active'
      }
    ]
  };

  INITIAL_FARMER_LOTS.unshift(newLot);

  showToast(currentLang === 'te'
    ? `🚀 మీ ${config.nameTe} విజయవంతంగా లైవ్ బిడ్డింగ్ కోసం లిస్ట్ చేయబడింది!`
    : `🚀 Your ${config.nameEn} is now LIVE for competitive buyer bidding!`
  );

  switchFarmerTab('biddingArena');
}

// -----------------------------------------------------------------------------
// TAB 3: HOLD OR SELL AI ADVISOR
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

  // Decision Box
  decisionBox.className = `decision-recommendation-box ${data.recommendation}`;
  decisionBox.innerHTML = `
    <div class="decision-verdict">${currentLang === 'te' ? data.verdictTe : data.verdictEn}</div>
    <div class="decision-detail">${currentLang === 'te' ? data.explanationTe : data.explanationEn}</div>
  `;

  // Comparison Grid
  comparisonGrid.innerHTML = `
    <div class="comparison-card">
      <div class="comparison-card-title">1. ఇప్పుడే మార్కెట్లో అమ్మితే (Sell Today)</div>
      <div class="comparison-big-rate">₹${data.currentMandiPrice.toLocaleString('en-IN')} <small style="font-size:0.8rem; font-weight:500;">/ క్వింటాల్</small></div>
      <ul class="comparison-meta-list">
        <li>• తక్షణ నగదు లభ్యత</li>
        <li>• వేర్‌హౌస్ నిల్వ చార్జీలు: ₹0</li>
        <li>• వాతావరణం లేదా పురుగుల రిస్క్: లేదు</li>
      </ul>
    </div>

    <div class="comparison-card" style="border-color: var(--primary-600); background: #FAFDFB;">
      <div class="comparison-card-title">2. TSWC గోదాములో 15 రోజులు నిల్వ చేస్తే (Hold 15 Days)</div>
      <div class="comparison-big-rate" style="color: var(--primary-700);">₹${data.projected15DayPrice.toLocaleString('en-IN')} <small style="font-size:0.8rem; font-weight:500;">/ క్వింటాల్</small></div>
      <ul class="comparison-meta-list">
        <li>• అంచనా ధర పెరుగుదల: <strong>+₹${(data.projected15DayPrice - data.currentMandiPrice).toLocaleString('en-IN')}/Q</strong></li>
        <li>• ప్రభుత్వ గోదాము అద్దె (15 రోజులకు): <strong>-₹${data.tswcRentPerQ}/Q</strong></li>
        <li style="color: var(--accent-green); font-weight: 700;">• అదనపు నికర లాభం: +₹${data.netGainPerQ.toLocaleString('en-IN')} / క్వింటాల్</li>
      </ul>
    </div>
  `;

  // Nearby TSWC Warehouses
  warehouseGrid.innerHTML = data.nearbyTSWC.map(w => `
    <div class="warehouse-card">
      <div class="wh-name">🏛️ ${w.name}</div>
      <div class="wh-dist">📍 మీ పొలం నుండి దూరం: <strong>${w.dist}</strong></div>
      <div class="wh-stat-row">
        <span>లభ్యత:</span>
        <strong style="color: #16A34A;">${w.capacity}</strong>
      </div>
      <div class="wh-stat-row">
        <span>ప్రభుత్వ అద్దె:</span>
        <strong>${w.rate}</strong>
      </div>
    </div>
  `).join('');
}

// -----------------------------------------------------------------------------
// TAB 4: ORDERS & ESCROW LIFECYCLE TRACKER
// -----------------------------------------------------------------------------
function renderOrdersEscrow() {
  const container = document.getElementById('ordersEscrowContainer');
  if (!container) return;

  if (ACTIVE_ORDERS.length === 0) {
    container.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--text-muted);">యాక్టివ్ ఎస్క్రో ఆర్డర్లు ఏవీ లేవు.</p>`;
    return;
  }

  container.innerHTML = ACTIVE_ORDERS.map(order => {
    return `
      <div class="order-card" id="order-${order.orderId}">
        <div class="order-header-row">
          <div class="order-id-group">
            <h4>${order.cropNameTe}</h4>
            <span>ఆర్డర్ ఐడీ: <strong>#${order.orderId}</strong> • కొనుగోలుదారు: <strong>${order.buyerName}</strong></span>
          </div>
          <div class="order-escrow-badge">
            🛡️ ఎస్క్రోలో భద్రంగా ఉంది: ₹${order.totalEscrowAmount.toLocaleString('en-IN')}
          </div>
        </div>

        <!-- 5-Step Milestone Stepper -->
        <div class="milestone-stepper">
          <div class="stepper-step ${order.currentStep >= 1 ? 'done' : ''}">
            <div class="step-circle">${order.currentStep > 1 ? '✓' : '1'}</div>
            <div class="step-label">1. బిడ్ ఆమోదం (Deal Accepted)</div>
          </div>
          <div class="stepper-step ${order.currentStep >= 2 ? (order.currentStep > 2 ? 'done' : 'active') : ''}">
            <div class="step-circle">${order.currentStep > 2 ? '✓' : '2'}</div>
            <div class="step-label">2. ఎస్క్రో డిపాజిట్ (Funds Locked)</div>
          </div>
          <div class="stepper-step ${order.currentStep >= 3 ? (order.currentStep > 3 ? 'done' : 'active') : ''}">
            <div class="step-circle">${order.currentStep > 3 ? '✓' : '3'}</div>
            <div class="step-label">3. లారీ రాక (Truck En Route)</div>
          </div>
          <div class="stepper-step ${order.currentStep >= 4 ? (order.currentStep > 4 ? 'done' : 'active') : ''}">
            <div class="step-circle">${order.currentStep > 4 ? '✓' : '4'}</div>
            <div class="step-label">4. పొలం వద్ద OTP (Farm-Gate OTP)</div>
          </div>
          <div class="stepper-step ${order.currentStep >= 5 ? 'done' : ''}">
            <div class="step-circle">${order.currentStep >= 5 ? '✓' : '5'}</div>
            <div class="step-label">5. బ్యాంక్ చెల్లింపు విడుదల (Paid)</div>
          </div>
        </div>

        <!-- Details & OTP verification box -->
        <div class="order-footer-details">
          <div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">
              🚛 కేటాయించిన వాహనం: <strong>${order.vehicleNumber}</strong> • డ్రైవర్: <strong>${order.driverName}</strong>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              ⏱️ రాక సమయం: <strong>${order.estimatedArrival}</strong>
            </div>
          </div>

          <div class="order-otp-action-box">
            ${order.currentStep < 5 ? `
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">పొలం వద్ద డ్రైవర్‌కు చూపించాల్సిన OTP:</span>
                <span class="farm-otp-pill">${order.farmGateOtp}</span>
              </div>
              <button class="btn btn-primary btn-sm" onclick="completeDeliveryOtp('${order.orderId}')">
                🔓 లోడింగ్ ధృవీకరించు (Verify OTP)
              </button>
            ` : `
              <div style="color: var(--accent-green); font-weight: 700; font-size: 0.95rem;">
                ✅ చెల్లింపు నేరుగా రైతు బ్యాంక్ ఖాతాకు జమ చేయబడింది!
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function completeDeliveryOtp(orderId) {
  const order = ACTIVE_ORDERS.find(o => o.orderId === orderId);
  if (!order) return;

  order.currentStep = 5;
  renderOrdersEscrow();

  // Update wallet display
  const currentWallet = 148500;
  const newWallet = currentWallet + order.totalEscrowAmount;
  const walletStr = `₹${newWallet.toLocaleString('en-IN')}`;
  
  const displayWalletEl = document.getElementById('displayWalletAmount');
  if (displayWalletEl) displayWalletEl.innerHTML = `${walletStr} <small>(జమ చేయబడింది)</small>`;
  
  const topDisplayWalletEl = document.getElementById('topDisplayWallet');
  if (topDisplayWalletEl) topDisplayWalletEl.textContent = walletStr;

  showToast(currentLang === 'te'
    ? `💰 అద్భుతం! OTP ధృవీకరించబడింది. ₹${order.totalEscrowAmount.toLocaleString('en-IN')} మొత్తం తక్షణమే మీ SBI ఖాతాకు బదిలీ చేయబడింది!`
    : `💰 OTP Verified! ₹${order.totalEscrowAmount.toLocaleString('en-IN')} credited into your bank account via instant escrow release!`
  );
}

// -----------------------------------------------------------------------------
// TAB 5: GRIEVANCE REDRESSAL TICKET
// -----------------------------------------------------------------------------
function handleDisputeSubmit(e) {
  e.preventDefault();
  const orderId = document.getElementById('disputeOrderSelect').value;
  const type = document.getElementById('disputeType').value;
  const details = document.getElementById('disputeDetails').value;

  showToast(currentLang === 'te'
    ? `🚨 మీ ఫిర్యాదు నమోదు చేయబడింది (టికెట్ #TS-GRV-${Math.floor(1000 + Math.random() * 9000)}). ఎస్క్రో నిధులు సురక్షితంగా తాత్కాలికంగా హోల్డ్ చేయబడ్డాయి. మండల అధికారి 24 గంటల్లో సంప్రదిస్తారు.`
    : `🚨 Grievance Ticket logged! Escrow funds frozen safely pending review by Nodal Officer.`
  );

  document.getElementById('disputeDetails').value = '';
}
