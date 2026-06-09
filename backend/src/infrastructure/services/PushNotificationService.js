const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^Ex(?:ponent)?PushToken\[.+\]$/;

/**
 * Push messaging via the Expo Push Notification service.
 *
 * Unlike WhatsApp this requires no per-message cost and no template approval, but
 * the recipient must have the mobile app installed and a registered Expo push token.
 * Used as the primary notification channel; WhatsApp remains a backup.
 *
 * Expo accepts up to 100 messages per request, so send() batches automatically.
 */
class PushNotificationService {
  // Expo only accepts tokens of the form ExponentPushToken[...] / ExpoPushToken[...]
  _isValidToken(token) {
    return typeof token === 'string' && EXPO_TOKEN_PATTERN.test(token);
  }

  _logError(err) {
    const errorData = err.response?.data || {};
    console.error('[PushNotificationService] Expo Push Error:', {
      message: errorData.errors ? JSON.stringify(errorData.errors) : err.message,
      status: err.response?.status,
    });
    return { error: true, details: errorData.errors || { message: err.message } };
  }

  /**
   * Sends a notification to one or more Expo push tokens.
   * @param {string|string[]} tokens - One token or a list of tokens.
   * @param {object} payload
   * @param {string} payload.title
   * @param {string} payload.body
   * @param {object} [payload.data] - Arbitrary data delivered to the app.
   * @returns {Promise<object>} Expo response, or { error, details } on failure.
   */
  async send(tokens, { title, body, data = {} } = {}) {
    const tokenList = (Array.isArray(tokens) ? tokens : [tokens]).filter((t) => this._isValidToken(t));

    if (tokenList.length === 0) {
      console.warn('[PushNotificationService] No valid Expo push tokens. Skipping.');
      return { error: true, details: { message: 'No valid push tokens' } };
    }
    if (!title && !body) {
      console.warn('[PushNotificationService] Empty title and body. Skipping.');
      return { error: true, details: { message: 'Empty notification content' } };
    }

    const messages = tokenList.map((to) => ({
      to,
      sound: 'default',
      title,
      body,
      data,
    }));

    // Expo caps each request at 100 messages.
    const batches = [];
    for (let i = 0; i < messages.length; i += 100) {
      batches.push(messages.slice(i, i + 100));
    }

    try {
      const tickets = [];
      for (const batch of batches) {
        const response = await axios.post(EXPO_PUSH_URL, batch, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        });
        if (Array.isArray(response.data?.data)) {
          tickets.push(...response.data.data);
        }
      }
      console.log(`[PushNotificationService] Sent ${messages.length} push message(s). Tickets: ${tickets.length}`);
      return { data: tickets };
    } catch (err) {
      return this._logError(err);
    }
  }
}

module.exports = PushNotificationService;
