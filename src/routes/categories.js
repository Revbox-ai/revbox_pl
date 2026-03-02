const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function log(req, action, entityId, details) {
  await db.query(
    `INSERT INTO activity_logs (user_id, username, action, entity_type, entity_id, ip_address, details)
     VALUES ($1, $2, $3, 'category', $4, $5, $6)`,
    [req.adminUser.user_id, req.adminUser.username, action, String(entityId), req.ip, JSON.stringify(details || {})]
  );
}

// GET /api/admin/categories  (public też przez /api/categories)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
       GROUP BY c.id
       ORDER BY c.sort_order, c.name_pl`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/categories
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name_pl, name_en, slug, description, is_active, sort_order } = req.body;
    if (!name_pl || !slug) return res.status(400).json({ error: 'name_pl i slug są wymagane' });

    const { rows } = await db.query(
      `INSERT INTO categories (name_pl, name_en, slug, description, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name_pl, name_en || null, slug, description || null, is_active !== false, sort_order || 0]
    );
    await log(req, 'create_category', rows[0].id, { name: name_pl });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug już istnieje' });
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PUT /api/admin/categories/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name_pl, name_en, slug, description, is_active, sort_order } = req.body;
    const { rows } = await db.query(
      `UPDATE categories SET name_pl=$1, name_en=$2, slug=$3, description=$4,
       is_active=$5, sort_order=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name_pl, name_en || null, slug, description || null, is_active !== false, sort_order || 0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    await log(req, 'update_category', req.params.id, { name: name_pl });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// DELETE /api/admin/categories/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM categories WHERE id=$1 RETURNING name_pl', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    await log(req, 'delete_category', req.params.id, { name: rows[0].name_pl });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

module.exports = router;
