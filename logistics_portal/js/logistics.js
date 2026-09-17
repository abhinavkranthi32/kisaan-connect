/**
 * KISSAN CONNECT - LOGISTICS FLEET PORTAL JAVASCRIPT
 */

let selectedTripForAccept = null;
let currentTripFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  renderMandiTicker();
  renderLogisticsTrips();
  updateLogisticsEarningsUI();
});

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.innerHTML = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function setTripFilter(filterKey) {
  currentTripFilter = filterKey;
  document.querySelectorAll('.trip-filter-btn').forEach(btn => {
    btn.classList.remove('active', 'btn-primary');
    btn.classList.add('btn-secondary');
  });

  const activeBtn = document.getElementById('btnFilter' + filterKey.charAt(0).toUpperCase() + filterKey.slice(1));
  if (activeBtn) {
    activeBtn.classList.remove('btn-secondary');
    activeBtn.classList.add('active', 'btn-primary');
  }

  renderLogisticsTrips();
}

function updateLogisticsEarningsUI() {
  const earningsEl = document.getElementById('logisticsEarnings');
  if (!earningsEl) return;
  const trips = window.LogisticsDB ? window.LogisticsDB.getTrips() : [];
  let totalEarnings = 48200;
  trips.forEach(t => {
    if (t.status === 'delivered') {
      totalEarnings += Number(t.freightOffer || 5000);
    }
  });
  earningsEl.textContent = `₹${totalEarnings.toLocaleString('en-IN')}`;
}

function renderLogisticsTrips() {
  const grid = document.getElementById('logisticsTripsGrid');
  if (!grid) return;

  let trips = window.LogisticsDB ? window.LogisticsDB.getTrips() : [];

  if (currentTripFilter !== 'all') {
    trips = trips.filter(t => t.status === currentTripFilter);
  }

  if (trips.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-card);">
        <div style="font-size:2.5rem; margin-bottom:0.5rem;">🚚</div>
        <p>ఎంచుకున్న కేటగిరీలో ట్రిప్పులు ఏవీ లేవు.</p>
        <button class="btn btn-secondary btn-sm" onclick="setTripFilter('all')">అన్ని ట్రిప్పులను చూడండి</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = trips.map(t => {
    const isAvailable = t.status === 'available';
    const isAssigned = t.status === 'assigned' || t.status === 'in_transit';
    const isDelivered = t.status === 'delivered';

    let statusText = 'లభ్యంగా ఉంది';
    let statusClass = 'high';

    if (isAssigned) {
      statusText = 'రవాణాలో ఉంది (Assigned)';
      statusClass = 'normal';
    } else if (isDelivered) {
      statusText = 'పూర్తయింది (Delivered)';
      statusClass = 'success';
    }

    return `
      <div class="trip-card">
        <div class="trip-card-header">
          <div>
            <h4 style="font-size:1.1rem; font-weight:800; color:var(--primary-900);">${t.cropName}</h4>
            <span style="font-size:0.75rem; color:var(--text-muted);">ట్రిప్ ఐడీ: #${t.tripId}</span>
          </div>
          <span class="demand-tag ${statusClass}">
            ${statusText}
          </span>
        </div>

        <div class="trip-route-visual">
          <div class="trip-route-line">
            <span>📍 బయలుదేరే స్థలం:</span>
            <strong>${t.origin}</strong>
          </div>
          <div class="trip-route-line">
            <span>🏁 గమ్యస్థానం:</span>
            <strong>${t.destination}</strong>
          </div>
          <div style="font-size:0.75rem; color:var(--text-light); margin-top:0.25rem;">
            అంచనా దూరం: <strong>${t.distanceKm} కి.మీ</strong> • వాహనం: <strong>${t.vehicleType}</strong>
          </div>
          ${t.assignedVehicle ? `
            <div style="font-size:0.78rem; color:var(--primary-700); margin-top:0.35rem; background:var(--primary-50); padding:0.3rem 0.6rem; border-radius:6px;">
              🚛 కేటాయించబడింది: <strong>${t.assignedVehicle}</strong> (${t.driverName || 'డ్రైవర్'})
            </div>
          ` : ''}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--border-card); padding-top:0.75rem; margin-top:0.5rem;">
          <div>
            <span style="font-size:0.75rem; color:var(--text-light); display:block;">రవాణా చార్జీలు:</span>
            <strong style="font-size:1.25rem; color:var(--primary-800);">₹${Number(t.freightOffer).toLocaleString('en-IN')}</strong>
          </div>

          <div>
            ${isAvailable ? `
              <button class="btn btn-primary btn-sm" onclick="openAcceptTripModal('${t.tripId}')">
                ✓ ట్రిప్ తీసుకోండి
              </button>
            ` : (isAssigned ? `
              <button class="btn btn-outline btn-sm" onclick="promptTripOtp('${t.tripId}', '${t.pickupOtp}')">
                🔑 OTP ధృవీకరించు
              </button>
            ` : `
              <span style="color:var(--accent-green); font-weight:700; font-size:0.85rem;">
                ✓ ఛార్జీలు చెల్లించబడ్డాయి
              </span>
            `)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openAcceptTripModal(tripId) {
  selectedTripForAccept = tripId;
  document.getElementById('acceptTripSubtitle').textContent = `ట్రిప్ #${tripId} కోసం డ్రైవర్ వివరాలు నమోదు చేయండి`;
  document.getElementById('acceptTripModal').classList.add('active');
}

function closeAcceptTripModal() {
  document.getElementById('acceptTripModal').classList.remove('active');
  selectedTripForAccept = null;
}

function handleAcceptTripSubmit(e) {
  e.preventDefault();
  const reg = document.getElementById('tripVehicleReg').value;
  const name = document.getElementById('tripDriverName').value;
  const phone = document.getElementById('tripDriverPhone').value;

  if (window.LogisticsDB && selectedTripForAccept) {
    window.LogisticsDB.acceptTrip(selectedTripForAccept, reg, name, phone);
  }

  closeAcceptTripModal();
  renderLogisticsTrips();
  showToast('🚛 ట్రిప్ విజయవంతంగా మీ ఫ్లీట్‌కు కేటాయించబడింది!');
}

function promptTripOtp(tripId, expectedOtp) {
  const entered = prompt(`సరుకు లోడ్ చేసిన తర్వాత రైతు ఇచ్చిన 4 అంకెల OTP నమోదు చేయండి: (డెమో OTP: ${expectedOtp})`, expectedOtp || '');
  if (entered) {
    if (window.LogisticsDB.verifyOtp(tripId, entered.trim())) {
      renderLogisticsTrips();
      updateLogisticsEarningsUI();
      showToast('💰 OTP ధృవీకరించబడింది! రవాణా ఛార్జీలు మీ ఖాతాకు జమ అయ్యాయి.');
    } else {
      showToast('❌ తప్పు OTP.');
    }
  }
}

function renderMandiTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const mandis = window.IntegratedDB ? window.IntegratedDB.getMandis() : (typeof TELANGANA_MANDIS !== 'undefined' ? TELANGANA_MANDIS : []);

  const lang = typeof currentLang !== 'undefined' ? currentLang : 'te';
  const itemsHtml = mandis.map(m => `
    <span class="ticker-item">
      <strong>${lang === 'te' ? m.nameTe : m.nameEn}</strong>: ${m.crop} 
      <span class="ticker-price">₹${Number(m.price).toLocaleString('en-IN')}</span>
    </span>
  `).join('');

  track.innerHTML = itemsHtml + itemsHtml;
}
