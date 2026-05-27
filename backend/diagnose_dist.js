const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env from dist folder
const envPath = path.join(__dirname, 'dist', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

console.log('Testing connection with DIST environment:');
console.log('Host:', env.DB_HOST);
console.log('Port:', env.DB_PORT);
console.log('User:', env.DB_USER);
console.log('DB Name:', env.DB_NAME);

const pool = new Pool({
  user: env.DB_USER || 'postgres',
  host: env.DB_HOST || 'localhost',
  database: env.DB_NAME || 'renter_systems',
  password: env.DB_PASSWORD || '123700',
  port: env.DB_PORT || 5432,
});

async function test() {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('SUCCESS: Connection verified at', res.rows[0].now);
    } catch (err) {
        console.error('FAILURE: Could not connect to database with dist/.env config');
        console.error(err.message);
    } finally {
        await pool.end();
    }
}

test();
