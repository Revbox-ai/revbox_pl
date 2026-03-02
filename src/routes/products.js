const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function log(req, action, entityId, details) {
  await db.query(
    `INSERT INTO activity_logs (user_id, username, action, entity_type, entity_id, ip_address, details)
     VALUES ($1, $2, $3, 'product', $4, $5, $6)`,
    [req.adminUser.user_id, req.adminUser.username, action, String(entityId), req.ip, JSON.stringify(details || {})]
  );
}

// GET /api/products  — public listing (also used by admin)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 24));
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim() || '';
    const category = req.query.category || '';
    const featured = req.query.featured === 'true';
    const adminMode = req.query.admin === 'true';

    const conditions = [];
    const params = [];

    if (!adminMode) {
      conditions.push('p.is_active = true');
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name_pl ILIKE $${params.length} OR p.name_en ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      conditions.push(`c.slug = $${params.length}`);
    }
    if (featured) {
      conditions.push('p.is_featured = true');
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT p.id, p.sku, p.name_pl, p.name_en, p.price_eur, p.price_pln,
              p.is_active, p.is_featured, p.priority, p.image_url,
              p.description_pl, p.url, p.created_at,
              c.name_pl AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.is_featured DESC, p.priority DESC, p.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Total count
    const countParams = params.slice(0, -2);
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}`,
      countParams
    );

    res.json({
      products: rows,
      total: parseInt(countRows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, c.name_pl AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });

    const product = rows[0];
    const { rows: features } = await db.query(
      `SELECT feature_en, sentiment, mention_count, sample_quote
       FROM product_features WHERE product_id = $1
       ORDER BY mention_count DESC LIMIT 30`,
      [product.id]
    );
    product.features = features;
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/products
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { sku, name_pl, name_en, category_id, price_eur, price_pln,
            url, description_pl, description_en, is_active, is_featured, priority, image_url } = req.body;
    if (!sku || !name_pl) return res.status(400).json({ error: 'SKU i nazwa są wymagane' });

    const { rows } = await db.query(
      `INSERT INTO products (sku, name_pl, name_en, category_id, price_eur, price_pln,
         url, description_pl, description_en, is_active, is_featured, priority, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [sku, name_pl, name_en || null, category_id || null, price_eur || null, price_pln || null,
       url || null, description_pl || null, description_en || null,
       is_active !== false, !!is_featured, priority || 0, image_url || null]
    );
    await log(req, 'create_product', rows[0].id, { sku, name: name_pl });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU już istnieje' });
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PUT /api/admin/products/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name_pl, name_en, category_id, price_eur, price_pln,
            url, description_pl, description_en, is_active, is_featured, priority, image_url } = req.body;
    const { rows } = await db.query(
      `UPDATE products SET name_pl=$1, name_en=$2, category_id=$3, price_eur=$4, price_pln=$5,
         url=$6, description_pl=$7, description_en=$8, is_active=$9, is_featured=$10,
         priority=$11, image_url=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [name_pl, name_en || null, category_id || null, price_eur || null, price_pln || null,
       url || null, description_pl || null, description_en || null,
       is_active !== false, !!is_featured, priority || 0, image_url || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    await log(req, 'update_product', req.params.id, { name: name_pl });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// DELETE /api/admin/products/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM products WHERE id=$1 RETURNING name_pl', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    await log(req, 'delete_product', req.params.id, { name: rows[0].name_pl });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// PATCH /api/admin/products/:id/toggle
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE products SET is_active = NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING id, is_active, name_pl',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono' });
    await log(req, rows[0].is_active ? 'activate_product' : 'deactivate_product', req.params.id, { name: rows[0].name_pl });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

module.exports = router;
