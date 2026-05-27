/**
 * @interface SystemSettingsRepository
 */
class SystemSettingsRepository {
  async get(key) {
    throw new Error('Method not implemented');
  }

  async set(key, value) {
    throw new Error('Method not implemented');
  }

  async getAll() {
    throw new Error('Method not implemented');
  }
}

module.exports = SystemSettingsRepository;
