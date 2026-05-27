const db = require('./src/infrastructure/database/db');

async function test() {
  try {
    const id = 9;
    const { rows } = await db.query(
      'SELECT COUNT(*) as count FROM meal_tickets WHERE registration_id = $1',
      [id]
    );
    console.log(`Diagnostic: id=${id}, count=${rows[0].count}, type of count=${typeof rows[0].count}`);
    
    // Check if it's equal to 0
    if (parseInt(rows[0].count) > 0) {
      console.log('Test: Correctly identified > 0 transactions');
    } else {
      console.log('Test: Erroneously identified 0 transactions');
    }
    
    // List some meal tickets for this registration
    const tickets = await db.query('SELECT * FROM meal_tickets WHERE registration_id = $1', [id]);
    console.log('Tickets found:', tickets.rows.length);
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    process.exit();
  }
}

test();
