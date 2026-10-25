const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'apex-motors-super-secret-jwt-key';
const dbPath = process.env.DB_PATH || path.join(__dirname, '../dealership.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'customer'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER DEFAULT 2024,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    hp INTEGER DEFAULT 500,
    engine TEXT DEFAULT '4.0L V8',
    zeroToSixty REAL DEFAULT 3.5
  )`);
});

const app = express();
app.use(cors());
app.use(express.json());

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role = 'customer' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const hashed = bcrypt.hashSync(password, 8);
  db.run(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name || email.split('@')[0], email, hashed, role],
    function (err) {
      if (err) return res.status(400).json({ error: 'User already exists' });
      const token = jwt.sign({ id: this.lastID, email, role }, JWT_SECRET, { expiresIn: '24h' });
      res.status(201).json({ id: this.lastID, email, role, token });
    }
  );
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, token });
  });
});

// GET /api/vehicles
app.get('/api/vehicles', (req, res) => {
  db.all('SELECT * FROM vehicles', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/vehicles/search
app.get('/api/vehicles/search', (req, res) => {
  const { make, model, category, maxPrice } = req.query;
  let sql = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];
  if (make) { sql += ' AND LOWER(make) LIKE ?'; params.push(`%${make.toLowerCase()}%`); }
  if (model) { sql += ' AND LOWER(model) LIKE ?'; params.push(`%${model.toLowerCase()}%`); }
  if (category && category !== 'ALL') { sql += ' AND category = ?'; params.push(category); }
  if (maxPrice) { sql += ' AND price <= ?'; params.push(Number(maxPrice)); }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/vehicles (Protected)
app.post('/api/vehicles', authenticateToken, (req, res) => {
  const { id, make, model, category, price, quantity, hp = 500, engine = '4.0L V8', zeroToSixty = 3.5 } = req.body;
  const vId = id || `car-${Date.now()}`;
  db.run(
    'INSERT INTO vehicles (id, make, model, category, price, quantity, hp, engine, zeroToSixty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [vId, make, model, category, price, quantity, hp, engine, zeroToSixty],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.status(201).json({ id: vId, make, model, category, price, quantity, hp, engine, zeroToSixty });
    }
  );
});

// PUT /api/vehicles/:id (Protected)
app.put('/api/vehicles/:id', authenticateToken, (req, res) => {
  const { make, model, category, price, quantity } = req.body;
  db.run(
    'UPDATE vehicles SET make = ?, model = ?, category = ?, price = ?, quantity = ? WHERE id = ?',
    [make, model, category, price, quantity, req.params.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: req.params.id, make, model, category, price, quantity });
    }
  );
});

// DELETE /api/vehicles/:id (Admin only)
app.delete('/api/vehicles/:id', authenticateToken, requireAdmin, (req, res) => {
  db.run('DELETE FROM vehicles WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ deleted: req.params.id });
  });
});

// POST /api/vehicles/:id/purchase (Protected)
app.post('/api/vehicles/:id/purchase', authenticateToken, (req, res) => {
  db.get('SELECT * FROM vehicles WHERE id = ?', [req.params.id], (err, vehicle) => {
    if (err || !vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.quantity <= 0) return res.status(400).json({ error: 'Vehicle out of stock' });
    const newQty = vehicle.quantity - 1;
    db.run('UPDATE vehicles SET quantity = ? WHERE id = ?', [newQty, req.params.id], function (uErr) {
      if (uErr) return res.status(500).json({ error: uErr.message });
      res.json({ ...vehicle, quantity: newQty, status: 'PURCHASE_CONFIRMED' });
    });
  });
});

// POST /api/vehicles/:id/restock (Admin only)
app.post('/api/vehicles/:id/restock', authenticateToken, requireAdmin, (req, res) => {
  const amount = Number(req.body.amount || 1);
  db.get('SELECT * FROM vehicles WHERE id = ?', [req.params.id], (err, vehicle) => {
    if (err || !vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    const newQty = vehicle.quantity + amount;
    db.run('UPDATE vehicles SET quantity = ? WHERE id = ?', [newQty, req.params.id], function (uErr) {
      if (uErr) return res.status(500).json({ error: uErr.message });
      res.json({ ...vehicle, quantity: newQty });
    });
  });
});

module.exports = app;
