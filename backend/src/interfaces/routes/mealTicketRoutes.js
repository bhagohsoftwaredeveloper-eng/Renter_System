const express = require('express');

function createMealTicketRoutes(mealTicketController) {
  const router = express.Router();

  router.post('/generate', (req, res) => mealTicketController.generate(req, res));
  router.get('/biometric-candidates', (req, res) => mealTicketController.biometricCandidates(req, res));
  router.get('/registration/:registrationId', (req, res) => mealTicketController.getByRegistrationId(req, res));

  return router;
}

module.exports = createMealTicketRoutes;
