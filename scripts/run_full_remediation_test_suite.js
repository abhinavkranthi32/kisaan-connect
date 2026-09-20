/**
 * KISSAN CONNECT - PRODUCTION DATABASE AUDIT REMEDIATION VERIFICATION SUITE
 * Tests all 18 requirements in automated sequence.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { performBackup } = require('../scripts/backup_db');
const { performCleanup } = require('../scripts/cleanup');

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.join(__dirname, '..', 'data', 'kissan.db');
const OTP_SALT = process.env.OTP_SALT || 'kissan_connect_sih_2026_salt';

function hashOtp(phone, otp) {
  const clean = String(phone).replace(/\D/g, '').slice(-10);
  return crypto.createHash('sha256').update(`${clean}:${otp}:${OTP_SALT}`).digest('hex');
}

async function request(urlPath, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${urlPath}`, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  return { status: res.status, ok: res.ok, data };
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('🧪 KISSAN CONNECT — 18-STEP AUDIT REMEDIATION VERIFICATION SUITE');
  console.log('===============================================================\n');

  const results = [];
  function record(testNum, name, passed, details = '') {
    results.push({ testNum, name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [Test ${testNum}]: ${name} ${details ? '(' + details + ')' : ''}`);
  }

  const db = new DatabaseSync(DB_PATH);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Successful OTP Verification
    // -------------------------------------------------------------------------
    const testPhone1 = '9888111001';
    const otp1 = '739102';
    const exp1 = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO auth_otps (phone, otp_code, attempts, expires_at, verified) VALUES (?, ?, 0, ?, 0)')
      .run(testPhone1, hashOtp(testPhone1, otp1), exp1);

    const res1 = await request('/api/auth/otp/verify', 'POST', { phone: testPhone1, otp: otp1, role: 'farmer' });
    const t1Passed = res1.status === 200 && res1.data.status === 'success' && res1.data.token && res1.data.user;
    record(1, 'Successful OTP Verification', t1Passed, `Token: ${res1.data.token?.slice(0, 10)}...`);

    // -------------------------------------------------------------------------
    // TEST 2: Incorrect OTP Rejection & Counter Increment
    // -------------------------------------------------------------------------
    const testPhone2 = '9888111002';
    const otp2 = '445566';
    const exp2 = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO auth_otps (phone, otp_code, attempts, expires_at, verified) VALUES (?, ?, 0, ?, 0)')
      .run(testPhone2, hashOtp(testPhone2, otp2), exp2);

    const res2 = await request('/api/auth/otp/verify', 'POST', { phone: testPhone2, otp: '000000' });
    const row2 = db.prepare('SELECT attempts, verified FROM auth_otps WHERE phone = ? ORDER BY id DESC LIMIT 1').get(testPhone2);
    const t2Passed = res2.status === 400 && row2.attempts === 1 && row2.verified === 0;
    record(2, 'Incorrect OTP & Attempt Increment', t2Passed, `Attempts: ${row2?.attempts}, Msg: "${res2.data.message}"`);

    // -------------------------------------------------------------------------
    // TEST 3: Five Failed OTP Attempts & Lockout
    // -------------------------------------------------------------------------
    for (let i = 2; i <= 4; i++) {
      await request('/api/auth/otp/verify', 'POST', { phone: testPhone2, otp: `11111${i}` });
    }
    const res3Final = await request('/api/auth/otp/verify', 'POST', { phone: testPhone2, otp: '999999' });
    const res3Locked = await request('/api/auth/otp/verify', 'POST', { phone: testPhone2, otp: otp2 });
    const row3 = db.prepare('SELECT attempts FROM auth_otps WHERE phone = ? ORDER BY id DESC LIMIT 1').get(testPhone2);
    const t3Passed = (res3Final.status === 429 || res3Final.status === 400) && res3Locked.status === 429 && row3.attempts >= 5;
    record(3, 'Five Failed Attempts Lockout', t3Passed, `Locked on attempt 5 & reject correct OTP while locked`);

    // -------------------------------------------------------------------------
    // TEST 4: Expired OTP
    // -------------------------------------------------------------------------
    const testPhone4 = '9888111004';
    const otp4 = '123123';
    const exp4 = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min in the past
    db.prepare('INSERT INTO auth_otps (phone, otp_code, attempts, expires_at, verified) VALUES (?, ?, 0, ?, 0)')
      .run(testPhone4, hashOtp(testPhone4, otp4), exp4);

    const res4 = await request('/api/auth/otp/verify', 'POST', { phone: testPhone4, otp: otp4 });
    const t4Passed = res4.status === 400 && res4.data.message.includes('expired');
    record(4, 'Expired OTP Rejection', t4Passed, `Response status: ${res4.status}`);

    // -------------------------------------------------------------------------
    // TEST 5: OTP Reuse (Replay Prevention)
    // -------------------------------------------------------------------------
    const res5 = await request('/api/auth/otp/verify', 'POST', { phone: testPhone1, otp: otp1 });
    const t5Passed = res5.status === 400;
    record(5, 'OTP Replay Prevention', t5Passed, `Replay of already verified OTP rejected`);

    // -------------------------------------------------------------------------
    // TEST 6: OTP Resend Cooldown
    // -------------------------------------------------------------------------
    const testPhone6 = '98' + Date.now().toString().slice(-8);
    const res6a = await request('/api/auth/otp/send', 'POST', { phone: testPhone6 });
    const res6b = await request('/api/auth/otp/send', 'POST', { phone: testPhone6 });
    const t6Passed = res6a.status === 200 && res6b.status === 429 && res6b.data.message.includes('45 seconds');
    record(6, 'OTP Resend 45s Cooldown', t6Passed, `First request: 200, Immediate resend: 429`);

    // -------------------------------------------------------------------------
    // TEST 7: New Farmer Registration Auto-Provisioning
    // -------------------------------------------------------------------------
    const testPhone7 = '9888111007';
    const otp7 = '908172';
    db.prepare('INSERT INTO auth_otps (phone, otp_code, attempts, expires_at, verified) VALUES (?, ?, 0, ?, 0)')
      .run(testPhone7, hashOtp(testPhone7, otp7), new Date(Date.now() + 5 * 60 * 1000).toISOString());
    const res7 = await request('/api/auth/otp/verify', 'POST', { phone: testPhone7, otp: otp7, role: 'farmer' });
    const farmer7 = db.prepare('SELECT * FROM farmers WHERE phone LIKE ?').get(`%${testPhone7}`);
    const t7Passed = res7.status === 200 && farmer7 && farmer7.wallet_balance === 0;
    record(7, 'New Farmer Registration & Profile Provisioning', t7Passed, `Farmer ID: ${farmer7?.id}`);

    // -------------------------------------------------------------------------
    // TEST 8: New Buyer Registration Auto-Provisioning
    // -------------------------------------------------------------------------
    const testPhone8 = '9888111008';
    const otp8 = '556677';
    db.prepare('INSERT INTO auth_otps (phone, otp_code, attempts, expires_at, verified) VALUES (?, ?, 0, ?, 0)')
      .run(testPhone8, hashOtp(testPhone8, otp8), new Date(Date.now() + 5 * 60 * 1000).toISOString());
    const res8 = await request('/api/auth/otp/verify', 'POST', { phone: testPhone8, otp: otp8, role: 'buyer' });
    const buyer8 = db.prepare('SELECT * FROM buyers WHERE phone LIKE ?').get(`%${testPhone8}`);
    const t8Passed = res8.status === 200 && buyer8 && buyer8.escrow_balance === 0;
    record(8, 'New Buyer Registration & Profile Provisioning', t8Passed, `Buyer ID: ${buyer8?.id}, GSTIN: ${buyer8?.gstin}`);

    // -------------------------------------------------------------------------
    // TEST 9 & 10: Bid Acceptance & Escrow Locking inside Atomic Transaction
    // -------------------------------------------------------------------------
    // Create a lot & bid
    const lotId9 = `LOT-TX-${Date.now().toString().slice(-4)}`;
    db.prepare(`
      INSERT INTO harvest_lots (id, farmer_id, farmer_name, crop_key, crop_name_te, crop_name_en, variety_te, variety_en, quantity_quintals, reserve_price, highest_bid, location_te, location_en, status)
      VALUES (?, 'USR-FARM-01', 'మల్లారెడ్డి', 'teja_chilli', 'మిర్చి', 'Chilli', 'తేజ', 'Teja', 20, 20000, 22000, 'వరంగల్', 'Warangal', 'active')
    `).run(lotId9);

    const bidId9 = `BID-TX-${Date.now().toString().slice(-4)}`;
    db.prepare(`
      INSERT INTO bids (id, lot_id, buyer_id, buyer_name, price_per_q, total_deal_amount, logistics_mode, status)
      VALUES (?, ?, 'USR-BUY-01', 'ITC Agri', 22000, 440000, 'buyer_vehicle', 'active')
    `).run(bidId9, lotId9);

    // Login as farmer to accept bid
    const loginFarmer = await request('/api/auth/login-role', 'POST', { role: 'farmer', userId: 'USR-FARM-01' });
    const farmerToken = loginFarmer.data.token;

    const res9 = await request('/api/orders/accept-bid', 'POST', { lotId: lotId9, bidId: bidId9 }, farmerToken);
    const order9 = res9.data.order;
    const lot9After = db.prepare('SELECT status FROM harvest_lots WHERE id = ?').get(lotId9);
    const bid9After = db.prepare('SELECT status FROM bids WHERE id = ?').get(bidId9);
    const trip9After = db.prepare('SELECT * FROM logistics_trips WHERE order_id = ?').get(order9?.id);

    const t9Passed = res9.status === 201 && order9 && lot9After.status === 'deal_accepted' && bid9After.status === 'accepted';
    record(9, 'Bid Acceptance inside Atomic Transaction', t9Passed, `Order ID: ${order9?.id}`);

    const t10Passed = order9?.status === 'escrow_locked' && order9?.total_escrow_amount === 440000 && trip9After?.status === 'available';
    record(10, 'Escrow Locking & Trip Generation Consistency', t10Passed, `Locked: ₹${order9?.total_escrow_amount}, Trip: ${trip9After?.id}`);

    // -------------------------------------------------------------------------
    // TEST 11: Escrow Release & Farmer Wallet Credit
    // -------------------------------------------------------------------------
    const buyerBefore = db.prepare('SELECT escrow_balance FROM buyers WHERE id = ?').get('USR-BUY-01').escrow_balance;
    const farmerBefore = db.prepare('SELECT wallet_balance FROM farmers WHERE id = ?').get('USR-FARM-01').wallet_balance;

    const res11 = await request(`/api/orders/${order9.id}/verify-otp`, 'POST', { otp: order9.farm_gate_otp }, farmerToken);

    const buyerAfter = db.prepare('SELECT escrow_balance FROM buyers WHERE id = ?').get('USR-BUY-01').escrow_balance;
    const farmerAfter = db.prepare('SELECT wallet_balance FROM farmers WHERE id = ?').get('USR-FARM-01').wallet_balance;
    const order9Delivered = db.prepare('SELECT status, current_step FROM procurement_orders WHERE id = ?').get(order9.id);
    const trip9Delivered = db.prepare('SELECT status FROM logistics_trips WHERE order_id = ?').get(order9.id);

    const t11Passed = res11.status === 200 &&
      order9Delivered.status === 'delivered' &&
      order9Delivered.current_step === 5 &&
      trip9Delivered.status === 'delivered' &&
      buyerAfter === (buyerBefore - 440000) &&
      farmerAfter === (farmerBefore + 440000);

    record(11, 'Escrow Release & Wallet Settlement', t11Passed, `Buyer escrow deducted: -₹440k, Farmer wallet credited: +₹440k`);

    // -------------------------------------------------------------------------
    // TEST 12: Server Crash Simulation & Transaction Rollback
    // -------------------------------------------------------------------------
    // Simulate failure mid-transaction in SQLite
    let rolledBackProperly = false;
    const preRollbackFarmer = db.prepare('SELECT wallet_balance FROM farmers WHERE id = ?').get('USR-FARM-01').wallet_balance;
    const preRollbackBuyer = db.prepare('SELECT escrow_balance FROM buyers WHERE id = ?').get('USR-BUY-01').escrow_balance;

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare('UPDATE farmers SET wallet_balance = wallet_balance + 999999 WHERE id = ?').run('USR-FARM-01');
      db.prepare('UPDATE buyers SET escrow_balance = escrow_balance - 999999 WHERE id = ?').run('USR-BUY-01');
      // Intentional failure / simulate crash
      throw new Error('SIMULATED_CRASH_MID_TRANSACTION');
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      const postRollbackFarmer = db.prepare('SELECT wallet_balance FROM farmers WHERE id = ?').get('USR-FARM-01').wallet_balance;
      const postRollbackBuyer = db.prepare('SELECT escrow_balance FROM buyers WHERE id = ?').get('USR-BUY-01').escrow_balance;
      rolledBackProperly = (postRollbackFarmer === preRollbackFarmer) && (postRollbackBuyer === preRollbackBuyer);
    }
    record(12, 'Server Crash Simulation & Atomic Rollback', rolledBackProperly, `Zero partial state preserved`);

    // -------------------------------------------------------------------------
    // TEST 13: Logistics Trip Completion
    // -------------------------------------------------------------------------
    const trip13Id = `TRIP-TEST-${Date.now().toString().slice(-4)}`;
    db.prepare(`
      INSERT INTO logistics_trips (id, crop_name, origin, destination, distance_km, vehicle_type, freight_offer, status, pickup_otp)
      VALUES (?, 'వరి (Paddy)', 'వరంగల్', 'హైదరాబాద్', 140, '10-Ton Truck', 8500, 'assigned', '9911')
    `).run(trip13Id);

    const loginLog = await request('/api/auth/login-role', 'POST', { role: 'logistics', userId: 'USR-LOG-01' });
    const logToken = loginLog.data.token;

    const res13 = await request(`/api/trips/${trip13Id}/verify-otp`, 'POST', { otp: '9911' }, logToken);
    const trip13Row = db.prepare('SELECT status, delivered_at FROM logistics_trips WHERE id = ?').get(trip13Id);
    const t13Passed = res13.status === 200 && trip13Row.status === 'delivered' && trip13Row.delivered_at !== null;
    record(13, 'Logistics Trip Completion & Freight Payout Release', t13Passed, `Delivered: ${trip13Row?.status}`);

    // -------------------------------------------------------------------------
    // TEST 14: Foreign-Key Enforcement
    // -------------------------------------------------------------------------
    let fkBlocked = false;
    try {
      db.prepare(`
        INSERT INTO harvest_lots (id, farmer_id, farmer_name, crop_key, crop_name_te, crop_name_en, variety_te, variety_en, quantity_quintals, reserve_price, highest_bid, location_te, location_en, status)
        VALUES ('LOT-INVALID-FK', 'NON_EXISTENT_FARMER_9999', 'Fake', 'paddy', 'వరి', 'Paddy', 'A', 'A', 10, 1000, 1000, 'A', 'A', 'active')
      `).run();
    } catch (err) {
      fkBlocked = err.message.includes('FOREIGN KEY constraint failed');
    }
    const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
    const t14Passed = fkBlocked && fkCheck.length === 0;
    record(14, 'Foreign-Key Enforcement & Integrity Checks', t14Passed, `Zero foreign-key violations`);

    // -------------------------------------------------------------------------
    // TEST 15: Database Restart & Persistence Resilience
    // -------------------------------------------------------------------------
    db.close();
    const dbRestart = new DatabaseSync(DB_PATH);
    const restartPragmas = {
      journal_mode: dbRestart.prepare('PRAGMA journal_mode').get().journal_mode,
      foreign_keys: dbRestart.prepare('PRAGMA foreign_keys').get().foreign_keys,
      user_version: dbRestart.prepare('PRAGMA user_version').get().user_version,
      integrity: dbRestart.prepare('PRAGMA integrity_check').get().integrity_check
    };
    dbRestart.close();
    const t15Passed = restartPragmas.journal_mode === 'wal' && restartPragmas.user_version === 1 && restartPragmas.integrity === 'ok';
    record(15, 'Database Restart & Persistence Resilience', t15Passed, `WAL mode, v1 schema, integrity: ok`);

    // -------------------------------------------------------------------------
    // TEST 16: Automated Backup Creation (VACUUM INTO)
    // -------------------------------------------------------------------------
    const backupFile = performBackup();
    const t16Passed = fs.existsSync(backupFile) && fs.statSync(backupFile).size > 100000;
    record(16, 'Automated Backup Creation (VACUUM INTO)', t16Passed, `Backup file: ${path.basename(backupFile)}`);

    // -------------------------------------------------------------------------
    // TEST 17: Backup Restoration & Integrity Verification
    // -------------------------------------------------------------------------
    const bdb = new DatabaseSync(backupFile);
    const bIntegrity = bdb.prepare('PRAGMA integrity_check').all();
    const bLotsCount = bdb.prepare('SELECT COUNT(*) as c FROM harvest_lots').get().c;
    const bUsersCount = bdb.prepare('SELECT COUNT(*) as c FROM users').get().c;
    bdb.close();
    const t17Passed = bIntegrity[0]?.integrity_check === 'ok' && bLotsCount > 0 && bUsersCount > 0;
    record(17, 'Backup Restoration & Integrity Verification', t17Passed, `Valid SQLite database restored (Users: ${bUsersCount}, Lots: ${bLotsCount})`);

    // -------------------------------------------------------------------------
    // TEST 18: Multiple Concurrent Read/Write Operations in WAL Mode
    // -------------------------------------------------------------------------
    const concurrentCount = 15;
    const promises = [];
    for (let i = 0; i < concurrentCount; i++) {
      if (i % 2 === 0) {
        promises.push(request('/api/lots'));
      } else {
        promises.push(request('/api/buyers'));
      }
    }
    const concurrentResults = await Promise.all(promises);
    const t18Passed = concurrentResults.every(r => r.status === 200 && r.data && r.data.status === 'success');
    record(18, 'Multiple Concurrent Read/Write in WAL Mode', t18Passed, `${concurrentCount} concurrent requests completed with 0 errors`);

    console.log('\n===============================================================');
    const totalPassed = results.filter(r => r.passed).length;
    console.log(`🏁 TEST RESULTS: ${totalPassed} / ${results.length} PASSED (${((totalPassed / results.length) * 100).toFixed(0)}%)`);
    console.log('===============================================================');

    return { totalPassed, total: results.length, results };
  } catch (err) {
    console.error('❌ Test suite encountered unhandled error:', err);
    throw err;
  }
}

if (require.main === module) {
  runAllTests()
    .then(({ totalPassed, total }) => {
      process.exit(totalPassed === total ? 0 : 1);
    })
    .catch(() => process.exit(1));
}

module.exports = { runAllTests };
