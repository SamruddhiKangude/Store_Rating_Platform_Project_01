import express from 'express';
import { db } from './src/lib/db.ts';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(express.json());
app.use(cors());

// ---- AUTH ROUTES ----
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users]: any = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    if (users.length === 0 || users[0].password !== password) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ user: users[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, address } = req.body;
  try {
    const [existing]: any = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO User (id, name, email, password, address, role) VALUES (?, ?, ?, ?, ?, ?)', 
      [id, name, email, password, address, 'USER']
    );
    res.json({ user: { id, name, email, role: 'USER' }, success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Mock '/api/auth/me' since we don't have JWT implemented yet
app.get('/api/auth/me', (req, res) => {
  res.status(401).json({ error: 'Not authenticated' });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// ---- ADMIN ROUTES ----
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const [[{c: uCount}]]: any = await db.query('SELECT COUNT(*) as c FROM User');
    const [[{c: sCount}]]: any = await db.query('SELECT COUNT(*) as c FROM Store');
    const [[{c: rCount}]]: any = await db.query('SELECT COUNT(*) as c FROM Rating');
    res.json({ totalUsers: uCount, totalStores: sCount, totalRatings: rCount });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const [users]: any = await db.query('SELECT * FROM User');
    res.json({ users });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stores', async (req, res) => {
  try {
    const [stores]: any = await db.query('SELECT * FROM Store');
    res.json({ stores });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.listen(3001, () => { console.log('Server running on port 3001'); });
