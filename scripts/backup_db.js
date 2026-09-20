/**
 * KISSAN CONNECT - AUTOMATED DATABASE BACKUP SYSTEM
 * Performs zero-lock, atomic SQLite snapshots using VACUUM INTO
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'kissan.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS_TO_KEEP = 14;

function performBackup() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found at:', DB_PATH);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupFileName = `kissan_backup_${timestamp}.db`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);
  const normalizedPath = backupFilePath.replace(/\\/g, '/');

  console.log(`📦 Initiating database backup: ${backupFileName}...`);
  const startTime = Date.now();

  const db = new DatabaseSync(DB_PATH);
  try {
    db.exec(`VACUUM INTO '${normalizedPath}'`);
    const elapsed = Date.now() - startTime;
    const stats = fs.statSync(backupFilePath);
    console.log(`✅ Backup successfully created in ${elapsed}ms:`);
    console.log(`   Location: ${backupFilePath}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);

    // Verification check on backup
    const bdb = new DatabaseSync(backupFilePath);
    const integrity = bdb.prepare('PRAGMA integrity_check').all();
    bdb.close();
    console.log(`   Integrity: ${integrity[0]?.integrity_check || 'ok'}`);

    pruneOldBackups();
    return backupFilePath;
  } catch (err) {
    console.error('❌ Backup failed:', err.message);
    throw err;
  } finally {
    db.close();
  }
}

function pruneOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db') && f.startsWith('kissan_'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS_TO_KEEP) {
      const toDelete = files.slice(MAX_BACKUPS_TO_KEEP);
      for (const item of toDelete) {
        fs.unlinkSync(item.path);
        console.log(`🧹 Pruned old backup: ${item.name}`);
      }
    }
  } catch (err) {
    console.warn('⚠️ Prune warning:', err.message);
  }
}

if (require.main === module) {
  try {
    performBackup();
  } catch (e) {
    process.exit(1);
  }
}

module.exports = { performBackup, pruneOldBackups };
