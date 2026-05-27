class SystemController {
  constructor(resetData, exportDataExcel, exportDataSQL, systemSettingsRepository) {
    this.resetData = resetData;
    this.exportDataExcel = exportDataExcel;
    this.exportDataSQL = exportDataSQL;
    this.systemSettingsRepository = systemSettingsRepository;
  }

  async reset(req, res) {
    try {
      const result = await this.resetData.execute();
      res.status(200).json(result);
    } catch (error) {
      console.error('Error resetting data:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async exportExcel(req, res) {
    try {
      const buffer = await this.exportDataExcel.execute();
      res.setHeader('Content-Disposition', `attachment; filename=RenterSystems_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async exportSQL(req, res) {
    try {
      const sqlContent = await this.exportDataSQL.execute();
      res.setHeader('Content-Disposition', `attachment; filename=RenterSystems_Backup_${new Date().toISOString().split('T')[0]}.sql`);
      res.setHeader('Content-Type', 'text/plain');
      res.send(sqlContent);
    } catch (error) {
      console.error('Error exporting SQL:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getSettings(req, res) {
    try {
      const settings = await this.systemSettingsRepository.getAll();
      res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateSetting(req, res) {
    try {
      const { key, value } = req.body;
      console.log(`[SystemController] Updating setting: ${key} = ${value}`);
      if (!key) {
        console.warn('[SystemController] Missing key in request body');
        return res.status(400).json({ error: 'Key is required' });
      }
      const result = await this.systemSettingsRepository.set(key, value);
      console.log('[SystemController] Setting updated successfully');
      res.status(200).json(result);
    } catch (error) {
      console.error('[SystemController] Error updating setting:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = SystemController;
