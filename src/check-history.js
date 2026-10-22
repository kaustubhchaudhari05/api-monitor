
const pool = require("./db");

async function checkHistory() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        url,
        status_code,
        is_reachable,
        is_up,
        response_time_ms,
        status,
        error_message,
        checked_at
      FROM monitoring_history
      ORDER BY id DESC
      LIMIT 10;
    `);

    console.table(result.rows);
  } catch (error) {
    console.error("Failed to retrieve history:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkHistory();
