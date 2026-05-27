const db = require('./src/infrastructure/database/db');

async function checkAndInsert() {
  try {
    console.log('Inserting test key...');
    await db.query("INSERT INTO system_settings (key, value) VALUES ('wassenger_api_key', 'TEST_KEY_FROM_DB') ON CONFLICT (key) DO UPDATE SET value = 'TEST_KEY_FROM_DB'");
    
    const { rows } = await db.query("SELECT * FROM system_settings WHERE key = 'wassenger_api_key'");
    console.log('Setting wassenger_api_key:', rows);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkAndInsert();
