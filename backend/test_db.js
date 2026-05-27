const db = require('./src/infrastructure/database/db');

async function test() {
  try {
    const { rows } = await db.query('SELECT NOW()');
    console.log('DB Connection Success:', rows[0].now);
  } catch (err) {
    console.error('DB Connection Failed:', err);
  } finally {
    process.exit();
  }
}

test();
