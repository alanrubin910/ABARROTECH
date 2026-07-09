const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'abarrotech.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    barcode TEXT UNIQUE,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'pieza',
    category TEXT DEFAULT 'General',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS cashier_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cashier_name TEXT NOT NULL,
    opened_at TEXT DEFAULT (datetime('now', 'localtime')),
    closed_at TEXT,
    status TEXT DEFAULT 'open',
    opening_cash REAL DEFAULT 0,
    total_sales REAL DEFAULT 0,
    total_cash REAL DEFAULT 0,
    total_card REAL DEFAULT 0,
    total_transfer REAL DEFAULT 0,
    sale_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES cashier_sessions(id),
    cashier_name TEXT NOT NULL,
    payment_method TEXT DEFAULT 'efectivo',
    total REAL DEFAULT 0,
    cash_received REAL,
    change_given REAL DEFAULT 0,
    transfer_ref TEXT,
    sale_date TEXT DEFAULT (date('now', 'localtime')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER REFERENCES sales(id),
    product_id INTEGER REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_barcode TEXT,
    price REAL NOT NULL,
    quantity INTEGER DEFAULT 1,
    subtotal REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date TEXT NOT NULL,
    type TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS restocking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_name TEXT NOT NULL,
    notes TEXT,
    total_cost REAL DEFAULT 0,
    restock_date TEXT DEFAULT (date('now', 'localtime')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS restocking_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restocking_id INTEGER REFERENCES restocking(id),
    product_id INTEGER REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity_added INTEGER NOT NULL,
    cost_per_unit REAL DEFAULT 0,
    subtotal REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    lot_number TEXT,
    expiry_date TEXT,
    quantity INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

// Migraciones incrementales (seguras si ya existen)
try { db.exec('ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE sales ADD COLUMN commission_rate REAL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE sales ADD COLUMN commission_amount REAL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE sales ADD COLUMN terminal_name TEXT'); } catch {}

module.exports = db;
