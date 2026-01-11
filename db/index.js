const { Pool } = require("pg");

// Use DATABASE_URL if provided, otherwise use Render external database URL
const connectionString = process.env.DATABASE_URL || "postgres://owly_postgres_db_user:H7muDNQ42ufBVKXSSw3F8nn3LiwSAAz9@dpg-d4vg7vemcj7s73dn0nf0-a.oregon-postgres.render.com/owly_postgres_db";
const isLocalDb = connectionString.includes("localhost");

const pool = new Pool({
  connectionString,
  ssl: isLocalDb ? false : { rejectUnauthorized: false }
});

async function query(text, params) {
  return pool.query(text, params);
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS studio_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES studio_categories(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS studio_entries (
      id SERIAL PRIMARY KEY,
      title TEXT,
      prompt TEXT,
      content_text TEXT NOT NULL,
      entry_type TEXT,
      category_id INTEGER REFERENCES studio_categories(id) ON DELETE SET NULL,
      subcategory_id INTEGER REFERENCES studio_categories(id) ON DELETE SET NULL,
      audio_path TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS owly_logs (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      age INTEGER,
      summary TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

module.exports = {
  pool,
  query,
  initDb
};
