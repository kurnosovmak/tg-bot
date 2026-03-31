# Секреты и токен Telegram (QuickSave Bot)

## Получить токен у провайдера (BotFather)

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather).
2. Отправьте `/newbot`, следуйте инструкциям (имя и username бота).
3. Скопируйте выданный **HTTP API token** — это секрет; не публикуйте его в чатах и не коммитьте в git.

Если токен утёк: в BotFather используйте `/revoke` для бота и выдайте новый.

## Не публикуйте токен в трекерах и чатах

Задавайте `TELEGRAM_BOT_TOKEN` только в локальном `.env`, в секретах CI/CD или в менеджере секретов на сервере. Если токен попал в тикет, мессенджер или лог — считайте его скомпрометированным: отзовите через BotFather (`/revoke`) и выдайте новый.

## Локальная разработка (dev)

1. Скопируйте пример окружения: `cp .env.example .env`
2. Вставьте токен в `TELEGRAM_BOT_TOKEN=` в файле `.env`.
3. Файл `.env` в `.gitignore` и не попадает в репозиторий.

Проверка: `npm install && npm run dev`

## Staging / production

Принципы:

- **Не хранить** токен в репозитории, в образах Docker в виде слоёв с секретами, в логах CI.
- **Выдавать** токен через секреты окружения хоста или секретный менеджер.

Типичные варианты:

| Среда        | Как задать `TELEGRAM_BOT_TOKEN` |
|-------------|----------------------------------|
| VPS / bare metal | Переменные окружения systemd, `EnvironmentFile` вне репо, или `.env` на сервере с правами `600` |
| Docker      | `docker run -e TELEGRAM_BOT_TOKEN=...` или secrets Docker Swarm / Compose `secrets` |
| Kubernetes  | `Secret` + `env` в Pod, или внешний CSI (Vault, cloud KMS) |
| GitHub Actions | Repository **Secrets** → `secrets.TELEGRAM_BOT_TOKEN` в deploy-job только |

Пример фрагмента для GitHub Actions (deploy-шаг, не логировать значение):

```yaml
env:
  TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
```

Добавьте `TELEGRAM_BOT_TOKEN` в настройках репозитория: **Settings → Secrets and variables → Actions**.

## Vault (HashiCorp Vault и аналоги)

Если используется Vault:

1. Храните токен по пути вроде `kv/quicksave/telegram` (ключ `token` или `TELEGRAM_BOT_TOKEN`).
2. При старте процесса или в CI получайте значение через `vault kv get` / агент sidecar и экспортируйте в `TELEGRAM_BOT_TOKEN`.
3. Политики Vault: минимальные права только для сервисного аккаунта бота.

## Чеклист перед коммитом

- [ ] В репозитории нет файлов `.env` с реальным токеном
- [ ] В истории git нет случайно закоммиченного токена (при утечке — revoke в BotFather)
