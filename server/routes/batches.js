const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /batches?product_id=X  —  lotes de un producto
router.get('/', (req, res) => {
  try {
    const { product_id } = req.query;
    const where = product_id ? 'WHERE b.product_id = ?' : '';
    const params = product_id ? [product_id] : [];
    const rows = db.prepare(`
      SELECT b.*, p.name as product_name
      FROM batches b
      JOIN products p ON p.id = b.product_id
      ${where}
      ORDER BY b.expiry_date ASC, b.created_at ASC
    `).all(...params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /batches/expiring?days=30  —  lotes que caducan pronto o ya caducaron
router.get('/expiring', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const rows = db.prepare(`
      SELECT b.*, p.name as product_name, p.category
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE b.expiry_date IS NOT NULL
        AND b.expiry_date <= date('now', 'localtime', '+' || ? || ' days')
        AND b.quantity > 0
      ORDER BY b.expiry_date ASC
    `).all(days);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /batches  —  agregar lote
router.post('/', (req, res) => {
  try {
    const { product_id, lot_number, expiry_date, quantity, notes } = req.body;
    if (!product_id || quantity == null) {
      return res.status(400).json({ error: 'product_id y quantity son requeridos' });
    }
    const result = db.prepare(`
      INSERT INTO batches (product_id, lot_number, expiry_date, quantity, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(product_id, lot_number || null, expiry_date || null, parseInt(quantity), notes || null);
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(batch);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /batches/:id  —  actualizar lote
router.put('/:id', (req, res) => {
  try {
    const { lot_number, expiry_date, quantity, notes } = req.body;
    db.prepare(`
      UPDATE batches SET lot_number=?, expiry_date=?, quantity=?, notes=? WHERE id=?
    `).run(lot_number || null, expiry_date || null, parseInt(quantity), notes || null, req.params.id);
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    res.json(batch);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /batches/:id
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM batches WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
