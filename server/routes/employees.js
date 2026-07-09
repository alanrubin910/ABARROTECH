const express = require('express');
const router = express.Router();
const db = require('../database');
const { localDateStr, localDateTimeStr } = require('../utils/date');

// GET all payroll history (general) — must be before /:id routes
router.get('/payroll/all', (req, res) => {
  try {
    const { from, to } = req.query;
    const today = localDateStr();
    const fromDate = from || (today.slice(0, 7) + '-01');
    const toDate = to || today;
    const payments = db.prepare(`
      SELECT * FROM payroll_payments
      WHERE paid_at BETWEEN ? AND ?
      ORDER BY paid_at DESC
    `).all(fromDate + ' 00:00:00', toDate + ' 23:59:59');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all active employees
router.get('/', (req, res) => {
  try {
    const employees = db.prepare('SELECT * FROM employees WHERE active = 1 ORDER BY name').all();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create employee
router.post('/', (req, res) => {
  try {
    const { name, position, salary_type, base_salary } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const result = db.prepare(`
      INSERT INTO employees (name, position, salary_type, base_salary, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(name.trim(), position || '', salary_type || 'weekly', parseFloat(base_salary) || 0, localDateTimeStr());
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(emp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update employee
router.put('/:id', (req, res) => {
  try {
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });
    const { name, position, salary_type, base_salary } = req.body;
    db.prepare(`
      UPDATE employees SET name = ?, position = ?, salary_type = ?, base_salary = ?
      WHERE id = ?
    `).run(
      name || emp.name,
      position !== undefined ? position : emp.position,
      salary_type || emp.salary_type,
      parseFloat(base_salary) >= 0 ? parseFloat(base_salary) : emp.base_salary,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (soft) employee
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE employees SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET payroll history for one employee
router.get('/:id/payroll', (req, res) => {
  try {
    const payments = db.prepare(`
      SELECT * FROM payroll_payments WHERE employee_id = ?
      ORDER BY paid_at DESC LIMIT 50
    `).all(req.params.id);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST register payroll payment for one employee
router.post('/:id/payroll', (req, res) => {
  try {
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });
    const { period_start, period_end, days_worked, amount_paid, notes } = req.body;
    if (!amount_paid) return res.status(400).json({ error: 'Monto requerido' });
    const result = db.prepare(`
      INSERT INTO payroll_payments (employee_id, employee_name, period_start, period_end, days_worked, base_amount, amount_paid, notes, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(emp.id), emp.name,
      period_start || null,
      period_end || null,
      parseInt(days_worked) || 0,
      Number(emp.base_salary) || 0,
      parseFloat(amount_paid),
      notes || null,
      localDateTimeStr()
    );
    const payment = db.prepare('SELECT * FROM payroll_payments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
