const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all products
router.get('/', (req, res) => {
  try {
    const { category, search, active } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (active !== 'all') {
      query += ' AND active = 1';
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (name LIKE ? OR barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY name ASC';

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET product by barcode (for scanner)
router.get('/barcode/:barcode', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE barcode = ? AND active = 1').get(req.params.barcode);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET categories
router.get('/categories', (req, res) => {
  try {
    const cats = db.prepare('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category').all();
    res.json(cats.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single product
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create product
router.post('/', (req, res) => {
  try {
    const { name, price, barcode, stock, min_stock, unit, category, cost_price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Nombre y precio son requeridos' });
    }
    const result = db.prepare(`
      INSERT INTO products (name, price, barcode, stock, min_stock, unit, category, cost_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, price, barcode || null, stock || 0, min_stock || 5, unit || 'pieza', category || 'General', cost_price || 0);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'El código de barras ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update product
router.put('/:id', (req, res) => {
  try {
    const { name, price, barcode, stock, min_stock, unit, category, cost_price } = req.body;
    db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        barcode = COALESCE(?, barcode),
        stock = COALESCE(?, stock),
        min_stock = COALESCE(?, min_stock),
        unit = COALESCE(?, unit),
        category = COALESCE(?, category),
        cost_price = COALESCE(?, cost_price),
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(name, price, barcode, stock, min_stock, unit, category, cost_price ?? null, req.params.id);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(product);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'El código de barras ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE soft delete
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
