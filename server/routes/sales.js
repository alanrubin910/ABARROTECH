const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  try {
    const { date, session_id } = req.query;
    let query = 'SELECT * FROM sales WHERE 1=1';
    const params = [];

    if (date) { query += ' AND sale_date = ?'; params.push(date); }
    if (session_id) { query += ' AND session_id = ?'; params.push(session_id); }
    query += ' ORDER BY created_at DESC';

    const sales = db.prepare(query).all(...params);
    const withItems = sales.map(sale => ({
      ...sale,
      items: db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id)
    }));
    res.json(withItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
    res.json({ ...sale, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { session_id, cashier_name, payment_method, items, cash_received, transfer_ref,
            commission_rate, commission_amount, terminal_name } = req.body;
    if (!cashier_name || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos de venta incompletos' });
    }

    const productTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const commAmt = parseFloat(commission_amount) || 0;
    const total = parseFloat((productTotal + commAmt).toFixed(2));
    console.log(`[VENTA] metodo=${payment_method} productTotal=${productTotal} commAmt=${commAmt} total=${total} terminal=${terminal_name}`);
    const change_given = payment_method === 'efectivo' && cash_received ? Math.max(0, cash_received - total) : 0;

    // Verificar stock antes de iniciar la transacción
    for (const item of items) {
      const product = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(item.product_id);
      if (!product) {
        return res.status(400).json({ error: `Producto no encontrado (ID ${item.product_id})` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuficiente: "${product.name}" — disponible: ${product.stock}, solicitado: ${item.quantity}`,
          product_name: product.name,
          available: product.stock,
          requested: item.quantity
        });
      }
    }

    db.exec('BEGIN');
    try {
      const saleResult = db.prepare(`
        INSERT INTO sales (session_id, cashier_name, payment_method, total, cash_received, change_given, transfer_ref,
                          commission_rate, commission_amount, terminal_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(session_id, cashier_name, payment_method || 'efectivo', total, cash_received || null, change_given, transfer_ref || null,
             parseFloat(commission_rate) || 0, commAmt, terminal_name || null);

      const saleId = saleResult.lastInsertRowid;

      for (const item of items) {
        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, product_name, product_barcode, price, quantity, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(saleId, item.product_id, item.product_name, item.product_barcode || null, item.price, item.quantity, item.price * item.quantity);

        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
      }

      db.exec('COMMIT');

      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
      res.status(201).json({ ...sale, items: saleItems });
    } catch (inner) {
      db.exec('ROLLBACK');
      throw inner;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
