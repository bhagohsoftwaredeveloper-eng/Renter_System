const SystemRepository = require('../../domain/repositories/SystemRepository');

class PostgresSystemRepository extends SystemRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  async resetData() {
    // Truncate non-user tables and restart identity to reset SERIAL counters
    // CASCADE handles foreign key dependencies
    await this.db.query(`
      TRUNCATE TABLE 
        meal_tickets, 
        registrations, 
        access_logs, 
        audit_logs 
      RESTART IDENTITY CASCADE
    `);
    return { success: true };
  }

  async getTableData(tableName) {
    const { rows } = await this.db.query(`SELECT * FROM ${tableName}`);
    return rows;
  }

  async getAllTables() {
    // List of tables we want to include in backups
    return ['users', 'registrations', 'meal_tickets', 'access_logs', 'audit_logs'];
  }
}

module.exports = PostgresSystemRepository;
