class UpdateRegistrationStatus {
  constructor(registrationRepository) {
    this.registrationRepository = registrationRepository;
  }

  async execute(id, status) {
    let canGenerateMealTicket = undefined;
    if (status === 'Approved') {
      canGenerateMealTicket = true;
    }
    return await this.registrationRepository.updateStatus(id, status, canGenerateMealTicket);
  }
}

module.exports = UpdateRegistrationStatus;
