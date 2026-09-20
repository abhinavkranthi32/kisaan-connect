/**
 * KISSAN CONNECT - SESSION & STALE OTP CLEANUP SYSTEM
 * Safely purges expired sessions and old verified/expired OTPs
 */

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'kissan.db');

function performCleanup(dbInstance = null) {
  const db = dbInstance || new DatabaseSync(DB_PATH);
  let closedOnExit = false;

  try {
    console.log('🧹 Running database cleanup routines...');

    // 1. Clean expired sessions
    const expiredSessions = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at < CURRENT_TIMESTAMP').get().count;
    if (expiredSessions > 0) {
      db.prepare('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP').run();
      console.log(`   ✅ Purged ${expiredSessions} expired session(s).`);
    } else {
      console.log('   ℹ️ No expired sessions to purge.');
    }

    // 2. Clean stale OTPs (older than 24 hours, whether verified or expired)
    const staleOtps = db.prepare(`
      SELECT COUNT(*) as count FROM auth_otps 
      WHERE (expires_at < datetime('now', '-24 hours') OR verified = 1)
        AND created_at < datetime('now', '-24 hours')
    `).get().count;

    if (staleOtps > 0) {
      db.prepare(`
        DELETE FROM auth_otps 
        WHERE (expires_at < datetime('now', '-24 hours') OR verified = 1)
          AND created_at < datetime('now', '-24 hours')
      `).run();
      console.log(`   ✅ Purged ${staleOtps} stale OTP record(s) (>24h old).`);
    } else {
      console.log('   ℹ️ No stale OTPs to purge (>24h).');
    }

    return { expiredSessions, staleOtps };
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
    throw err;
  } finally {
    if (!dbInstance) {
      db.close();
    }
  }
}

if (require.main === module) {
  try {
    performCleanup();
  } catch (e) {
    process.exit(1);
  }
}

module.exports = { performCleanup };
