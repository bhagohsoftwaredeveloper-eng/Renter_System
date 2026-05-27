const db = require('./src/infrastructure/database/db');

async function check() {
  try {
    const { rows } = await db.query("SELECT id, registration_number, (registration_number IS NULL) as is_null, length(registration_number) as len FROM registrations");
    console.log('--- DB PRECISION CHECK ---');
    rows.forEach(r => {
      console.log(`ID: ${r.id}, Val: '${r.registration_number}', IsNull: ${r.is_null}, Len: ${r.len}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

check();
