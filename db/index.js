const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "dpg-d4vg7vemcj7s73dn0nf0-a",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "owly_postgres_db",
  user: process.env.DB_USER || "owly_postgres_db_user",
  password: process.env.DB_PASSWORD || "H7muDNQ42ufBVKXSSw3F8nn3LiwSAAz9",
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false }
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
