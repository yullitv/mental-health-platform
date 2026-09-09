# Опора

Платформа психологічної підтримки: сесії зі спеціалістами, зашифрований щоденник, AI-компаньйон і практики самодопомоги. Дипломний проєкт.

## Стек

React + Vite + Tailwind (клієнт), Express + Prisma + PostgreSQL (сервер), Clerk (автентифікація), Google Gemini (AI-функції), Socket.io (чат у реальному часі).

## Локальний запуск

### 1. База даних і сервер

```
cd server
cp .env.example .env   # заповнити реальними значеннями
npm install
npx prisma migrate dev
npm run dev
```

Сервер піднімається на порту з `PORT` (за замовчуванням 5000).

### 2. Клієнт

```
cd client
cp .env.example .env   # заповнити реальними значеннями
npm install
npm run dev
```

Клієнт - на `http://localhost:5173`.

## Змінні середовища

Повний список і опис - у `server/.env.example` та `client/.env.example`. Коротко: `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY`, `GEMINI_API_KEY`, `CLIENT_ORIGIN`, `R2_*` (для сервера); `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` (для клієнта).

## Деплой - що врахувати

- **CORS**: сервер приймає запити лише з origin, перелічених у `CLIENT_ORIGIN` (через кому, якщо кілька). За замовчуванням - лише `http://localhost:5173`. Перед деплоєм додати реальний домен фронтенду.
- **Адреса бекенду на фронтенді**: задається через `VITE_API_BASE_URL` - без цього фронтенд ходитиме на `localhost:5000`, що працює лише локально.
- **Файли**: зберігаються в Cloudflare R2 (S3-сумісне сховище), а не на диску сервера - переживають редеплой на будь-якому хостингу. Фото спеціалістів - публічні (пряме посилання через `R2_PUBLIC_URL`), донат-скріни та документи верифікації - приватні (короткочасні підписані посилання, генеруються на кожен запит). Дивись `R2_*` змінні в `server/.env.example`.
- **Prisma-міграції**: `npx prisma migrate deploy` на проді (не `migrate dev` - той може запропонувати скидання бази при розбіжностях).
- **Rate limiting**: базові ліміти вже є (`server/src/middlewares/rateLimiters.js`) - за потреби підкрутити цифри під реальне навантаження.

## Структура

- `client/src/pages` - сторінки за фічами (Diary, Specialists, Dashboard, Auth тощо)
- `client/src/components` - переюзабельні компоненти (layout, dashboard-віджети)
- `server/src/controllers` + `server/src/routes` - REST API за ресурсами
- `server/prisma/schema.prisma` - модель даних
