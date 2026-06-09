/**
 * Shared-secret API key auth for public/cloud deployment.
 *
 * Factory returns an Express middleware that checks the `x-api-key` header
 * against the value of the given env var.
 *
 * Opt-in by design: if the env var is NOT set, the middleware is DISABLED and
 * lets every request through. This keeps local development (where the backend is
 * on the LAN and trusted) working without configuration, while a cloud deploy
 * simply sets the env var to switch protection on.
 *
 * Two separate keys are used so the distributed mobile app never carries the
 * admin secret:
 *   - API_KEY         -> terminal / admin endpoints
 *   - MOBILE_API_KEY  -> the RenterNotify app's push endpoints
 */
function createApiKeyAuth(envVarName) {
  let warned = false;
  return (req, res, next) => {
    const expected = process.env[envVarName];

    if (!expected) {
      if (!warned) {
        console.warn(`[apiKeyAuth] ${envVarName} not set — auth DISABLED for these routes (local/dev mode).`);
        warned = true;
      }
      return next();
    }

    const provided = req.headers['x-api-key'];
    if (provided && provided === expected) {
      return next();
    }

    return res.status(401).json({ error: 'Unauthorized' });
  };
}

module.exports = createApiKeyAuth;
