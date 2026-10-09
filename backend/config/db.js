const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'mock_cms.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');
const SEED_PATH = path.join(__dirname, '..', 'database', 'seed.sql');

// Fresh DB on first run (or when RESET_DB=true) so the demo is reproducible.
const freshInit = !fs.existsSync(DB_PATH) || process.env.RESET_DB === 'true';

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

if (freshInit) {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  const seed = fs.readFileSync(SEED_PATH, 'utf8');
  db.exec(seed);

  console.log('[DB] Schema created and seed data loaded ->', DB_PATH);
} else {
  console.log('[DB] Using existing database ->', DB_PATH);
}

module.exports = db;
