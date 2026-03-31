import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";

const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_user_id INTEGER NOT NULL UNIQUE,
        username TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS saves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('link', 'note')),
        telegram_update_id INTEGER NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_saves_user_created
        ON saves (user_id, created_at DESC);
    `,
  },
];

function defaultDbPath() {
  return path.join(process.cwd(), "data", "quicksave.db");
}

/**
 * @param {string} dbPath
 */
function persist(db, dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function migrate(db, dbPath) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const cur = db.exec(
    "SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations"
  );
  let current = cur[0]?.values?.[0]?.[0] ?? 0;

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    db.exec(m.sql);
    db.run("INSERT INTO schema_migrations (version) VALUES (?)", [m.version]);
    current = m.version;
  }

  persist(db, dbPath);
}

/**
 * @returns {Promise<import('sql.js').Database>}
 */
export async function openDatabase() {
  const dbPath = process.env.DATABASE_PATH?.trim() || defaultDbPath();

  const SQL = await initSqlJs();

  let db;
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  migrate(db, dbPath);

  return { db, dbPath };
}

/**
 * @param {import('sql.js').Database} db
 * @param {string} dbPath
 */
export function persistDatabase(db, dbPath) {
  persist(db, dbPath);
}
