class PushController {
  constructor(registerPushToken, pushTokenRepository) {
    this.registerPushToken = registerPushToken;
    this.pushTokenRepository = pushTokenRepository;
  }

  async register(req, res) {
    try {
      const { registrationNumber, phone, expoToken, platform } = req.body;
      const result = await this.registerPushToken.execute({ registrationNumber, phone, expoToken, platform });
      res.status(201).json(result);
    } catch (error) {
      console.error('Error registering push token:', error.message);
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  async unregister(req, res) {
    try {
      const { expoToken } = req.body;
      if (!expoToken) {
        return res.status(400).json({ error: 'expoToken is required' });
      }
      const deleted = await this.pushTokenRepository.deleteByToken(expoToken);
      if (!deleted) {
        return res.status(404).json({ error: 'Token not found' });
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error unregistering push token:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = PushController;
