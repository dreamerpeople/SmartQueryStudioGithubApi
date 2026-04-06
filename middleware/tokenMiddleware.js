/**
 * @file middleware/tokenMiddleware.js
 * @description Adaptive middleware to authenticate requests from both GitHub Copilot (Signature) 
 * and standalone frontends (Bearer Token/API Key).
 */

const { verifyAndParseRequest } = require("@copilot-extensions/preview-sdk");
const { Octokit } = require("@octokit/rest");

/**
 * Middleware that authenticates a request using either GitHub Signature Verification 
 * or a Bearer Token/Internal API Key.
 * 
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 */
async function authenticateGitHub(req, res, next) {
  const signature = req.get("Github-Public-Key-Signature");
  const keyId = req.get("Github-Public-Key-Identifier");
  const xGitHubToken = req.get("X-GitHub-Token");
  const authHeader = req.get("Authorization");
  const apiKey = req.get("x-api-key");

  // Mode 1: GitHub Signature Verification (Extension Mode)
  if (signature && keyId && xGitHubToken) {
    try {
      // Note: req.body MUST be the raw buffer for signature verification
      const { isValidRequest, payload } = await verifyAndParseRequest(
        req.body,
        signature,
        keyId,
        {
          token: xGitHubToken,
        }
      );

      if (!isValidRequest) {
        console.error("[Auth Error] Invalid GitHub signature.");
        return res.status(401).json({
          type: "error",
          message: "Invalid GitHub signature.",
        });
      }

      req.githubToken = xGitHubToken;
      req.gitHubPayload = payload;
      req.authMode = "signature";

      // Populate user info from GitHub Token
      await populateUserProfile(req, xGitHubToken, payload);
      return next();
    } catch (error) {
      console.error("[Auth Error] Signature Verification failed:", error.message);
      return res.status(500).json({
        type: "error",
        message: "Security error: Could not verify GitHub signature.",
      });
    }
  }

  // Mode 2: Bearer Token (Frontend Mode / PAT)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      req.githubToken = token;
      req.authMode = "bearer_token";
      await populateUserProfile(req, token);
      return next();
    } catch (error) {
      console.error("[Auth Error] Token Validation failed:", error.message);
      return res.status(401).json({
        type: "error",
        message: "Invalid or expired GitHub token.",
      });
    }
  }

  // Mode 3: Internal API Key (Bypass Mode)
  const expectedKey = process.env.INTERNAL_API_KEY;
  if (apiKey && expectedKey && apiKey === expectedKey) {
    req.user = {
      name: "Internal Service",
      username: "service_account@internal",
      isService: true,
      provider: "internal",
    };
    req.authMode = "api_key";
    return next();
  }

  // Fallback: No authentication provided
  return res.status(401).json({
    type: "error",
    message: "Authentication required. Please provide a GitHub Signature, a Bearer Token, or an API Key.",
  });
}

/**
 * Helper to fetch GitHub user profile and populate req.user.
 */
async function populateUserProfile(req, token, payload = null) {
  try {
    const octokit = new Octokit({ auth: token });
    const { data: userProfile } = await octokit.users.getAuthenticated();
    
    req.user = {
      id: userProfile.id,
      username: userProfile.login,
      displayName: userProfile.name,
      profileUrl: userProfile.html_url,
      emails: [{ value: userProfile.email }],
      photos: [{ value: userProfile.avatar_url }],
      provider: "github",
      accessToken: token,
      isExtension: !!payload
    };
  } catch (error) {
    if (payload && payload.sender) {
      // Fallback for signatures if GitHub API is slow/unavailable
      req.user = {
        username: payload.sender.login,
        id: payload.sender.id,
        provider: "github",
        accessToken: token,
        isExtension: true
      };
    } else {
      throw error;
    }
  }
}

module.exports = {
  authenticateGitHub,
  // Maintain backward compatibility for existing imports
  verifyGitHubSignature: authenticateGitHub,
  injectAppToken: authenticateGitHub, 
};
