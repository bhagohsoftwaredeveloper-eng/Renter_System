const XLSX = require('xlsx');

class ExportDataExcel {
  constructor(systemRepository) {
    this.systemRepository = systemRepository;
  }

  async execute() {
    const tables = await this.systemRepository.getAllTables();
    const workbook = XLSX.utils.book_new();

    for (const table of tables) {
      const data = await this.systemRepository.getTableData(table);
      if (data && data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, table);
      }
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }
}

module.exports = ExportDataExcel;
