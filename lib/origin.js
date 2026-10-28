/**
 * Compare a browser's Origin header with the actual request host.
 * APP_ORIGIN is optional and may also be a hostname without a scheme.
 * Malformed configuration must never crash an otherwise valid same-origin request.
 */
function normalizeOrigin(value, allowBareHost = false) {
  if (typeof value !== "string" || !value.trim()) return null;
  let candidate = value.trim();
  if (allowBareHost && !/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    candidate = "https://" + candidate;
  }
  try {
    const url = new URL(candidate);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isAllowedRequestOrigin({ origin, requestUrl, configuredOrigin }) {
  // Preserve support for non-browser clients that omit Origin.
  if (!origin) return true;
  const actualOrigin = normalizeOrigin(origin);
  if (!actualOrigin) return false;
  const requestOrigin = normalizeOrigin(requestUrl);
  const canonicalOrigin = normalizeOrigin(configuredOrigin, true);
  return actualOrigin === requestOrigin || (canonicalOrigin !== null && actualOrigin === canonicalOrigin);
}
