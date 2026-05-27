const db = require('./src/infrastructure/database/db');

async function check() {
  try {
    console.log('Checking registrations for meal ticket authorization...');
    const { rows } = await db.query(`
      SELECT id, first_name, last_name, registration_number, can_generate_meal_ticket, 
             (biometric_template IS NOT NULL AND length(biometric_template) > 50) as has_valid_template
      FROM registrations
    `);
    
    console.log('Registrations found:', rows.length);
    rows.forEach(r => {
      console.log(`ID: ${r.id}, Name: ${r.first_name} ${r.last_name}, Reg#: ${r.registration_number}, ` +
                  `Auth: ${r.can_generate_meal_ticket}, Valid Template: ${r.has_valid_template}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

check();
