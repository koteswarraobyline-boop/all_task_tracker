# DevTask Tracker — Project Documentation

Multi-project development task tracker with an **admin workspace** and **client share links**. Admins manage projects, tasks, developers, and dashboards. Clients open a secret URL and view only the shared project’s tasks (read-only).

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
13. [Hosting / production](#13-hosting--production)
14. [Default credentials](#14-default-credentials)
15. [Sample CSV](#15-sample-csv)

---

## 1. Overview

| Area | Description |
|------|-------------|
| **Admin** | Login with JWT → Projects, Developers, Task Board, Dashboard, Settings, User Management |
| **Client** | Open `/client/{uuid}` → optional password → Tasks for one project only |
| **Data** | MySQL via Sequelize; CSV import for bulk tasks |
| **UI** | React + MUI; responsive layouts; 4px border radius theme |

---

## 2. Tech stack

### Frontend (`client/`)

- React 19 + Vite 8
- React Router 7
- MUI 9 + Emotion
- Recharts (dashboard charts)
- Axios, Framer Motion, PapaParse

### Backend (`server/`)

- Node.js + Express 4
- Sequelize + MySQL2
- JWT auth (`jsonwebtoken`)
- bcryptjs (passwords)
- Multer + csv-parser (CSV upload)
- express-rate-limit (login & share-token)

---

## 3. Repository structure

```text
task_tarker/
├── client/                     # React frontend
│   ├── src/
│   │   ├── App.jsx             # Routes
│   │   ├── theme.js            # MUI theme (4px radius)
│   │   ├── components/         # Layout, TaskDetailsDrawer, Share dialog, etc.
│   │   ├── context/            # RoleContext, permissions
│   │   ├── hooks/              # useProjectId, usePermission
│   │   ├── pages/              # Screens (Projects, Board, Dashboard, ClientShell…)
│   │   ├── services/api.js     # Axios API client
│   │   └── utils/
│   ├── .env                    # VITE_API_URL
│   └── package.json
├── server/                     # Express API
│   ├── server.js               # Entry, sync DB, seed admin
│   ├── src/
│   │   ├── config/database.js
│   │   ├── controllers/
│   │   ├── middleware/auth.js
│   │   ├── models/             # Project, Task, Developer, ClientAccess, Admin
│   │   ├── routes/
│   │   └── utils/seedAdmin.js
│   ├── uploads/                # Temporary CSV uploads
│   ├── .env
│   └── package.json
├── sample_tasks.csv
├── sample_tasks_grouped.csv
└── PROJECT.md                  # This file
```

---

## 4. Features

### Admin

- **Projects** — list, delete, share, open task board or dashboard
- **CSV upload** — create a new project or append tasks to an existing one
- **Add Task** — create a single task on the board
- **Task Board / Sprint Planner** — filter, sort, paginate, edit via drawer
- **Edit Task** — name, description, status, assignee, priority, module, dates, hours, notes
- **Dashboard** — KPIs, status pie, workload bars, progress timeline, effort by module, activity, developer performance
- **Developers** — CRUD team members (used for assignment)
- **Share project** — generate UUID link (optional password); regenerate / disable / delete
- **Settings / User Management** — workspace settings and admin-related screens
- **Theme** — light/dark; collapsible sidebar

### Client (share link)

- No admin login
- Validates token against `ClientAccessRecord`
- Locked to **one** `projectId` from the token (not from URL query)
- **Tasks only** (view / search / filter / sort)
- No Dashboard / Reports in client nav
- Optional share password via header `x-share-password`

### Removed / redirected

- **Reports** page removed from admin nav; `/projects/:id/reports` redirects to **Dashboard**

---

## 5. Roles & permissions

Defined in `client/src/context/permissions.js`.

| Role | Access |
|------|--------|
| **superadmin** | Full project/task/developer/CSV/share/settings/users |
| **client** | `task.view`, `task.search`, `task.filter`, `task.sort` only |

UI gates use `<Can permission="…" />` and `usePermission()`.

---

## 6. Local setup

### Prerequisites

- Node.js 18+ (recommended)
- MySQL 8+ running locally
- npm

### Database

Create DB (or let the server auto-create via `ensureDatabaseExists`):

```sql
CREATE DATABASE IF NOT EXISTS dev_task_tracker;
```

Tables are created/synced on server start (`sequelize.sync`).  
Optional schema alter: set `DB_SYNC_ALTER=true` in server `.env`.

### Install

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

---

## 7. Environment variables

### Server (`server/.env`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `PORT` | `5000` | API port |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASS` | *(empty or password)* | MySQL password |
| `DB_NAME` | `dev_task_tracker` | Database name |
| `JWT_SECRET` | long random string | Sign admin JWTs |
| `ADMIN_USERNAME` | `admin` | Seeded admin user |
| `ADMIN_PASSWORD` | `admin123` | Seeded admin password |
| `CLIENT_APP_URL` | `http://localhost:5174` | Base URL for share links |
| `DB_SYNC_ALTER` | `true` / unset | Optional Sequelize `alter` sync |

### Client (`client/.env`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend API base URL |

---

## 8. Running the app

Open **two terminals**:

```bash
# Terminal 1 — API
cd server
npm run dev
# → http://localhost:5000

# Terminal 2 — UI
cd client
npm run dev
# → http://localhost:5174 (or next free Vite port)
```

| Script | Where | What |
|--------|-------|------|
| `npm run dev` | server | Nodemon API |
| `npm start` | server | Production node |
| `npm run dev` | client | Vite dev server |
| `npm run build` | client | Production build |
| `npm run preview` | client | Preview build |

---

## 9. Frontend routes

### Public / client

| Path | Screen |
|------|--------|
| `/login` | Admin login |
| `/client/:token` | Validates share → redirects to tasks |
| `/client/:token/tasks` | Client task board (read-only) |

### Admin (JWT required)

| Path | Screen |
|------|--------|
| `/projects` | Project list |
| `/projects/upload` | CSV import |
| `/projects/:id/tasks` | Task board |
| `/projects/:id/dashboard` | Project dashboard |
| `/projects/:id/reports` | → redirects to dashboard |
| `/developers` | Developers |
| `/settings` | Settings |
| `/users` | User management |

---

## 10. API reference

Base URL: `http://localhost:5000/api`  
Admin routes need header: `Authorization: Bearer <jwt>`

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | No | Login → JWT |
| `GET` | `/auth/me` | Yes | Current admin |

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects` | Yes | List projects + stats |
| `DELETE` | `/projects/:id` | Yes | Delete project + tasks |
| `POST` | `/projects/upload` | Yes | CSV upload (`multipart`: `file`, body: `name`, `clientName`, `mapping`, optional `projectId`) |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/projects/:id/tasks` | Yes | Paginated/filterable tasks |
| `POST` | `/projects/:id/tasks` | Yes | Create one task |
| `PUT` | `/tasks/:id` | Yes | Update task fields |

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
| `GET` | `/client/:token` | Token (+ optional password) | Validate link → project + `clientMeta` |
| `GET` | `/client/:token/tasks` | Token (+ optional password) | Tasks for token’s project only |

Password (if set): header `x-share-password` or query `password`.

### Client access (admin CRUD)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/client-access` | Yes | List share records |
| `POST` | `/client-access` | Yes | Create share (`projectId`, `clientName`, …) |
| `PUT` | `/client-access/:id` | Yes | Update status / password / meta |
| `POST` | `/client-access/:id/regenerate` | Yes | New UUID token |
| `DELETE` | `/client-access/:id` | Yes | Delete record |

---

## 11. Client share links

### Local example

```text
http://localhost:5174/client/b4e2bacc-e499-4d88-9a0d-acac9a244656
```

### Hosted example

```text
https://YOUR-FRONTEND-DOMAIN/client/{uuid}
```

### Flow

1. Admin shares a project → server creates `ClientAccessRecord` with UUID v4 `token` and `projectId`.
2. Share URL = `{CLIENT_APP_URL}/client/{token}`.
3. Browser opens link → `ClientShell` calls `GET /api/client/{token}`.
4. Server resolves token → returns project + `clientMeta` (never trusts client-supplied project id).
5. App stores client session → shows **Tasks** for that project only.
6. Task loads use `GET /api/client/{token}/tasks`.

### Security notes

- Token is a secret UUID; treat links as credentials.
- Optional bcrypt password on the share record.
- Rate limiting on token endpoints.
- Clients cannot call admin list/update APIs without JWT.
- Disabled links return forbidden; expiry date is not enforced in current logic.

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
  ├── status, priority, module, feature, phase, week
  ├── startDate, dueDate
  ├── estimatedHours, actualHours, estDays
  ├── dependencies, remarks
  └── …

ClientAccessRecord
  ├── token (UUID)
  ├── projectId
  ├── clientName, company, email
  ├── status (active / disabled / …)
  ├── passwordHash (optional)
  ├── expiresAt (nullable; not blocking access currently)
  └── lastOpenedAt
```

### Common task statuses

`Upcoming`, `Assigned`, `In Development`, `Code Review`, `Testing`, `Completed`, `Blocked`, `On Hold`

---

## 13. Hosting / production

### Important

- **Never commit real `.env` files** — use examples only.
- On the host: `cp server/.env.production.example server/.env` and fill DB credentials from cPanel.
- Local: `cp server/.env.example server/.env` and `cp client/.env.example client/.env`.
- Env is loaded from `server/.env` next to `server.js`.
- Prefer `cd server && npm start` (or cPanel Node app → startup file `server.js`).
- On cPanel, `DB_USER` / `DB_NAME` are usually prefixed (e.g. `legatolx_dev_task_tracker`). Use exact names from MySQL Databases.
- Client `VITE_API_URL` is baked in at **build** time. For same-origin hosting use `/api` (see `.env.production.example`).

### Checklist (hosted)

1. **API env on the server**

   ```bash
   cd ~/tasktracker.legatolxp.online/server
   cp .env.production.example .env
   nano .env   # set DB_*, JWT_SECRET, ADMIN_PASSWORD, PORT=5004
   ```

2. **Start API** (must stay running)

   ```bash
   npm install --omit=dev
   npm start
   # or: node server.js
   ```

   Confirm: `https://tasktracker.legatolxp.online/api/health` returns `{"ok":true,...}`.  
   If you get **503** / HTML from LiteSpeed, Node is down or `.htaccess` proxy port ≠ `PORT`.

3. **Build & deploy frontend**

   ```bash
   cd ~/tasktracker.legatolxp.online/client
   cp .env.production.example .env.production
   npm install
   npm run build
   # Point document root at client/dist (includes .htaccess from public/)
   ```

4. **Proxy + SPA** — `client/public/.htaccess` (copied into `dist/` on build) proxies `/api` → `127.0.0.1:5004` and rewrites other routes to `index.html`.

5. Share links: `https://tasktracker.legatolxp.online/client/{uuid}`

### Local vs production env files

| File | Use |
|------|-----|
| `server/.env.example` | Local API template |
| `server/.env.production.example` | Hosted API template |
| `client/.env.example` | Local Vite (`http://localhost:5004/api`) |
| `client/.env.production.example` | Hosted build (`VITE_API_URL=/api`) |

---

## 14. Default credentials

Seeded on server start (`seedAdmin.js`) from env:

| Field | Default |
|-------|---------|
| Username | `admin` |
| Password | `admin123` |

**Change these before any public deployment.**

---

## 15. Sample CSV

Sample files at repo root:

- `sample_tasks.csv`
- `sample_tasks_grouped.csv`

Use **Projects → Upload** (or Import CSV from a project) and map columns to task fields.

---

## Quick start checklist

1. MySQL running; `DB_*` set in `server/.env`
2. `cd server && npm install && npm run dev`
3. `cd client && npm install && npm run dev`
4. Open `http://localhost:5174` → login `admin` / `admin123`
5. Upload CSV or create tasks → open Dashboard
6. Share project → open `/client/{token}` in a private window

---

## License / notes

Internal project documentation for **DevTask Tracker**. Adjust env secrets and `CLIENT_APP_URL` / `VITE_API_URL` for each environment (local vs hosted).
