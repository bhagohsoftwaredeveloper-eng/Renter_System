const db = require('./src/infrastructure/database/db');
async function check() {
  try {
    const { rows } = await db.query('SELECT id, name, meal_type FROM registrations LIMIT 10');
    console.table(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
check();
