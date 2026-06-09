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

const LOCAL_HOST = 'localhost';
const EMULATOR_HOST = '10.0.2.2'; // Standard Android emulator loopback to host

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    try {
      const savedUrl = localStorage.getItem('BACKEND_URL');
      // Guard: reject any URL that incorrectly points at the Biometric Bridge port
      if (savedUrl && !savedUrl.includes(':5003')) {
        return savedUrl;
      }
    } catch (e) {
      console.warn('Failed to read BACKEND_URL from localStorage', e);
    }
    return `http://${LOCAL_HOST}:5005/api`;
  }
  return `http://${EMULATOR_HOST}:5005/api`;
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

export const API_BASE_URL = getBaseUrl();
export const BRIDGE_BASE_URL = getBridgeUrl();

export default {
  API_BASE_URL,
  BRIDGE_BASE_URL,
};
