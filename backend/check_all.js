const db = require('./src/infrastructure/database/db');

async function checkAll() {
  try {
    const { rows } = await db.query('SELECT id, name, can_generate_meal_ticket, status FROM registrations');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkAll();
