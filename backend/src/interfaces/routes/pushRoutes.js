const express = require('express');

const createPushRoutes = (controller) => {
  const router = express.Router();

  // App registers/links its Expo push token to a registration.
  router.post('/register', (req, res) => controller.register(req, res));

  // App removes its token (logout / uninstall cleanup).
  router.post('/unregister', (req, res) => controller.unregister(req, res));

  return router;
};

module.exports = createPushRoutes;
