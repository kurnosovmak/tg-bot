/**
 * In-memory sliding-window rate limiter per key (e.g. Telegram user id).
 * Not shared across processes — sufficient for single-instance VPS.
 */

/**
 * @param {{ windowMs: number; max: number }} opts
 */
export function createSlidingWindowLimiter({ windowMs, max }) {
  /** @type {Map<string | number, number[]>} */
  const buckets = new Map();

  /**
   * @param {string | number} key
   * @returns {boolean} true if allowed, false if over limit
   */
  return function allow(key) {
    const now = Date.now();
    let stamps = buckets.get(key);
    if (!stamps) {
      stamps = [];
      buckets.set(key, stamps);
    }
    while (stamps.length > 0 && stamps[0] < now - windowMs) {
      stamps.shift();
    }
    if (stamps.length >= max) {
      return false;
    }
    stamps.push(now);
    return true;
  };
}

/**
 * @param {object} env
 * @returns {{ windowMs: number; maxSaves: number }}
 */
export function loadRateLimitConfig(env = process.env) {
  const windowMs = Math.max(
    1000,
    Number.parseInt(String(env.RATE_LIMIT_WINDOW_MS ?? "60000"), 10) || 60_000
  );
  const maxSaves = Math.max(
    1,
    Number.parseInt(String(env.RATE_LIMIT_MAX_SAVES_PER_WINDOW ?? "40"), 10) || 40
  );
  return { windowMs, maxSaves };
}
