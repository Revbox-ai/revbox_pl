const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

const COOKIE_NAME = 'revbox_user_session';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dni
  path: '/',
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password)
      return res.status(400).json({ error: 'Wymagane: email, username, password' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO site_users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username`,
      [email.toLowerCase().trim(), username.trim(), hash]
    );
    const user = rows[0];

    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO site_sessions (id, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [sessionId, user.id]
    );

    res.cookie(COOKIE_NAME, sessionId, COOKIE_OPTS);
    res.json({ loggedIn: true, id: user.id, email: user.email, username: user.username });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Ten adres email jest już zarejestrowany' });
    console.error('register error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Wymagane: email, password' });

    const { rows } = await db.query(
      `SELECT id, email, username, password_hash, is_active
       FROM site_users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    if (!user.is_active) return res.status(403).json({ error: 'Konto zostało dezaktywowane' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });

    await db.query(`UPDATE site_users SET last_login = NOW() WHERE id = $1`, [user.id]);

    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO site_sessions (id, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [sessionId, user.id]
    );

    res.cookie(COOKIE_NAME, sessionId, COOKIE_OPTS);
    res.json({ loggedIn: true, id: user.id, email: user.email, username: user.username });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const sessionId = req.cookies?.[COOKIE_NAME];
    if (sessionId) {
      await db.query('DELETE FROM site_sessions WHERE id = $1', [sessionId]);
    }
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ loggedIn: false });
  } catch (err) {
    console.error('logout error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const sessionId = req.cookies?.[COOKIE_NAME];
    if (!sessionId) return res.json({ loggedIn: false });

    const { rows } = await db.query(
      `SELECT u.id, u.email, u.username, u.is_active
       FROM site_sessions s
       JOIN site_users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.expires_at > NOW()`,
      [sessionId]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.json({ loggedIn: false });
    }
    res.json({ loggedIn: true, id: user.id, email: user.email, username: user.username });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

module.exports = router;
