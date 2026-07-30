# Отчёт лидера

Форма ежемесячного отчёта лидеров с кейсами, факторами, премиями/штрафами и выгрузкой XLSX для администратора.

## Запуск

1. Выполните миграцию `supabase/migrations/20260730000000_create_leader_reports.sql` в Supabase SQL Editor.
2. Скопируйте `.env.example` в `.env` и заполните URL и anon key проекта. Поддерживаются как переменные `VITE_SUPABASE_*`, так и существующие `NEXT_PUBLIC_SUPABASE_*`.
3. Установите зависимости и запустите: `npm install && npm run dev`.

Приложение не изменяет существующую таблицу `employees`. Список лидеров читает поля `id` и `name` только у сотрудников, для которых регистрозависимое поле `Position` равно `Leader`.

## GitHub Pages

Публикация выполняется workflow `.github/workflows/deploy-pages.yml`. В настройках репозитория добавьте Actions variable `NEXT_PUBLIC_SUPABASE_URL` и Actions secret `NEXT_PUBLIC_SUPABASE_ANON_KEY`, затем в **Settings → Pages → Build and deployment → Source** выберите **GitHub Actions**. После push в `main` или `codex` приложение собирается с правильным базовым путём `/Leader_report/` и публикуется автоматически.
