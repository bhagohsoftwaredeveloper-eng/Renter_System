const db = require('./src/infrastructure/database/db');

async function check() {
  try {
    const { rows } = await db.query('SELECT * FROM system_settings');
    console.log('System Settings:', rows);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
