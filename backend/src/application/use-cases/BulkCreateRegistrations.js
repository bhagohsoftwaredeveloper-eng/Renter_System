const Registration = require('../../domain/entities/Registration');

class BulkCreateRegistrations {
  constructor(registrationRepository) {
    this.registrationRepository = registrationRepository;
  }

  async generateUniqueRegistrationNumber() {
    let registrationNumber;
    let exists = true;
    while (exists) {
      registrationNumber = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await this.registrationRepository.getByRegistrationNumber(registrationNumber);
      if (!existing) exists = false;
    }
    return registrationNumber;
  }

  async execute(registrationsData) {
    const results = {
      success: [],
      errors: []
    };

    for (const data of registrationsData) {
      try {
        // Basic validation
        if (!data.firstName || !data.lastName || !data.email) {
          results.errors.push({ data, error: 'Missing required fields (firstName, lastName, or email)' });
          continue;
        }

        const fullName = `${data.firstName} ${data.lastName}`;
        const initials = (data.firstName[0] || '') + (data.lastName[0] || '');
        const unit = data.unit || (data.roomNo ? `Room ${data.roomNo}` : 'N/A');

        const registrationNumber = await this.generateUniqueRegistrationNumber();

        const registration = new Registration({
          ...data,
          name: fullName,
          initials: initials.toUpperCase(),
          unit: unit,
          status: data.status || 'Approved', // Bulk imports are often pre-approved
          date: data.date || new Date().toISOString().split('T')[0],
          canGenerateMealTicket: data.canGenerateMealTicket !== undefined ? data.canGenerateMealTicket : true,
          mealType: data.mealType || 'Non-Veggie',
          registrationNumber
        });

        const saved = await this.registrationRepository.save(registration);
        results.success.push(saved);
      } catch (err) {
        results.errors.push({ data, error: err.message });
      }
    }

    return results;
  }
}

module.exports = BulkCreateRegistrations;
