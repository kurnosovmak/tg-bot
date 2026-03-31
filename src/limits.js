/**
 * Central limits from env (validation + abuse protection).
 * Telegram message text max is 4096; we align with that for stored content.
 */

const DEFAULT_MAX = 4096;

/**
 * @param {object} [env]
 * @returns {number}
 */
export function maxSaveContentLength(env = process.env) {
  const raw = env.MAX_SAVE_CONTENT_LENGTH;
  if (raw == null || String(raw).trim() === "") {
    return DEFAULT_MAX;
  }
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_MAX;
  }
  return Math.min(n, 16_384);
}

/**
 * @param {string} text
 * @param {number} maxLen
 * @returns {{ ok: true } | { ok: false; reason: 'empty' | 'too_long' }}
 */
export function validateSaveText(text, maxLen) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }
  if (trimmed.length > maxLen) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true };
}
