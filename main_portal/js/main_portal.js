/**
 * KISSAN CONNECT - MAIN PORTAL ROUTER & AUTHENTICATION
 */

let otpResendInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  renderMandiTicker();
  setupOtpInputs();

  // Close modal when clicking backdrop
  const modal = document.getElementById('farmerAuthModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeFarmerAuth();
      }
    });
  }

  // Close modal on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeFarmerAuth();
    }
  });
});

function showToast(message, duration = 3500) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.innerHTML = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// -----------------------------------------------------------------------------
// NAVIGATION & DIRECT LOGIN ACTIONS
// -----------------------------------------------------------------------------
function directFarmerLogin(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  closeFarmerAuth();
  showToast('🌾 రైతు డాష్‌బోర్డ్‌లోకి ప్రవేశిస్తున్నారు...');
  setTimeout(() => {
    window.location.href = '../farmer_portal/index.html';
  }, 350);
}

function navigateToBuyerPortal(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  showToast('🏢 కొనుగోలుదారు పోర్టల్‌లోకి తీసుకెళ్తున్నాము...');
  setTimeout(() => {
    window.location.href = '../buyer_portal/index.html';
  }, 250);
}

function navigateToLogisticsPortal(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  showToast('🚛 రవాణాదారు పోర్టల్‌లోకి తీసుకెళ్తున్నాము...');
  setTimeout(() => {
    window.location.href = '../logistics_portal/index.html';
  }, 250);
}

// -----------------------------------------------------------------------------
// FARMER MOBILE OTP AUTHENTICATION
// -----------------------------------------------------------------------------
function openFarmerAuth(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const modal = document.getElementById('farmerAuthModal');
  if (!modal) return;

  modal.classList.add('active');
  const stepPhone = document.getElementById('authStepPhone');
  const stepOtp = document.getElementById('authStepOtp');
  if (stepPhone) stepPhone.classList.add('active');
  if (stepOtp) stepOtp.classList.remove('active');

  const phoneInput = document.getElementById('farmerPhoneInput');
  if (phoneInput) {
    phoneInput.focus();
    phoneInput.select();
  }
}

function closeFarmerAuth() {
  const modal = document.getElementById('farmerAuthModal');
  if (modal) modal.classList.remove('active');
  if (otpResendInterval) clearInterval(otpResendInterval);
}

function handleSendOtp(e) {
  if (e) e.preventDefault();
  const phone = document.getElementById('farmerPhoneInput').value.trim();
  if (!phone || phone.length < 10) {
    showToast('దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.');
    return;
  }

  const targetEl = document.getElementById('displayTargetPhone');
  if (targetEl) targetEl.textContent = `+91 ${phone}`;

  const stepPhone = document.getElementById('authStepPhone');
  const stepOtp = document.getElementById('authStepOtp');
  if (stepPhone) stepPhone.classList.remove('active');
  if (stepOtp) stepOtp.classList.add('active');

  // Pre-fill demo OTP 842109 for convenience
  autoFillDemoOtp(false);

  showToast(typeof currentLang !== 'undefined' && currentLang === 'te' 
    ? `📲 OTP పంపబడింది: ${phone}` 
    : `📲 OTP sent to +91 ${phone}`);

  const otp1 = document.getElementById('otp1');
  if (otp1) otp1.focus();
}

function setupOtpInputs() {
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`otp${i}`);
    if (!input) continue;

    // Support backspace navigation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 1) {
        const prev = document.getElementById(`otp${i - 1}`);
        if (prev) prev.focus();
      }
    });

    // Support pasting full 6-digit OTP
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').trim();
      if (pasteData.length >= 6) {
        for (let j = 1; j <= 6; j++) {
          const digitEl = document.getElementById(`otp${j}`);
          if (digitEl) digitEl.value = pasteData[j - 1];
        }
        const lastEl = document.getElementById('otp6');
        if (lastEl) lastEl.focus();
        showToast('✅ 6 అంకెల OTP పేస్ట్ చేయబడింది');
      }
    });
  }
}

function focusNextOtp(index) {
  const currentInput = document.getElementById(`otp${index}`);
  if (currentInput && currentInput.value.length === 1 && index < 6) {
    const nextInput = document.getElementById(`otp${index + 1}`);
    if (nextInput) nextInput.focus();
  }
}

function autoFillDemoOtp(notify = true) {
  const demoOtp = "842109";
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`otp${i}`);
    if (input) input.value = demoOtp[i - 1];
  }
  if (notify) {
    showToast('✅ డెమో OTP 842109 నింపబడింది');
  }
}

function handleVerifyOtp(e) {
  if (e) e.preventDefault();
  let enteredOtp = '';
  for (let i = 1; i <= 6; i++) {
    const input = document.getElementById(`otp${i}`);
    if (input) enteredOtp += input.value.trim();
  }

  if (enteredOtp.length < 6) {
    showToast('దయచేసి 6 అంకెల OTP పూర్తి చేయండి.');
    return;
  }

  closeFarmerAuth();
  showToast('🌾 వెరిఫికేషన్ విజయవంతమైంది! రైతు పోర్టల్‌లోకి తీసుకెళ్తున్నాము...');
  
  setTimeout(() => {
    window.location.href = '../farmer_portal/index.html';
  }, 450);
}

// -----------------------------------------------------------------------------
// MANDI TICKER BAR
// -----------------------------------------------------------------------------
function renderMandiTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const mandis = window.IntegratedDB ? window.IntegratedDB.getMandis() : (typeof TELANGANA_MANDIS !== 'undefined' ? TELANGANA_MANDIS : []);

  const lang = typeof currentLang !== 'undefined' ? currentLang : 'te';
  const itemsHtml = mandis.map(m => `
    <span class="ticker-item">
      <strong>${lang === 'te' ? m.nameTe : m.nameEn}</strong>: ${m.crop} 
      <span class="ticker-price">₹${Number(m.price).toLocaleString('en-IN')}</span>
      <span class="ticker-trend ${m.trend}">${m.change}</span>
    </span>
  `).join('');

  track.innerHTML = itemsHtml + itemsHtml;
}
