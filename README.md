# 🤍 Опора (Opora)

**Opora** ("support" / "pillar" in Ukrainian) is a mental-health platform that connects people with verified psychologists and wraps that around a set of private, end-to-end encrypted self-help tools — usable even without an account.

Sessions aren't paid for directly. Instead, clients donate to a charitable fundraiser of their choice, and the donation stands in for the session fee — an approach shaped by the wartime Ukrainian context the project was built in.

[**Live demo**](https://mental-health-platform-lilac.vercel.app) — the backend is on a free Render instance and spins down after 15 minutes of inactivity, so the first request after a while can take ~30–50s to wake up.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&labelColor=1f1b2c)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white&labelColor=1f1b2c)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white&labelColor=1f1b2c)
![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?logo=socket.io&logoColor=white&labelColor=1f1b2c)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white&labelColor=1f1b2c)

---

## What's inside

### Open to everyone, no account needed
- Browse verified specialists — filter by concern, approach, gender, price
- A dedicated crisis-support screen: a 5-4-3-2-1 grounding technique, a breathing exercise, and hotlines — deliberately not gated behind login, because a person in crisis shouldn't have to register first

### For clients
- Book a session in a specialist's open slot, pay via donation to a fundraiser instead of a direct fee
- Upload donation proof — an AI pass reads the screenshot and flags mismatches for a human to confirm (see [Design principle](#design-principle-ai-suggests-humans-decide) below); where the fundraiser is connected to a real Monobank jar, the donation is cross-checked against the actual bank statement
- A private diary (mood, sleep, notes) — encrypted client-side with the Web Crypto API; the server only ever sees ciphertext
- Self-screening with PHQ-9 / GAD-7
- A guided CBT-style tool for reframing an anxious thought
- An AI companion for a supportive conversation (Google Gemini)
- Breathing exercises picked by emotional state
- A private, encrypted "resource kit" (safety plan) — same client-side encryption as the diary
- In-session chat and video calls (embedded Jitsi Meet — no video infrastructure of our own)
- Leave a review after a completed session

### For specialists
- A public profile: bio, approaches, price, concerns they work with, photo
- Document upload for verification; an AI pass pre-reads the diploma/certificate and leaves notes for the admin — it never approves or rejects on its own
- Manage open availability slots

### For admins
- Review specialist verification requests (with the AI's notes as a starting point)
- Review submitted donations, confirm or reject them

### Platform-wide
- Real-time chat and notifications over Socket.io, scoped so a socket can only join rooms it's actually a participant in
- File storage on Cloudflare R2 (S3-compatible): specialist photos are public URLs, donation proofs and verification documents are private and served through short-lived signed links
- Installable PWA — works like a native app on a phone, no separate mobile build
- Light and dark themes
- Rate limiting, a CORS allowlist, and Helmet security headers on the API

## Design principle: AI suggests, humans decide

The same rule shows up in three unrelated places in this codebase, deliberately: **specialist document verification**, **donation confirmation**, and **crisis-language detection** in the thought-analysis tool all call an AI model — and in every one of them, the model's output is a note or a flag for a person to read, never the final action. An admin still clicks "approve," a specialist or admin still confirms a donation, a flagged conversation still routes to a human. The AI reads faster and more attentively than a tired reviewer might at 1am; it doesn't get the authority to decide.

## Tech stack

**Client** — React 19, Vite, Tailwind CSS, React Router, Clerk (auth), Socket.io client, jsPDF (diary export), `vite-plugin-pwa`

**Server** — Node.js, Express, Prisma ORM over PostgreSQL (adapter-based, works well with serverless/pooled Postgres like Neon), Clerk (backend auth), Google Gemini API, AWS SDK v3 against Cloudflare R2, Socket.io, Helmet, express-rate-limit, Nodemailer

**Hosting** — Render (API) + Vercel (client), both on free tiers; PostgreSQL on Neon; files on Cloudflare R2

## Project structure

```
client/
  src/pages/        — one folder per feature (Diary, Specialists, Dashboard, Crisis, ...)
  src/components/   — shared UI (layout, dashboard widgets)
  src/context/       — auth/user/theme context
  src/utils/         — client-side crypto, PDF export, etc.
server/
  src/controllers/  + src/routes/  — REST API, one pair per resource
  src/middlewares/  — auth, roles, rate limiting
  src/utils/        — R2 client, mailer, Monobank client, Gemini client
  prisma/schema.prisma — data model
```

## Getting started

### 1. Server

```bash
cd server
cp .env.example .env   # fill in real values
npm install
npx prisma migrate dev
npm run dev
```

The server listens on `PORT` (defaults to `5000`).

### 2. Client

```bash
cd client
cp .env.example .env   # fill in real values
npm install
npm run dev
```

The client runs on `http://localhost:5173`.

## Environment variables

Full list and comments live in `server/.env.example` and `client/.env.example`. In short:

| Variable | Where | What it's for |
|---|---|---|
| `DATABASE_URL` | server | PostgreSQL connection string (e.g. Neon), with `?sslmode=require` |
| `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` | server | Clerk auth |
| `GEMINI_API_KEY` | server | AI companion, thought analysis, weekly diary reflection, document/donation screening |
| `EMAIL_USER` / `EMAIL_PASS` | server | outgoing notification email |
| `MONOBANK_JAR_TOKEN` | server | optional — cross-checks donations against a real Monobank jar statement |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | server | Cloudflare R2 file storage |
| `CLIENT_ORIGIN` | server | allowed frontend origin(s) for CORS, comma-separated |
| `VITE_CLERK_PUBLISHABLE_KEY` | client | Clerk auth (public key) |
| `VITE_API_BASE_URL` | client | backend URL — required for anything other than local dev |

## Deployment notes

- **CORS**: the API only accepts requests from origins listed in `CLIENT_ORIGIN`. Add the real frontend domain before deploying.
- **Files**: stored on Cloudflare R2, not on the server's disk — they survive a redeploy on any host. Specialist photos are public (via `R2_PUBLIC_URL`); donation proofs and verification documents are private, served through short-lived signed URLs generated per request.
- **Migrations**: run `npx prisma migrate deploy` in production (not `migrate dev`, which can offer to reset the database on drift).
- **Rate limiting**: sane defaults are already in `server/src/middlewares/rateLimiters.js` — tune the numbers for real traffic if needed.

---

Master's diploma project — Information Systems and Technologies, Kyiv Polytechnic Institute.
