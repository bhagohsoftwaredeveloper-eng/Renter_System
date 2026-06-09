const PushTokenRepository = require('../../domain/repositories/PushTokenRepository');

class PostgresPushTokenRepository extends PushTokenRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  /**
   * Upsert a device token. expo_token is unique, so re-registering the same
   * device (e.g. it switched to a different student) updates the existing row.
   */
  async save({ registrationId, recipientType, expoToken, platform }) {
    const { rows } = await this.db.query(
      `INSERT INTO push_tokens (registration_id, recipient_type, expo_token, platform)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (expo_token) DO UPDATE
         SET registration_id = EXCLUDED.registration_id,
             recipient_type = EXCLUDED.recipient_type,
             platform = EXCLUDED.platform,
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [registrationId, recipientType, expoToken, platform]
    );
    return rows[0];
  }

  async getByRegistrationId(registrationId) {
    const { rows } = await this.db.query(
      'SELECT * FROM push_tokens WHERE registration_id = $1',
      [registrationId]
    );
    return rows;
  }

  async getByRegistrationIdAndType(registrationId, recipientType) {
    const { rows } = await this.db.query(
      'SELECT * FROM push_tokens WHERE registration_id = $1 AND recipient_type = $2',
      [registrationId, recipientType]
    );
    return rows;
  }

  async deleteByToken(expoToken) {
    const { rows } = await this.db.query(
      'DELETE FROM push_tokens WHERE expo_token = $1 RETURNING *',
      [expoToken]
    );
    return rows[0] || null;
  }
}

module.exports = PostgresPushTokenRepository;
