const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serves index-3.html, admin.html, etc.

// ── Helper: read/write JSON ─────────────────────────────────
function readBookings() {
  if (!fs.existsSync(BOOKINGS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8')); }
  catch { return []; }
}

function writeBookings(data) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── POST /api/book  — save a new booking ───────────────────
app.post('/api/book', (req, res) => {
  const { name, email, subject, message, phone, company, trainingType, preferredDate } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Name, email and message are required.' });
  }

  const booking = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim(),
    phone: (phone || '').trim(),
    company: (company || '').trim(),
    subject: (subject || '').trim(),
    trainingType: (trainingType || '').trim(),
    preferredDate: (preferredDate || '').trim(),
    message: message.trim(),
    status: 'new',          // new | contacted | confirmed | completed
    createdAt: new Date().toISOString()
  };

  const bookings = readBookings();
  bookings.unshift(booking);   // newest first
  writeBookings(bookings);

  console.log(`[${new Date().toLocaleString()}] New booking from ${name} <${email}>`);
  res.json({ ok: true, id: booking.id });
});

// ── GET /api/bookings  — list all bookings (admin) ─────────
app.get('/api/bookings', (req, res) => {
  // Simple password check via query param: /api/bookings?key=YOUR_PASSWORD
  const ADMIN_KEY = process.env.ADMIN_KEY || 'saquib2025';
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  res.json({ ok: true, bookings: readBookings() });
});

// ── PATCH /api/bookings/:id  — update status ───────────────
app.patch('/api/bookings/:id', (req, res) => {
  const ADMIN_KEY = process.env.ADMIN_KEY || 'saquib2025';
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const bookings = readBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Not found' });
  bookings[idx].status = status;
  writeBookings(bookings);
  res.json({ ok: true });
});

// ── DELETE /api/bookings/:id  — delete a booking ───────────
app.delete('/api/bookings/:id', (req, res) => {
  const ADMIN_KEY = process.env.ADMIN_KEY || 'saquib2025';
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const id = parseInt(req.params.id);
  let bookings = readBookings();
  bookings = bookings.filter(b => b.id !== id);
  writeBookings(bookings);
  res.json({ ok: true });
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
