const express = require('express');
const authorize = require('../../infrastructure/middleware/authorize');
const { PERMISSIONS } = require('../../infrastructure/security/permissions');

function createRegistrationRoutes(registrationController) {
  const router = express.Router();

  const multer = require('multer');
  const upload = multer({ storage: multer.memoryStorage() });

  router.get('/', authorize(PERMISSIONS.MANAGE_REGISTRATIONS), (req, res) => registrationController.getAll(req, res));
  router.post('/check-biometric', authorize(PERMISSIONS.MANAGE_REGISTRATIONS), (req, res) => registrationController.checkBiometric(req, res));
  router.post('/', authorize(PERMISSIONS.MANAGE_REGISTRATIONS), (req, res) => registrationController.create(req, res));
  router.post('/bulk', authorize(PERMISSIONS.MANAGE_REGISTRATIONS), upload.single('file'), (req, res) => registrationController.bulkUpload(req, res));
  router.put('/:id', authorize(PERMISSIONS.MANAGE_REGISTRATIONS), (req, res) => registrationController.update(req, res));
  router.patch('/:id/status', authorize(PERMISSIONS.MANAGE_REGISTRATIONS), (req, res) => registrationController.updateStatus(req, res));
  router.patch('/:id/meal-ticket-allowance', authorize(PERMISSIONS.MANAGE_REGISTRATIONS), (req, res) => registrationController.toggleMealTicketAllowance(req, res));
  router.patch('/:id/meal-ticket-expiration', authorize(PERMISSIONS.MANAGE_REGISTRATIONS), (req, res) => registrationController.setMealTicketExpiration(req, res));
  router.get('/expired-meal-tickets', authorize(PERMISSIONS.MANAGE_REGISTRATIONS), (req, res) => registrationController.getExpired(req, res));
  router.delete('/:id', authorize(PERMISSIONS.MANAGE_REGISTRATIONS), (req, res) => registrationController.delete(req, res));


  return router;
}

module.exports = createRegistrationRoutes;
