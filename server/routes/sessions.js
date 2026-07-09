const express = require('express');
const router = express.Router();
const db = require('../database');
const { localDateStr, localDateTimeStr } = require('../utils/date');

// GET all sessions (today)
router.get('/', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || localDateStr();
    const sessions = db.prepare(`
      SELECT * FROM cashier_sessions
      WHERE date(opened_at) = ?
      ORDER BY opened_at DESC
    `).all(targetDate);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET active sessions — auto-cierra sesiones de días anteriores (usando hora México)
router.get('/active', (req, res) => {
  try {
    const today = localDateStr();

    // Auto-cerrar sesiones abiertas de días anteriores
    const stale = db.prepare(`
      SELECT id FROM cashier_sessions
      WHERE status = 'open' AND date(opened_at) < ?
    `).all(today);

    for (const s of stale) {
      const totals = db.prepare(`
        SELECT
          COALESCE(SUM(total), 0) as total_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN total ELSE 0 END), 0) as total_cash,
          COALESCE(SUM(CASE WHEN payment_method = 'tarjeta' THEN total ELSE 0 END), 0) as total_card,
          COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN total ELSE 0 END), 0) as total_transfer,
          COUNT(*) as sale_count
        FROM sales WHERE session_id = ?
      `).get(s.id);

      db.prepare(`
        UPDATE cashier_sessions SET
          status = 'closed', closed_at = ?,
          total_sales = ?, total_cash = ?, total_card = ?, total_transfer = ?, sale_count = ?
        WHERE id = ?
      `).run(localDateTimeStr(), totals.total_sales, totals.total_cash, totals.total_card, totals.total_transfer, totals.sale_count, s.id);
    }

    const sessions = db.prepare(`
      SELECT * FROM cashier_sessions
      WHERE status = 'open' AND date(opened_at) = ?
      ORDER BY opened_at ASC
    `).all(today);

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single session
router.get('/:id', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM cashier_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST open new session
router.post('/', (req, res) => {
  try {
    const { cashier_name, opening_cash } = req.body;
    if (!cashier_name) return res.status(400).json({ error: 'Nombre del cajero requerido' });

    const existing = db.prepare(`
      SELECT id FROM cashier_sessions WHERE cashier_name = ? AND status = 'open'
    `).get(cashier_name);

    if (existing) {
      return res.status(409).json({ error: 'Este cajero ya tiene una sesión abierta', session_id: existing.id });
    }

    // Insertar con fecha/hora de México explícita
    const result = db.prepare(`
      INSERT INTO cashier_sessions (cashier_name, opening_cash, opened_at)
      VALUES (?, ?, ?)
    `).run(cashier_name, opening_cash || 0, localDateTimeStr());

    const session = db.prepare('SELECT * FROM cashier_sessions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT close session
router.put('/:id/close', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM cashier_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN total ELSE 0 END), 0) as total_cash,
        COALESCE(SUM(CASE WHEN payment_method = 'tarjeta' THEN total ELSE 0 END), 0) as total_card,
        COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN total ELSE 0 END), 0) as total_transfer,
        COUNT(*) as sale_count
      FROM sales WHERE session_id = ?
    `).get(req.params.id);

    db.prepare(`
      UPDATE cashier_sessions SET
        status = 'closed', closed_at = ?,
        total_sales = ?, total_cash = ?, total_card = ?, total_transfer = ?, sale_count = ?
      WHERE id = ?
    `).run(
      localDateTimeStr(),
      totals.total_sales, totals.total_cash,
      totals.total_card, totals.total_transfer,
      totals.sale_count, req.params.id
    );

    const updated = db.prepare('SELECT * FROM cashier_sessions WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE session (cierra la caja — conserva las ventas asociadas)
router.delete('/:id', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM cashier_sessions WHERE id = ?').get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN total ELSE 0 END), 0) as total_cash,
        COALESCE(SUM(CASE WHEN payment_method = 'tarjeta' THEN total ELSE 0 END), 0) as total_card,
        COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN total ELSE 0 END), 0) as total_transfer,
        COUNT(*) as sale_count
      FROM sales WHERE session_id = ?
    `).get(req.params.id);

    db.prepare(`
      UPDATE cashier_sessions SET
        status = 'closed', closed_at = ?,
        total_sales = ?, total_cash = ?, total_card = ?, total_transfer = ?, sale_count = ?
      WHERE id = ?
    `).run(localDateTimeStr(), totals.total_sales, totals.total_cash, totals.total_card, totals.total_transfer, totals.sale_count, req.params.id);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
