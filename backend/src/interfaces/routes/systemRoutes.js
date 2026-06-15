const express = require('express');
const multer = require('multer');

// In-memory upload for the SQL restore file (kept small; it's a data dump).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function createSystemRoutes(systemController) {
  const router = express.Router();

  router.post('/reset', (req, res) => systemController.reset(req, res));
  router.get('/backup/excel', (req, res) => systemController.exportExcel(req, res));
  router.get('/backup/sql', (req, res) => systemController.exportSQL(req, res));
  router.post('/import/sql', upload.single('file'), (req, res) => systemController.importSQL(req, res));
  router.get('/settings', (req, res) => systemController.getSettings(req, res));
  router.post('/settings', (req, res) => systemController.updateSetting(req, res));

  return router;
}

module.exports = createSystemRoutes;
