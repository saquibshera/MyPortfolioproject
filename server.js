const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

// ── Email Configuration ─────────────────────────────────────
// const transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com',
//   port: 465,
//   secure: true,
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_APP_PASSWORD
//   }
// });
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_APP_PASSWORD
//   }
// });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  connectionTimeout: 10000,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP Error:", error);
  } else {
    console.log("SMTP server is ready");
  }
});

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

// ── Helper: send email ──────────────────────────────────────
async function sendEmail(booking) {
  // Email to you (admin)
  const adminMailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: `📌 New Booking: ${booking.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0066cc;">New Booking Received</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Name:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${booking.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${booking.email}">${booking.email}</a></td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Phone:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${booking.phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Company:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${booking.company || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Training Type:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${booking.trainingType || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Preferred Date:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${booking.preferredDate || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Message:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${booking.message}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">
          <em>Check your admin dashboard to manage this booking.</em>
        </p>
      </div>
    `
  };

  // Confirmation email to user
  const userMailOptions = {
    from: process.env.GMAIL_USER,
    to: booking.email,
    subject: 'Booking Confirmation - Saquib Manzoor',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Thank you for your interest, ${booking.name}!</h2>
        <p>We have received your booking request and will get back to you shortly.</p>
        <h3>Your Details:</h3>
        <ul>
          <li><strong>Subject:</strong> ${booking.subject || 'N/A'}</li>
          <li><strong>Preferred Date:</strong> ${booking.preferredDate || 'N/A'}</li>
          <li><strong>Training Type:</strong> ${booking.trainingType || 'N/A'}</li>
        </ul>
        <p style="margin-top: 20px; color: #666;">We will review your request and contact you soon.</p>
        <p style="margin-top: 30px; color: #999; font-size: 12px;">
          <em>This is an automated message. Please do not reply to this email.</em>
        </p>
      </div>
    `
  };

  try {
    // Send both emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);
    console.log(`✅ Emails sent for booking ID: ${booking.id}`);
  } catch (error) {
    console.error(`❌ Email error for booking ID ${booking.id}:`, error.message);
  }
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
  
  // Send emails asynchronously (don't wait for completion)
  sendEmail(booking);

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
  
  // Verify email configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email configuration error:', error.message);
      console.log('\n⚠️  Email setup issue detected:');
      console.log('1. Check if GMAIL_APP_PASSWORD is correct (16 characters, no spaces when setting)');
      console.log('2. Verify 2-Step Verification is ENABLED on your Gmail account');
      console.log('3. Make sure the App Password is recent (sometimes old ones expire)');
    } else {
      console.log('✅ Email service ready to send!');
    }
  });
});
