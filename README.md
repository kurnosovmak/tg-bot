# QuickSave Bot

Telegram-бот для быстрого сохранения ссылок и заметок (MVP по спецификации в репозитории проекта).

## Стек

- **Runtime:** Node.js 20+ (ESM)
- **Telegram:** [Telegraf](https://telegraf.js.org/) 4.x
- **Конфиг:** `dotenv` для локального `.env`
- **Логи:** [Pino](https://getpino.io/) — JSON в stdout (`LOG_LEVEL`, по умолчанию `info`)

## CI

На каждый push/PR в `main`/`master`: `npm ci` → `npm run lint` → `npm test` (см. [.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Структура репозитория

- `src/index.js` — точка входа: long polling, graceful shutdown
- `src/health.js` — HTTP `/health` и `/ready` (отдельный порт, см. ниже)
- `docs/SECRETS.md` — токены и окружения

## Быстрый старт (dev)

1. Node.js 20+.
2. Токен от [@BotFather](https://t.me/BotFather) — см. [docs/SECRETS.md](docs/SECRETS.md).
3. `cp .env.example .env` и заполните `TELEGRAM_BOT_TOKEN`.
4. `npm install` → `npm run dev`.

После запуска процесс слушает HTTP-пробы на `127.0.0.1:${HEALTH_PORT:-8080}`:

- `GET /health` — процесс жив (`200`, `{ "status": "ok" }`)
- `GET /ready` — бот подключился к Telegram (`200` и `{ "ready": true }` после успешного `launch`; до этого `503`)
- `GET /metrics` — счётчики и uptime в текстовом формате Prometheus (для алертов/дашбордов на стороне хоста)

Каждый запрос к пробам пишется структурированным логом (`http_request`: метод, путь, статус, длительность).

Порт задаётся переменной `HEALTH_PORT` (по умолчанию `8080`).

## Секреты

Подробно: [docs/SECRETS.md](docs/SECRETS.md) — dev (`.env`), staging/prod (CI, Vault, переменные хоста). Токены не коммитятся.

## ПДн и лимиты

- Политика данных: [docs/PRIVACY.md](docs/PRIVACY.md).
- Лимиты на сохранения и длину текста настраиваются через переменные окружения (см. `.env.example`).

## Прод: Docker и runbook

- Образ: `Dockerfile`, запуск: `docker compose` — см. [docs/DEPLOY.md](docs/DEPLOY.md) (хост/VPS, long polling vs webhook, перезапуск, пробы).
- Перед продом: [docs/STAGING_SMOKE.md](docs/STAGING_SMOKE.md), чеклист релиза и откат — [docs/RELEASE.md](docs/RELEASE.md).
