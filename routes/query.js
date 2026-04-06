/**
 * @file routes/query.js
 * @description API routes for AI-powered data queries and visualizations.
 */

const express = require("express");
const { handleQuery } = require("../controllers/queryController");
const { verifyGitHubSignature } = require("../middleware/tokenMiddleware");
const { ensureJsonBody } = require("../middleware/bodyParseMiddleware");
const router = express.Router();

/**
 * Handle natural language queries for data and visualizations.
 * 
 * @name POST /api/query
 */
router.post(
  "/query",
  express.raw({ type: "application/json" }),
  verifyGitHubSignature,
  ensureJsonBody,
  handleQuery
);



module.exports = router;
