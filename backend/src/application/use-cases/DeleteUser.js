class DeleteUser {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(id) {
    const user = await this.userRepository.getById(id);
    if (!user) throw new Error('User not found');

    // Block deletion of primary admin
    if (user.username === 'admin') {
      const error = new Error('Cannot delete system administrator account');
      error.code = 'IS_ADMIN';
      throw error;
    }

    // Check for transactions (Audit Logs), excluding common session logs
    const logCount = await this.userRepository.countAuditLogsByUsername(user.username, ['Login', 'Logout']);
    if (logCount > 0) {
      const error = new Error('Cant delete this User - has existing transactions/logs');
      error.code = 'HAS_TRANSACTIONS';
      throw error;
    }

    return await this.userRepository.delete(id);
  }
}

module.exports = DeleteUser;
