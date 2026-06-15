/**
 * Restores a database backup by running an uploaded .sql script against the
 * (Railway) database. Pairs with ExportDataSQL, whose output is TRUNCATE + INSERT
 * statements. The whole script runs in one transaction so a bad file rolls back
 * instead of leaving the database half-imported.
 *
 * Admin-only (mounted behind API_KEY auth). Executing arbitrary SQL is powerful,
 * which is why it sits next to Reset in the admin "Data Maintenance" area.
 */
class ImportDataSQL {
  constructor(systemRepository) {
    this.systemRepository = systemRepository;
  }

  async execute(sql) {
    if (!sql || !String(sql).trim()) {
      const err = new Error('No SQL content to import.');
      err.statusCode = 400;
      throw err;
    }
    return this.systemRepository.importSql(String(sql));
  }
}

module.exports = ImportDataSQL;
