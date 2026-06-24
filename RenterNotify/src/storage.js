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

// Recent alerts persist across app restarts but only for ONE MONTH — anything
// older than 30 days is dropped on load/save so the list self-prunes.
const ALERTS_KEY = 'renter_notify_alerts';
export const ALERTS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function loadAlerts() {
  const raw = await AsyncStorage.getItem(ALERTS_KEY);
  const all = raw ? JSON.parse(raw) : [];
  const cutoff = Date.now() - ALERTS_RETENTION_MS;
  return all.filter((a) => a && a.at && a.at >= cutoff);
}

export async function saveAlerts(alerts) {
  const cutoff = Date.now() - ALERTS_RETENTION_MS;
  const fresh = (alerts || []).filter((a) => a && a.at && a.at >= cutoff);
  await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(fresh));
}
