# Task Tracker — Project Documentation

**Status:** Application completed and hosted at [https://tasktracker.legatolxp.online](https://tasktracker.legatolxp.online).

Multi-project development task tracker with an **admin workspace** and **client share links**. Admins manage projects, tasks, developers, calendars, and dashboards. Clients open a secret URL and view only the shared project’s tasks (read-only).

---

## Table of contents

1. [Overview](#1-overview)
2. [Tech stack](#2-tech-stack)
3. [Repository structure](#3-repository-structure)
4. [Features](#4-features)
5. [Roles & permissions](#5-roles--permissions)
6. [Local setup](#6-local-setup)
7. [Environment variables](#7-environment-variables)
8. [Running the app](#8-running-the-app)
9. [Frontend routes](#9-frontend-routes)
10. [API reference](#10-api-reference)
11. [Client share links](#11-client-share-links)
12. [Data model](#12-data-model)
13. [Task progress by status](#13-task-progress-by-status)
14. [Hosting / production](#14-hosting--production)
15. [Default credentials](#15-default-credentials)
16. [Sample CSV](#16-sample-csv)
17. [Flexible CSV schema](#17-flexible-csv-schema-module--task)
18. [Quick start checklist](#18-quick-start-checklist)

---

## 1. Overview

| Area | Description |
|------|-------------|
| **Admin** | JWT login → Projects, Developers, Task Board, Calendar, Dashboard, Settings, User Management |
| **Client** | Open `/client/{uuid}` → optional password → Tasks (+ Calendar) for one project only |
| **Data** | MySQL via Sequelize; CSV import (legacy + flexible Module/Task) |
| **UI** | React + MUI; PrimeReact date picker + FullCalendar; light/dark theme |

**Typical ports (local):**

| Service | Port |
|---------|------|
| API | `5004` |
| Vite UI | `5173` |

---

## 2. Tech stack

### Frontend (`client/`)

| Library | Role |
|---------|------|
| React 19 + Vite 8 | App shell / build |
| React Router 7 | Routing |
| MUI 9 + Emotion | UI components & theme |
| Recharts | Dashboard charts |
| FullCalendar 6 | Project task calendar (month / week / day / list) |
| PrimeReact 10 + PrimeIcons | Inline date navigator on calendar page |
| Axios | API client |
| Framer Motion | Motion |
| PapaParse | CSV preview / mapping in upload wizard |

### Backend (`server/`)

| Library | Role |
|---------|------|
| Node.js + Express 4 | HTTP API |
| Sequelize + MySQL2 | ORM / MySQL |
| JWT (`jsonwebtoken`) | Admin auth |
| bcryptjs | Password hashing |
| Multer + csv-parser | CSV upload & parse |
| express-rate-limit | Login & share-token rate limits |
| PM2 (`ecosystem.config.cjs`) | Production process manager |

---

## 3. Repository structure

```text
task_tarker/
├── client/                          # React frontend
│   ├── public/
│   │   └── .htaccess                # SPA fallback + /api proxy (production)
│   ├── src/
│   │   ├── App.jsx                  # Routes
│   │   ├── main.jsx                 # Entry + vendored PrimeReact CSS
│   │   ├── theme.js                 # MUI theme
│   │   ├── index.css                # Global + calendar tweaks
│   │   ├── components/              # Layout, TaskDetailsDrawer, Share, Can, …
│   │   ├── context/                 # RoleContext, permissions
│   │   ├── hooks/                   # useProjectId, usePermission
│   │   ├── pages/                   # Screens (see routes below)
│   │   ├── services/api.js          # Axios API client
│   │   ├── utils/                   # taskProgress, developerDisplay
│   │   └── vendor/                  # Copied PrimeReact / PrimeIcons CSS
│   ├── .env.example
│   ├── .env.production.example
│   └── package.json
├── server/                          # Express API
│   ├── server.js                    # Entry: env, sync, seed, listen, static dist
│   ├── ecosystem.config.cjs         # PM2 (task-tracker-api)
│   ├── src/
│   │   ├── config/                  # loadEnv.js, database.js
│   │   ├── controllers/
│   │   ├── middleware/auth.js
│   │   ├── models/                  # Project, Task, Developer, ClientAccess, Admin
│   │   ├── routes/
│   │   └── utils/                   # csvImport, ensureTaskSchema, seedAdmin
│   ├── uploads/                     # Temporary CSV uploads
│   ├── .env.example
│   ├── .env.production.example
│   └── package.json
├── sample_tasks.csv                 # Legacy flat CSV
├── sample_tasks_grouped.csv         # Legacy grouped CSV
├── sample_flexible_modules_tasks.csv # Recommended Module/Task CSV
└── PROJECT.md                       # This file
```

---

## 4. Features

### Admin

| Feature | Details |
|---------|---------|
| **Projects** | List, delete, share, open Board / Calendar / Dashboard |
| **CSV upload** | Create project or append; column mapping; flexible Module/Task auto-detect; manual edit / retry |
| **Add Task** | Create a single task from the board |
| **Task Board** | Phase tabs + Sprint Planner; module hierarchy; inline status/assignee; search & status filters |
| **Progress bars** | Per-task bar derived from workflow status (and saved `progressPercent`) |
| **Calendar** | Project-wise FullCalendar + PrimeReact jump-to-date; drag/resize to reschedule |
| **Task details** | Drawer: edit name, description, status, assignee, priority, dates, hours, notes |
| **Dashboard** | KPIs, status pie, workload, timeline, effort by module, activity, developer performance |
| **Developers** | CRUD team members for assignment |
| **Share project** | UUID link, optional password; regenerate / disable / delete |
| **Settings / Users** | Workspace settings and user-management screens |
| **Theme** | Light/dark; collapsible sidebar |

### Client (share link)

- No admin login
- Token validated against `ClientAccessRecord`
- Locked to **one** `projectId` from the token
- **Tasks** + **Calendar** (read-only)
- Optional share password via `x-share-password`
- No Dashboard / Developers / Settings admin screens

### Removed / redirected

- **Reports** removed from nav; `/projects/:id/reports` → **Dashboard**

---

## 5. Roles & permissions

Defined in `client/src/context/permissions.js`.

| Role | Access |
|------|--------|
| **superadmin** | Full project / task / developer / CSV / share / settings / users |
| **client** | `task.view`, `task.search`, `task.filter`, `task.sort` (read-only board & calendar) |

UI gates: `<Can permission="…" />` and `usePermission()`.

---

## 6. Local setup

### Prerequisites

- Node.js 18+
- MySQL 8+
- npm

### Database

```sql
CREATE DATABASE IF NOT EXISTS dev_task_tracker;
```

Tables sync on server start (`sequelize.sync`). Extra task columns are ensured by `ensureTaskSchema.js`. Optional full alter: `DB_SYNC_ALTER=true`.

### Install

```bash
cd server && npm install
cd ../client && npm install
```

Copy env templates:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

---

## 7. Environment variables

### Server (`server/.env`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `PORT` | `5004` | API port |
| `HOST` | `0.0.0.0` | Bind address |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASS` | *(password or empty)* | MySQL password |
| `DB_NAME` | `dev_task_tracker` | Database name |
| `JWT_SECRET` | long random string | Sign admin JWTs |
| `ADMIN_USERNAME` | `admin` | Seeded admin |
| `ADMIN_PASSWORD` | `admin123` | Seeded admin password |
| `CLIENT_APP_URL` | `http://localhost:5173` | Base URL for share links |
| `CORS_ORIGINS` | `http://localhost:5173,…` | Allowed browser origins |
| `DB_SYNC_ALTER` | `true` / unset | Optional Sequelize alter sync |
| `CLIENT_DIST_PATH` | *(optional)* | Override path to `client/dist` |

Env is always loaded from `server/.env` next to `package.json` / `server.js` (via `loadEnv.js`), independent of process cwd.

### Client (`client/.env`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:5004/api` | API base (must end with `/api`) |

Production build example: `VITE_API_URL=/api` (same-origin proxy).

---

## 8. Running the app

```bash
# Terminal 1 — API
cd server
npm run dev
# → http://localhost:5004
# → GET /api/health → { "ok": true, ... }

# Terminal 2 — UI
cd client
npm run dev
# → http://localhost:5173
```

| Script | Where | What |
|--------|-------|------|
| `npm run dev` | server | Nodemon API |
| `npm start` | server | Production node |
| `npm run pm2:start` | server | PM2 start |
| `npm run pm2:restart` | server | PM2 restart |
| `npm run pm2:logs` | server | PM2 logs |
| `npm run dev` | client | Vite |
| `npm run build` | client | Production build → `client/dist` (`VITE_API_URL` from `.env.production`) |
| `npm run preview` | client | Preview build |
| `npm run deploy` | root / server | Build client + `pm2 reload` |
| `npm run pm2:start` | root / server | Start `task-tracker-api` |

Vite proxies `/api` → `http://localhost:5004` during local UI development.

---

## 9. Frontend routes

### Public / client

| Path | Screen |
|------|--------|
| `/login` | Admin login |
| `/client/:token` | Validates share → redirects to tasks |
| `/client/:token/tasks` | Client task board (read-only) |
| `/client/:token/calendar` | Client project calendar (read-only) |

### Admin (JWT required)

| Path | Screen |
|------|--------|
| `/projects` | Project list |
| `/projects/upload` | CSV import wizard |
| `/projects/:id/tasks` | Task board / sprint planner |
| `/projects/:id/calendar` | Project calendar |
| `/projects/:id/dashboard` | Project dashboard |
| `/projects/:id/reports` | Redirect → dashboard |
| `/developers` | Developers |
| `/settings` | Settings |
| `/users` | User management |

---

## 10. API reference

Base URL (local): `http://localhost:5004/api`  
Admin routes: `Authorization: Bearer <jwt>`

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Liveness check |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | No | Login → JWT |
| `GET` | `/auth/me` | Yes | Current admin |

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects` | Yes | List + stats (modules excluded from counts) |
| `DELETE` | `/projects/:id` | Yes | Delete project + tasks |
| `POST` | `/projects/upload` | Yes | CSV upload (`file`, `name`, `clientName`, `mapping`, optional `projectId`) |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects/:id/tasks` | Yes | List / filter / paginate (`limit=-1` for all) |
| `POST` | `/projects/:id/tasks` | Yes | Create task |
| `PUT` | `/tasks/:id` | Yes | Update (status auto-syncs `progressPercent` unless sent explicitly) |

### Developers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/developers` | Yes | List |
| `POST` | `/developers` | Yes | Create |
| `PUT` | `/developers/:id` | Yes | Update |
| `DELETE` | `/developers/:id` | Yes | Delete |

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/dashboard/:projectId` | Yes | Aggregated metrics |

### Client share (public token)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/client/:token` | Token (+ optional password) | Validate → project + `clientMeta` |
| `GET` | `/client/:token/tasks` | Token (+ optional password) | Tasks for token’s project |

Password: header `x-share-password` or query `password`.

### Client access (admin CRUD)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/client-access` | Yes | List share records |
| `POST` | `/client-access` | Yes | Create share |
| `PUT` | `/client-access/:id` | Yes | Update status / password / meta |
| `POST` | `/client-access/:id/regenerate` | Yes | New UUID |
| `DELETE` | `/client-access/:id` | Yes | Delete |

---

## 11. Client share links

### Local

```text
http://localhost:5173/client/{uuid}
```

### Hosted

```text
https://YOUR-DOMAIN/client/{uuid}
```

### Flow

1. Admin shares a project → `ClientAccessRecord` with UUID `token` + `projectId`.
2. Share URL = `{CLIENT_APP_URL}/client/{token}`.
3. `ClientShell` calls `GET /api/client/{token}`.
4. Server returns project + `clientMeta` (never trusts a client-supplied project id).
5. Client session shows Tasks / Calendar for that project only.

### Security

- Treat share URLs as secrets.
- Optional bcrypt password on the share.
- Rate limiting on token endpoints.
- Clients cannot call admin APIs without JWT.

---

## 12. Data model

```text
AdminCredential
  └── username, passwordHash, …

Project
  ├── name, clientName, …
  ├── hasMany Task
  └── hasMany ClientAccessRecord

Developer
  └── hasMany Task (nullable assignee)

Task
  ├── projectId, developerId
  ├── taskId, taskName, description
  ├── status, priority, module, feature, phase
  ├── startDate, dueDate
  ├── estimatedHours, actualHours, estDays
  ├── dependencies, remarks
  ├── parentId, recordType (module | task)
  ├── tags, progressPercent, customFields
  └── …

ClientAccessRecord
  ├── token (UUID)
  ├── projectId
  ├── clientName, company, email
  ├── status (active | disabled)
  ├── passwordHash (optional)
  ├── expiresAt (nullable)
  └── lastOpenedAt
```

### Task statuses

`Upcoming` · `Assigned` · `In Development` · `Code Review` · `Testing` · `Completed` · `Blocked` · `On Hold`

---

## 13. Task progress by status

Progress bars on the board, drawer, and calendar follow workflow status. Changing status also updates `progressPercent` on the server (unless an explicit percent is sent).

| Status | Progress |
|--------|----------|
| Upcoming | 0% |
| Assigned | 15% |
| In Development | 40% |
| Code Review | 60% |
| Testing | 80% |
| Completed | 100% |
| Blocked | 25% |
| On Hold | 20% |

Shared helper: `client/src/utils/taskProgress.js`.

### Calendar notes

- Events use **start date → due date** (all-day).
- Tasks with **no dates** appear under **Unscheduled**.
- Admins can drag / resize events to update dates.
- Modules (`recordType === 'module'`) are hidden from calendar events and sprint lists; they group the board hierarchy.

---

## 14. Hosting / production

### Architecture (recommended)

```text
Browser → https://YOUR-DOMAIN
            │
            ├─ static files (client/dist) via Apache/LiteSpeed
            └─ /api/*  ──proxy──►  127.0.0.1:5004  (PM2 → Node)
```

Document root = `client/dist` (includes `.htaccess`). PM2 only runs the API (and can also serve `dist` if you hit `:5004` directly).

### Important

- **Never commit real `.env` files.**
- Host: copy `server/.env.production.example` → `server/.env` and fill DB credentials.
- Prefer **PM2** (`npm run pm2:start` from `server/` or repo root) with `wait_ready`.
- On cPanel, DB names/users are often prefixed (e.g. `legatolx_dev_task_tracker`).
- `VITE_API_URL` is baked in at **build** time — must be `/api` for same-origin hosting (see `client/.env.production`).
- Set `TRUST_PROXY=1` so rate limits see the real client IP behind the proxy.
- Change `JWT_SECRET` and `ADMIN_PASSWORD` before going public.

### First-time host setup

```bash
# 1) API env
cd server
cp .env.production.example .env
nano .env   # DB_*, JWT_SECRET, ADMIN_PASSWORD, CLIENT_APP_URL, CORS_ORIGINS

# 2) Install + PM2
npm install --omit=dev
npm install -g pm2   # once per machine
mkdir -p logs

# 3) Build UI (same-origin /api)
cd ../client
cp .env.production.example .env.production
npm ci
npm run build
# Upload/sync client/dist to the domain document root (includes .htaccess)

# 4) Start API
cd ../server
npm run pm2:start
pm2 save
pm2 startup          # follow the printed command so PM2 survives reboot

# 5) Smoke test
curl -s http://127.0.0.1:5004/api/health
curl -s https://YOUR-DOMAIN/api/health
```

### Updates (code or UI)

```bash
# From repo root or server/
npm run deploy
# = rebuild client/dist + pm2 reload --update-env
```

Or manually: rebuild `client`, sync `dist` to document root, then `npm run pm2:reload`.

### Checklist

1. Configure `server/.env` (`PORT=5004`, `NODE_ENV=production`, DB_*, JWT, admin password, public `CLIENT_APP_URL` / `CORS_ORIGINS`).
2. Start API with PM2; confirm `http://127.0.0.1:5004/api/health` and `https://YOUR-DOMAIN/api/health`.
3. Build client with `VITE_API_URL=/api`; put `client/dist` on the document root.
4. Ensure `.htaccess` proxies `/api` → `127.0.0.1:5004` and SPA fallback to `index.html`.
5. Share links: `https://YOUR-DOMAIN/client/{uuid}` (uses `CLIENT_APP_URL`).

### Env file map

| File | Use |
|------|-----|
| `server/.env.example` | Local API |
| `server/.env.production.example` | Hosted API |
| `client/.env.example` | Local Vite → `:5004/api` |
| `client/.env.production.example` | Hosted build → `/api` |
| `server/ecosystem.config.cjs` | PM2 process `task-tracker-api` |
| `package.json` (root) | `npm run deploy` / `pm2:*` helpers |

---

## 15. Default credentials

Seeded on start (`seedAdmin.js`) from env:

| Field | Default |
|-------|---------|
| Username | `admin` |
| Password | `admin123` |

**Change before any public deployment.**

---

## 16. Sample CSV

| File | Format |
|------|--------|
| `sample_tasks.csv` | Legacy flat tasks |
| `sample_tasks_grouped.csv` | Legacy parent/child module IDs |
| `sample_flexible_modules_tasks.csv` | **Recommended** Module / Task format |

Upload via **Projects → Upload** or **Import CSV** on a project. Flexible format auto-detects when `Record Type` + `ID` exist.

---

## 17. Flexible CSV schema (Module + Task)

One file can mix **modules**, **nested submodules**, **tasks under modules**, and **standalone tasks**.

### Columns

| Column | Required | Notes |
|--------|----------|--------|
| Record Type | Yes | `Module` or `Task` |
| ID | Yes | Unique (`M001`, `T001`, …) |
| Parent ID | No | Parent module/task ID |
| Name | Yes | Title |
| Description | No | Long text |
| Status | No | App statuses or aliases (`Todo`, `In Progress`, `Done`, …) |
| Priority | No | Free text |
| Assignee | No | Developer name/email (auto-created) |
| Start Date / Due Date | No | `YYYY-MM-DD` |
| Estimated Hours / Actual Hours | No | Numbers |
| Progress % | No | 0–100 |
| Tags | No | e.g. `api;auth` |
| Dependencies | No | e.g. `T001` |
| Phase | No | Planning field |

> Leave missing values blank. Use plain text only in CSV cells.

### Hierarchy

- Module, empty Parent ID → root module
- Module with Parent ID → nested submodule
- Task with Parent ID → under that module
- Task, empty Parent ID → standalone

Example: [`sample_flexible_modules_tasks.csv`](sample_flexible_modules_tasks.csv).

Legacy CSVs (no `Record Type`) still work via the upload mapping step.

---

## 18. Quick start checklist

1. MySQL running; `DB_*` set in `server/.env`
2. `cd server && npm install && npm run dev`
3. `cd client && npm install && npm run dev`
4. Open `http://localhost:5173` → login `admin` / `admin123`
5. Upload CSV or create tasks → open **Board**, **Calendar**, **Dashboard**
6. Share project → open `/client/{token}` in a private window

---

## License / notes

Internal documentation for **Task Tracker**. Adjust secrets and `CLIENT_APP_URL` / `VITE_API_URL` per environment (local vs hosted).
