class ExportDataSQL {
  constructor(systemRepository) {
    this.systemRepository = systemRepository;
  }

  async execute() {
    const tables = await this.systemRepository.getAllTables();
    let sqlContent = `-- Database Backup\n-- Generated on: ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      const data = await this.systemRepository.getTableData(table);
      if (data && data.length > 0) {
        sqlContent += `-- Table: ${table}\n`;
        sqlContent += `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;\n\n`;

        for (const row of data) {
          const keys = Object.keys(row);
          const values = keys.map(key => {
            const val = row[key];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return val;
          });

          sqlContent += `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sqlContent += '\n';
      }
    }

    return sqlContent;
  }
}

module.exports = ExportDataSQL;
