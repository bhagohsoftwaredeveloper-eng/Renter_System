const db = require('./src/infrastructure/database/db');
const PostgresUserRepository = require('./src/infrastructure/repositories/PostgresUserRepository');
const DeleteUser = require('./src/application/use-cases/DeleteUser');

async function testManualDelete() {
  const userRepository = new PostgresUserRepository(db);
  const deleteUser = new DeleteUser(userRepository);

  try {
    // Check if newuser (id: 3) exists
    const users = await userRepository.getAll();
    const target = users.find(u => u.username === 'newuser');
    
    if (!target) {
      console.log('Test user "newuser" not found. Creating one...');
      const created = await userRepository.save({
        name: 'New User',
        email: 'newuser@example.com',
        username: 'newuser',
        role: 'Staff',
        status: 'Active',
        initials: 'NU',
        password: 'password123',
        customPermissions: []
      });
      console.log(`Created test user: ${created.username} (ID: ${created.id})`);
      await performDelete(deleteUser, created.id);
    } else {
      console.log(`Found test user: ${target.username} (ID: ${target.id})`);
      await performDelete(deleteUser, target.id);
    }

  } catch (err) {
    console.error('Manual Delete Error:', err.message);
    if (err.code) console.error('Error Code:', err.code);
    console.error(err.stack);
  } finally {
    process.exit();
  }
}

async function performDelete(deleteUser, id) {
  console.log(`Attempting to delete user with ID: ${id}...`);
  await deleteUser.execute(id);
  console.log('SUCCESS: User deleted.');
}

testManualDelete();
