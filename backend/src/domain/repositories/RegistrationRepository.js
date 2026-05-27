/**
 * @interface RegistrationRepository
 */
class RegistrationRepository {
  async getAll() {
    throw new Error('Method not implemented');
  }

  async getById(id) {
    throw new Error('Method not implemented');
  }

  async save(registration) {
    throw new Error('Method not implemented');
  }

  async updateStatus(id, status) {
    throw new Error('Method not implemented');
  }

  async update(id, registrationData) {
    throw new Error('Method not implemented');
  }

  async getExpiredMealTickets() {
    throw new Error('Method not implemented');
  }

  async getByRegistrationNumber(registrationNumber) {
    throw new Error('Method not implemented');
  }

  async countTransactionsByRegistrationId(id) {
    throw new Error('Method not implemented');
  }

  async getByName(name) {
    throw new Error('Method not implemented');
  }
}

module.exports = RegistrationRepository;
