# Smoke-тесты staging (QuickSave Bot)

Минимальный набор проверок после деплоя на staging **до** переключения трафика или пометки «готово к прод».

## Предусловия

- Контейнер/процесс запущен, `TELEGRAM_BOT_TOKEN` для **staging-бота** задан.
- Доступ к `HEALTH_PORT` с хоста или через `docker compose exec` / SSH.

## HTTP-пробы

```bash
HOST="${HEALTH_HOST:-127.0.0.1}"
PORT="${HEALTH_PORT:-8080}"
curl -fsS "http://${HOST}:${PORT}/health" | jq .
curl -fsS "http://${HOST}:${PORT}/ready" | jq .
curl -fsS "http://${HOST}:${PORT}/metrics" | head -20
```

Ожидание: `/health` → `200`, `{"status":"ok"}`; `/ready` → `200`, `{"ready":true}` после успешного запуска polling; `/metrics` — текст Prometheus.

## Поведение в Telegram (ручной чек)

1. `/start` — приветствие и справка.
2. Отправить короткую заметку — ответ «сохранена».
3. `/list` — заметка в списке.
4. `/privacy` — краткий текст про ПДн.
5. Отправить очень длинное сообщение (> `MAX_SAVE_CONTENT_LENGTH`) — отказ с текстом про лимит.
6. Быстро отправить много сообщений подряд — после порога — ответ про rate limit (см. `RATE_LIMIT_*` в `.env.example`).

## Автоматизация

Скрипт `scripts/smoke-staging.sh` проверяет только HTTP (удобно в CI после деплоя на staging, **без** реального Telegram API для сообщений).

```bash
HEALTH_PORT=8080 ./scripts/smoke-staging.sh
```
