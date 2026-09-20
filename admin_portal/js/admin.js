/**
 * KISSAN CONNECT - APMC ADMIN & REGULATORY DESK JAVASCRIPT
 * Real-time monitoring, KYC verification, dispute resolution, and audit trail
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.KissanAPI) {
    const user = window.KissanAPI.getCurrentUser();
    if (!user || user.role !== 'admin') {
      try {
        await window.KissanAPI.loginAsRole('admin', 'USR-ADM-01');
      } catch (e) {}
    }
  }
  await loadAdminStats();
  await loadAdminUsers();
  await loadAdminLots();
  await loadAdminDisputes();
  await loadAdminAuditLogs();

  // Listen to live events to keep stats fresh
  if (window.KissanAPI) {
    window.KissanAPI.subscribeEvents({
      ALL: () => {
        loadAdminStats();
      }
    });
  }
});

function showToast(msg) {
  if (window.KissanAPI) {
    window.KissanAPI.toast(msg);
  } else {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.innerHTML = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }
}

function switchAdminTab(tabKey) {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));

  event.target.classList.add('active');

  const panelMap = {
    users: 'panelUsers',
    lots: 'panelLots',
    community: 'panelCommunity',
    financial: 'panelFinancial',
    disputes: 'panelDisputes',
    audit: 'panelAudit'
  };

  const activePanelId = panelMap[tabKey];
  if (activePanelId) {
    const panel = document.getElementById(activePanelId);
    if (panel) panel.classList.add('active');
  }

  if (tabKey === 'community') loadAdminCommunityOverview();
  if (tabKey === 'financial') loadAdminFinancialOverview();
}

  if (tabKey === 'users') loadAdminUsers();
  if (tabKey === 'lots') loadAdminLots();
  if (tabKey === 'community') loadAdminCommunityOverview();
  if (tabKey === 'disputes') loadAdminDisputes();
  if (tabKey === 'audit') loadAdminAuditLogs();
}

// -----------------------------------------------------------------------------
// KPI METRICS
// -----------------------------------------------------------------------------
async function loadAdminStats() {
  try {
    const res = await window.KissanAPI.getAdminStats();
    if (res && res.stats) {
      const s = res.stats;
      document.getElementById('kpiLots').textContent = s.totalLots || 0;
      document.getElementById('kpiActiveLots').textContent = `${s.activeLots || 0} యాక్టివ్ వేలంలో ఉన్నాయి`;
      document.getElementById('kpiEscrow').textContent = `₹${Number(s.totalEscrowLocked || 0).toLocaleString('en-IN')}`;
      document.getElementById('kpiSettled').textContent = `₹${Number(s.totalSettled || 0).toLocaleString('en-IN')}`;
      document.getElementById('kpiUsers').textContent = s.totalUsers || 0;
    }
  } catch (err) {
    console.error('[Load Stats Error]', err);
  }
}

// -----------------------------------------------------------------------------
// USER MANAGEMENT & KYC
// -----------------------------------------------------------------------------
async function loadAdminUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  try {
    const res = await window.KissanAPI.getAdminUsers();
    const users = res.users || [];

    tbody.innerHTML = users.map(u => {
      const isVerified = u.kyc_status === 'verified';
      const roleBadge = u.role === 'farmer' ? '👨‍🌾 రైతు' : (u.role === 'buyer' ? '🏢 కొనుగోలుదారు' : (u.role === 'logistics' ? '🚛 రవాణాదారు' : '🛡️ అడ్మిన్'));

      return `
        <tr>
          <td><code>${u.id}</code></td>
          <td><strong>${u.name}</strong></td>
          <td>${u.phone}</td>
          <td><span style="font-weight:600;">${roleBadge}</span></td>
          <td>${u.organization || '—'}</td>
          <td>${u.city || '—'}</td>
          <td>
            <span class="status-pill ${u.kyc_status || 'verified'}">
              ${isVerified ? '✓ ధృవీకరించబడింది' : u.kyc_status}
            </span>
          </td>
          <td>
            ${isVerified ? `
              <button class="btn-sm btn-reject" onclick="handleSetUserKyc('${u.id}', 'rejected')">సస్పెండ్ చేయండి</button>
            ` : `
              <button class="btn-sm btn-verify" onclick="handleSetUserKyc('${u.id}', 'verified')">✓ ఆమోదించండి</button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('[Load Users Error]', err);
  }
}

async function handleSetUserKyc(userId, status) {
  try {
    await window.KissanAPI.verifyUserKyc(userId, status);
    showToast(`✅ యూజర్ #${userId} KYC స్థితి ${status === 'verified' ? 'ఆమోదించబడింది' : 'సస్పెండ్ చేయబడింది'}`);
    loadAdminUsers();
  } catch (err) {
    showToast(`❌ లోపం: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// LOTS MODERATION
// -----------------------------------------------------------------------------
async function loadAdminLots() {
  const tbody = document.getElementById('lotsTableBody');
  if (!tbody) return;

  try {
    const res = await window.KissanAPI.getLots();
    const lots = res.lots || [];

    tbody.innerHTML = lots.map(l => {
      const isActive = l.status === 'active';
      return `
        <tr>
          <td><code>${l.id}</code></td>
          <td><strong>${l.crop_name_te || l.crop_name_en}</strong></td>
          <td>${l.farmer_name}</td>
          <td>${l.quantity_quintals} క్వింటాళ్లు</td>
          <td>గ్రేడ్ ${l.grade} • ${l.moisture_pct}</td>
          <td>₹${Number(l.reserve_price).toLocaleString('en-IN')}</td>
          <td><strong style="color:var(--primary-800);">₹${Number(l.highest_bid).toLocaleString('en-IN')}</strong></td>
          <td>
            <span class="status-pill ${isActive ? 'verified' : 'pending'}">
              ${isActive ? 'లైవ్ వేలం' : l.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('[Load Lots Error]', err);
  }
}

// -----------------------------------------------------------------------------
// DISPUTES & GRIEVANCE
// -----------------------------------------------------------------------------
async function loadAdminDisputes() {
  const tbody = document.getElementById('disputesTableBody');
  if (!tbody) return;

  try {
    const res = await window.KissanAPI.getDisputes();
    const disputes = res.disputes || [];

    if (disputes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:#64748B;">ఫిర్యాదులు ఏవీ లేవు.</td></tr>`;
      return;
    }

    tbody.innerHTML = disputes.map(d => {
      const isResolved = d.status === 'resolved';
      return `
        <tr>
          <td><code>${d.id}</code></td>
          <td><code>${d.order_id || '—'}</code></td>
          <td><strong>${d.raised_by_name}</strong> (${d.raised_by_role})</td>
          <td>${d.title}</td>
          <td style="max-width:300px;">${d.description}</td>
          <td>
            <span class="status-pill ${isResolved ? 'verified' : 'pending'}">
              ${isResolved ? 'పరిష్కరించబడింది' : 'పరిశీలనలో ఉంది'}
            </span>
          </td>
          <td>
            ${isResolved ? `
              <small style="color:#059669; font-weight:600;">${d.resolution || 'ఆమోదించబడింది'}</small>
            ` : `
              <button class="btn-sm btn-verify" onclick="handleResolveDispute('${d.id}')">⚖️ పరిష్కరించు</button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('[Load Disputes Error]', err);
  }
}

async function handleResolveDispute(disputeId) {
  const resolution = prompt('సమస్య పరిష్కార నిర్ణయాన్ని నమోదు చేయండి (APMC Resolution):', 'నాణ్యతా తనిఖీ పూర్తయింది. ఇరువర్గాల అంగీకారంతో ఎస్క్రో విడుదల ఆమోదించబడింది.');
  if (resolution) {
    try {
      await window.KissanAPI.resolveDispute(disputeId, resolution);
      showToast('✅ సమస్య విజయవంతంగా పరిష్కరించబడింది');
      loadAdminDisputes();
    } catch (err) {
      showToast(`❌ లోపం: ${err.message}`);
    }
  }
}

// -----------------------------------------------------------------------------
// IMMUTABLE AUDIT TRAIL
// -----------------------------------------------------------------------------
async function loadAdminAuditLogs() {
  const container = document.getElementById('auditLogsContainer');
  if (!container) return;

  try {
    const res = await window.KissanAPI.getAuditLogs();
    const logs = res.logs || [];

    if (logs.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:#64748B;">ఆడిట్ లాగ్స్ ఏవీ లేవు.</p>`;
      return;
    }

    container.innerHTML = logs.map(log => `
      <div class="audit-item">
        <div>
          <div class="audit-meta">
            <span class="audit-tag">${log.action}</span>
            <strong>${log.entity_type} / ${log.entity_id}</strong>
            <span style="color:#64748B;">(${log.user_role} - ${log.user_id})</span>
          </div>
          <div style="margin-top:0.25rem; font-size:0.85rem; color:#334155;">
            ${log.details}
          </div>
        </div>
        <div class="audit-time">
          ${new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[Load Audit Logs Error]', err);
  }
}

// -----------------------------------------------------------------------------
// COMMUNITY BULK PROCUREMENT & VILLAGE POOLING OVERVIEW
// -----------------------------------------------------------------------------
async function loadAdminCommunityOverview() {
  try {
    const [statsRes, reqsRes, transportRes] = await Promise.all([
      window.KissanAPI.getAdminCommunityStats().catch(() => ({ stats: {} })),
      window.KissanAPI.getCommunityRequirements().catch(() => ({ requirements: [] })),
      window.KissanAPI.getTransportRequests().catch(() => ({ requests: [] }))
    ]);

    const s = statsRes.stats || {};
    const commActiveEl = document.getElementById('kpiCommActiveReqs');
    if (commActiveEl) commActiveEl.textContent = s.activeRequirementsCount || 0;
    
    const commTotalEl = document.getElementById('kpiCommTotalReqs');
    if (commTotalEl) commTotalEl.textContent = `${s.totalRequirementsCount || 0} మొత్తం పోస్ట్ చేయబడ్డాయి`;
    
    const commQtyEl = document.getElementById('kpiCommTotalQty');
    if (commQtyEl) commQtyEl.textContent = `${(s.totalRequestedQtyKg || 0).toLocaleString('en-IN')} kg`;
    
    const commPoolsEl = document.getElementById('kpiCommVillagePools');
    if (commPoolsEl) commPoolsEl.textContent = s.activeVillagePools || 0;
    
    const commReadyEl = document.getElementById('kpiCommTransportReady');
    if (commReadyEl) commReadyEl.textContent = s.transportReadyOrdersCount || 0;
    
    const commDelivEl = document.getElementById('kpiCommDeliveriesActive');
    if (commDelivEl) commDelivEl.textContent = `${s.deliveriesInProgressCount || 0} డెలివరీలో ఉన్నాయి`;

    // Render Community Requirements Table
    const reqsTbody = document.getElementById('adminCommunityReqsTableBody');
    if (reqsTbody) {
      const reqs = reqsRes.requirements || [];
      if (reqs.length === 0) {
        reqsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748B;">కమ్యూనిటీ డిమాండ్లు ఏవీ లేవు.</td></tr>`;
      } else {
        reqsTbody.innerHTML = reqs.map(r => {
          const pct = r.fulfillment_pct || 0;
          return `
            <tr>
              <td><code>#${r.id}</code></td>
              <td><strong>${r.community_name || r.buyer_name || 'Community'}</strong></td>
              <td><span style="font-size:0.8rem; font-weight:600; background:#E2E8F0; padding:0.2rem 0.5rem; border-radius:4px;">${r.buyer_type || 'community'}</span></td>
              <td>${r.delivery_city || r.delivery_address || '—'}</td>
              <td>${r.required_delivery_date || '—'}</td>
              <td>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <div style="flex:1; background:#E2E8F0; height:8px; border-radius:4px; overflow:hidden;">
                    <div style="width:${Math.min(100, pct)}%; background:#10B981; height:100%;"></div>
                  </div>
                  <strong style="font-size:0.8rem;">${pct}%</strong>
                </div>
              </td>
              <td>
                <span class="status-pill ${r.status === 'fully_fulfilled' ? 'verified' : (r.status === 'published' ? 'pending' : 'verified')}">
                  ${r.status}
                </span>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Render Transport Requests Table
    const transportTbody = document.getElementById('adminCommunityTransportTableBody');
    if (transportTbody) {
      const requests = transportRes.requests || [];
      if (requests.length === 0) {
        transportTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748B;">రవాణా ఆర్డర్లు ఏవీ లేవు.</td></tr>`;
      } else {
        transportTbody.innerHTML = requests.map(tr => {
          return `
            <tr>
              <td><code>#${tr.id}</code></td>
              <td><strong>${tr.community_name || 'Community'}</strong></td>
              <td>${tr.pickup_villages || '—'}</td>
              <td><strong>${tr.total_weight_kg || 0} kg</strong></td>
              <td>${tr.suggested_vehicle_type || 'LCV'}</td>
              <td>${tr.estimated_distance_km ? `${tr.estimated_distance_km} km` : 'Distance pending'}</td>
              <td>
                <span class="status-pill ${tr.status === 'delivered' ? 'verified' : 'pending'}">
                  ${tr.status}
                </span>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('[Load Admin Community Overview Error]', err);
  }
}

// -----------------------------------------------------------------------------
// ADMIN FINANCIAL MONITORING, ESCROW AUDIT & PAYOUT VERIFICATION
// -----------------------------------------------------------------------------
async function loadAdminFinancialOverview() {
  try {
    const statsRes = await window.KissanAPI.getAdminFinancialStats();
    if (statsRes && statsRes.stats) {
      const s = statsRes.stats;
      const elWallets = document.getElementById('adminTotalWalletBal');
      if (elWallets) elWallets.textContent = `₹${(s.total_wallets_rupees || 0).toLocaleString('en-IN')}`;

      const elHolds = document.getElementById('adminActiveEscrowHolds');
      if (elHolds) elHolds.textContent = `₹${(s.active_escrow_holds_rupees || 0).toLocaleString('en-IN')}`;

      const elFarmerPayouts = document.getElementById('adminFarmerPayoutsTotal');
      if (elFarmerPayouts) elFarmerPayouts.textContent = `₹${(s.farmer_payouts_released_rupees || 0).toLocaleString('en-IN')}`;

      const elFees = document.getElementById('adminPlatformFeesTotal');
      if (elFees) elFees.textContent = `₹${(s.platform_fees_earned_rupees || 0).toLocaleString('en-IN')}`;

      // Render Farmer Payout Verification Table
      const verifyTbody = document.getElementById('farmerPayoutVerifyTableBody');
      if (verifyTbody) {
        if (!s.unverified_farmer_profiles || s.unverified_farmer_profiles.length === 0) {
          verifyTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.25rem; color:#16A34A; font-weight:700;">✅ అన్ని రైతుల బ్యాంక్ ప్రొఫైల్‌లు ధృవీకరించబడ్డాయి! (No Pending Verifications)</td></tr>`;
        } else {
          verifyTbody.innerHTML = s.unverified_farmer_profiles.map(fp => `
            <tr>
              <td><code>${fp.farmer_id}</code></td>
              <td><strong>${fp.account_holder_name}</strong></td>
              <td>${fp.bank_name}</td>
              <td style="font-family:monospace; font-weight:700;">${fp.account_number_masked}</td>
              <td style="font-family:monospace;">${fp.ifsc_code}</td>
              <td><span class="status-pill pending">${fp.payout_eligibility_status}</span></td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="verifyFarmerPayoutProfileAction('${fp.farmer_id}')" style="background:#16A34A; border:none;">
                  ✓ ఖాతా ధృవీకరించు & అనుసంధానించు
                </button>
              </td>
            </tr>
          `).join('');
        }
      }
    }

    // Render Full System Financial Audit Ledger
    const ledgerRes = await window.KissanAPI.getAdminFinancialLedger(100);
    const ledgerTbody = document.getElementById('financialLedgerTableBody');
    if (ledgerTbody && ledgerRes && ledgerRes.ledger) {
      if (ledgerRes.ledger.length === 0) {
        ledgerTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.25rem; color:#94A3B8;">ఆర్థిక లావాదేవీలు ఏవీ నమోదు కాలేదు.</td></tr>`;
      } else {
        ledgerTbody.innerHTML = ledgerRes.ledger.map(l => {
          const isCredit = l.direction === 'credit';
          const sign = isCredit ? '+' : '-';
          const color = isCredit ? '#16A34A' : '#DC2626';
          return `
            <tr style="border-bottom:1px solid #F1F5F9;">
              <td style="padding:0.6rem; font-family:monospace; font-weight:600; color:#475569;">${l.id}</td>
              <td style="padding:0.6rem; font-family:monospace;">${l.user_id}</td>
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
    console.error('[Load Admin Financial Overview Error]', err);
    showToast(`❌ ఆర్థిక ఆడిట్ పొరపాటు: ${err.message}`);
  }
}

async function verifyFarmerPayoutProfileAction(farmerId) {
  try {
    const res = await window.KissanAPI.verifyFarmerPayoutProfile(farmerId);
    if (res && res.status === 'success') {
      showToast(`✅ రైతు (${farmerId}) బ్యాంక్ ఖాతా APMC ద్వారా ధృవీకరించబడింది!`);
      await loadAdminFinancialOverview();
    } else {
      showToast(`❌ ${res.message || 'ధృవీకరణ విఫలమైంది'}`);
    }
  } catch (err) {
    showToast(`❌ error: ${err.message}`);
  }
}
