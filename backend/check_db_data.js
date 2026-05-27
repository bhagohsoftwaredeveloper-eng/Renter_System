const db = require('./src/infrastructure/database/db');

async function check() {
  try {
    console.log('Checking column existence in registrations table...');
    const columns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'registrations' 
      AND column_name = 'registration_number'
    `);
    console.log('Column info:', columns.rows);

    if (columns.rows.length > 0) {
      console.log('Checking first 5 records for registration_number...');
      const { rows } = await db.query('SELECT id, registration_number FROM registrations LIMIT 5');
      console.log('Registration Numbers in DB:', rows);
    } else {
      console.log('CRITICAL: registration_number column DOES NOT EXIST in database!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

check();
