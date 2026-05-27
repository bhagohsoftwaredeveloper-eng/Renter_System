const db = require('./src/infrastructure/database/db');

async function migrate() {
  try {
    console.log('Adding whatsapp_status column to access_logs...');
    await db.query('ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS whatsapp_status VARCHAR(50) DEFAULT \'Not Sent\'');
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
