import Constants from 'expo-constants';

// Base URL of the Renter Systems backend.
// Set this in app.json -> expo.extra.apiBaseUrl. It MUST be reachable from the
// phone, so use the machine's LAN IP (e.g. http://192.168.1.100:5005), NOT
// localhost. Find it with `ipconfig` (Windows) under your active adapter.
export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:5005';

// EAS project id, required by Expo to issue a push token on SDK 53+.
export const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId || null;

// Shared secret for the backend's MOBILE_API_KEY auth. Empty locally (auth off);
// set it in app.json -> expo.extra.mobileApiKey when the backend is on the cloud.
export const MOBILE_API_KEY =
  Constants.expoConfig?.extra?.mobileApiKey || '';
