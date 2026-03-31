import "dotenv/config";
import { Telegraf } from "telegraf";
import { createHealthServer } from "./health.js";
import { openDatabase } from "./db.js";
import { registerHandlers } from "./handlers.js";
import { logger } from "./logger.js";
import { createMetrics } from "./metrics.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || !token.trim()) {
  logger.fatal(
    "Missing TELEGRAM_BOT_TOKEN. Copy .env.example to .env and set the token (see docs/SECRETS.md)."
  );
  process.exit(1);
}

const { db, dbPath } = await openDatabase();

const healthPort = Number(process.env.HEALTH_PORT || 8080);
let ready = false;
const metrics = createMetrics();

const healthServer = await createHealthServer({
  port: healthPort,
  getReady: () => ready,
  logger,
  metrics,
});

const bot = new Telegraf(token.trim());

registerHandlers(bot, { db, dbPath, metrics });

bot.catch((err, ctx) => {
  metrics.recordBotError();
  logger.error(
    { err, updateId: ctx.update?.update_id },
    "bot_handler_error"
  );
  return ctx.reply("Временная ошибка. Попробуйте позже.");
});

function shutdown(signal) {
  bot.stop(signal);
  try {
    db.close();
  } catch (e) {
    logger.error({ err: e }, "db_close_error");
  }
  healthServer.close(() => process.exit(0));
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

bot
  .launch()
  .then(() => {
    ready = true;
    logger.info(
      {
        healthPort,
        endpoints: ["/health", "/ready", "/metrics"],
      },
      "bot_polling_started"
    );
  })
  .catch((err) => {
    logger.fatal({ err }, "bot_launch_failed");
    process.exit(1);
  });
