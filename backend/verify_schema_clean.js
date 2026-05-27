const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'renter_systems',
  password: process.env.DB_PASSWORD || '123700',
  port: process.env.DB_PORT || 5432,
});

async function checkSchema() {
  const client = await pool.connect();
  try {
    const tables = ['registrations', 'users', 'meal_tickets', 'access_logs', 'audit_logs'];
    console.log('--- DB SCHEMA ACTUAL ---');
    for (const table of tables) {
      const { rows } = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      console.log(`\nTable: ${table}`);
      rows.forEach(r => {
        console.log(`  ${r.column_name.padEnd(25)} | ${r.data_type.padEnd(20)} | ${r.is_nullable}`);
      });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

checkSchema();
