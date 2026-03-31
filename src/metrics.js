/**
 * Minimal in-process counters for scraping (Prometheus text exposition).
 */
export function createMetrics() {
  /** @type {Record<string, number>} */
  const counters = {
    http_requests_total: 0,
    http_errors_total: 0,
    bot_handler_errors_total: 0,
    rate_limited_total: 0,
    saves_accepted_total: 0,
    validation_rejected_total: 0,
  };

  return {
    /**
     * @param {{ statusCode: number; durationMs: number }} e
     */
    recordHttp(e) {
      counters.http_requests_total += 1;
      if (e.statusCode >= 500) {
        counters.http_errors_total += 1;
      }
    },
    recordBotError() {
      counters.bot_handler_errors_total += 1;
    },
    recordRateLimited() {
      counters.rate_limited_total += 1;
    },
    recordSaveAccepted() {
      counters.saves_accepted_total += 1;
    },
    recordValidationRejected() {
      counters.validation_rejected_total += 1;
    },
    /** Prometheus text format (counters + process gauges). */
    prometheusText() {
      const uptimeSec = Math.floor(process.uptime());
      const lines = [
        "# HELP process_uptime_seconds Seconds since process start.",
        "# TYPE process_uptime_seconds gauge",
        `process_uptime_seconds ${uptimeSec}`,
        "# HELP http_requests_total Total HTTP requests to health/metrics.",
        "# TYPE http_requests_total counter",
        `http_requests_total ${counters.http_requests_total}`,
        "# HELP http_errors_total HTTP 5xx responses from health server.",
        "# TYPE http_errors_total counter",
        `http_errors_total ${counters.http_errors_total}`,
        "# HELP bot_handler_errors_total Telegraf catch handler invocations.",
        "# TYPE bot_handler_errors_total counter",
        `bot_handler_errors_total ${counters.bot_handler_errors_total}`,
        "# HELP rate_limited_total Saves or list blocked by per-user rate limit.",
        "# TYPE rate_limited_total counter",
        `rate_limited_total ${counters.rate_limited_total}`,
        "# HELP saves_accepted_total Saves persisted after validation.",
        "# TYPE saves_accepted_total counter",
        `saves_accepted_total ${counters.saves_accepted_total}`,
        "# HELP validation_rejected_total Rejected empty/too-long input before save.",
        "# TYPE validation_rejected_total counter",
        `validation_rejected_total ${counters.validation_rejected_total}`,
        "",
      ];
      return lines.join("\n");
    },
  };
}
