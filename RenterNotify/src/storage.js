import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'renter_notify_session';

// The session holds who is logged in plus the Expo token we registered, so we
// can unregister it on logout.
export async function saveSession(session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

// Recent alerts persist across app restarts but only for ONE DAY — anything
// older than 24h is dropped on load/save so the list self-prunes.
const ALERTS_KEY = 'renter_notify_alerts';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function loadAlerts() {
  const raw = await AsyncStorage.getItem(ALERTS_KEY);
  const all = raw ? JSON.parse(raw) : [];
  const cutoff = Date.now() - ONE_DAY_MS;
  return all.filter((a) => a && a.at && a.at >= cutoff);
}

export async function saveAlerts(alerts) {
  const cutoff = Date.now() - ONE_DAY_MS;
  const fresh = (alerts || []).filter((a) => a && a.at && a.at >= cutoff);
  await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(fresh));
}
