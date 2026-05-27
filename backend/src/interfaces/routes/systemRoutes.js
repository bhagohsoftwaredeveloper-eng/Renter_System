const express = require('express');

function createSystemRoutes(systemController) {
  const router = express.Router();

  router.post('/reset', (req, res) => systemController.reset(req, res));
  router.get('/backup/excel', (req, res) => systemController.exportExcel(req, res));
  router.get('/backup/sql', (req, res) => systemController.exportSQL(req, res));
  router.get('/settings', (req, res) => systemController.getSettings(req, res));
  router.post('/settings', (req, res) => systemController.updateSetting(req, res));

  return router;
}

module.exports = createSystemRoutes;
