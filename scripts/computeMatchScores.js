'use strict';
/**
 * Przelicza match_score dla wszystkich produktów z cechami.
 * Uruchamiać po każdym imporcie danych.
 *
 * Użycie: node scripts/computeMatchScores.js
 */
const db = require('../src/db');
const { calculateMatchScore } = require('../src/services/matchScore');

async function run() {
  // Pobierz wszystkie produkty mające jakiekolwiek cechy
  const { rows: products } = await db.query(
    'SELECT DISTINCT product_id FROM product_features'
  );
  console.log(`Liczba produktów do przeliczenia: ${products.length}`);

  let updated = 0;
  for (const { product_id } of products) {
    const { rows: features } = await db.query(
      `SELECT
         feature_en,
         COALESCE(SUM(mention_count) FILTER (WHERE sentiment = 'positive'), 0) AS positive,
         COALESCE(SUM(mention_count) FILTER (WHERE sentiment = 'negative'), 0) AS negative
       FROM product_features
       WHERE product_id = $1
       GROUP BY feature_en`,
      [product_id]
    );

    const result = calculateMatchScore(features);

    await db.query(
      `UPDATE products
       SET match_score = $1, match_score_data = $2, updated_at = NOW()
       WHERE id = $3`,
      [result.matchScore, JSON.stringify(result), product_id]
    );
    updated++;
  }

  console.log(`Zaktualizowano ${updated} produktów.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
