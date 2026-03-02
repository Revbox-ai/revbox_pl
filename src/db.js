const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'revbox',
  user: 'revbox_user',
  password: 'revbox_secure_2026',
  max: 10,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  tx: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
