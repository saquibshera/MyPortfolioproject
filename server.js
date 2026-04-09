const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── Helper: read/write JSON ─────────────────────────────────
function readBookings() {
  if (!fs.existsSync(BOOKINGS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8')); }
  catch { return []; }
}

function writeBookings(data) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Helper: send email using Brevo API ──────────────────────
async function sendEmail(booking) {
  try {
    // Admin email
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { email: process.env.SENDER_EMAIL, name: "Saquib" },
        to: [{ email: process.env.SENDER_EMAIL }],
        subject: `📌 New Booking: ${booking.name}`,
        htmlContent: `
          <h2>New Booking Received</h2>
          <p><b>Name:</b> ${booking.name}</p>
          <p><b>Email:</b> ${booking.email}</p>
          <p><b>Phone:</b> ${booking.phone || 'N/A'}</p>
          <p><b>Company:</b> ${booking.company || 'N/A'}</p>
          <p><b>Training Type:</b> ${booking.trainingType || 'N/A'}</p>
          <p><b>Date:</b> ${booking.preferredDate || 'N/A'}</p>
          <p><b>Message:</b> ${booking.message}</p>
        `
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    // User confirmation email
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { email: process.env.SENDER_EMAIL, name: "Saquib" },
        to: [{ email: booking.email }],
        subject: 'Booking Confirmation - Saquib Manzoor',
        htmlContent: `
          <h2>Thank you ${booking.name}!</h2>
          <p>Your booking request has been received.</p>
          <p>We will contact you shortly.</p>
        `
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Emails sent for booking ID: ${booking.id}`);
  } catch (error) {
    console.error("❌ Email error:", error.response?.data || error.message);
  }
}

// ── POST /api/book ──────────────────────────────────────────
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
    status: 'new',
    createdAt: new Date().toISOString()
  };

  const bookings = readBookings();
  bookings.unshift(booking);
  writeBookings(bookings);

  console.log(`[${new Date().toLocaleString()}] New booking from ${name} <${email}>`);

  sendEmail(booking);

  res.json({ ok: true, id: booking.id });
});

// ── GET bookings ────────────────────────────────────────────
app.get('/api/bookings', (req, res) => {
  const ADMIN_KEY = process.env.ADMIN_KEY || 'saquib2025';

  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  res.json({ ok: true, bookings: readBookings() });
});

// ── PATCH booking ───────────────────────────────────────────
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

// ── DELETE booking ──────────────────────────────────────────
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

// ── Start server ────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});