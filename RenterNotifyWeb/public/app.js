// Renter Notify — web alerts page.
// Sign in with registration number + phone (typed or scanned from the QR), then
// poll for recent meal-ticket alerts. Alert text + browser notifications use the
// same configurable ServeQueue templates the Android app receives.

const POLL_MS = 15000;
const STORE_KEY = 'rn_web_session';

const $ = (id) => document.getElementById(id);
const signinCard = $('signinCard');
const panel = $('panel');
const signinBtn = $('signinBtn');
const signinError = $('signinError');

let session = null;       // { registrationNumber, phone }
let seenIds = new Set();  // alert ids already shown (so only NEW ones notify)
let firstLoad = true;
let pollTimer = null;

// Renter + notification config from the backend (filled on each fetch).
let renter = { name: '', mealType: '' };
let tmpl = {
  titleTemplate: 'Meal Ticket Used',
  bodyTemplate: 'Hi! {name} used their {mealType} meal ticket at {time}.',
};

// --- helpers ---------------------------------------------------------------

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Same placeholder substitution as ServeQueue's CreateAccessLog._fillTemplate.
function fillTemplate(template, { name, mealType, time }) {
  return String(template || '')
    .replace(/\{name\}/g, name ?? '')
    .replace(/\{mealType\}/g, mealType ?? '')
    .replace(/\{time\}/g, time ?? '');
}

function prettyTime(time) {
  // "08:15:30 AM" -> "8:15 AM"
  if (!time) return '';
  const m = String(time).match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?/i);
  if (!m) return time;
  const h = String(parseInt(m[1], 10));
  return `${h}:${m[2]}${m[3] ? ' ' + m[3].toUpperCase() : ''}`;
}

function prettyDate(date) {
  // "2026-06-13" -> "Jun 13"
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d)) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function alertMessage(a) {
  const vars = { name: renter.name, mealType: renter.mealType, time: prettyTime(a.time) };
  return {
    title: fillTemplate(tmpl.titleTemplate, vars),
    body: fillTemplate(tmpl.bodyTemplate, vars),
  };
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
  } catch {}
}

function notify(a) {
  const { title, body } = alertMessage(a);
  beep();
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/assets/icon.png' });
    } catch {}
  }
}

// --- rendering -------------------------------------------------------------

function captureConfig(data) {
  renter = {
    name: data.registration?.name || 'Your renter',
    mealType: data.registration?.mealType || '',
  };
  if (data.notification) {
    tmpl = {
      titleTemplate: data.notification.titleTemplate || tmpl.titleTemplate,
      bodyTemplate: data.notification.bodyTemplate || tmpl.bodyTemplate,
    };
  }
}

function renderAlerts(data, freshIds) {
  $('whoName').textContent = data.registration?.name || 'Renter';
  const role = data.recipientType === 'parent' ? 'Parent' : 'Student';
  $('whoRole').textContent = role;

  const list = $('alertsList');
  const empty = $('emptyMsg');
  list.innerHTML = '';

  const alerts = data.alerts || [];
  empty.style.display = alerts.length ? 'none' : 'block';

  for (const a of alerts) {
    const { title, body } = alertMessage(a);
    const li = document.createElement('li');
    li.className = 'alert' + (freshIds.has(a.id) ? ' fresh' : '');
    li.innerHTML = `
      <div class="icon">🍽️</div>
      <div class="body">
        <div class="t">${escapeHtml(title)}</div>
        <div class="s">${escapeHtml(body)}</div>
      </div>
      <div class="when">${prettyDate(a.date)}<br>${prettyTime(a.time)}</div>
    `;
    list.appendChild(li);
  }
}

// --- data ------------------------------------------------------------------

async function fetchAlerts() {
  if (!session) return;
  let res, data;
  try {
    res = await fetch('/api/my-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    data = await res.json();
  } catch {
    return; // transient network error; keep last view, try again next tick
  }

  if (!res.ok) {
    if (res.status === 403 || res.status === 404) {
      signOut();
      signinError.textContent = data?.error || 'Could not verify your details.';
    }
    return;
  }

  captureConfig(data);

  const incoming = data.alerts || [];
  const freshIds = new Set();
  if (!firstLoad) {
    for (const a of incoming) {
      if (!seenIds.has(a.id)) {
        freshIds.add(a.id);
        notify(a);
      }
    }
  }
  for (const a of incoming) seenIds.add(a.id);
  firstLoad = false;

  renderAlerts(data, freshIds);
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(fetchAlerts, POLL_MS);
}
function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

// --- sign in / out ---------------------------------------------------------

async function signIn(registrationNumber, phone) {
  signinError.textContent = '';
  signinBtn.disabled = true;
  signinBtn.textContent = 'Checking…';
  try {
    const res = await fetch('/api/my-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber, phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      signinError.textContent = data?.error || 'Sign in failed. Check your details.';
      return;
    }
    session = { registrationNumber, phone };
    localStorage.setItem(STORE_KEY, JSON.stringify(session));
    seenIds = new Set();
    firstLoad = true;

    captureConfig(data);
    signinCard.style.display = 'none';
    panel.style.display = 'block';
    renderAlerts(data, new Set());
    for (const a of data.alerts || []) seenIds.add(a.id);
    firstLoad = false;
    startPolling();
  } catch {
    signinError.textContent = 'Could not connect. Please try again.';
  } finally {
    signinBtn.disabled = false;
    signinBtn.textContent = 'View my alerts';
  }
}

function signOut() {
  stopPolling();
  session = null;
  localStorage.removeItem(STORE_KEY);
  panel.style.display = 'none';
  signinCard.style.display = 'block';
}

// --- QR scanning -----------------------------------------------------------

const scanner = $('scanner');
const scanVideo = $('scanVideo');
const scanHint = $('scanHint');
let scanStream = null;
let scanRAF = null;
const scanCanvas = document.createElement('canvas');

// Accept the same payloads the app does: JSON {registrationNumber|r, phone|p}
// or a "reg|phone" string.
function parseQr(raw) {
  let reg = '';
  let ph = '';
  try {
    const p = JSON.parse(raw);
    reg = String(p.registrationNumber ?? p.r ?? '');
    ph = String(p.phone ?? p.p ?? '');
  } catch {
    const parts = String(raw).split(/[|,;]/);
    if (parts.length >= 2) {
      reg = parts[0];
      ph = parts[1];
    }
  }
  return { reg: reg.trim(), ph: ph.trim() };
}

async function startScan() {
  if (typeof jsQR !== 'function' || !navigator.mediaDevices?.getUserMedia) {
    signinError.textContent = 'QR scanning is not supported here — enter your details manually.';
    return;
  }
  signinError.textContent = '';
  scanHint.textContent = 'Point at your Renter Notify QR code';
  scanner.style.display = 'flex';
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    scanVideo.srcObject = scanStream;
    await scanVideo.play();
    scanRAF = requestAnimationFrame(scanTick);
  } catch {
    scanHint.textContent = 'Camera access denied. Tap Cancel and enter your details manually.';
  }
}

function scanTick() {
  if (scanVideo.readyState === scanVideo.HAVE_ENOUGH_DATA) {
    scanCanvas.width = scanVideo.videoWidth;
    scanCanvas.height = scanVideo.videoHeight;
    const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(scanVideo, 0, 0, scanCanvas.width, scanCanvas.height);
    const img = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code && code.data) {
      const { reg, ph } = parseQr(code.data);
      if (reg && ph) {
        stopScan();
        $('reg').value = reg;
        $('phone').value = ph;
        signIn(reg, ph);
        return;
      }
      scanHint.textContent = 'That QR is not a Renter Notify code. Try again or enter manually.';
    }
  }
  scanRAF = requestAnimationFrame(scanTick);
}

function stopScan() {
  if (scanRAF) cancelAnimationFrame(scanRAF);
  scanRAF = null;
  if (scanStream) scanStream.getTracks().forEach((t) => t.stop());
  scanStream = null;
  scanVideo.srcObject = null;
  scanner.style.display = 'none';
}

// --- wire up ---------------------------------------------------------------

signinBtn.addEventListener('click', () => {
  const reg = $('reg').value.trim();
  const phone = $('phone').value.trim();
  if (!reg || !phone) {
    signinError.textContent = 'Enter your registration number and phone.';
    return;
  }
  signIn(reg, phone);
});

$('phone').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') signinBtn.click();
});

$('scanBtn').addEventListener('click', startScan);
$('scanCancel').addEventListener('click', stopScan);

$('logoutBtn').addEventListener('click', signOut);

$('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    $('notifyBtn').textContent = 'Not supported on this browser';
    return;
  }
  const perm = await Notification.requestPermission();
  $('notifyBtn').textContent = perm === 'granted' ? '🔔 Browser alerts on' : '🔔 Alerts blocked';
});

// Restore a stored session on load.
(function init() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (stored?.registrationNumber && stored?.phone) {
      session = stored;
      signinCard.style.display = 'none';
      panel.style.display = 'block';
      fetchAlerts();
      startPolling();
    }
  } catch {}
})();
