const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
const PORT = process.env.PORT || 3000;

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

// Health check for our own server
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check API Monitor server health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: API Monitor is running
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Monitor is running",
  });
});

// Check an external API
/**
 * @swagger
 * /monitor:
 *   get:
 *     summary: Monitor an external API endpoint
 *     description: Checks endpoint availability and measures response time.
 *     tags: [Monitoring]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: The HTTP or HTTPS endpoint to check
 *         example: https://jsonplaceholder.typicode.com/posts/1
 *     responses:
 *       200:
 *         description: Monitoring result, including HTTP status and response time
 *       400:
 *         description: Missing or invalid URL
 *       502:
 *         description: Monitoring request failed at the HTTP client level
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

    return res.status(200).json({
      success: true,
      url: parsedUrl.href,
      statusCode: response.status,
      isReachable: true,
      isUp: response.ok,
      responseTimeMs,
      status: responseTimeMs < 2000 ? "UP" : "DEGRADED",
    });
  } catch (error) {
    const isTimeout = error.name === "TimeoutError";

    return res.status(200).json({
      success: true,
      url: parsedUrl.href,
      isUp: false,
      error: isTimeout ? "Request timed out" : "Unable to reach the API",
      responseTimeMs: Date.now() - startTime,
      status: "DOWN"
    });
  }
});

app.listen(PORT, () => {
  console.log(`API Monitor running at http://localhost:${PORT}`);
});