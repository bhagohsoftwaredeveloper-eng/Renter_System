const db = require('./src/infrastructure/database/db');
const PostgresAccessLogRepository = require('./src/infrastructure/repositories/PostgresAccessLogRepository');
const PostgresRegistrationRepository = require('./src/infrastructure/repositories/PostgresRegistrationRepository');
const PostgresSystemSettingsRepository = require('./src/infrastructure/repositories/PostgresSystemSettingsRepository');
const CreateAccessLog = require('./src/application/use-cases/CreateAccessLog');

// Pretends a parent device is registered and logs what would be pushed.
class MockPushTokenRepository {
  async getByRegistrationId(registrationId) {
    return [{ recipient_type: 'parent', expo_token: 'ExponentPushToken[mock]' }];
  }
}

class MockPushNotificationService {
  async send(tokens, payload) {
    console.log('[MockPushNotificationService] send called with:');
    console.log('  tokens:', tokens);
    console.log('  payload:', payload);
    return { data: [{ status: 'ok' }] };
  }
}

async function test() {
  try {
    const accessLogRepo = new PostgresAccessLogRepository(db);
    const regRepo = new PostgresRegistrationRepository(db);
    const settingsRepo = new PostgresSystemSettingsRepository(db);
    const mockPush = new MockPushNotificationService();
    const mockTokens = new MockPushTokenRepository();

    const createAccessLog = new CreateAccessLog(accessLogRepo, regRepo, settingsRepo, mockPush, mockTokens);

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
    const saved = await createAccessLog.execute(logData);
    console.log('Saved log push_status:', saved.push_status);

    console.log('Test completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

test();
