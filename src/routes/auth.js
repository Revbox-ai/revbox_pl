const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();
const SESSION_DAYS = 7;

// POST /api/admin/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Brak danych' });

    const { rows } = await db.query(
      'SELECT * FROM admin_users WHERE username = $1 AND is_active = true',
      [username]
    );
    if (!rows.length) return res.status(401).json({ error: 'Błędne dane logowania' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      await db.query(
        `INSERT INTO activity_logs (username, action, ip_address, details)
         VALUES ($1, 'login_failed', $2, $3)`,
        [username, req.ip, JSON.stringify({ reason: 'bad_password' })]
      );
      return res.status(401).json({ error: 'Błędne dane logowania' });
    }

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
    await db.query(
      'INSERT INTO admin_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
      [sessionId, user.id, expiresAt]
    );
    await db.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [user.id]);
    await db.query(
      `INSERT INTO activity_logs (user_id, username, action, ip_address)
       VALUES ($1, $2, 'login', $3)`,
      [user.id, user.username, req.ip]
    );

    res.cookie('revbox_session', sessionId, {
      httpOnly: true,
      secure: false,
      maxAge: SESSION_DAYS * 86400000,
      sameSite: 'lax',
    });
    res.json({ ok: true, username: user.username, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/admin/auth/logout
router.post('/logout', async (req, res) => {
  const sessionId = req.cookies?.revbox_session;
  if (sessionId) {
    await db.query('DELETE FROM admin_sessions WHERE id = $1', [sessionId]);
  }
  res.clearCookie('revbox_session');
  res.json({ ok: true });
});

// GET /api/admin/auth/me
router.get('/me', async (req, res) => {
  const sessionId = req.cookies?.revbox_session;
  if (!sessionId) return res.json({ loggedIn: false });

  const { rows } = await db.query(
    `SELECT u.username, u.role FROM admin_sessions s
     JOIN admin_users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > NOW() AND u.is_active = true`,
    [sessionId]
  );
  if (!rows.length) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, ...rows[0] });
});

module.exports = router;
