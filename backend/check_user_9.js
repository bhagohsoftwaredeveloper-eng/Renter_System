const db = require('./src/infrastructure/database/db');

async function checkUser9() {
  try {
    const { rows } = await db.query('SELECT id, name, first_name, last_name, can_generate_meal_ticket, status FROM registrations WHERE id = 9');
    console.log('User 9 data:', rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkUser9();
