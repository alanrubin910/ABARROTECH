const express = require('express');
const router = express.Router();
const db = require('../database');
const { localDateStr, localDateTimeStr } = require('../utils/date');

const CATEGORIES = ['Renta', 'Servicios', 'Proveedores', 'Transporte', 'Limpieza', 'Mantenimiento', 'Otros'];

router.get('/categories', (req, res) => res.json(CATEGORIES));

// GET expenses in date range
router.get('/', (req, res) => {
  try {
    const today = localDateStr();
    const from = req.query.from || (today.slice(0, 7) + '-01');
    const to = req.query.to || today;
    const expenses = db.prepare(`
      SELECT * FROM expenses
      WHERE expense_date BETWEEN ? AND ?
      ORDER BY expense_date DESC, created_at DESC
    `).all(from, to);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create expense
router.post('/', (req, res) => {
  try {
    const { category, description, amount, expense_date, notes } = req.body;
    if (!category || !amount) return res.status(400).json({ error: 'Categoría y monto requeridos' });
    const result = db.prepare(`
      INSERT INTO expenses (category, description, amount, expense_date, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      category,
      description || '',
      parseFloat(amount),
      expense_date || localDateStr(),
      notes || '',
      localDateTimeStr()
    );
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update expense
router.put('/:id', (req, res) => {
  try {
    const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!exp) return res.status(404).json({ error: 'Gasto no encontrado' });
    const { category, description, amount, expense_date, notes } = req.body;
    db.prepare(`
      UPDATE expenses SET category = ?, description = ?, amount = ?, expense_date = ?, notes = ?
      WHERE id = ?
    `).run(
      category || exp.category,
      description !== undefined ? description : exp.description,
      parseFloat(amount) || exp.amount,
      expense_date || exp.expense_date,
      notes !== undefined ? notes : exp.notes,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE expense
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
