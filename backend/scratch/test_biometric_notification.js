const db = require('../src/infrastructure/database/db');
const PostgresRegistrationRepository = require('../src/infrastructure/repositories/PostgresRegistrationRepository');
const PostgresSystemSettingsRepository = require('../src/infrastructure/repositories/PostgresSystemSettingsRepository');
const PostgresAccessLogRepository = require('../src/infrastructure/repositories/PostgresAccessLogRepository');
const CreateAccessLog = require('../src/application/use-cases/CreateAccessLog');

async function test() {
  console.log('--- STARTING BIOMETRIC NOTIFICATION TEST ---');
  
  const registrationRepo = new PostgresRegistrationRepository(db);
  const settingsRepo = new PostgresSystemSettingsRepository(db);
  const accessLogRepo = new PostgresAccessLogRepository(db);
  
  // Mock WhatsApp Service
  const whatsAppServiceMock = {
    sendMessage: async (to, msg) => {
      console.log(`[MOCK WHATSAPP] To: ${to}, Message: ${msg}`);
      return { success: true, id: 'test-id' };
    }
  };

  const createAccessLog = new CreateAccessLog(accessLogRepo, registrationRepo, whatsAppServiceMock, settingsRepo);

  try {
    // 1. Create a dummy registration if it doesn't exist
    const testName = 'Test Renter ' + Math.floor(Math.random() * 1000);
    console.log(`Creating test registration for: ${testName}`);
    
    const reg = await registrationRepo.save({
      name: testName,
      firstName: 'Test',
      lastName: 'Renter',
      email: `test${Math.floor(Math.random() * 1000)}@example.com`,
      studentPhone: '09123456789',
      parentPhone: '09987654321', // Target phone
      roomNo: '101',
      floorNo: '1',
      unit: 'Unit 101',
      imd: 'None',
      hasFingerprint: true,
      status: 'Approved',
      initials: 'TR',
      date: new Date().toISOString().split('T')[0],
      mealType: 'Veggie'
    });

    console.log(`Registration created with ID: ${reg.id}`);

    // 2. Trigger Biometric Access Log
    console.log('Executing CreateAccessLog with type "Biometric Scan"...');
    await createAccessLog.execute({
      name: testName,
      dept: 'Resident',
      point: 'Test Terminal',
      location: 'Test Lobby',
      type: 'Biometric Scan',
      status: 'Granted'
    });

    console.log('--- TEST COMPLETED ---');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

test();
