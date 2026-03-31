import { persistDatabase } from "./db.js";

const URL_RE = /\bhttps?:\/\/[^\s<>"{}|\\^`[\]]+/i;

/**
 * @param {string} text
 * @returns {{ kind: 'link' | 'note', content: string }}
 */
export function classifyContent(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { kind: "note", content: "" };
  }
  const firstLine = trimmed.split(/\r?\n/)[0].trim();
  const direct = firstLine.match(/^https?:\/\/\S+/i);
  if (direct) {
    return { kind: "link", content: direct[0] };
  }
  const anywhere = trimmed.match(URL_RE);
  if (anywhere) {
    return { kind: "link", content: anywhere[0] };
  }
  return { kind: "note", content: trimmed };
}

/**
 * @param {import('sql.js').Database} db
 * @param {string} dbPath
 * @param {{ telegramUserId: number, username?: string }} user
 * @returns {number} internal user id
 */
function ensureUser(db, dbPath, { telegramUserId, username }) {
  db.run("INSERT OR IGNORE INTO users (telegram_user_id, username) VALUES (?, ?)", [
    telegramUserId,
    username ?? null,
  ]);
  if (db.getRowsModified() > 0) {
    persistDatabase(db, dbPath);
  }

  const stmt = db.prepare(
    "SELECT id FROM users WHERE telegram_user_id = ? LIMIT 1"
  );
  stmt.bind([telegramUserId]);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  const id = row.id;
  if (typeof id !== "number") {
    throw new Error("ensureUser: missing user row");
  }
  return id;
}

/**
 * @param {import('sql.js').Database} db
 * @param {number} updateId
 * @returns {boolean}
 */
export function isDuplicateUpdate(db, updateId) {
  const stmt = db.prepare(
    "SELECT 1 AS x FROM saves WHERE telegram_update_id = ? LIMIT 1"
  );
  stmt.bind([updateId]);
  const has = stmt.step();
  stmt.free();
  return has;
}

/**
 * Idempotent save: duplicate telegram_update_id → returns { inserted: false }.
 * @param {import('sql.js').Database} db
 * @param {string} dbPath
 * @param {{ telegramUserId: number, username?: string, updateId: number, text: string }} input
 */
export function tryInsertSave(db, dbPath, { telegramUserId, username, updateId, text }) {
  const { kind, content } = classifyContent(text);
  if (!content) {
    return { inserted: false, reason: "empty" };
  }

  const userId = ensureUser(db, dbPath, { telegramUserId, username });

  db.run(
    `INSERT OR IGNORE INTO saves (user_id, content, kind, telegram_update_id)
     VALUES (?, ?, ?, ?)`,
    [userId, content, kind, updateId]
  );

  if (db.getRowsModified() === 0) {
    return { inserted: false, reason: "duplicate_update" };
  }

  persistDatabase(db, dbPath);
  return { inserted: true, kind, content };
}

/**
 * @param {import('sql.js').Database} db
 * @param {number} telegramUserId
 * @param {number} limit
 */
export function listRecentSaves(db, telegramUserId, limit = 10) {
  const stmt = db.prepare(
    `SELECT s.id, s.content, s.kind, s.created_at
     FROM saves s
     JOIN users u ON u.id = s.user_id
     WHERE u.telegram_user_id = ?
     ORDER BY s.created_at DESC, s.id DESC
     LIMIT ?`
  );
  stmt.bind([telegramUserId, limit]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}
