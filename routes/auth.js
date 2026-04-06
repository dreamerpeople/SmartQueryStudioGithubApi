/**
 * @file routes/auth.js
 * @description Authentication routes for GitHub.
 * Focuses on non-interactive authentication for GitHub Copilot Extensions.
 */

const express = require("express");
const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/rest");

const router = express.Router();

/**
 * Background application login using GitHub App Installation Token.
 * Equivalent to Microsoft Client Credentials flow.
 * 
 * NOTE: For Copilot Extensions, it's preferred to use the X-GitHub-Token 
 * provided in the request headers verified via signature.
 *
 * @name POST /auth/app-login
 */
router.post("/app-login", async (req, res) => {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;
  const installationId = process.env.GITHUB_INSTALLATION_ID;

  if (!appId || !privateKey || !installationId) {
    return res.status(500).json({
      error: "GitHub App configuration missing",
      message:
        "Please ensure GITHUB_APP_ID, GITHUB_PRIVATE_KEY, and GITHUB_INSTALLATION_ID are set.",
    });
  }

  try {
    const auth = createAppAuth({
      appId: appId,
      privateKey: privateKey.replace(/\\n/g, "\n"), // Handle newlines in env variables
      installationId: installationId,
    });

    const { token } = await auth({ type: "installation" });

    // Return the token and user info directly.
    // Session management is removed in favor of token-based or signature-based auth.
    const appUser = {
      name: "SmartQueryStudio App",
      username: `app_${appId}`,
      isApp: true,
      token: token,
    };

    res.json({
      success: true,
      message: "App authenticated successfully in the background",
      user: appUser,
    });
  } catch (error) {
    console.error("Error in GitHub App auth flow:", error);
    res.status(500).json({
      error: "Background auth failed",
      message: error.message,
    });
  }
});

const { verifyGitHubSignature } = require("../middleware/tokenMiddleware");
const { ensureJsonBody } = require("../middleware/bodyParseMiddleware");

/**
 * Retrieve the current authenticated user's information.
 * Works with the verifyGitHubSignature middleware which populates req.user.
 */
router.get(
  "/user",
  express.raw({ type: "application/json" }),
  verifyGitHubSignature,
  ensureJsonBody,
  (req, res) => {

  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ 
      error: "Not authenticated",
      message: "This endpoint requires a signed request from GitHub Copilot or a valid Installation Token." 
    });
  }
});

module.exports = router;


module.exports = router;
