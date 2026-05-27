class DeleteRegistration {
  constructor(registrationRepository) {
    this.registrationRepository = registrationRepository;
  }

  async execute(id) {
    const transactionsCount = await this.registrationRepository.countTransactionsByRegistrationId(id);
    if (transactionsCount > 0) {
      const error = new Error('Cant delete this Data have transactions');
      error.code = 'HAS_TRANSACTIONS';
      throw error;
    }
    return await this.registrationRepository.delete(id);
  }
}

module.exports = DeleteRegistration;
