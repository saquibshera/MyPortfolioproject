# Saquib Manzoor — Portfolio & Booking System

## 📁 Files
```
index-3.html     ← Your portfolio website
admin.html       ← Bookings admin dashboard
server.js        ← Node.js backend server
bookings.json    ← All bookings stored here (auto-created)
package.json     ← Node dependencies
```

## 🚀 How to Run

### 1. Install Node.js (one time)
Download from https://nodejs.org (LTS version)

### 2. Install dependencies (one time)
Open terminal in this folder and run:
```
npm install
```

### 3. Start the server
```
npm start
```
You'll see:
```
✅  Server running at http://localhost:3000
📋  Admin panel:   http://localhost:3000/admin.html
🔑  Admin password: saquib2025
```

### 4. Open your portfolio
Go to: http://localhost:3000/index-3.html

### 5. View bookings
Go to: http://localhost:3000/admin.html
Password: **saquib2025**

---

## 🔐 Change Admin Password
Edit `server.js` line ~15:
```js
const ADMIN_KEY = process.env.ADMIN_KEY || 'saquib2025';
```
Change `saquib2025` to your preferred password.

Or run with environment variable:
```
ADMIN_KEY=mypassword npm start
```

## 📊 Admin Features
- View all bookings with status
- Filter by status (New / Contacted / Confirmed / Completed)
- Search by name or email
- Update booking status with one click
- View full booking details in modal
- Export all bookings to CSV
- Delete bookings

## 📦 Bookings stored in
`bookings.json` — plain JSON file, easy to back up or open in Excel.
