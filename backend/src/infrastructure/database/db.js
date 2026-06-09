const { Pool } = require('pg');
require('dotenv').config();

// Cloud hosts (Railway, Render, …) provide a single DATABASE_URL. When present,
// use it; otherwise fall back to the individual DB_* vars for local development.
//
// SSL: enabled by default for cloud (Railway's public URL and Render require it).
// Railway's *internal* network connection does NOT use SSL — set DB_SSL=false
// there to avoid a connection error.
const useSsl = process.env.DATABASE_URL && process.env.DB_SSL !== 'false';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'renter_systems',
      password: process.env.DB_PASSWORD || '123700',
      port: process.env.DB_PORT || 5432,
    });

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
