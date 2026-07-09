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
        COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN total ELSE 0 END), 0) as transferencia
      FROM sales WHERE sale_date = ?
    `).get(targetDate);

    // Separado para no romper el reporte si la columna no existe aún en la BD
    let total_comisiones = 0;
    try {
      const commRow = db.prepare(
        'SELECT COALESCE(SUM(commission_amount), 0) as val FROM sales WHERE sale_date = ?'
      ).get(targetDate);
      total_comisiones = Number(commRow?.val) || 0;
      console.log(`[REPORTE] fecha=${targetDate} total_comisiones=${total_comisiones} commRow=${JSON.stringify(commRow)}`);
    } catch (e) {
      console.log(`[REPORTE] Error al consultar comisiones: ${e.message}`);
    }

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
        ROUND(SUM(si.quantity), 3) as total_piezas,
        ROUND(SUM(si.subtotal), 2) as total_importe
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

    res.json({ date: targetDate, summary: { ...summary, ganancia: profitRow?.ganancia || 0, total_comisiones }, topProducts, salesByHour });
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

// GET card sales with commission for a given date (diagnostic)
router.get('/card-sales', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || localDateStr();

    let sales = [];
    try {
      sales = db.prepare(`
        SELECT id, cashier_name, total, commission_rate, commission_amount, terminal_name, created_at
        FROM sales
        WHERE sale_date = ? AND payment_method = 'tarjeta'
        ORDER BY created_at DESC
      `).all(targetDate);
    } catch (e) {
      // commission columns may not exist on older DBs
      sales = db.prepare(`
        SELECT id, cashier_name, total, created_at
        FROM sales
        WHERE sale_date = ? AND payment_method = 'tarjeta'
        ORDER BY created_at DESC
      `).all(targetDate);
    }

    const totalComision = sales.reduce((s, v) => s + (parseFloat(v.commission_amount) || 0), 0);
    res.json({ date: targetDate, count: sales.length, total_comisiones: parseFloat(totalComision.toFixed(2)), sales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
