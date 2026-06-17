const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const PUBLIC_DIR = path.join(__dirname, 'public');
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

// Backend the web alerts page talks to. The MOBILE_API_KEY is kept server-side
// here (set as a Railway env var) and never shipped to the browser.
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://rentersystem-production.up.railway.app';
const MOBILE_API_KEY = process.env.MOBILE_API_KEY || '';

app.use(express.json());

// Proxy for the web alerts page: forwards the renter's reg#/phone to the backend
// (adding the API key) and relays the meal-ticket alerts back. Keeps the secret
// off the client and avoids CORS.
app.post('/api/my-alerts', async (req, res) => {
  const { registrationNumber, phone } = req.body || {};
  if (!registrationNumber || !phone) {
    return res.status(400).json({ error: 'Registration number and phone are required.' });
  }
  try {
    const upstream = await fetch(`${BACKEND_API_URL}/api/push/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(MOBILE_API_KEY ? { 'x-api-key': MOBILE_API_KEY } : {}),
      },
      body: JSON.stringify({ registrationNumber, phone, limit: 30 }),
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('my-alerts proxy error:', err.message);
    res.status(502).json({ error: 'Could not reach the alerts service. Please try again.' });
  }
});

// Find the APK to serve. Drop any *.apk into downloads/ and it gets picked up;
// if several exist, the most recently modified one wins (newest build).
function findApk() {
  try {
    const apks = fs
      .readdirSync(DOWNLOADS_DIR)
      .filter((f) => f.toLowerCase().endsWith('.apk'))
      .map((f) => {
        const full = path.join(DOWNLOADS_DIR, f);
        return { name: f, full, mtime: fs.statSync(full).mtimeMs, size: fs.statSync(full).size };
      })
      .sort((a, b) => b.mtime - a.mtime);
    return apks[0] || null;
  } catch {
    return null;
  }
}

// JSON describing the current build, so the page can show size/availability.
app.get('/api/release', (req, res) => {
  const apk = findApk();
  if (!apk) return res.json({ available: false });
  res.json({
    available: true,
    fileName: apk.name,
    sizeMb: +(apk.size / (1024 * 1024)).toFixed(1),
    updatedAt: new Date(apk.mtime).toISOString(),
  });
});

// The actual download. Forces a clean, branded filename for the saved file.
app.get('/download', (req, res) => {
  const apk = findApk();
  if (!apk) {
    return res
      .status(503)
      .type('text/plain')
      .send('The APK has not been uploaded yet. Please try again after the app is built.');
  }
  res.download(apk.full, 'ZT-Notify.apk');
});

// Static landing page + assets.
app.use(express.static(PUBLIC_DIR));

// Railway health check.
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`RenterNotify download site running on port ${PORT}`);
});
