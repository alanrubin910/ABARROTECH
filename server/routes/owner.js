const express = require('express');
const router = express.Router();
const db = require('../database');
const { localDateStr, localDateTimeStr } = require('../utils/date');

// POST /api/owner/verify-pin
router.post('/verify-pin', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN requerido' });
    const row = db.prepare("SELECT value FROM owner_settings WHERE key = 'pin'").get();
    if (!row) return res.status(500).json({ error: 'PIN no configurado' });
    if (pin === row.value) return res.json({ ok: true });
    return res.status(401).json({ error: 'PIN incorrecto' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/owner/change-pin
router.post('/change-pin', (req, res) => {
  try {
    const { current_pin, new_pin } = req.body;
    const row = db.prepare("SELECT value FROM owner_settings WHERE key = 'pin'").get();
    if (!row || current_pin !== row.value) return res.status(401).json({ error: 'PIN actual incorrecto' });
    if (!new_pin || String(new_pin).length < 4) return res.status(400).json({ error: 'El PIN debe tener al menos 4 dígitos' });
    db.prepare("UPDATE owner_settings SET value = ? WHERE key = 'pin'").run(String(new_pin));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/owner/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/summary', (req, res) => {
  try {
    const today = localDateStr();
    const from = req.query.from || (today.slice(0, 7) + '-01');
    const to = req.query.to || today;

    // Sales totals + COGS
    const salesRow = db.prepare(`
      SELECT
        COUNT(DISTINCT s.id) as total_ventas,
        COALESCE(SUM(s.total), 0) as ingresos,
        COALESCE(SUM(COALESCE(p.cost_price, 0) * si.quantity), 0) as costo_mercancia,
        COALESCE(SUM((si.price - COALESCE(p.cost_price, 0)) * si.quantity), 0) as ganancia_bruta
      FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE s.sale_date BETWEEN ? AND ?
    `).get(from, to);

    // Card commissions
    let total_comisiones = 0;
    try {
      const commRow = db.prepare(
        "SELECT COALESCE(SUM(commission_amount), 0) as val FROM sales WHERE sale_date BETWEEN ? AND ?"
      ).get(from, to);
      total_comisiones = Number(commRow?.val) || 0;
    } catch {}

    // Operating expenses
    const expRow = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date BETWEEN ? AND ?"
    ).get(from, to);

    // Payroll
    const payRow = db.prepare(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM payroll_payments WHERE paid_at BETWEEN ? AND ?"
    ).get(from + ' 00:00:00', to + ' 23:59:59');

    const ingresos = Number(salesRow?.ingresos) || 0;
    const costo_mercancia = Number(salesRow?.costo_mercancia) || 0;
    const ganancia_bruta = Number(salesRow?.ganancia_bruta) || 0;
    const total_gastos = Number(expRow?.total) || 0;
    const total_nomina = Number(payRow?.total) || 0;
    const utilidad_neta = ganancia_bruta - total_gastos - total_nomina - total_comisiones;

    res.json({
      from, to,
      total_ventas: Number(salesRow?.total_ventas) || 0,
      ingresos,
      costo_mercancia,
      ganancia_bruta,
      total_comisiones,
      total_gastos,
      total_nomina,
      utilidad_neta,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/owner/daily-profit?from=&to=
router.get('/daily-profit', (req, res) => {
  try {
    const today = localDateStr();
    const from = req.query.from || (today.slice(0, 7) + '-01');
    const to = req.query.to || today;

    const rows = db.prepare(`
      SELECT
        s.sale_date as fecha,
        COALESCE(SUM(s.total), 0) as ingresos,
        COALESCE(SUM(COALESCE(p.cost_price, 0) * si.quantity), 0) as costo,
        COALESCE(SUM((si.price - COALESCE(p.cost_price, 0)) * si.quantity), 0) as ganancia
      FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE s.sale_date BETWEEN ? AND ?
      GROUP BY s.sale_date
      ORDER BY s.sale_date
    `).all(from, to);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
