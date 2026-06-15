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

  // Run a backup .sql script (TRUNCATE + INSERT) in a single transaction so a
  // malformed file rolls back cleanly instead of half-importing.
  //
  // Backups INSERT explicit ids, which does NOT advance the SERIAL sequences, so
  // afterwards the next auto-insert would collide (duplicate key on *_pkey). We
  // re-sync every serial id sequence to MAX(id) at the end so new scans keep
  // working — this self-heals even older backup files that lack setval lines.
  async importSql(sql) {
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN
            SELECT table_name FROM information_schema.columns
            WHERE table_schema = 'public' AND column_name = 'id'
              AND column_default LIKE 'nextval%'
          LOOP
            EXECUTE format(
              'SELECT setval(pg_get_serial_sequence(%L, ''id''), GREATEST((SELECT COALESCE(MAX(id), 1) FROM %I), 1))',
              r.table_name, r.table_name
            );
          END LOOP;
        END $$;
      `);
      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = PostgresSystemRepository;
