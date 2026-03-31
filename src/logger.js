import pino from "pino";

const level = process.env.LOG_LEVEL?.trim() || "info";

/** @type {import('pino').Logger} */
export const logger = pino({
  level,
  base: { service: "quicksave-bot" },
  timestamp: pino.stdTimeFunctions.isoTime,
});
