const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
