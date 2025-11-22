const Database = require("better-sqlite3");
const path = require("path");

// Path to the database file
const dbPath = path.join(__dirname, "..", "data", "bank.db");

// Open or create the database
const db = new Database(dbPath);

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    discord_id TEXT PRIMARY KEY,
    player_name TEXT,
    balance INTEGER NOT NULL
  );
`);

// Shops table – for merchant names in Farhearth
db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE
  );
`);


// Fetch an account by Discord ID
function getAccount(discordId) {
    const stmt = db.prepare("SELECT * FROM accounts WHERE discord_id = ?");
    return stmt.get(discordId);
}

// Create or update an account balance
function setBalance(discordId, playerName, balance) {
    const stmt = db.prepare(`
    INSERT INTO accounts (discord_id, player_name, balance)
    VALUES (?, ?, ?)
    ON CONFLICT(discord_id) DO UPDATE SET
      player_name = excluded.player_name,
      balance = excluded.balance
  `);
    stmt.run(discordId, playerName, balance);
}

// Add gold to an account, return new balance
function depositGold(discordId, playerName, amount) {
    const existing = getAccount(discordId);

    const newBalance = existing
        ? existing.balance + amount
        : amount;

    setBalance(discordId, playerName, newBalance);
    return newBalance;
}

function withdrawGold(discordId, playerName, amount) {
    const existing = getAccount(discordId);
    const currentBalance = existing ? existing.balance : 0;

    if (amount <= 0) {
        throw new Error("Amount must be a positive number");
    }

    if (currentBalance < amount) {
        // Not enough funds
        return {
            success: false,
            balance: currentBalance
        };
    }

    const newBalance = currentBalance - amount;
    setBalance(discordId, playerName, newBalance);

    return {
        success: true,
        balance: newBalance
    };
}

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
    getAccount,
    setBalance,
    depositGold,
    withdrawGold,
    getAllShops,
    upsertShop
};
