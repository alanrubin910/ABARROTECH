const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM restocking ORDER BY created_at DESC').all();
    const withItems = orders.map(order => ({
      ...order,
      items: db.prepare('SELECT * FROM restocking_items WHERE restocking_id = ?').all(order.id)
    }));
    res.json(withItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM restocking WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    const items = db.prepare('SELECT * FROM restocking_items WHERE restocking_id = ?').all(order.id);
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { supplier_name, notes, items } = req.body;
    if (!supplier_name || !items || items.length === 0) {
      return res.status(400).json({ error: 'Proveedor y productos son requeridos' });
    }

    const total_cost = items.reduce((sum, item) => sum + (item.cost_per_unit * item.quantity_added), 0);

    db.exec('BEGIN');
    try {
      const result = db.prepare(`
        INSERT INTO restocking (supplier_name, notes, total_cost)
        VALUES (?, ?, ?)
      `).run(supplier_name, notes || null, total_cost);

      const restockId = result.lastInsertRowid;

      for (const item of items) {
        const subtotal = item.cost_per_unit * item.quantity_added;
        db.prepare(`
          INSERT INTO restocking_items (restocking_id, product_id, product_name, quantity_added, cost_per_unit, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(restockId, item.product_id, item.product_name, item.quantity_added, item.cost_per_unit || 0, subtotal);

        db.prepare(`UPDATE products SET stock = stock + ?, updated_at = datetime('now', 'localtime') WHERE id = ?`)
          .run(item.quantity_added, item.product_id);
      }

      db.exec('COMMIT');

      const order = db.prepare('SELECT * FROM restocking WHERE id = ?').get(restockId);
      const orderItems = db.prepare('SELECT * FROM restocking_items WHERE restocking_id = ?').all(restockId);
      res.status(201).json({ ...order, items: orderItems });
    } catch (inner) {
      db.exec('ROLLBACK');
      throw inner;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
