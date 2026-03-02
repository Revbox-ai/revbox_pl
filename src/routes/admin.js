const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/logs
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const user = req.query.user || '';
    const action = req.query.action || '';

    const conditions = [];
    const params = [];
    if (user) { params.push(`%${user}%`); conditions.push(`username ILIKE $${params.length}`); }
    if (action) { params.push(`%${action}%`); conditions.push(`action ILIKE $${params.length}`); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT * FROM activity_logs ${where} ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const { rows: cnt } = await db.query(
      `SELECT COUNT(*) FROM activity_logs ${where}`, params.slice(0, -2)
    );
    res.json({ logs: rows, total: parseInt(cnt[0].count), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [prod, cat, logs, feat] = await Promise.all([
      db.query('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active, COUNT(*) FILTER (WHERE is_featured) AS featured FROM products'),
      db.query('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active FROM categories'),
      db.query('SELECT COUNT(*) AS total FROM activity_logs'),
      db.query('SELECT COUNT(*) AS total FROM product_features'),
    ]);
    res.json({
      products: prod.rows[0],
      categories: cat.rows[0],
      logs: logs.rows[0],
      features: feat.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, role, is_active, last_login, created_at FROM admin_users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/users
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Brak danych' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO admin_users (username, password_hash, role) VALUES ($1,$2,$3) RETURNING id, username, role, is_active',
      [username, hash, role || 'admin']
    );
    await db.query(
      `INSERT INTO activity_logs (user_id, username, action, entity_type, entity_id)
       VALUES ($1,$2,'create_user','user',$3)`,
      [req.adminUser.user_id, req.adminUser.username, String(rows[0].id)]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Użytkownik już istnieje' });
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PATCH /api/admin/users/:id/toggle
router.patch('/users/:id/toggle', requireAdmin, async (req, res) => {
  try {
    if (String(req.params.id) === String(req.adminUser.user_id)) {
      return res.status(400).json({ error: 'Nie możesz dezaktywować własnego konta' });
    }
    const { rows } = await db.query(
      'UPDATE admin_users SET is_active = NOT is_active WHERE id=$1 RETURNING id, username, is_active',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// DELETE /api/admin/features/:id
router.delete('/features/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM product_features WHERE id=$1 RETURNING id, feature_en',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    await db.query(
      `INSERT INTO activity_logs (user_id, username, action, entity_type, entity_id, ip_address)
       VALUES ($1,$2,'delete_feature','product_feature',$3,$4)`,
      [req.adminUser.user_id, req.adminUser.username, String(req.params.id), req.ip]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

module.exports = router;
