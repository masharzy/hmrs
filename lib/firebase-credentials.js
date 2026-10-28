/**
 * Firebase JSON key fields are sometimes pasted to Vercel as JSON-quoted
 * strings instead of the unquoted PEM value. Decode either form safely.
 * Never log or return the resulting secret.
 */
export function normalizeServiceAccountPrivateKey(value) {
  if (typeof value !== "string") return "";
  let key = value.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    try { key = JSON.parse(key); }
    catch { key = key.slice(1, -1); }
  }
  if (typeof key !== "string") return "";
  return key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
}
