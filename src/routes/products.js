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
    const status = req.query.status || '';           // 'active'|'inactive'|'' (admin only)
    const featuredFilter = req.query.featured_filter || ''; // 'yes'|'no'|'' (admin only)
    const priceEurMin = req.query.price_eur_min ? parseFloat(req.query.price_eur_min) : null;
    const priceEurMax = req.query.price_eur_max ? parseFloat(req.query.price_eur_max) : null;
    const pricePlnMin = req.query.price_pln_min ? parseFloat(req.query.price_pln_min) : null;
    const pricePlnMax = req.query.price_pln_max ? parseFloat(req.query.price_pln_max) : null;

    const conditions = [];
    const params = [];

    if (!adminMode) {
      conditions.push('p.is_active = true');
    } else if (status === 'active') {
      conditions.push('p.is_active = true');
    } else if (status === 'inactive') {
      conditions.push('p.is_active = false');
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
    if (adminMode && featuredFilter === 'yes') {
      conditions.push('p.is_featured = true');
    } else if (adminMode && featuredFilter === 'no') {
      conditions.push('p.is_featured = false');
    }
    if (priceEurMin !== null) { params.push(priceEurMin); conditions.push(`p.price_eur >= $${params.length}`); }
    if (priceEurMax !== null) { params.push(priceEurMax); conditions.push(`p.price_eur <= $${params.length}`); }
    if (pricePlnMin !== null) { params.push(pricePlnMin); conditions.push(`p.price_pln >= $${params.length}`); }
    if (pricePlnMax !== null) { params.push(pricePlnMax); conditions.push(`p.price_pln <= $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT p.id, p.sku, p.name_pl, p.name_en, p.price_eur, p.price_pln,
              p.is_active, p.is_featured, p.priority, p.image_url,
              p.description_pl, p.url, p.source, p.created_at, p.revbox_score,
              c.name_pl AS category_name, c.slug AS category_slug,
              (SELECT COUNT(*) FROM product_features pf WHERE pf.product_id = p.id) AS feature_count,
              (SELECT COALESCE(SUM(pf2.mention_count), 0) FROM product_features pf2 WHERE pf2.product_id = p.id) AS total_mentions
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

// GET /api/products/:id/quotes?feature=...
router.get('/:id/quotes', async (req, res) => {
  try {
    const feature = req.query.feature || '';
    if (!feature) return res.status(400).json({ error: 'Brak parametru feature' });
    const { rows } = await db.query(
      `SELECT id, quote_en, sentiment FROM feature_quotes
       WHERE product_id = $1 AND feature_en = $2
       ORDER BY id`,
      [req.params.id, feature]
    );
    res.json(rows);
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
      `SELECT id, feature_en, sentiment, mention_count, sample_quote
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
    const { sku, name_pl, name_en, category_id, price_eur, price_pln,
            url, description_pl, description_en, is_active, is_featured, priority, image_url, source, seo_text_pl } = req.body;
    const { rows } = await db.query(
      `UPDATE products SET sku=COALESCE($1, sku), name_pl=$2, name_en=$3, category_id=$4, price_eur=$5, price_pln=$6,
         url=$7, description_pl=$8, description_en=$9, is_active=$10, is_featured=$11,
         priority=$12, image_url=$13, source=$14, seo_text_pl=$15, updated_at=NOW()
       WHERE id=$16 RETURNING *`,
      [sku || null, name_pl, name_en || null, category_id || null, price_eur || null, price_pln || null,
       url || null, description_pl || null, description_en || null,
       is_active !== false, !!is_featured, priority || 0, image_url || null,
       source || null, seo_text_pl || null, req.params.id]
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
