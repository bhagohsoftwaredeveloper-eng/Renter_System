/**
 * @interface PushTokenRepository
 */
class PushTokenRepository {
  async save(tokenData) {
    throw new Error('Method not implemented');
  }

  async getByRegistrationId(registrationId) {
    throw new Error('Method not implemented');
  }

  async getByRegistrationIdAndType(registrationId, recipientType) {
    throw new Error('Method not implemented');
  }

  async deleteByToken(expoToken) {
    throw new Error('Method not implemented');
  }
}

module.exports = PushTokenRepository;
