import { Platform } from 'react-native';
import axios from 'axios';

/**
 * Centrally managed API configuration to ensure consistent behavior
 * across Web, Android Emulator, and Physical Devices.
 *
 * For distributed terminal deployments, set the following in localStorage:
 *   BACKEND_URL — e.g. "http://192.168.1.100:5005/api"   (central server)
 *   BRIDGE_URL  — e.g. "http://localhost:5003"            (local bridge, stays localhost per terminal)
 *   API_KEY     — the backend's API_KEY (only needed when the backend is public/cloud)
 */

// Default backend: the production cloud (Railway). A LAN/local deployment can
// override this per-terminal by saving BACKEND_URL in localStorage (Settings →
// Network Configuration), e.g. http://192.168.1.100:5005/api.
const CLOUD_API = 'https://rentersystem-production.up.railway.app/api';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    try {
      const savedUrl = localStorage.getItem('BACKEND_URL');
      // Migration: the old build defaulted to localhost:5005. Treat that exact
      // value as "no real override" so this cloud-default build takes effect.
      if (savedUrl && /\/\/(localhost|127\.0\.0\.1):5005\//.test(savedUrl)) {
        localStorage.removeItem('BACKEND_URL');
      } else if (savedUrl && !savedUrl.includes(':5003')) {
        // Guard: reject any URL that incorrectly points at the Biometric Bridge port
        return savedUrl;
      }
    } catch (e) {
      console.warn('Failed to read BACKEND_URL from localStorage', e);
    }
    return CLOUD_API;
  }
  return CLOUD_API;
};

/**
 * Returns the URL of the local Biometric Bridge service.
 * Reads BRIDGE_URL from localStorage so each terminal node can be
 * configured independently without a rebuild.
 * Default: http://localhost:5003
 */
const getBridgeUrl = () => {
  if (Platform.OS === 'web') {
    try {
      const saved = localStorage.getItem('BRIDGE_URL');
      if (saved && saved.trim().length > 0) return saved.trim();
    } catch (e) {
      console.warn('Failed to read BRIDGE_URL from localStorage', e);
    }
  }
  return 'http://127.0.0.1:5003';
};

/**
 * Reads the backend API key from localStorage (web/terminal builds) and applies
 * it as a default header on every axios request. Only needed once the backend is
 * public/cloud and enforces API_KEY; harmless (empty) for local LAN deployments.
 */
const applyApiKey = () => {
  if (Platform.OS !== 'web') return;
  try {
    const key = localStorage.getItem('API_KEY');
    if (key && key.trim().length > 0) {
      axios.defaults.headers.common['x-api-key'] = key.trim();
    }
  } catch (e) {
    console.warn('Failed to read API_KEY from localStorage', e);
  }
};

applyApiKey();

/**
 * Persists the backend API key and applies it immediately to all axios requests,
 * so login (and everything after) works against the cloud without an app restart.
 * Pass an empty string to clear it (LAN deployments where auth is off).
 */
export const setApiKey = (key) => {
  const trimmed = (key || '').trim();
  try {
    if (trimmed) localStorage.setItem('API_KEY', trimmed);
    else localStorage.removeItem('API_KEY');
  } catch (e) {
    console.warn('Failed to persist API_KEY', e);
  }
  if (trimmed) axios.defaults.headers.common['x-api-key'] = trimmed;
  else delete axios.defaults.headers.common['x-api-key'];
};

export const getStoredApiKey = () => {
  try { return localStorage.getItem('API_KEY') || ''; } catch (e) { return ''; }
};

export const API_BASE_URL = getBaseUrl();
export const BRIDGE_BASE_URL = getBridgeUrl();

export default {
  API_BASE_URL,
  BRIDGE_BASE_URL,
};
