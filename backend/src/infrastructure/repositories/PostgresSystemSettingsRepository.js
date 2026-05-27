const SystemSettingsRepository = require('../../domain/repositories/SystemSettingsRepository');

class PostgresSystemSettingsRepository extends SystemSettingsRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  async get(key) {
    const { rows } = await this.db.query('SELECT value FROM system_settings WHERE key = $1', [key]);
    if (rows.length === 0) return null;
    return rows[0].value;
  }

  async set(key, value) {
    try {
      console.log(`[PostgresSystemSettingsRepository] Setting ${key} to ${value}`);
      const { rows } = await this.db.query(
        `INSERT INTO system_settings (key, value, updated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP) 
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP 
         RETURNING *`,
        [key, value]
      );
      console.log(`[PostgresSystemSettingsRepository] Successfully updated ${key}`);
      return rows[0];
    } catch (err) {
      console.error(`[PostgresSystemSettingsRepository] Error setting ${key}:`, err.message);
      throw err;
    }
  }

  async getAll() {
    const { rows } = await this.db.query('SELECT * FROM system_settings');
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }
}

module.exports = PostgresSystemSettingsRepository;
