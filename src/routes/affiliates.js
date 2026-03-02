const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const publicRouter = express.Router();
const adminRouter = express.Router();

// ── PUBLIC ──────────────────────────────────────────────────────

// GET /api/affiliates/shops
publicRouter.get('/shops', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, logo_url FROM affiliate_shops WHERE is_active=true ORDER BY sort_order, id'
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Błąd serwera' }); }
});

// GET /api/affiliates/product/:id
publicRouter.get('/product/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pa.id, pa.product_url, pa.price_pln, pa.price_with_shipping,
              pa.delivery_time, pa.delivery_note, pa.sort_order,
              s.name AS shop_name, s.logo_url AS shop_logo
       FROM product_affiliates pa
       JOIN affiliate_shops s ON s.id = pa.shop_id
       WHERE pa.product_id = $1 AND s.is_active = true
       ORDER BY pa.sort_order, pa.id`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Błąd serwera' }); }
});

// ── ADMIN: SHOPS ────────────────────────────────────────────────

// GET /api/admin/affiliates/shops
adminRouter.get('/shops', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM affiliate_shops ORDER BY sort_order, id');
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Błąd serwera' }); }
});

// POST /api/admin/affiliates/shops
adminRouter.post('/shops', requireAdmin, async (req, res) => {
  try {
    const { name, logo_url, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Nazwa wymagana' });
    const { rows } = await db.query(
      'INSERT INTO affiliate_shops (name, logo_url, sort_order) VALUES ($1,$2,$3) RETURNING *',
      [name, logo_url || null, sort_order || 0]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Błąd serwera' }); }
});

// PUT /api/admin/affiliates/shops/:id
adminRouter.put('/shops/:id', requireAdmin, async (req, res) => {
  try {
    const { name, logo_url, sort_order } = req.body;
    const { rows } = await db.query(
      'UPDATE affiliate_shops SET name=$1, logo_url=$2, sort_order=$3 WHERE id=$4 RETURNING *',
      [name, logo_url || null, sort_order || 0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Błąd serwera' }); }
});

// PATCH /api/admin/affiliates/shops/:id/toggle
adminRouter.patch('/shops/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE affiliate_shops SET is_active=NOT is_active WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Błąd serwera' }); }
});

// DELETE /api/admin/affiliates/shops/:id
adminRouter.delete('/shops/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM affiliate_shops WHERE id=$1 RETURNING id', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Błąd serwera' }); }
});

// ── ADMIN: PRODUCT AFFILIATES ───────────────────────────────────

// GET /api/admin/affiliates/product/:id
adminRouter.get('/product/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pa.*, s.name AS shop_name, s.logo_url AS shop_logo
       FROM product_affiliates pa JOIN affiliate_shops s ON s.id=pa.shop_id
       WHERE pa.product_id=$1 ORDER BY pa.sort_order, pa.id`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Błąd serwera' }); }
});

// POST /api/admin/affiliates/product/:id
adminRouter.post('/product/:id', requireAdmin, async (req, res) => {
  try {
    const { shop_id, product_url, price_pln, price_with_shipping, delivery_time, delivery_note, sort_order } = req.body;
    if (!shop_id || !product_url) return res.status(400).json({ error: 'shop_id i product_url wymagane' });
    const { rows } = await db.query(
      `INSERT INTO product_affiliates
         (product_id, shop_id, product_url, price_pln, price_with_shipping, delivery_time, delivery_note, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, shop_id, product_url, price_pln || null, price_with_shipping || null,
       delivery_time || null, delivery_note || null, sort_order || 0]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ten sklep jest już dodany do tego produktu' });
    console.error(err); res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PUT /api/admin/affiliates/:id
adminRouter.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { shop_id, product_url, price_pln, price_with_shipping, delivery_time, delivery_note, sort_order } = req.body;
    const { rows } = await db.query(
      `UPDATE product_affiliates
       SET shop_id=$1, product_url=$2, price_pln=$3, price_with_shipping=$4,
           delivery_time=$5, delivery_note=$6, sort_order=$7
       WHERE id=$8 RETURNING *`,
      [shop_id, product_url, price_pln || null, price_with_shipping || null,
       delivery_time || null, delivery_note || null, sort_order || 0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Błąd serwera' }); }
});

// DELETE /api/admin/affiliates/:id
adminRouter.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM product_affiliates WHERE id=$1 RETURNING id', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Błąd serwera' }); }
});

module.exports = { public: publicRouter, admin: adminRouter };
