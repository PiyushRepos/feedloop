# feedloop

Real-time polling platform — create multi-question polls, share a link, and watch responses arrive live.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Tech Stack](#tech-stack)

---

## Features

- **Multi-question polls** — build polls with unlimited questions, each with its own set of options. Questions and options are ordered and rendered consistently across all clients.
- **Draft → Active → Closed → Published workflow** — save polls as drafts before going live. Publish to start collecting. Close manually or let auto-expiry handle it. Results visibility is separately controlled.
- **Anonymous voting** — respondents answer without creating an account, reducing friction and maximising response rates. Identity is never stored when a poll is anonymous.
- **Response limits & expiry** — cap the maximum number of responses or set a hard close date. A server-side cron job checks every minute and auto-closes expired or full polls, broadcasting the status change to all connected clients via Socket.io.
- **Real-time response count** — Socket.io pushes a `response:new` event into a per-poll room every time a response is submitted. The poll view page increments the live counter without a page reload.
- **Configurable stats visibility** — three tiers that control what respondents (and the public) see after voting:
  - `VOTES_ONLY` — option counts and percentages only (default).
  - `BASIC` — adds device type (mobile / tablet / desktop) and country breakdown.
  - `FULL` — adds browser, OS, region, and city breakdown.
- **Geo & device analytics** — IP address is resolved to country/region/city via `geoip-lite` at write time. User-agent is parsed via `ua-parser-js`. Raw IP is never exposed through any API endpoint.
- **Google OAuth + email/password auth** — Google One Tap (FedCM) and credential-based sign-in both supported. JWT access tokens (15 min) with refresh-token rotation (7 day TTL, hashed at rest). Concurrent 401 requests share a single token-refresh call via a queue in the Axios interceptor.
- **Per-option results breakdown** — votes per option shown as animated progress bars on the results page, sorted by vote count. The top option is visually highlighted.
- **Creator dashboard** — lists all polls grouped by status (Live, Drafts, Closed) with response counts, time-ago timestamps, and quick actions (publish, close, delete) without leaving the page.
- **Duplicate response prevention** — authenticated users are constrained to one response per poll at the database level (`@@unique([pollId, respondentId])`). Anonymous polls use IP-based deduplication.

---

## Architecture

```
feedloop/
├── backend/      # Node.js + Express REST API + Socket.io server
└── frontend/     # React 19 + Vite SPA
```

The backend and frontend are independent apps that communicate over HTTP (REST) and WebSocket (Socket.io). They share no code or build pipeline — run them in separate terminals.

```
Browser
  │
  ├── REST (HTTP/JSON) ──▶  Express  ──▶  PostgreSQL (via Prisma)
  │                              │
  └── WebSocket ─────────▶  Socket.io
                                 │
                            (same process, same port)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 11+ (`npm install -g pnpm`)
- PostgreSQL 15+ (local or hosted)

### 1. Clone

```bash
git clone https://github.com/<your-username>/feedloop.git
cd feedloop
```

### 2. Backend

```bash
cd backend
pnpm install
cp .env.example .env          # fill in the required values (see Environment Variables)
pnpm db:migrate               # run Prisma migrations
pnpm dev                      # starts on http://localhost:3000
```

### 3. Frontend

Open a second terminal:

```bash
cd frontend
pnpm install
cp .env.example .env.local    # set VITE_API_URL and VITE_GOOGLE_CLIENT_ID
pnpm dev                      # starts on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173).

---

## Environment Variables

### Backend — `backend/.env`

| Variable                      | Description                                               | Required |
| ----------------------------- | --------------------------------------------------------- | -------- |
| `NODE_ENV`                    | `development` or `production`                             | Yes      |
| `PORT`                        | Port the API server listens on                            | Yes      |
| `CLIENT_URL`                  | Frontend origin for CORS (e.g. `http://localhost:5173`)   | Yes      |
| `DATABASE_URL`                | PostgreSQL connection string                              | Yes      |
| `GOOGLE_CLIENT_ID`            | Google OAuth client ID (same value used in frontend)      | Yes      |
| `JWT_ACCESS_SECRET`           | Secret for signing access tokens — minimum 32 characters  | Yes      |
| `JWT_REFRESH_SECRET`          | Secret for signing refresh tokens — minimum 32 characters | Yes      |
| `JWT_ACCESS_EXPIRES_IN`       | Access token TTL (default: `15m`)                         | No       |
| `JWT_REFRESH_EXPIRES_IN_DAYS` | Refresh token TTL in days (default: `7`)                  | No       |

### Frontend — `frontend/.env.local`

| Variable                | Description                                         | Required |
| ----------------------- | --------------------------------------------------- | -------- |
| `VITE_API_URL`          | Backend base URL (e.g. `http://localhost:3000/api`) | Yes      |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID — must match backend         | Yes      |

---

## Project Structure

### Backend

```
backend/src/
├── app.ts                   # Express app factory (middleware, routes)
├── index.ts                 # HTTP server + Socket.io bootstrap + cron
├── core/
│   ├── config/env.ts        # Zod-validated environment variables
│   ├── constants/           # Shared constants (token TTLs, etc.)
│   ├── cron/                # node-cron jobs (auto-close expired polls)
│   ├── errors/              # AppError class + HTTP error factories
│   ├── middleware/          # Auth guard, rate limiter, error handler
│   ├── utils/               # apiResponse helpers, token utilities
│   └── ws/                  # Socket.io server setup + room management
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.router.ts
│   │   ├── auth.schema.ts   # Zod schemas for all auth endpoints
│   │   └── auth.service.ts  # Business logic: register, login, refresh, Google OAuth
│   ├── poll/
│   │   ├── poll.controller.ts
│   │   ├── poll.router.ts
│   │   ├── poll.schema.ts
│   │   └── poll.service.ts  # Poll CRUD, status transitions, results aggregation
│   ├── response/            # Response submission + deduplication
│   └── analytics/           # Results + analytics endpoints
└── prisma/
    ├── schema.prisma
    └── generated/           # Prisma client (gitignored)
```

### Frontend

```
frontend/src/
├── api/
│   ├── client.ts            # Axios instance with JWT refresh-token queue
│   ├── auth.ts              # Auth API functions + TanStack Query hooks
│   ├── polls.ts             # Poll CRUD API + hooks
│   ├── responses.ts         # Response submission hook
│   └── analytics.ts         # Results + analytics hooks
├── context/
│   └── auth.tsx             # AuthContext — wraps useMe() query, provides useAuth()
├── layouts/
│   └── RootLayout.tsx       # Navbar + <Outlet />
├── components/
│   ├── layout/header.tsx    # Auth-aware Navbar with dropdown
│   └── ui/                  # Base UI component library (button, badge, card, …)
├── pages/
│   ├── Landing.tsx          # Hero + Features + CTA + Footer (Framer Motion)
│   ├── Login.tsx            # Email/password + Google One Tap
│   ├── Register.tsx         # Registration form
│   ├── Dashboard.tsx        # Creator's poll list with manage actions
│   ├── CreatePoll.tsx       # Dynamic poll builder with settings
│   ├── PollView.tsx         # Respondent voting UI + thank-you screen
│   ├── PollResults.tsx      # Vote breakdown + audience analytics
│   └── Explore.tsx          # Public published polls grid
└── router.tsx               # createBrowserRouter route tree
```

---

## Data Model

```
User
 ├── UserProvider[]        (Google, local)
 ├── RefreshToken[]
 ├── Poll[]                (created by)
 └── Response[]            (submitted by)

Poll
 ├── Question[]
 │    └── QuestionOption[]
 └── Response[]
      └── ResponseAnswer[] (one per question, references QuestionOption)
```

**Poll status flow:**

```
DRAFT ──publish──▶ ACTIVE ──close──▶ CLOSED ──publish results──▶ PUBLISHED
         ▲                │
         └── (cron: auto-close on expiresAt or maxResponses reached)
```

**StatsVisibility tiers:**

| Tier         | What respondents see after voting |
| ------------ | --------------------------------- |
| `VOTES_ONLY` | Vote counts + percentages         |
| `BASIC`      | + country, device type            |
| `FULL`       | + browser, OS, region, city       |

---

## API Reference

All endpoints are prefixed with `/api`. All responses follow the shape:

```json
{ "success": true, "message": "...", "data": { ... } }
```

### Auth — `/api/auth`

| Method | Path        | Auth   | Description                                |
| ------ | ----------- | ------ | ------------------------------------------ |
| `POST` | `/register` | —      | Create account with email + password       |
| `POST` | `/login`    | —      | Sign in, receive access + refresh tokens   |
| `POST` | `/google`   | —      | Exchange Google id_token for app tokens    |
| `POST` | `/refresh`  | —      | Rotate refresh token, get new access token |
| `POST` | `/logout`   | Bearer | Revoke refresh token                       |
| `GET`  | `/me`       | Bearer | Return authenticated user profile          |

### Polls — `/api/polls`

| Method   | Path               | Auth   | Description                                         |
| -------- | ------------------ | ------ | --------------------------------------------------- |
| `POST`   | `/`                | Bearer | Create a poll (returns DRAFT)                       |
| `GET`    | `/mine`            | Bearer | List authenticated user's polls                     |
| `GET`    | `/:slug`           | —      | Get poll by slug (public)                           |
| `PATCH`  | `/:id`             | Bearer | Update poll metadata                                |
| `PATCH`  | `/:id/status`      | Bearer | Transition status (`ACTIVE`, `CLOSED`, `PUBLISHED`) |
| `DELETE` | `/:id`             | Bearer | Delete poll and all its data                        |
| `POST`   | `/:slug/responses` | —      | Submit a response                                   |
| `GET`    | `/:slug/results`   | —      | Get vote breakdown (respects statsVisibility)       |
| `GET`    | `/:id/analytics`   | Bearer | Get full analytics including timeline               |

### WebSocket events (Socket.io)

| Event          | Direction       | Payload                    | Description                    |
| -------------- | --------------- | -------------------------- | ------------------------------ |
| `join:poll`    | Client → Server | `{ slug }`                 | Join a poll's Socket.io room   |
| `leave:poll`   | Client → Server | `{ slug }`                 | Leave the room                 |
| `response:new` | Server → Client | `{ slug, totalResponses }` | Broadcast on each new response |
| `poll:status`  | Server → Client | `{ slug, status }`         | Broadcast on status change     |

---

## Tech Stack

### Backend

|            |                                             |
| ---------- | ------------------------------------------- |
| Runtime    | Node.js 20 + TypeScript                     |
| Framework  | Express 5                                   |
| Database   | PostgreSQL 15 via Prisma ORM                |
| Auth       | JWT (jose) + bcryptjs + Google Auth Library |
| Real-time  | Socket.io 4                                 |
| Validation | Zod 4                                       |
| Geo / UA   | geoip-lite + ua-parser-js                   |
| Scheduling | node-cron                                   |
| Logging    | Pino + pino-pretty                          |

### Frontend

|               |                                               |
| ------------- | --------------------------------------------- |
| Framework     | React 19 + TypeScript + Vite                  |
| Routing       | React Router v7                               |
| Server state  | TanStack Query v5                             |
| HTTP client   | Axios (with JWT refresh-token queue)          |
| UI components | Base UI (headless) + class-variance-authority |
| Styling       | Tailwind CSS v4                               |
| Animation     | Framer Motion (motion/react) v12              |
| Auth          | @react-oauth/google (Google One Tap / FedCM)  |
| Validation    | Zod 4                                         |
| Icons         | Lucide React                                  |
| Fonts         | Geist (variable) via @fontsource-variable     |

---

## License

[ISC](LICENSE)
