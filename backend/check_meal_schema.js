const db = require('./src/infrastructure/database/db');

async function checkMealTicketSchema() {
  try {
    const { rows } = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'meal_tickets'
    `);
    console.log('Meal Tickets Columns:', rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkMealTicketSchema();
