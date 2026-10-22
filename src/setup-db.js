
const pool = require("./db");

async function setupDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS monitoring_history (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        url TEXT NOT NULL,
        status_code INTEGER,
        is_reachable BOOLEAN NOT NULL,
        is_up BOOLEAN NOT NULL,
        response_time_ms INTEGER,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log("monitoring_history table created or already exists.");

    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'monitoring_history';
    `);

    console.log("Table verification:", result.rows);
  } catch (error) {
    console.error("Database setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

setupDatabase();
