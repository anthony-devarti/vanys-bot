const Database = require("better-sqlite3");
const path = require("path");

// Path to the database file (reuse existing data directory)
const dbPath = path.join(__dirname, "..", "data", "bank.db");

// Open or create the database
const db = new Database(dbPath);

// Shops table – merchant names only (no accounts/banking logic)
db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE
  );
`);

function normalizeShopName(name) {
  return name.trim().toLowerCase();
}

function getAllShops() {
  const stmt = db.prepare("SELECT name, normalized_name FROM shops");
  return stmt.all();
}

function upsertShop(name) {
  const normalized = normalizeShopName(name);
  const stmt = db.prepare(`
    INSERT INTO shops (name, normalized_name)
    VALUES (?, ?)
    ON CONFLICT(normalized_name) DO UPDATE SET name = excluded.name
  `);
  stmt.run(name, normalized);
}

module.exports = {
  getAllShops,
  upsertShop
};
