import { FingerprintReader, SampleFormat, DeviceSearch } from '@digitalpersona/devices/dist/es6';
import { FingerprintCaptureV1 } from '@digitalpersona/fingerprint';
import { BRIDGE_BASE_URL } from './api';

/**
 * Biometric Utility for Digital Persona Web Components
 * This utility uses the official @digitalpersona SDK to interact with the local service.
 * The bridge URL is read from localStorage (BRIDGE_URL) so it can be configured per-terminal.
 */

let reader = null;

const getReader = () => {
  if (!reader) {
    reader = new FingerprintReader();
  }
  return reader;
};

export const BiometricService = {
  /**
   * Check if the DigitalPersona Web Service is active
   */
  isServiceRunning: async () => {
    // 1. Try hitting the .NET Bridge (Primary) — URL is configurable per terminal
    try {
      console.log(`Biometric Service: Checking .NET Bridge at ${BRIDGE_BASE_URL}...`);
      const response = await fetch(`${BRIDGE_BASE_URL}/health`);
      if (response.ok) {
        console.log('.NET Biometric Bridge detected and running.');
        return true;
      }
    } catch (e) {
      console.log(`Could not reach .NET Biometric Bridge at ${BRIDGE_BASE_URL}. Falling back to HID Web SDK...`);
    }

    // 2. Fallback to HID Web SDK (52181)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('https://127.0.0.1:52181/get_connection', { 
        signal: controller.signal,
        mode: 'no-cors' 
      });
      clearTimeout(timeoutId);
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Start a capture operation
   * @returns {Promise<{template: string, status: string}>}
   */
  capture: async (options = {}) => {
    const { bridgeOnly = false } = options;
    // 1. Try .NET Bridge first — URL is configurable per terminal.
    // IMPORTANT: when the bridge is REACHABLE it is the sole owner of the reader
    // (it opens it EXCLUSIVE). A bridge timeout/error must NOT fall through to the
    // HID Web SDK below — that would have two clients fighting over the same
    // reader and wedge the hardware (0x8000ffff). We only fall back to the Web
    // SDK when the bridge is genuinely unreachable (fetch throws).
    let bridgeReachable = false;
    try {
      console.log(`Initiating capture via .NET Bridge at ${BRIDGE_BASE_URL}...`);
      const response = await fetch(`${BRIDGE_BASE_URL}/capture`);
      bridgeReachable = true;
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'SUCCESS') {
          return data;
        }
        throw new Error(data.detail || 'Capture failed');
      }
      // Bridge responded but not OK (e.g. 500 = 5s timeout / no finger). Surface
      // its message; the terminal treats "timed out" as "no finger yet".
      let detail = 'Capture timed out or no data received.';
      try { const p = await response.json(); detail = p.detail || p.title || detail; } catch (_) {}
      throw new Error(detail);
    } catch (e) {
      // If the bridge answered (even an error), it owns the reader — propagate,
      // never use the Web SDK fallback.
      if (bridgeReachable || bridgeOnly) {
        throw e;
      }
      console.warn('.NET Bridge unreachable. Trying HID Web SDK fallback...', e);
    }

    // 2. Fallback to HID Web SDK (only when the bridge is truly unreachable)
    const reader = getReader();
    // ... rest of the original capture logic ...
    
    try {
      console.log('Enumerating devices before capture...');
      const devices = await reader.enumerateDevices();
      console.log('Devices found:', devices);
      
      if (devices.length === 0) {
        throw new Error('NO_READER_FOUND: PLEASE CONNECT A FINGERPRINT READER TO CONTINUE.');
      }
      
      // If we have devices, let's log the first one's details
      console.log('Using Device:', devices[0]);
    } catch (err) {
      console.error('Error during device enumeration:', err);
      // We continue anyway as startAcquisition might work if the service handles it
    }

    return new Promise((resolve, reject) => {
      const onQualityReported = (event) => {
        console.log('Quality Reported:', event.quality);
      };

      const onSamplesAcquired = (event) => {
        console.log('Samples Acquired Event:', event);
        try {
          const samples = event.samples;
          if (samples && samples.length > 0) {
            const sample = samples[0];
            const templateData = sample.Data || sample; 
            console.log('Extracted Template Data (Base64Url):', templateData);
            
            resolve({
              template: templateData, 
              status: 'SUCCESS'
            });
          } else {
            console.warn('SamplesAcquired event fired but no samples found.');
            reject(new Error('No samples acquired'));
          }
        } catch (err) {
          console.error('Error processing acquired samples:', err);
          reject(err);
        } finally {
          reader.off('SamplesAcquired', onSamplesAcquired);
          reader.off('QualityReported', onQualityReported);
          reader.off('ErrorOccurred', onError);
          reader.stopAcquisition(); 
        }
      };

      const onError = (event) => {
        console.error('Biometric SDK Error (ErrorOccurred):', event);
        reader.off('SamplesAcquired', onSamplesAcquired);
        reader.off('QualityReported', onQualityReported);
        reader.off('ErrorOccurred', onError);
        reader.stopAcquisition().catch(() => {}); // ignore stop errors
        
        // Map 0x8000ffff to a human readable message if possible
        let errorMsg = event.error || 'Capture error';
        if (errorMsg.includes('0x8000ffff')) {
          errorMsg = 'CATASTROPHIC FAILURE (0x8000ffff): THE BIOMETRIC HARDWARE IS NOT RESPONDING. PLEASE UNPLUG AND RE-PLUG THE READER.';
        }
        
        reject(new Error(errorMsg));
      };

      reader.on('SamplesAcquired', onSamplesAcquired);
      reader.on('QualityReported', onQualityReported);
      reader.on('ErrorOccurred', onError);

      console.log('Sending startAcquisition command to reader...');
      reader.startAcquisition(SampleFormat.Intermediate)
        .catch(err => {
          console.error('Biometric SDK startAcquisition Catch:', err);
          reader.off('SamplesAcquired', onSamplesAcquired);
          reader.off('QualityReported', onQualityReported);
          reader.off('ErrorOccurred', onError);
          
          let errorMsg = err.message || 'Start acquisition failed';
          if (errorMsg.includes('0x8000ffff')) {
            errorMsg = 'CATASTROPHIC FAILURE (0x8000ffff): HARDWARE INITIALIZATION FAILED. TRY RESTARTING THE DIGITALPERSONA LITE SERVICE.';
          }
          reject(new Error(errorMsg));
        });
    });
  },

  /**
   * Verify/Identify a scanned fingerprint against stored templates
   * Identification is typically done on the server side using @digitalpersona/fingerprint library.
   * This stub remains for compatibility if local matching is ever needed.
   */
  identify: async (capturedTemplate, storedTemplates) => {
    console.warn('Local identification not implemented in SDK mode. Use server-side matching.');
    return { score: 0, index: -1 };
  }
};
