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
