const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./src/db');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3200;

app.use(express.json());
app.use(cookieParser());

// Panel admina — serwowany przez Express (nginx proxy)
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Static files — frontend HTML/CSS/JS
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html'],
}));

// API routes
const authRoutes = require('./src/routes/auth');
const categoriesRoutes = require('./src/routes/categories');
const productsRoutes = require('./src/routes/products');
const adminRoutes = require('./src/routes/admin');
const affiliatesRoutes = require('./src/routes/affiliates');
const preferencesRoutes = require('./src/routes/preferences');
const { requireAdmin } = require('./src/middleware/auth');

app.use('/api/admin/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/affiliates', affiliatesRoutes.public);
app.use('/api/admin/affiliates', affiliatesRoutes.admin);
app.use('/api/features', preferencesRoutes);
app.use('/api/preferences', preferencesRoutes);

// Admin CRUD for categories and products (require auth)
app.use('/api/admin/categories', categoriesRoutes);
app.use('/api/admin/products', productsRoutes);

// Ensure admin user exists on startup
async function ensureAdminUser() {
  const { rows } = await db.query("SELECT id FROM admin_users WHERE username = 'admin'");
  if (!rows.length) {
    const hash = await bcrypt.hash('bardzodobrehaslo', 10);
    await db.query(
      "INSERT INTO admin_users (username, password_hash, role) VALUES ('admin', $1, 'superadmin')",
      [hash]
    );
    console.log('Utworzono konto admin');
  }
}

ensureAdminUser().catch(console.error);

app.listen(PORT, () => {
  console.log(`Revbox server running on port ${PORT}`);
});
