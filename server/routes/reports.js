const express = require('express');
const router = express.Router();
const db = require('../database');

// Fecha local en formato YYYY-MM-DD (evita el bug de toISOString que usa UTC)
function localDateStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// GET daily summary
router.get('/daily', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || localDateStr();

    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_ventas,
        COALESCE(SUM(total), 0) as total_importe,
        COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN total ELSE 0 END), 0) as efectivo,
        COALESCE(SUM(CASE WHEN payment_method = 'tarjeta' THEN total ELSE 0 END), 0) as tarjeta,
        COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN total ELSE 0 END), 0) as transferencia,
        COALESCE(SUM(commission_amount), 0) as total_comisiones
      FROM sales WHERE sale_date = ?
    `).get(targetDate);

    const profitRow = db.prepare(`
      SELECT COALESCE(SUM((si.price - COALESCE(p.cost_price, 0)) * si.quantity), 0) as ganancia
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.sale_date = ?
    `).get(targetDate);

    const topProducts = db.prepare(`
      SELECT
        si.product_name,
        SUM(si.quantity) as total_piezas,
        SUM(si.subtotal) as total_importe
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.sale_date = ?
      GROUP BY si.product_id, si.product_name
      ORDER BY total_piezas DESC
      LIMIT 10
    `).all(targetDate);

    const salesByHour = db.prepare(`
      SELECT
        strftime('%H', created_at) as hora,
        COUNT(*) as ventas,
        COALESCE(SUM(total), 0) as importe
      FROM sales
      WHERE sale_date = ?
      GROUP BY hora
      ORDER BY hora
    `).all(targetDate);

    res.json({ date: targetDate, summary: { ...summary, ganancia: profitRow?.ganancia || 0 }, topProducts, salesByHour });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET inventory status
router.get('/inventory', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT id, name, barcode, stock, min_stock, unit, category, price,
        CASE
          WHEN stock = 0 THEN 'agotado'
          WHEN stock <= min_stock THEN 'bajo'
          ELSE 'ok'
        END as status
      FROM products WHERE active = 1
      ORDER BY stock ASC
    `).all();

    const stats = {
      total: products.length,
      agotado: products.filter(p => p.status === 'agotado').length,
      bajo: products.filter(p => p.status === 'bajo').length,
      ok: products.filter(p => p.status === 'ok').length
    };

    res.json({ products, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET corte de caja — end of day summary
router.get('/corte', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || localDateStr();

    const sessions = db.prepare(`
      SELECT cs.*,
        (SELECT COUNT(*) FROM sales WHERE session_id = cs.id) as ventas_count,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE session_id = cs.id) as ventas_total,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE session_id = cs.id AND payment_method = 'efectivo') as total_efectivo,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE session_id = cs.id AND payment_method = 'tarjeta') as total_tarjeta,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE session_id = cs.id AND payment_method = 'transferencia') as total_transferencia
      FROM cashier_sessions cs
      WHERE date(cs.opened_at) = ?
      ORDER BY cs.opened_at
    `).all(targetDate);

    const globalTotal = db.prepare(`
      SELECT
        COUNT(*) as total_ventas,
        COALESCE(SUM(total), 0) as total_importe,
        COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN total ELSE 0 END), 0) as efectivo,
        COALESCE(SUM(CASE WHEN payment_method = 'tarjeta' THEN total ELSE 0 END), 0) as tarjeta,
        COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN total ELSE 0 END), 0) as transferencia
      FROM sales WHERE sale_date = ?
    `).get(targetDate);

    // Inventory snapshot for the day
    const inventoryNow = db.prepare(`
      SELECT id, name, barcode, stock, unit, category, price
      FROM products WHERE active = 1 ORDER BY name
    `).all();

    // Save final snapshot
    const existingSnapshot = db.prepare(`
      SELECT id FROM inventory_snapshots WHERE snapshot_date = ? AND type = 'final'
    `).get(targetDate);

    if (!existingSnapshot) {
      db.prepare(`
        INSERT INTO inventory_snapshots (snapshot_date, type, snapshot)
        VALUES (?, 'final', ?)
      `).run(targetDate, JSON.stringify(inventoryNow));
    }

    res.json({ date: targetDate, sessions, globalTotal, inventory: inventoryNow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET sales history range
router.get('/history', (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const toDate = to || localDateStr();

    const daily = db.prepare(`
      SELECT
        sale_date as fecha,
        COUNT(*) as ventas,
        COALESCE(SUM(total), 0) as importe
      FROM sales
      WHERE sale_date BETWEEN ? AND ?
      GROUP BY sale_date
      ORDER BY sale_date
    `).all(fromDate, toDate);

    res.json({ from: fromDate, to: toDate, daily });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
