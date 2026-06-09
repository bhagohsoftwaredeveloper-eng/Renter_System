import axios from 'axios';
import { API_BASE_URL, MOBILE_API_KEY } from './config';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  // Sent only when configured; the backend ignores it when MOBILE_API_KEY is unset.
  headers: MOBILE_API_KEY ? { 'x-api-key': MOBILE_API_KEY } : {},
});

// Links this device's Expo token to a registration. The backend verifies the
// phone belongs to the registration and tells us whether we're the parent or
// student. Throws with a friendly message on failure.
export async function registerPushToken({ registrationNumber, phone, expoToken, platform }) {
  try {
    const { data } = await client.post('/api/push/register', {
      registrationNumber,
      phone,
      expoToken,
      platform,
    });
    return data;
  } catch (err) {
    const message = err.response?.data?.error || err.message || 'Network error';
    throw new Error(message);
  }
}

export async function unregisterPushToken(expoToken) {
  try {
    await client.post('/api/push/unregister', { expoToken });
  } catch (err) {
    // Best-effort cleanup; ignore failures so logout always proceeds.
    console.warn('unregister failed:', err.message);
  }
}
