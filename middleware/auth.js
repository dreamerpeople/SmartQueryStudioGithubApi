/**
 * @file middleware/auth.js
 * @description Middleware for handling dual-mode authentication: API Key and GitHub Signature.
 */

module.exports = {
  /**
   * Middleware to ensure the request is authenticated.
   * Checks for a valid API key in the 'x-api-key' header first, 
   * then falls back to checking for a valid authenticated user (populated by signature verification).
   * 
   * @param {import("express").Request} req - Express request object.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   */
  ensureAuthenticated: (req, res, next) => {

    // 1. Check for API Key (Silent Auth / Machine-to-Machine)
    const apiKey = req.headers["x-api-key"];
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (apiKey && expectedKey && apiKey === expectedKey) {
      if (!req.user) {
        req.user = {
          name: "Internal Service",
          username: "service_account@internal",
          isService: true,
        };
      }
      return next();
    }

    // 2. Check for signature-verified user (populated by verifyGitHubSignature middleware)
    if (req.user) {
      return next();
    }

    res
      .status(401)
      .json({
        error:
          "Not authenticated. This request must be signed by GitHub or provide a valid INTERNAL_API_KEY.",
      });
  },
};

