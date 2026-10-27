
const pool = require("./db");

async function setupUsersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'USER'
          CHECK (role IN ('ADMIN', 'USER')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log("Users table created successfully!");
  } catch (error) {
    console.error("Failed to create users table:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

setupUsersTable();
