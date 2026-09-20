/**
 * KISSAN CONNECT - PREMIUM MAIN PORTAL CONTROLLER
 * Modern 6-Screen Architecture & Real SQLite Authentication Flow
 */

(function(window, document) {
  'use strict';

  // State
  let currentScreen = 'landing';
  let selectedRole = 'farmer';
  let activePhone = '';
  let resendTimer = null;
  let resendSecondsRemaining = 45;

  // Role Metadata & Personalized Content
  const ROLE_CONFIG = {
    farmer: {
      key: 'farmer',
      title: 'Farmer',
      welcomeTitle: 'Welcome, Farmer',
      welcomeSubtitle: 'Let’s help you connect with better markets for your produce.',
      pillText: 'Produce Seller',
      avatar: '👨‍🌾',
      portalUrl: '../farmer_portal/index.html',
      features: [
        'List harvest lots with your custom reserve price',
        'Receive transparent live bids from verified commercial buyers',
        'Guaranteed 100% escrow payment protection upon digital OTP loading'
      ]
    },
    buyer: {
      key: 'buyer',
      title: 'Buyer',
      welcomeTitle: 'Welcome, Buyer',
      welcomeSubtitle: 'Discover quality produce and connect with trusted farmers.',
      pillText: 'Agro Enterprise',
      avatar: '🏢',
      portalUrl: '../buyer_portal/index.html',
      features: [
        'Direct procurement from verified Telangana farm gates',
        'Transparent digital auctions, live bids, and APMC compliance',
        'Digital tax invoice generation and automated escrow locking'
      ]
    },
    logistics: {
      key: 'logistics',
      title: 'Logistics Partner',
      welcomeTitle: 'Welcome, Logistics Partner',
      welcomeSubtitle: 'Keep produce moving with reliable delivery coordination.',
      pillText: 'Fleet Haulage',
      avatar: '🚛',
      portalUrl: '../logistics_portal/index.html',
      features: [
        'Access rural agricultural haulage trips and load assignments',
        'Farm-gate digital OTP verification for secure dispatch',
        'Guaranteed fast freight payouts credited upon delivery'
      ]
    },
    admin: {
      key: 'admin',
      title: 'Administrator',
      welcomeTitle: 'Welcome, Administrator',
      welcomeSubtitle: 'Manage and monitor the Kissan Connect marketplace.',
      pillText: 'APMC Authority',
      avatar: '🛡️',
      portalUrl: '../admin_portal/index.html',
      features: [
        'Real-time APMC mandi stats and trade volume oversight',
        'Participant KYC approval and harvest lot moderation',
        'Comprehensive immutable audit logging and dispute resolution'
      ]
    }
  };

  // DOM Elements Cache
  let elements = {};

  document.addEventListener('DOMContentLoaded', () => {
    cacheDomElements();
    bindEvents();
    setupOtpInputs();
    syncLanguageButtons();
    handleInitialUrlHash();
  });

  function cacheDomElements() {
    elements = {
      header: document.getElementById('globalHeader'),
      desktopNav: document.getElementById('desktopNav'),
      btnHeaderGetStarted: document.getElementById('btnHeaderGetStarted'),
      screens: {
        landing: document.getElementById('screenLanding'),
        roleSelect: document.getElementById('screenRoleSelect'),
        welcome: document.getElementById('screenWelcome'),
        phoneLogin: document.getElementById('screenPhoneLogin'),
        otpVerify: document.getElementById('screenOtpVerify')
      },
      welcome: {
        avatar: document.getElementById('welcomeAvatar'),
        pill: document.getElementById('welcomeRolePill'),
        title: document.getElementById('welcomeTitle'),
        subtitle: document.getElementById('welcomeSubtitle'),
        features: document.getElementById('welcomeFeatures')
      },
      phoneLogin: {
        pill: document.getElementById('phoneLoginRolePill'),
        input: document.getElementById('mobileInput'),
        form: document.getElementById('phoneLoginForm'),
        error: document.getElementById('phoneErrorMsg'),
        submitBtn: document.getElementById('btnSubmitPhone')
      },
      otpVerify: {
        pill: document.getElementById('otpRolePill'),
        phoneDisplay: document.getElementById('displayTargetPhone'),
        alertBanner: document.getElementById('otpAlertBanner'),
        form: document.getElementById('otpVerifyForm'),
        resendBtn: document.getElementById('btnResendOtp'),
        resendLabel: document.getElementById('resendTimerLabel'),
        countdown: document.getElementById('resendCountdown'),
        submitBtn: document.getElementById('btnSubmitOtp')
      },
      modal: {
        backdrop: document.getElementById('redirectionModal'),
        iconWrap: document.getElementById('modalIconWrap'),
        title: document.getElementById('modalTitle'),
        desc: document.getElementById('modalDesc'),
        progressFill: document.getElementById('modalProgressFill'),
        actionBar: document.getElementById('modalActionBar')
      }
    };
  }

  function bindEvents() {
    // Mobile input formatting and digit restriction
    if (elements.phoneLogin.input) {
      elements.phoneLogin.input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        if (elements.phoneLogin.error) {
          elements.phoneLogin.error.textContent = '';
        }
      });
    }

    // Window history back handling
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.screen) {
        setScreenView(e.state.screen, false);
      } else {
        setScreenView('landing', false);
      }
    });
  }

  // ===========================================================================
  // SCREEN NAVIGATION & VIEW SWITCHING
  // ===========================================================================

  function navigateToScreen(screenName, e) {
    if (e) e.preventDefault();
    setScreenView(screenName, true);
  }
  window.navigateToScreen = navigateToScreen;

  function setScreenView(screenName, pushHistory = true) {
    if (!elements.screens[screenName]) return;

    currentScreen = screenName;

    // Update screen visibility
    Object.keys(elements.screens).forEach(key => {
      if (elements.screens[key]) {
        elements.screens[key].classList.toggle('active', key === screenName);
      }
    });

    // Update header navigation context
    if (elements.desktopNav) {
      elements.desktopNav.style.display = (screenName === 'landing') ? 'flex' : 'none';
    }
    if (elements.btnHeaderGetStarted) {
      elements.btnHeaderGetStarted.style.display = (screenName === 'landing') ? 'inline-flex' : 'none';
    }

    // Screen specific preparation
    if (screenName === 'welcome') {
      renderWelcomeScreen();
    } else if (screenName === 'phoneLogin') {
      preparePhoneLoginScreen();
    } else if (screenName === 'otpVerify') {
      prepareOtpVerifyScreen();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update history state
    if (pushHistory) {
      window.history.pushState({ screen: screenName, role: selectedRole }, '', `#${screenName}`);
    }
  }

  function handleInitialUrlHash() {
    const hash = (window.location.hash || '').replace('#', '').trim();
    if (hash && elements.screens[hash]) {
      setScreenView(hash, false);
    }
  }

  function handleNavScroll(sectionId, e) {
    if (e) e.preventDefault();
    if (currentScreen !== 'landing') {
      setScreenView('landing', false);
    }
    setTimeout(() => {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }
  window.handleNavScroll = handleNavScroll;

  // ===========================================================================
  // SCREEN 2: ROLE SELECTION
  // ===========================================================================

  function handleRoleSelection(roleKey) {
    if (!ROLE_CONFIG[roleKey]) return;
    selectedRole = roleKey;
    navigateToScreen('welcome');
  }
  window.handleRoleSelection = handleRoleSelection;

  // ===========================================================================
  // SCREEN 3: PERSONALIZED WELCOME SCREEN
  // ===========================================================================

  function renderWelcomeScreen() {
    const config = ROLE_CONFIG[selectedRole] || ROLE_CONFIG.farmer;

    if (elements.welcome.avatar) elements.welcome.avatar.textContent = config.avatar;
    if (elements.welcome.pill) elements.welcome.pill.textContent = `${config.title} Access`;
    if (elements.welcome.title) elements.welcome.title.textContent = config.welcomeTitle;
    if (elements.welcome.subtitle) elements.welcome.subtitle.textContent = config.welcomeSubtitle;

    if (elements.welcome.features) {
      elements.welcome.features.innerHTML = config.features.map(f => `
        <div class="kc-welcome-feat-item">
          <span class="kc-feat-bullet">✓</span>
          <span>${f}</span>
        </div>
      `).join('');
    }
  }

  // ===========================================================================
  // SCREEN 4: PHONE NUMBER LOGIN
  // ===========================================================================

  function preparePhoneLoginScreen() {
    const config = ROLE_CONFIG[selectedRole] || ROLE_CONFIG.farmer;
    if (elements.phoneLogin.pill) {
      elements.phoneLogin.pill.textContent = `Logging in as ${config.title}`;
    }
    if (elements.phoneLogin.error) {
      elements.phoneLogin.error.textContent = '';
    }
    if (elements.phoneLogin.input) {
      if (activePhone) {
        elements.phoneLogin.input.value = activePhone;
      }
      setTimeout(() => elements.phoneLogin.input.focus(), 150);
    }
  }

  async function handleSendOtpSubmit(e) {
    if (e) e.preventDefault();

    const phoneRaw = (elements.phoneLogin.input ? elements.phoneLogin.input.value : '').trim();
    const cleanPhone = phoneRaw.replace(/\D/g, '');

    // Strict 10-digit Indian Mobile validation
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      if (elements.phoneLogin.error) {
        elements.phoneLogin.error.textContent = 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
      }
      if (elements.phoneLogin.input) elements.phoneLogin.input.focus();
      return;
    }

    activePhone = cleanPhone;
    setButtonLoading(elements.phoneLogin.submitBtn, true);

    try {
      // Direct backend call with role parameter
      if (window.KissanAPI) {
        await window.KissanAPI.sendOtp(cleanPhone, selectedRole);
      } else {
        const res = await fetch('/api/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, role: selectedRole })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      }

      showToast(`📲 OTP sent successfully to +91 ${cleanPhone}`);
      navigateToScreen('otpVerify');
      startResendCountdown(45);

    } catch (err) {
      if (elements.phoneLogin.error) {
        elements.phoneLogin.error.textContent = err.message || 'Unable to send OTP. Please try again.';
      }
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setButtonLoading(elements.phoneLogin.submitBtn, false);
    }
  }
  window.handleSendOtpSubmit = handleSendOtpSubmit;

  // ===========================================================================
  // SCREEN 5: OTP VERIFICATION
  // ===========================================================================

  function prepareOtpVerifyScreen() {
    const config = ROLE_CONFIG[selectedRole] || ROLE_CONFIG.farmer;
    if (elements.otpVerify.pill) {
      elements.otpVerify.pill.textContent = `${config.title} Verification`;
    }
    if (elements.otpVerify.phoneDisplay) {
      const p = activePhone || '9848055210';
      elements.otpVerify.phoneDisplay.textContent = `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
    }
    if (elements.otpVerify.alertBanner) {
      elements.otpVerify.alertBanner.style.display = 'none';
      elements.otpVerify.alertBanner.textContent = '';
    }

    // Clear digit boxes
    for (let i = 1; i <= 6; i++) {
      const box = document.getElementById(`otpDigit${i}`);
      if (box) {
        box.value = '';
        box.classList.remove('filled');
      }
    }
    setTimeout(() => {
      const first = document.getElementById('otpDigit1');
      if (first) first.focus();
    }, 150);
  }

  function setupOtpInputs() {
    for (let i = 1; i <= 6; i++) {
      const box = document.getElementById(`otpDigit${i}`);
      if (!box) continue;

      // Handle digit input & auto-focus next
      box.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val[val.length - 1] : '';

        if (e.target.value) {
          box.classList.add('filled');
          if (i < 6) {
            const next = document.getElementById(`otpDigit${i + 1}`);
            if (next) next.focus();
          }
        } else {
          box.classList.remove('filled');
        }

        // Hide error banner when typing
        if (elements.otpVerify.alertBanner) {
          elements.otpVerify.alertBanner.style.display = 'none';
        }
      });

      // Handle Backspace navigation
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && i > 1) {
          const prev = document.getElementById(`otpDigit${i - 1}`);
          if (prev) {
            prev.focus();
            prev.value = '';
            prev.classList.remove('filled');
          }
        }
      });

      // Handle full 6-digit paste
      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').trim();
        if (pasteData.length >= 6) {
          for (let j = 1; j <= 6; j++) {
            const digitEl = document.getElementById(`otpDigit${j}`);
            if (digitEl) {
              digitEl.value = pasteData[j - 1];
              digitEl.classList.add('filled');
            }
          }
          const last = document.getElementById('otpDigit6');
          if (last) last.focus();
        }
      });
    }
  }

  function startResendCountdown(seconds = 45) {
    clearInterval(resendTimer);
    resendSecondsRemaining = seconds;

    if (elements.otpVerify.resendBtn) elements.otpVerify.resendBtn.disabled = true;
    if (elements.otpVerify.resendLabel) elements.otpVerify.resendLabel.style.display = 'inline';
    if (elements.otpVerify.countdown) elements.otpVerify.countdown.textContent = resendSecondsRemaining;

    resendTimer = setInterval(() => {
      resendSecondsRemaining--;
      if (elements.otpVerify.countdown) elements.otpVerify.countdown.textContent = resendSecondsRemaining;

      if (resendSecondsRemaining <= 0) {
        clearInterval(resendTimer);
        if (elements.otpVerify.resendBtn) elements.otpVerify.resendBtn.disabled = false;
        if (elements.otpVerify.resendLabel) elements.otpVerify.resendLabel.style.display = 'none';
      }
    }, 1000);
  }

  async function handleResendOtp() {
    if (resendSecondsRemaining > 0 || !activePhone) return;

    if (elements.otpVerify.resendBtn) {
      elements.otpVerify.resendBtn.disabled = true;
      elements.otpVerify.resendBtn.textContent = 'Resending...';
    }

    try {
      if (window.KissanAPI) {
        await window.KissanAPI.sendOtp(activePhone, selectedRole);
      }
      showToast(`📲 Fresh OTP sent to +91 ${activePhone}`);
      startResendCountdown(45);
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      if (elements.otpVerify.resendBtn) {
        elements.otpVerify.resendBtn.textContent = 'Resend OTP';
      }
    }
  }
  window.handleResendOtp = handleResendOtp;

  async function handleVerifyOtpSubmit(e) {
    if (e) e.preventDefault();

    let enteredOtp = '';
    for (let i = 1; i <= 6; i++) {
      const box = document.getElementById(`otpDigit${i}`);
      if (box) enteredOtp += box.value.trim();
    }

    if (enteredOtp.length !== 6) {
      showOtpError('Please enter the full 6-digit OTP code.');
      return;
    }

    setButtonLoading(elements.otpVerify.submitBtn, true);

    try {
      let authResponse;
      if (window.KissanAPI) {
        authResponse = await window.KissanAPI.verifyOtp(activePhone, enteredOtp, selectedRole);
      } else {
        const res = await fetch('/api/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, otp: enteredOtp, role: selectedRole })
        });
        authResponse = await res.json();
        if (!res.ok) throw new Error(authResponse.message || 'OTP verification failed');
      }

      // =======================================================================
      // SCREEN 6: PERSONALIZED PORTAL REDIRECTION & ROLE INTEGRITY CHECK
      // =======================================================================
      const authenticatedUser = authResponse.user;
      const authenticatedRole = authenticatedUser.role;

      // STRICT CHECK: Backend verified role must match the selected portal role
      if (authenticatedRole !== selectedRole) {
        showRoleMismatchModal(selectedRole, authenticatedRole, authenticatedUser.name);
        return;
      }

      // Successful verification & role match: Show animated portal redirection
      showSuccessRedirectionModal(authenticatedUser, authenticatedRole);

    } catch (err) {
      showOtpError(err.message || 'Invalid or expired OTP. Please try again.');
      // Re-focus first box
      const first = document.getElementById('otpDigit1');
      if (first) {
        first.focus();
        first.select();
      }
    } finally {
      setButtonLoading(elements.otpVerify.submitBtn, false);
    }
  }
  window.handleVerifyOtpSubmit = handleVerifyOtpSubmit;

  function showOtpError(message) {
    if (elements.otpVerify.alertBanner) {
      elements.otpVerify.alertBanner.className = 'kc-alert-banner error';
      elements.otpVerify.alertBanner.textContent = message;
      elements.otpVerify.alertBanner.style.display = 'block';
    }
  }

  // ===========================================================================
  // SCREEN 6: REDIRECTION MODALS
  // ===========================================================================

  function showSuccessRedirectionModal(user, role) {
    const config = ROLE_CONFIG[role] || ROLE_CONFIG.farmer;
    const modal = elements.modal;

    modal.backdrop.style.display = 'flex';
    modal.iconWrap.className = 'kc-modal-icon-wrap';
    modal.iconWrap.textContent = '✓';
    modal.title.textContent = `Welcome, ${user.name}!`;
    modal.desc.textContent = `Authentication successful. Transferring you securely to the ${config.title} Portal...`;

    modal.actionBar.innerHTML = `
      <div class="kc-progress-bar-track">
        <div class="kc-progress-bar-fill" id="modalProgressFill"></div>
      </div>
    `;

    setTimeout(() => {
      const fill = document.getElementById('modalProgressFill');
      if (fill) fill.style.width = '100%';
    }, 100);

    setTimeout(() => {
      window.location.href = config.portalUrl;
    }, 1200);
  }

  function showRoleMismatchModal(selected, actual, userName) {
    const selectedConfig = ROLE_CONFIG[selected] || { title: selected };
    const actualConfig = ROLE_CONFIG[actual] || { title: actual, portalUrl: '../main_portal/index.html' };
    const modal = elements.modal;

    modal.backdrop.style.display = 'flex';
    modal.iconWrap.className = 'kc-modal-icon-wrap error';
    modal.iconWrap.textContent = '⚠️';
    modal.title.textContent = 'Account Role Mismatch';
    modal.desc.innerHTML = `
      Hello <strong>${userName}</strong>, this mobile number is registered as a 
      <strong>${actualConfig.title}</strong>, not a <strong>${selectedConfig.title}</strong>.<br><br>
      To access your account, please continue to the ${actualConfig.title} portal.
    `;

    modal.actionBar.innerHTML = `
      <div style="display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap;">
        <button type="button" class="kc-btn kc-btn-outline" onclick="closeRedirectionModal('roleSelect')">
          Choose Another Role
        </button>
        <button type="button" class="kc-btn kc-btn-primary" onclick="proceedWithActualRole('${actual}')">
          Go to ${actualConfig.title} Portal →
        </button>
      </div>
    `;
  }

  function closeRedirectionModal(targetScreen = 'roleSelect') {
    if (elements.modal.backdrop) {
      elements.modal.backdrop.style.display = 'none';
    }
    navigateToScreen(targetScreen);
  }
  window.closeRedirectionModal = closeRedirectionModal;

  function proceedWithActualRole(actualRole) {
    const config = ROLE_CONFIG[actualRole];
    if (config) {
      window.location.href = config.portalUrl;
    }
  }
  window.proceedWithActualRole = proceedWithActualRole;

  // ===========================================================================
  // UI UTILITIES & LOCALIZATION
  // ===========================================================================

  function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    btn.disabled = isLoading;
    const textEl = btn.querySelector('.kc-btn-text');
    const loaderEl = btn.querySelector('.kc-btn-loader');
    const arrowEl = btn.querySelector('.kc-icon-arrow');

    if (textEl) textEl.style.display = isLoading ? 'none' : 'inline';
    if (loaderEl) loaderEl.style.display = isLoading ? 'inline-flex' : 'none';
    if (arrowEl) arrowEl.style.display = isLoading ? 'none' : 'inline-block';
  }

  function showToast(message, duration = 3500) {
    if (window.KissanAPI && typeof window.KissanAPI.toast === 'function') {
      window.KissanAPI.toast(message, duration);
    } else {
      const toast = document.getElementById('toastNotification');
      if (!toast) return;
      toast.innerHTML = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), duration);
    }
  }

  function switchLanguage(lang) {
    if (typeof setLanguage === 'function') {
      setLanguage(lang);
    }
    syncLanguageButtons(lang);
  }
  window.switchLanguage = switchLanguage;

  function syncLanguageButtons(lang) {
    const active = lang || (typeof currentLang !== 'undefined' ? currentLang : 'en');
    const btnEn = document.getElementById('btnLangEn');
    const btnTe = document.getElementById('btnLangTe');
    if (btnEn) btnEn.classList.toggle('active', active === 'en');
    if (btnTe) btnTe.classList.toggle('active', active === 'te');
  }

})(window, document);
