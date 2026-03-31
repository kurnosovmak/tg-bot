import { isDuplicateUpdate, listRecentSaves, tryInsertSave } from "./saves.js";
import { createSlidingWindowLimiter, loadRateLimitConfig } from "./rateLimit.js";
import { maxSaveContentLength, validateSaveText } from "./limits.js";

const HELP = `QuickSave — быстрые заметки и ссылки.

• Отправьте текст или ссылку — сохраню (ссылки определяются автоматически).
• /list — последние сохранения.
• /privacy — как обрабатываются данные (ПДн).
• /help — эта справка.`;

const PRIVACY_SHORT = `Мы храним только то, что нужно для работы бота: идентификатор Telegram, ник (если есть), текст заметок и ссылок в SQLite на сервере. Подробнее см. документ privacy в репозитории (docs/PRIVACY.md). Логи — без содержимого сообщений (уровень по LOG_LEVEL).`;

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {{ db: import('sql.js').Database, dbPath: string, metrics?: object }} store
 */
export function registerHandlers(bot, store) {
  const { db, dbPath, metrics } = store;

  const maxLen = maxSaveContentLength();
  const rl = loadRateLimitConfig();
  const allowSave = createSlidingWindowLimiter({
    windowMs: rl.windowMs,
    max: rl.maxSaves,
  });
  const maxList = Math.max(
    1,
    Number.parseInt(String(process.env.RATE_LIMIT_MAX_LIST_PER_WINDOW ?? "45"), 10) || 45
  );
  const allowList = createSlidingWindowLimiter({
    windowMs: rl.windowMs,
    max: maxList,
  });

  bot.start((ctx) =>
    ctx.reply(
      `Привет! Я QuickSave.\n\n${HELP}`
    )
  );

  bot.help((ctx) => ctx.reply(HELP));

  bot.command("privacy", (ctx) => ctx.reply(PRIVACY_SHORT));

  bot.command("list", (ctx) => {
    const uid = ctx.from?.id;
    if (uid == null) return;

    if (!allowList(uid)) {
      metrics?.recordRateLimited();
      return ctx.reply(
        "Слишком много запросов к списку. Подождите немного и попробуйте снова."
      );
    }

    const rows = listRecentSaves(db, uid, 10);
    if (rows.length === 0) {
      return ctx.reply("Пока ничего не сохранено. Отправьте текст или ссылку.");
    }

    const lines = rows.map((r, i) => {
      const tag = r.kind === "link" ? "ссылка" : "заметка";
      const preview =
        String(r.content).length > 200
          ? `${String(r.content).slice(0, 197)}…`
          : String(r.content);
      return `${i + 1}. [${tag}] #${r.id}\n${preview}`;
    });

    return ctx.reply(lines.join("\n\n"));
  });

  bot.command("save", (ctx) => {
    const text = ctx.message?.text ?? "";
    const arg = text.replace(/^\/save(@[\w]+)?\s*/i, "").trim();
    if (!arg) {
      return ctx.reply(
        "Использование: отправьте текст или ссылку сообщением, либо /save ваш текст"
      );
    }
    return saveFromContext(ctx, arg);
  });

  bot.on("text", (ctx) => {
    const t = ctx.message?.text ?? "";
    if (t.startsWith("/")) return;
    return saveFromContext(ctx, t);
  });

  /**
   * @param {import('telegraf').Context} ctx
   * @param {string} text
   */
  function saveFromContext(ctx, text) {
    const from = ctx.from;
    if (!from) return;

    const v = validateSaveText(text, maxLen);
    if (!v.ok) {
      metrics?.recordValidationRejected();
      if (v.reason === "too_long") {
        return ctx.reply(
          `Сообщение слишком длинное (максимум ${maxLen} символов). Сократите текст.`
        );
      }
      return ctx.reply("Пустое сообщение — нечего сохранять.");
    }

    const updateId = ctx.update.update_id;

    if (isDuplicateUpdate(db, updateId)) {
      return Promise.resolve();
    }

    if (!allowSave(from.id)) {
      metrics?.recordRateLimited();
      return ctx.reply(
        "Слишком много сохранений за короткое время. Подождите минуту и попробуйте снова."
      );
    }

    const result = tryInsertSave(db, dbPath, {
      telegramUserId: from.id,
      username: from.username,
      updateId,
      text,
    });

    if (!result.inserted) {
      if (result.reason === "duplicate_update") {
        return Promise.resolve();
      }
      return ctx.reply("Пустое сообщение — нечего сохранять.");
    }

    metrics?.recordSaveAccepted();
    const label = result.kind === "link" ? "Ссылка" : "Заметка";
    return ctx.reply(`${label} сохранена:\n${result.content}`);
  }
}
