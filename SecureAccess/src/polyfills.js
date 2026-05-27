// Polyfill Node.js globals for Electron renderer compatibility
const _global = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};

if (typeof _global.process === 'undefined') {
  _global.process = {
    env: { NODE_ENV: 'production' },
    browser: true,
    platform: 'browser',
    cwd: () => '/',
  };
}

_global.global = _global;
_global.__dirname = _global.__dirname || '/';
_global.__filename = _global.__filename || 'index.html';

if (typeof _global.Buffer === 'undefined') {
  try {
    _global.Buffer = require('buffer').Buffer;
  } catch (e) {
    console.warn('Buffer polyfill failed', e);
  }
}

import async from 'async';
import sjcl from 'sjcl';
import BigInteger from 'big-integer';

// Polyfill globals for DigitalPersona WebSDK
if (typeof window !== 'undefined') {
  window.async = async;
  window.sjcl = sjcl;
  window.BigInteger = BigInteger;
  
  // Providing a stub for SRPClient in case it's not used in the local capture path
  if (!window.SRPClient) {
    window.SRPClient = function() {
      console.warn('SRPClient stub called - Secure channel authentication might fail');
    };
  }

  // DigitalPersona WebSDK Core also needs to be initialized or stubbed if missing
  if (!window.WebSdkCore) {
    window.WebSdkCore = {};
  }
}
