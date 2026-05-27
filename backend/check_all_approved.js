const db = require('./src/infrastructure/database/db');

async function checkAllApproved() {
  try {
    const { rows } = await db.query('SELECT id, name, can_generate_meal_ticket, status FROM registrations WHERE status = \'Approved\' AND can_generate_meal_ticket = false');
    console.log('Approved users with can_generate_meal_ticket = false:', rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkAllApproved();
