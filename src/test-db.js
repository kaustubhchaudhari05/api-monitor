const pool = require("./db");

async function testConnection() {
  try {
    const result = await pool.query(
      "SELECT NOW() AS current_time, current_database() AS database_name"
    );

    console.log("PostgreSQL connected successfully!");
    console.log("Database:", result.rows[0].database_name);
    console.log("Server time:", result.rows[0].current_time);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();