const MealTicket = require('../../domain/entities/MealTicket');

class GenerateMealTicket {
  constructor(mealTicketRepository, registrationRepository) {
    this.mealTicketRepository = mealTicketRepository;
    this.registrationRepository = registrationRepository;
  }

  async execute(registrationId, mealType, biometricTemplate) {
    let registration;

    // 1. Identification logic: If registrationId is not provided (standalone terminal mode),
    // Or if we just want to identify from the fingerprint anyway.
    if ((!registrationId || registrationId === '1' || registrationId === 1) && biometricTemplate) {
      console.log('[GenerateMealTicket] No specific registrationId provided or default used. Attempting identification...');
      
      // Fetch all registrations with fingerprints
      const allRegistrations = await this.registrationRepository.getAll();
      const candidates = allRegistrations.filter(r => r.hasFingerprint && r.biometricTemplate);
      
      if (candidates.length === 0) {
        throw new Error('No enrolled fingerprints found in the system');
      }

      // Call Biometric Bridge to identify
      try {
        const axios = require('axios');
        const identifyResponse = await axios.post('http://localhost:5001/identify', {
          probe: biometricTemplate,
          candidates: candidates.map(c => c.biometricTemplate)
        });

        const { matchedIndex } = identifyResponse.data;
        if (matchedIndex !== undefined && matchedIndex !== -1) {
          registration = candidates[matchedIndex];
          registrationId = registration.id;
          console.log(`[GenerateMealTicket] Identified user: ${registration.firstName} ${registration.lastName} (ID: ${registrationId})`);
        } else {
          throw new Error('Biometric identification failed: Fingerprint not recognized');
        }
      } catch (err) {
        console.error('[GenerateMealTicket] Identification error:', err.message);
        throw new Error(err.message || 'Biometric identification service error');
      }
    } else {
      // Standard lookup by ID
      registration = await this.registrationRepository.getById(registrationId);
      if (!registration) {
        throw new Error(`Registration with ID ${registrationId} not found`);
      }

      // Verification (1:1) if template is provided
      if (registration.hasFingerprint && registration.biometricTemplate && biometricTemplate) {
        // We can still use /identify for 1:1 by passing a single candidate
        try {
          const axios = require('axios');
          const verifyResponse = await axios.post('http://localhost:5001/identify', {
            probe: biometricTemplate,
            candidates: [registration.biometricTemplate]
          });
          if (verifyResponse.data.matchedIndex === -1) {
            throw new Error('Biometric verification failed: Fingerprint does not match the registered user');
          }
        } catch (err) {
          console.error('[GenerateMealTicket] Verification error:', err.message);
          throw new Error(err.message || 'Biometric verification service error');
        }
      }
    }

    // 2. Check if allowed to generate
    if (!registration.canGenerateMealTicket) {
      console.warn(`[GenerateMealTicket] RID ${registrationId} is not authorized for meal tickets (canGenerateMealTicket: false)`);
      throw new Error('Meal ticket generation not authorized for this renter');
    }

    // 3. Generate a unique ticket number
    // Format: MT-YYYYMMDD-XXXX where XXXX is a random string or partial registration ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ticketNumber = `MT-${dateStr}-${randomStr}`;

    // 3. Set expiration (extending 24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 4. Use renter's specific meal type from DB (source of truth for biometric identification)
    // Preference: 1. DB record, 2. Provided arg (if any), 3. Catch-all default
    const finalMealType = registration.mealType || mealType || 'Non-Veggie';

    const mealTicket = new MealTicket({
      registrationId,
      ticketNumber,
      mealType: finalMealType,
      renterName: `${registration.firstName || ''} ${registration.lastName || ''}`.trim() || registration.name || 'Unknown',
      status: 'Active',
      expiresAt: expiresAt.toISOString()
    });

    const savedTicket = await this.mealTicketRepository.save(mealTicket);
    
    // 5. Consume the allowance (Optional: based on user requirement to keep it enabled)
    // await this.registrationRepository.updateMealTicketAllowance(registrationId, false);

    return savedTicket;
  }
}

module.exports = GenerateMealTicket;
