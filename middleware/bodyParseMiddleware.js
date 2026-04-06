/**
 * @file middleware/bodyParseMiddleware.js
 * @description Helper middleware to ensure req.body is a JSON object.
 */

/**
 * Middleware that ensures req.body is a parsed JSON object even 
 * if it was received as a raw Buffer for signature verification.
 * 
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 */
const ensureJsonBody = (req, res, next) => {
  // If the request was verified via signature, the payload is already parsed
  if (req.authMode === "signature" && req.gitHubPayload) {
    req.body = req.gitHubPayload;
    return next();
  }

  // Otherwise, for token/API-key based requests, we manually parse the raw buffer to JSON
  if (Buffer.isBuffer(req.body)) {
    try {
      const bodyStr = req.body.toString("utf8");
      req.body = JSON.parse(bodyStr);
    } catch (err) {
      console.error("[Body Parse Error] Failed to parse raw body as JSON:", err.message);
      return res.status(400).json({
        type: "error",
        message: "Invalid JSON body provided.",
      });
    }
  }
  next();
};

module.exports = {
  ensureJsonBody
};
