const db = require('../db');

async function requireAdmin(req, res, next) {
  const sessionId = req.cookies?.revbox_session;
  if (!sessionId) return res.status(401).json({ error: 'Brak sesji' });

  const { rows } = await db.query(
    `SELECT s.user_id, u.username, u.role
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > NOW() AND u.is_active = true`,
    [sessionId]
  );

  if (!rows.length) return res.status(401).json({ error: 'Sesja wygasła' });

  req.adminUser = rows[0];
  next();
}

module.exports = { requireAdmin };
