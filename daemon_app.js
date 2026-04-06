/**
 * @file daemon_app.js
 * @description Secure Express API for GitHub Copilot Extension.
 * Handles background signature verification and GitHub App authentication.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { verifyGitHubSignature } = require("./middleware/tokenMiddleware");
const queryRouter = require("./routes/query");
const authRouter = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 4040;

// CORS Configuration
app.use(
  cors({
    origin: function (origin, callback) {
      callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Github-Public-Key-Signature",
      "Github-Public-Key-Identifier",
      "X-GitHub-Token",
    ],
    credentials: true,
  }),
);

/**
 * Health check endpoint.
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "GitHub Copilot Extension API",
    time: new Date().toISOString(),
  });
});

/**
 * Authentication Routes.
 */
app.use("/auth", authRouter);

/**
 * AI Query Routes.
 */
app.use("/api", queryRouter);







/**
 * Fallback for other routes (standard JSON parsing).
 */
app.use(express.json());

app.get("/api/protected", verifyGitHubSignature, (req, res) => {
  res.json({
    message: "Succesfully verified GitHub signature in the background.",
    auth_info: {
      type: "GitHub Copilot Extension",
      payload: req.gitHubPayload,
    },
    data: {
      id: "SQS-001",
      val: "This data is secured by GitHub Signature Verification.",
      timestamp: Date.now(),
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(`[Server Error] ${new Date().toISOString()}:`, err.stack);
  res.status(500).json({
    type: "error",
    message: "Internal server error.",
    debug: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 GitHub API running at http://localhost:${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📍 Extension endpoint: http://localhost:${PORT}/api/query`);
  console.log(`🔑 Auth endpoints: http://localhost:${PORT}/auth/user\n`);

  if (!process.env.GITHUB_APP_ID) {
    console.warn("⚠️  WARNING: GITHUB_APP_ID is not set in .env!");
  }
});
