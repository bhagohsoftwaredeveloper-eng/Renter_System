const Registration = require('../../domain/entities/Registration');

class CreateRegistration {
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

  async execute(registrationData) {
    const registrationNumber = await this.generateUniqueRegistrationNumber();
    const registration = new Registration({
      ...registrationData,
      status: registrationData.status || 'Pending',
      date: new Date().toISOString().split('T')[0], // current date
      registrationNumber
    });
    
    return await this.registrationRepository.save(registration);
  }
}

module.exports = CreateRegistration;
