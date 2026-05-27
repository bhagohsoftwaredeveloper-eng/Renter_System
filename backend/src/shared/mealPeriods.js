/**
 * Meal period helpers shared by meal-ticket generation, the 1-meal restriction,
 * and report summaries. Meal windows are configurable via system_settings
 * (keys: meal_window_breakfast / meal_window_lunch / meal_window_dinner) and
 * stored as "HH:MM-HH:MM" strings.
 */

const DEFAULT_WINDOWS = {
  Breakfast: '5:00 AM-10:00 AM',
  Lunch: '11:00 AM-2:00 PM',
  Dinner: '5:00 PM-9:00 PM'
};

const SETTING_KEYS = {
  Breakfast: 'meal_window_breakfast',
  Lunch: 'meal_window_lunch',
  Dinner: 'meal_window_dinner'
};

/** Parse a single time token ("5:00 AM", "05:00", "2:30 PM") into minutes-from-midnight. */
function parseTimeToMinutes(token) {
  if (!token) return null;
  const m = String(token).trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (min > 59) return null;
  const ap = m[3] ? m[3].toUpperCase() : null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    h = ap === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  } else if (h > 23) {
    return null;
  }
  return h * 60 + min;
}

/**
 * Parse a meal window into { startMin, endMin }. Accepts 12h ("5:00 AM-10:00 AM")
 * or 24h ("05:00-10:00") so older saved values keep working.
 */
function parseWindow(value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split('-');
  if (parts.length !== 2) return null;
  const startMin = parseTimeToMinutes(parts[0]);
  const endMin = parseTimeToMinutes(parts[1]);
  if (startMin == null || endMin == null) return null;
  return { startMin, endMin };
}

/**
 * Load the configured windows from a SystemSettingsRepository, falling back to
 * defaults when a key is missing or malformed.
 * @returns {Promise<{Breakfast:string, Lunch:string, Dinner:string}>}
 */
async function loadWindows(systemSettingsRepository) {
  const windows = { ...DEFAULT_WINDOWS };
  if (!systemSettingsRepository) return windows;
  for (const period of Object.keys(SETTING_KEYS)) {
    try {
      const value = await systemSettingsRepository.get(SETTING_KEYS[period]);
      if (value && parseWindow(value)) windows[period] = value;
    } catch (_) {
      // keep default on read failure
    }
  }
  return windows;
}

/**
 * Determine which meal period a given date/time falls into.
 * @param {Date} date
 * @param {object} windows - { Breakfast, Lunch, Dinner } as "HH:MM-HH:MM"
 * @returns {'Breakfast'|'Lunch'|'Dinner'|null}
 */
function getMealPeriod(date, windows = DEFAULT_WINDOWS) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  for (const period of ['Breakfast', 'Lunch', 'Dinner']) {
    const w = parseWindow(windows[period]);
    if (w && minutes >= w.startMin && minutes < w.endMin) return period;
  }
  return null;
}

/**
 * Like getMealPeriod, but never returns null: a time outside every window is
 * attributed to the closest meal period. Used for REPORTS so an off-hours scan
 * still appears somewhere (the strict getMealPeriod is used for the 1-meal limit).
 * @returns {'Breakfast'|'Lunch'|'Dinner'}
 */
function getNearestMealPeriod(date, windows = DEFAULT_WINDOWS) {
  const inWindow = getMealPeriod(date, windows);
  if (inWindow) return inWindow;

  const minutes = date.getHours() * 60 + date.getMinutes();
  let best = 'Dinner';
  let bestDist = Infinity;
  for (const period of ['Breakfast', 'Lunch', 'Dinner']) {
    const w = parseWindow(windows[period]);
    if (!w) continue;
    const dist = minutes < w.startMin ? (w.startMin - minutes)
      : minutes >= w.endMin ? (minutes - w.endMin)
      : 0;
    if (dist < bestDist) {
      bestDist = dist;
      best = period;
    }
  }
  return best;
}

/**
 * Format a Date as a naive local wall-clock string ("YYYY-MM-DD HH:MM:SS").
 *
 * The meal_tickets.generated_at column is `TIMESTAMP WITHOUT TIME ZONE` and is
 * written by CURRENT_TIMESTAMP, so it holds the DB session's *local* wall clock.
 * Postgres parses an ISO string with a "Z"/offset as a NAIVE timestamp for that
 * column (it drops the zone), so passing `.toISOString()` bounds compares UTC
 * wall-clock against local-stored values and is off by the UTC offset. Use this
 * helper so the range bounds are local wall-clock too and the comparison lines up.
 */
function toLocalNaive(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Compute the [start, end] Date boundaries of a meal period on the same
 * calendar day as `date`.
 * @returns {{start: Date, end: Date}|null}
 */
function getPeriodBounds(date, period, windows = DEFAULT_WINDOWS) {
  const w = parseWindow(windows[period]);
  if (!w) return null;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  start.setMinutes(w.startMin);
  end.setMinutes(w.endMin);
  return { start, end };
}

module.exports = {
  DEFAULT_WINDOWS,
  SETTING_KEYS,
  parseWindow,
  loadWindows,
  getMealPeriod,
  getNearestMealPeriod,
  getPeriodBounds,
  toLocalNaive
};
