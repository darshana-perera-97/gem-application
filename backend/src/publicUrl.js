const PORT = Number(process.env.PORT) || 1324;

/**
 * Public site/API origin = the URL this backend is reachable on.
 * Uses the incoming request (incl. reverse-proxy headers) when available.
 */
function getPublicBaseUrl(req) {
  if (req) {
    const forwardedProto = typeof req.get === "function" ? req.get("x-forwarded-proto") : null;
    const forwardedHost = typeof req.get === "function" ? req.get("x-forwarded-host") : null;
    const hostHeader = typeof req.get === "function" ? req.get("host") : req.headers?.host;
    const proto = String(forwardedProto || req.protocol || "http")
      .split(",")[0]
      .trim();
    const host = String(forwardedHost || hostHeader || `localhost:${PORT}`)
      .split(",")[0]
      .trim();
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }
  return `http://localhost:${PORT}`.replace(/\/$/, "");
}

module.exports = { getPublicBaseUrl, PORT };
