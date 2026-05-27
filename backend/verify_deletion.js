const db = require('./src/infrastructure/database/db');
const PostgresRegistrationRepository = require('./src/infrastructure/repositories/PostgresRegistrationRepository');
const DeleteRegistration = require('./src/application/use-cases/DeleteRegistration');

console.log('STARTING TEST...');

async function test() {
  const repo = new PostgresRegistrationRepository(db);
  const deleteUseCase = new DeleteRegistration(repo);

  try {
    // 1. Create a dummy registration
    const { rows: [reg] } = await db.query(
      "INSERT INTO registrations (first_name, last_name, email, room_no, status) VALUES ('Test', 'User', 'test@example.com', '101', 'Approved') RETURNING id"
    );
    console.log('Created test registration with ID:', reg.id);

    // 2. Try to delete (should succeed)
    await deleteUseCase.execute(reg.id);
    console.log('Successfully deleted registration with no transactions.');

    // 3. Create another dummy registration
    const { rows: [reg2] } = await db.query(
      "INSERT INTO registrations (first_name, last_name, email, room_no, status) VALUES ('Test2', 'User2', 'test2@example.com', '102', 'Approved') RETURNING id"
    );
    console.log('Created second test registration with ID:', reg2.id);

    // 4. Create a dummy transaction (meal ticket)
    await db.query(
      "INSERT INTO meal_tickets (registration_id, ticket_number, meal_type, status) VALUES ($1, 'TEST-TICKET-123', 'Non-Veggie', 'Active')",
      [reg2.id]
    );
    console.log('Created test transaction for registration ID:', reg2.id);

    // 5. Try to delete (should fail)
    try {
      await deleteUseCase.execute(reg2.id);
      console.log('ERROR: Deletion succeeded for registration with transactions!');
    } catch (err) {
      if (err.code === 'HAS_TRANSACTIONS') {
        console.log('SUCCESS: Deletion blocked as expected with code HAS_TRANSACTIONS.');
      } else {
        console.log('ERROR: Received unexpected error:', err);
      }
    }

    // Cleanup
    await db.query('DELETE FROM meal_tickets WHERE ticket_number = $1', ['TEST-TICKET-123']);
    await db.query('DELETE FROM registrations WHERE id = $2', [reg2.id]);
    console.log('Cleanup complete.');

  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    process.exit();
  }
}

test();
