const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'renter_systems',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Adding registration_number column to registrations...');
    await client.query(`
      ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS registration_number VARCHAR(6) UNIQUE;
    `);
    console.log('Migration complete: registration_number column added to registrations.');
    
    // Optional: Populate existing records with a random number if needed
    console.log('Populating existing registrations with unique 6-digit numbers...');
    const { rows } = await client.query('SELECT id FROM registrations WHERE registration_number IS NULL');
    console.log(`Found ${rows.length} records to populate.`);
    for (const row of rows) {
      let regNum;
      let isUnique = false;
      while (!isUnique) {
        regNum = Math.floor(100000 + Math.random() * 900000).toString();
        const check = await client.query('SELECT 1 FROM registrations WHERE registration_number = $1', [regNum]);
        if (check.rows.length === 0) isUnique = true;
      }
      console.log(`Updating record ${row.id} with registration number ${regNum}...`);
      const updateResult = await client.query('UPDATE registrations SET registration_number = $1 WHERE id = $2', [regNum, row.id]);
      console.log(`Update result for ${row.id}: ${updateResult.rowCount} rows affected.`);
    }
    console.log(`Populated ${rows.length} existing records.`);
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
