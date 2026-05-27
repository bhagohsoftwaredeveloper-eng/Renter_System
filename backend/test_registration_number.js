const db = require('./src/infrastructure/database/db');
const Registration = require('./src/domain/entities/Registration');
const PostgresRegistrationRepository = require('./src/infrastructure/repositories/PostgresRegistrationRepository');
const CreateRegistration = require('./src/application/use-cases/CreateRegistration');

async function test() {
  const repository = new PostgresRegistrationRepository(db);
  const useCase = new CreateRegistration(repository);

  console.log('Testing registration number generation...');
  
  const testData = {
    firstName: 'Test',
    lastName: 'User',
    email: `test.${Date.now()}@example.com`,
    roomNo: '101'
  };

  try {
    const result = await useCase.execute(testData);
    console.log('Created registration:', JSON.stringify(result, null, 2));

    if (result.registrationNumber && result.registrationNumber.length === 6 && /^\d+$/.test(result.registrationNumber)) {
      console.log('SUCCESS: Valid 6-digit registration number generated.');
    } else {
      console.error('FAILURE: Invalid registration number format.');
    }

    // Verify it's in the DB
    const saved = await repository.getById(result.id);
    if (saved && saved.registrationNumber === result.registrationNumber) {
      console.log('SUCCESS: Registration number correctly persisted in database.');
    } else {
      console.error('FAILURE: Registration number not found in database.');
    }

    // Clean up
    await db.query('DELETE FROM registrations WHERE id = $1', [result.id]);
    console.log('Test cleanup complete.');

  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    process.exit();
  }
}

test();
