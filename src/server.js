
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Save a monitoring result to PostgreSQL
async function saveMonitoringResult(result) {
  try {
    await pool.query(
      `INSERT INTO monitoring_history
        (url, status_code, is_reachable, is_up,
         response_time_ms, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        result.url,
        result.statusCode,
        result.isReachable,
        result.isUp,
        result.responseTimeMs,
        result.status,
        result.error || null,
      ]
    );

    return true;
  } catch (error) {
    console.error("Failed to save monitoring history:", error.message);
    return false;
  }
}

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Monitoring System",
      version: "1.0.0",
      description:
        "API for monitoring endpoint availability and response times.",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Local development server",
      },
    ],
  },
  apis: ["./src/server.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check API Monitor server health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running successfully
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Monitor is running",
  });
});

/**
 * @swagger
 * /monitor:
 *   get:
 *     summary: Monitor an external API endpoint
 *     description: Checks endpoint availability, response time, and saves the result to PostgreSQL.
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         example: https://jsonplaceholder.typicode.com/posts/1
 *     responses:
 *       200:
 *         description: Monitoring result. Includes historySaved to indicate whether the result was stored.
 *       400:
 *         description: Missing or invalid URL
 */
app.get("/monitor", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      message: "Please provide a URL",
    });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid URL",
    });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({
      success: false,
      message: "Only HTTP and HTTPS URLs are supported",
    });
  }

  const startTime = Date.now();

  try {
    const response = await fetch(parsedUrl, {
      signal: AbortSignal.timeout(5000),
    });

    const responseTimeMs = Date.now() - startTime;

    const result = {
      url: parsedUrl.href,
      statusCode: response.status,
      isReachable: true,
      isUp: response.ok,
      responseTimeMs,
      status:
        !response.ok || responseTimeMs >= 2000
          ? "DEGRADED"
          : "UP",
    };

    const historySaved = await saveMonitoringResult(result);

    return res.status(200).json({
      success: true,
      ...result,
      historySaved,
    });
  } catch (error) {
    const isTimeout = error.name === "TimeoutError";

    const result = {
      url: parsedUrl.href,
      statusCode: null,
      isReachable: false,
      isUp: false,
      responseTimeMs: Date.now() - startTime,
      status: "DOWN",
      error: isTimeout
        ? "Request timed out"
        : "Unable to reach the API",
    };

    const historySaved = await saveMonitoringResult(result);

    return res.status(200).json({
      success: true,
      ...result,
      historySaved,
    });
  }
});


/**
 * @swagger
 * /history:
 *   get:
 *     summary: Get paginated monitoring history
 *     description: Returns monitoring results with limit and offset pagination.
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Monitoring history retrieved successfully
 *       400:
 *         description: Invalid pagination parameters
 *       500:
 *         description: Failed to retrieve monitoring history
 */
app.get("/history", async (req, res) => {
  const limit = Number(req.query.limit ?? 10);
  const offset = Number(req.query.offset ?? 0);

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        "limit must be an integer from 1 to 100, and offset must be a non-negative integer",
    });
  }

  try {
    const result = await pool.query(
      `SELECT
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
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      limit,
      offset,
      data: result.rows,
    });
  } catch (error) {
    console.error("Failed to retrieve monitoring history:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve monitoring history",
    });
  }
});


app.listen(PORT, () => {
  console.log(`API Monitor running at http://localhost:${PORT}`);
});
