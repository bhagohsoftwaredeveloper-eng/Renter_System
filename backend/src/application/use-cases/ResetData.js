class ResetData {
  constructor(systemRepository) {
    this.systemRepository = systemRepository;
  }

  async execute() {
    return await this.systemRepository.resetData();
  }
}

module.exports = ResetData;
