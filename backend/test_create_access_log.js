const db = require('./src/infrastructure/database/db');
const PostgresAccessLogRepository = require('./src/infrastructure/repositories/PostgresAccessLogRepository');
const PostgresRegistrationRepository = require('./src/infrastructure/repositories/PostgresRegistrationRepository');
const PostgresSystemSettingsRepository = require('./src/infrastructure/repositories/PostgresSystemSettingsRepository');
const CreateAccessLog = require('./src/application/use-cases/CreateAccessLog');

class MockWhatsAppService {
  async sendMessage(to, message, apiKey) {
    console.log('[MockWhatsAppService] sendMessage called with:');
    console.log('  to:', to);
    console.log('  message:', message);
    console.log('  apiKey:', apiKey);
    return { id: 'mock-id' };
  }
}

async function test() {
  try {
    const accessLogRepo = new PostgresAccessLogRepository(db);
    const regRepo = new PostgresRegistrationRepository(db);
    const settingsRepo = new PostgresSystemSettingsRepository(db);
    const mockWS = new MockWhatsAppService();

    const createAccessLog = new CreateAccessLog(accessLogRepo, regRepo, mockWS, settingsRepo);

    // Mock a registration with a phone number
    console.log('Mocking registration...');
    await db.query("INSERT INTO registrations (name, parent_phone, status, can_generate_meal_ticket) VALUES ('Test User', '639123456789', 'Active', true) ON CONFLICT DO NOTHING");

    const logData = {
      name: 'Test User',
      type: 'Biometric Scan',
      point: 'Main Gate',
      status: 'Granted'
    };

    console.log('Executing CreateAccessLog...');
    await createAccessLog.execute(logData);

    console.log('Test completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

test();
