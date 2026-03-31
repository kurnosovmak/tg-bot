import http from "node:http";

/**
 * Minimal HTTP server for orchestration probes (local dev and future deploy).
 * @param {object} opts
 * @param {number} opts.port
 * @param {() => boolean} opts.getReady
 * @param {import('pino').Logger} [opts.logger]
 * @param {ReturnType<import('./metrics.js').createMetrics>} [opts.metrics]
 * @returns {Promise<import('node:http').Server>}
 */
export function createHealthServer({ port, getReady, logger, metrics }) {
  const log = logger?.child?.({ component: "health" }) ?? null;

  const server = http.createServer((req, res) => {
    const started = performance.now();
    const host = req.headers.host ?? `127.0.0.1:${port}`;
    const u = new URL(req.url ?? "/", `http://${host}`);

    const finish = (statusCode, body, contentType) => {
      const durationMs = Math.round(performance.now() - started);
      metrics?.recordHttp?.({ statusCode, durationMs });
      if (log) {
        log.info(
          {
            method: req.method,
            path: u.pathname,
            statusCode,
            durationMs,
          },
          "http_request"
        );
      }
      res.writeHead(statusCode, {
        "Content-Type": contentType ?? "text/plain; charset=utf-8",
      });
      res.end(body);
    };

    if (req.method !== "GET") {
      finish(405, "Method Not Allowed");
      return;
    }

    if (u.pathname === "/health") {
      finish(200, JSON.stringify({ status: "ok" }), "application/json; charset=utf-8");
      return;
    }

    if (u.pathname === "/ready") {
      const ready = getReady();
      finish(
        ready ? 200 : 503,
        JSON.stringify({ ready }),
        "application/json; charset=utf-8"
      );
      return;
    }

    if (u.pathname === "/metrics" && metrics) {
      finish(200, metrics.prometheusText(), "text/plain; version=0.0.4; charset=utf-8");
      return;
    }

    finish(404, "Not Found");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve(server));
  });
}
