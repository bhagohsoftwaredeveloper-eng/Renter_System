const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.apiKey = process.env.WASSENGER_API_KEY;
    this.baseUrl = 'https://api.wassenger.com/v1/messages';
  }

  /**
   * Sends a plain text WhatsApp message using Wassenger API.
   * Wassenger works by scanning a QR code with your existing WhatsApp account.
   * @param {string} to - Recipient phone number (with country code, e.g. 639123456789)
   * @param {string} message - The text message to send
   * @param {string} [apiKey] - Optional Wassenger API key to override the environment variable
   */
  async sendMessage(to, message, apiKey) {
    const currentApiKey = apiKey || this.apiKey;

    if (!currentApiKey) {
      console.warn('[WhatsAppService] Wassenger API Key missing. Skipping message.');
      return;
    }

    // Sanitize phone number: remove '+' and any non-numeric characters
    const sanitizedPhone = to.replace(/\+/g, '').replace(/\D/g, '');

    if (!sanitizedPhone) {
      console.warn('[WhatsAppService] Invalid recipient phone number. skipping.');
      return;
    }

    try {
      const response = await axios.post(this.baseUrl, {
        phone: sanitizedPhone,
        message: message,
        enqueue: 'never' // Set to 'always' if you want to queue messages when device is offline
      }, {
        headers: {
          'Token': currentApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      console.log(`[WhatsAppService] Message sent via Wassenger to ${sanitizedPhone}. ID: ${response.data.id}`);
      return response.data;
    } catch (err) {
      const errorData = err.response?.data || {};
      console.error('[WhatsAppService] Wassenger API Error:', {
        message: errorData.message || err.message,
        code: errorData.code,
        status: err.response?.status
      });
      return { error: true, details: errorData };
    }
  }
}

module.exports = WhatsAppService;
