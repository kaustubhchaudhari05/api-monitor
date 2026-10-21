const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Health check for our own server
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Monitor is running",
  });
});

// Check an external API
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
      isUp: response.ok,
      responseTimeMs,
    });
  } catch (error) {
    const isTimeout = error.name === "TimeoutError";

    return res.status(200).json({
      success: true,
      url: parsedUrl.href,
      isUp: false,
      error: isTimeout ? "Request timed out" : "Unable to reach the API",
      responseTimeMs: Date.now() - startTime,
    });
  }
});

app.listen(PORT, () => {
  console.log(`API Monitor running at http://localhost:${PORT}`);
});