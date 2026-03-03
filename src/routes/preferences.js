'use strict';
const express = require('express');
const db = require('../db');
const { calculateMatchScore } = require('../services/matchScore');

const router = express.Router();

// GET /api/features/category/:categoryId  (router mounted at /api/features)
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         pf.feature_en,
         SUM(pf.mention_count) AS total_mentions,
         COALESCE(SUM(pf.mention_count) FILTER (WHERE pf.sentiment = 'positive'), 0) AS positive,
         COALESCE(SUM(pf.mention_count) FILTER (WHERE pf.sentiment = 'negative'), 0) AS negative,
         COUNT(DISTINCT pf.product_id) AS product_count
       FROM product_features pf
       JOIN products p ON p.id = pf.product_id
       WHERE p.category_id = $1 AND p.is_active = true
       GROUP BY pf.feature_en
       HAVING SUM(pf.mention_count) >= 5
       ORDER BY SUM(pf.mention_count) DESC
       LIMIT 50`,
      [req.params.categoryId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/preferences/:sessionId/:categoryId
// Preferowane cechy użytkownika dla danej kategorii
router.get('/:sessionId/:categoryId', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT feature_en FROM user_preferences WHERE session_id = $1 AND category_id = $2',
      [req.params.sessionId, req.params.categoryId]
    );
    res.json(rows.map(r => r.feature_en));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/preferences/:sessionId
// Wszystkie preferencje zgrupowane wg category_id
router.get('/:sessionId', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT category_id, feature_en FROM user_preferences WHERE session_id = $1 ORDER BY category_id',
      [req.params.sessionId]
    );
    const result = {};
    for (const row of rows) {
      if (!result[row.category_id]) result[row.category_id] = [];
      result[row.category_id].push(row.feature_en);
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/preferences/:sessionId/:categoryId/toggle
// Body: { feature_en, enabled }
router.post('/:sessionId/:categoryId/toggle', async (req, res) => {
  try {
    const { feature_en, enabled } = req.body;
    if (!feature_en) return res.status(400).json({ error: 'Brak feature_en' });
    if (enabled) {
      await db.query(
        `INSERT INTO user_preferences (session_id, category_id, feature_en)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [req.params.sessionId, req.params.categoryId, feature_en]
      );
    } else {
      await db.query(
        'DELETE FROM user_preferences WHERE session_id=$1 AND category_id=$2 AND feature_en=$3',
        [req.params.sessionId, req.params.categoryId, feature_en]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/preferences/match-batch
// Body: { sessionId, categoryId, productIds: [...] }
// Zwraca { productId: matchScore, ... } dla produktów z listy
router.post('/match-batch', async (req, res) => {
  try {
    const { sessionId, categoryId, productIds } = req.body;
    if (!sessionId || !categoryId || !productIds?.length) return res.json({});

    const { rows: prefRows } = await db.query(
      'SELECT feature_en FROM user_preferences WHERE session_id = $1 AND category_id = $2',
      [sessionId, categoryId]
    );
    if (!prefRows.length) return res.json({});
    const prefFeatures = prefRows.map(r => r.feature_en);

    const { rows: featureRows } = await db.query(
      `SELECT
         product_id,
         feature_en,
         COALESCE(SUM(mention_count) FILTER (WHERE sentiment = 'positive'), 0) AS positive,
         COALESCE(SUM(mention_count) FILTER (WHERE sentiment = 'negative'), 0) AS negative
       FROM product_features
       WHERE product_id = ANY($1) AND feature_en = ANY($2)
       GROUP BY product_id, feature_en`,
      [productIds, prefFeatures]
    );

    const byProduct = {};
    for (const row of featureRows) {
      if (!byProduct[row.product_id]) byProduct[row.product_id] = [];
      byProduct[row.product_id].push({
        feature_en: row.feature_en,
        positive: parseInt(row.positive) || 0,
        negative: parseInt(row.negative) || 0,
      });
    }

    const result = {};
    for (const productId of productIds) {
      const features = byProduct[productId] || [];
      result[productId] = features.length ? calculateMatchScore(features).matchScore : null;
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

module.exports = router;
