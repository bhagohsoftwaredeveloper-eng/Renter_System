class PostgresAccessLogRepository {
  constructor(db) {
    this.db = db;
  }

  async getAll() {
    const query = 'SELECT * FROM access_logs ORDER BY created_at DESC';
    const { rows } = await this.db.query(query);
    return rows;
  }

  async create(logData) {
    const query = `
      INSERT INTO access_logs (name, dept, point, location, type, status, date, time, avatar, whatsapp_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      logData.name,
      logData.dept,
      logData.point,
      logData.location,
      logData.type,
      logData.status,
      logData.date,
      logData.time,
      logData.avatar,
      logData.whatsappStatus || 'Not Sent'
    ];
    const { rows } = await this.db.query(query, values);
    return rows[0];
  }
}

module.exports = PostgresAccessLogRepository;
