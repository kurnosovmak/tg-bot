# Деплой QuickSave Bot (прод)

Краткий runbook: образ, хост, перезапуск, long polling vs webhook, пробы.

## Режим обновлений Telegram: long polling (текущий код)

В [src/index.js](../src/index.js) используется `bot.launch()` без webhook — бот сам опрашивает Telegram. Для прод на одном VPS этого достаточно: не нужен публичный HTTPS URL для входящих запросов от Telegram.

**Плюсы:** простой деплой за NAT, без сертификата для Bot API.

**Минусы:** постоянное исходящее соединение; при очень высокой нагрузке webhook часто предпочтительнее.

### Webhook (если понадобится позже)

Потребуется:

- Публичный HTTPS URL (Let's Encrypt на reverse proxy).
- В коде — `telegraf` webhook API вместо `launch()` polling, путь секрета, синхронизация с `setWebhook` в Bot API.

До смены режима оставляем long polling, как в репозитории.

## Хост / VPS

Минимально: **1 vCPU, 512 MB–1 GB RAM**, Debian/Ubuntu LTS или другой Linux с Docker. Регион — ближе к пользователям, если важна задержка; для бота критичнее стабильность и исходящий доступ в интернет.

## Docker (рекомендуемый путь)

1. На сервере: установите [Docker Engine](https://docs.docker.com/engine/install/) и Compose plugin.
2. Клонируйте репозиторий, скопируйте `cp .env.example .env`, задайте `TELEGRAM_BOT_TOKEN`.
3. Сборка и запуск:

   ```bash
   docker compose build
   docker compose up -d
   ```

4. Проверка:

   - `curl -sS http://127.0.0.1:8080/health` → `{"status":"ok"}`
   - `curl -sS http://127.0.0.1:8080/ready` → после старта бота `{"ready":true}`

Данные SQLite хранятся в именованном томе `quicksave-data` (путь в контейнере `/app/data`). Бэкап: `docker run --rm -v quicksave-data:/data -v $(pwd):/backup alpine tar czf /backup/quicksave-data.tgz -C /data .`

Переменная `DATABASE_PATH` в `docker-compose.yml` указывает на файл внутри тома.

## Перезапуск при сбое

- **Compose:** `restart: unless-stopped` — контейнер поднимется после падения процесса или ребута хоста (если включён автозапуск Docker).
- **Docker healthcheck** в образе и в compose проверяет `/health`; при повторных неудачах оркестратор может перезапустить контейнер (зависит от среды).

При OOM или kill -9 смотрите логи: `docker compose logs -f`.

## Альтернатива: systemd + Node на хосте

Без Docker: Node 20+, `npm ci --omit=dev`, `cp .env.example .env`, systemd unit с `Restart=always`, `WorkingDirectory`, `EnvironmentFile=/path/to/.env`, `ExecStart=/usr/bin/node src/index.js`. Пробы — те же URL на `HEALTH_PORT`.

## Секреты

См. [SECRETS.md](SECRETS.md). Токен только в `.env` или секретах оркестратора, не в git.

## Staging, релиз, откат

- Smoke после деплоя на staging: [STAGING_SMOKE.md](STAGING_SMOKE.md).
- Чеклист перед продом и откат: [RELEASE.md](RELEASE.md).
