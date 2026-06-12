class MealTicketController {
  constructor(generateMealTicket, getMealTicketsByRegistration, registrationRepository) {
    this.generateMealTicket = generateMealTicket;
    this.getMealTicketsByRegistration = getMealTicketsByRegistration;
    this.registrationRepository = registrationRepository;
  }

  // Lightweight list of enrolled fingerprints for client-side (local bridge)
  // matching. Guarded by the terminal's x-api-key only (no admin role needed),
  // so a kiosk terminal can identify renters without an admin login.
  async biometricCandidates(req, res) {
    try {
      const all = await this.registrationRepository.getAll();
      const candidates = (all || [])
        .filter((r) => r.hasFingerprint && r.biometricTemplate && r.biometricTemplate.length > 50)
        .map((r) => ({
          id: r.id,
          name: r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() || `Renter #${r.id}`,
          biometricTemplate: r.biometricTemplate,
        }));
      res.json(candidates);
    } catch (err) {
      console.error('[MealTicketController] biometricCandidates error:', err);
      res.status(500).json({ error: 'Failed to load biometric candidates' });
    }
  }

  async generate(req, res) {
    const { registrationId, mealType, biometricTemplate } = req.body;
    if (!registrationId && !biometricTemplate) {
      return res.status(400).json({ error: 'Either registrationId or biometricTemplate is required' });
    }
    try {
      console.log(`[MealTicketController] Generating ticket. RID: ${registrationId}, Type: ${mealType}`);
      const mealTicket = await this.generateMealTicket.execute(registrationId, mealType, biometricTemplate);
      console.log(`[MealTicketController] Ticket generated: ${mealTicket.ticketNumber}`);
      res.status(201).json(mealTicket);
    } catch (err) {
      console.error('[MealTicketController] Error caught:', err);
      
      const errorMsg = err.message || 'Database error';

      // 1-meal-per-period limit reached -> 409 Conflict (distinct from auth errors
      // so the terminal shows the specific "already claimed" message)
      if (errorMsg.includes('already claimed')) {
        console.log(`[MealTicketController] Sending 409 with error: "${errorMsg}"`);
        return res.status(409).json({ error: errorMsg });
      }

      // Map identification/authorization/connectivity errors to 401/403
      if (
        errorMsg.includes('not authorized') || 
        errorMsg.includes('not found') || 
        errorMsg.includes('not recognized') || 
        errorMsg.includes('failed') ||
        errorMsg.includes('No enrolled fingerprints') ||
        errorMsg.includes('Registrar Office') ||
        errorMsg.includes('ECONNREFUSED') ||
        errorMsg.includes('unreachable')
      ) {
        let userFriendlyMsg = errorMsg;
        if (errorMsg.includes('ECONNREFUSED')) {
          userFriendlyMsg = 'Biometric Bridge is unreachable. Please ensure the service is running.';
        }
        console.log(`[MealTicketController] Sending 403 with error: "${userFriendlyMsg}"`);
        return res.status(403).json({ error: userFriendlyMsg });
      }
      
      res.status(500).json({ error: errorMsg });
    }
  }

  async getByRegistrationId(req, res) {
    const { registrationId } = req.params;
    try {
      const mealTickets = await this.getMealTicketsByRegistration.execute(registrationId);
      res.json(mealTickets);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  }
}

module.exports = MealTicketController;
