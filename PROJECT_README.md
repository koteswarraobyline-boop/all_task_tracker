# Task Tracker — Project Overview

> Production project-management application for tracking multi-project development work with admin and client portal views.
>
> **Live:** https://tasktracker.legatolxp.online

---

## Table of Contents

1. [Product Purpose](#1-product-purpose)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Core Data Model](#5-core-data-model)
6. [Authentication & Permissions](#6-authentication--permissions)
7. [Frontend — Client](#7-frontend--client)
8. [Backend — Server](#8-backend--server)
9. [API Reference](#9-api-reference)
10. [Key Features](#10-key-features)
11. [Design System](#11-design-system)
12. [Getting Started](#12-getting-started)
13. [Environment Variables](#13-environment-variables)
14. [Deployment](#14-deployment)
15. [Related Docs](#15-related-docs)

---

## 1. Product Purpose

Task Tracker is a delivery-focused project tool for software teams and their clients.

| Audience | Goal |
|---|---|
| **Admin / PM** | Plan work, assign developers, track progress, spot delays, import tasks via CSV, share read-only links |
| **Client** | See delivery health, timelines, and task status — without internal notes or sensitive fields |

Core task hierarchy: **Phase → Module → Task** (no sprint layer).

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, MUI 9, Recharts, FullCalendar, @svar-ui/react-gantt, @dnd-kit |
| Backend | Node.js, Express 4, Sequelize 6, MySQL |
| Auth | JWT (admin), UUID share links (client, read-only) |
| Export | jsPDF, xlsx, pdfkit, papaparse |
| Deploy | PM2, Apache reverse proxy |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                      │
│  Admin Portal (/dashboard, /projects, ...)                   │
│  Client Portal (/client/:token/...)                          │
└────────────────────────┬────────────────────────────────────┘
                          │  HTTPS  (same origin /api in prod)
┌────────────────────────▼────────────────────────────────────┐
│              Express Server  :5004                           │
│  ├── Static: serves client/dist (prod only)                  │
│  ├── /api/auth         JWT login                             │
│  ├── /api/projects     project CRUD + import + export        │
│  ├── /api/tasks        task CRUD                             │
│  ├── /api/developers   developer management                  │
│  ├── /api/dashboard    global + per-project KPIs             │
│  └── /api/client/:tok  sanitized read-only client routes     │
└────────────────────────┬────────────────────────────────────┘
                          │  Sequelize ORM
┌────────────────────────▼────────────────────────────────────┐
│                   MySQL Database                             │
│  projects · tasks · developers · client_access_records       │
│  admin_credentials                                           │
└─────────────────────────────────────────────────────────────┘
```

**Dev mode:** Vite dev server on `:5173` proxies `/api` → Express on `:5004`.
**Prod mode:** Express serves the Vite-built `client/dist` as static files — single deployable Node.js process.

---

## 4. Project Structure

```
task_tarker/
├── client/                     React SPA (Vite)
│   ├── src/
│   │   ├── App.jsx             Root router + theme provider
│   │   ├── theme.js            Design tokens + MUI theme (light/dark)
│   │   ├── components/
│   │   │   ├── TaskBoard/      HierarchicalTaskTable, FilterDropdown, Badges
│   │   │   ├── DeliveryHealth/ DeliveryHealthCard, DelayAnalysisDrawer
│   │   │   ├── ProjectDashboard/ DonutChart, ProjectNavTabs
│   │   │   ├── ProjectGantt/   Gantt chart + scale controls
│   │   │   ├── Calendar/       Month/week/list calendar views
│   │   │   ├── KanbanBoard.jsx DnD Kanban with @dnd-kit
│   │   │   ├── Layout.jsx      Admin sidebar shell
│   │   │   ├── Can.jsx         Permission gate wrapper
│   │   │   └── ProtectedRoute.jsx JWT guard
│   │   ├── context/
│   │   │   ├── RoleContext.jsx  Global role/session state
│   │   │   └── permissions.js  Per-role permission sets
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── ProjectTaskBoard.jsx    ← main workspace
│   │   │   ├── ProjectTaskCalendar.jsx
│   │   │   ├── ProjectTaskTimeline.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UploadProject.jsx       CSV import wizard
│   │   │   ├── ClientShell.jsx         Client portal shell
│   │   │   ├── ClientOverview.jsx
│   │   │   ├── Developers.jsx
│   │   │   ├── DeveloperDetails.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── UserManagement.jsx
│   │   ├── services/
│   │   │   └── api.js          Axios client + all API calls
│   │   └── utils/
│   │       ├── taskManagementConstants.js
│   │       └── taskProgress.js
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── server.js               Entry point
│   └── src/
│       ├── config/
│       │   ├── database.js     Sequelize instance + auto-create DB
│       │   └── loadEnv.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── projectController.js
│       │   ├── taskController.js
│       │   ├── developerController.js
│       │   ├── dashboardController.js
│       │   ├── clientAccessController.js
│       │   └── exportController.js
│       ├── dto/                Response shaping / sanitization
│       ├── middleware/
│       │   └── auth.js         JWT verification (authMiddleware)
│       ├── models/
│       │   ├── index.js        Model associations
│       │   ├── project.js
│       │   ├── task.js
│       │   ├── developer.js
│       │   ├── clientAccessRecord.js
│       │   └── adminCredential.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── projectRoutes.js
│       │   ├── taskRoutes.js
│       │   ├── developerRoutes.js
│       │   ├── dashboardRoutes.js
│       │   └── clientAccessRoutes.js
│       ├── services/           Business logic layer
│       └── utils/
│           ├── seedAdmin.js    Seeds default admin on first run
│           ├── ensureTaskSchema.js    Runtime column guard
│           └── ensureDeveloperSchema.js
│
├── ecosystem.config.cjs        PM2 process config
├── PROJECT.md                  Technical setup docs
├── PROJECT_OVERVIEW.md         Full UI/UX spec
└── sample_flexible_modules_tasks.csv   Example import file
```

---

## 5. Core Data Model

### Hierarchy

```
Project
 └── Phase
      └── Module  (record_type = "module")
           └── Task  (record_type = "task")
```

### Models

**Project**

| Field | Type | Notes |
|---|---|---|
| id | INT PK | Auto-increment |
| name | STRING | Required |
| client_name | STRING | Optional |
| original_delivery_date | STRING | ISO date |
| revised_delivery_date | STRING | ISO date |
| target_delivery_date | STRING | ISO date — used for health calc |
| delivery_notes | TEXT | Free text |

**Task**

| Field | Type | Notes |
|---|---|---|
| id | INT PK | Auto-increment |
| project_id | INT FK | → projects |
| developer_id | INT FK | → developers (nullable) |
| task_id | STRING | Human-readable ID |
| task_name | STRING | Required |
| module | STRING | Container name |
| phase | STRING | Phase name |
| feature | STRING | Optional sub-group |
| status | ENUM | See status table below |
| priority | STRING | P0/P1/P2/P3 or High/Medium/Low |
| start_date | DATEONLY | |
| due_date | DATEONLY | |
| estimated_hours | DECIMAL | |
| actual_hours | DECIMAL | |
| progress_percent | DECIMAL | 0–100 |
| remarks | TEXT | Required for Blocked / On Hold |
| dependencies | STRING | |
| parent_id | STRING | Module nesting |
| record_type | STRING | `task` or `module` |
| tags | STRING | Comma-separated |
| custom_fields | TEXT | JSON blob |

**Task Status Values**

| DB Value | UI Label | Meaning |
|---|---|---|
| Upcoming | Planned | Not started |
| Assigned | Assigned | Owner set |
| In Development | In Development | Active build |
| Testing | Testing | QA / validation |
| Code Review | Testing | Legacy — maps to Testing in UI |
| Completed | Completed | Done |
| Blocked | Blocked | Requires remark |
| On Hold | On Hold | Requires remark |

**Associations**

- `Project` → `Task` (hasMany, CASCADE delete)
- `Developer` → `Task` (hasMany, SET NULL on delete)
- `Project` → `ClientAccessRecord` (hasMany, CASCADE delete)

---

## 6. Authentication & Permissions

### Admin Auth (JWT)

1. `POST /api/auth/login` → bcrypt password compare → signed JWT returned
2. Token stored in `localStorage` as `authToken`
3. `api.js` attaches `Authorization: Bearer <token>` to every request
4. `authMiddleware` on the server verifies the JWT on protected routes
5. On 401, client clears token and redirects to `/login`

Production guards:
- `JWT_SECRET` must be ≥32 chars and not a known dev default — server exits otherwise
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` seeded once on startup via `seedAdmin.js`

### Client Share Links

- UUID token stored in `ClientAccessRecord`; optionally password-protected (`x-share-password` header)
- No JWT — entirely separate unauthenticated route group under `/api/client/:token`
- API responses for client routes are **sanitized server-side** (developer names, remarks, hours, delay scores stripped)

### Role Permissions

| Permission | superadmin | client |
|---|---|---|
| `task.view` | ✅ | ✅ |
| `task.search` | ✅ | ✅ |
| `task.filter` | ✅ | ✅ |
| `task.sort` | ✅ | ✅ |
| `task.edit` | ✅ | — |
| `task.delete` | ✅ | — |
| `task.assign` | ✅ | — |
| `task.status` | ✅ | — |
| `project.create/edit/delete/share` | ✅ | — |
| `developer.manage` | ✅ | — |
| `csv.upload` | ✅ | — |
| `report.export` / `.pdf` | ✅ | — |
| `settings.view` | ✅ | — |
| `users.manage` | ✅ | — |

UI uses `<Can permission="...">` to hide (not just disable) actions the user lacks.

---

## 7. Frontend — Client

### Routing

All pages are lazy-loaded via `React.lazy`. Two top-level trees:

| Route | Page | Auth |
|---|---|---|
| `/login` | `LoginPage` | Public |
| `/client/:token/*` | `ClientShell` | Share token |
| `/dashboard` | `AdminDashboard` | JWT |
| `/projects` | `Projects` | JWT |
| `/projects/upload` | `UploadProject` | JWT |
| `/projects/:id/tasks` | `ProjectTaskBoard` | JWT |
| `/projects/:id/calendar` | `ProjectTaskCalendar` | JWT |
| `/projects/:id/timeline` | `ProjectTaskTimeline` | JWT |
| `/projects/:id/dashboard` | `Dashboard` | JWT |
| `/projects/:id/files` | `ProjectFiles` | JWT |
| `/projects/:id/settings` | `ProjectSettings` | JWT |
| `/developers` | `Developers` | JWT |
| `/developers/:id` | `DeveloperDetails` | JWT |
| `/settings` | `Settings` | JWT |
| `/users` | `UserManagement` | JWT |

### State Management

No Redux / Zustand. Uses component-local state + React Context:

- **`RoleContext`** — global role/session (roles: `superadmin`, `client`). Exposes `hasPermission()`, `logout()`, `setClientSession()`, `refreshAdminSession()`.
- **`permissions.js`** — static permission sets per role.

### API Layer (`services/api.js`)

Single `axios` instance. Base URL: `VITE_API_URL` env var → `window.location.origin + /api` → `http://localhost:5004/api`.

Interceptors:
- **Request:** attaches Bearer token; skips for `/client/` routes (prevents role bleed)
- **Response:** 401 → clears token + redirects to `/login`

### Key Pages

**ProjectTaskBoard** — main workspace:
- Filter panel: Phase, Module, Status (multi-select), Developer, Priority, Overdue
- View toggle: Table (hierarchical Phase→Module→Task tree) | Kanban (DnD columns)
- Inline status + developer edits (permission-gated)
- Task Details drawer on row click
- CSV import, Add Task, Calendar quick-link

**Dashboard** — per-project KPIs:
- Delivery health card + delay analysis drawer
- Status distribution donut chart
- Deadline breakdown (today / tomorrow / week / overdue)

**ProjectTaskTimeline** — Gantt chart:
- Group by: Phase, Module, Milestone, Assignee, Status
- Scale: Day / Week / Month / Quarter
- Drag bars to update dates (admin only)

**ClientShell** — read-only portal:
- Task board + calendar + overview
- No upload, edit, developer, or settings UI

---

## 8. Backend — Server

### Startup Sequence (`server.js`)

1. Bind HTTP port
2. `ensureDatabaseExists()` — creates DB if missing
3. `sequelize.authenticate()` + `sequelize.sync()`
4. `ensureTaskSchema()` / `ensureDeveloperSchema()` — runtime column guards
5. `seedDefaultAdmin()` — idempotent admin seed

If MySQL is unavailable, HTTP stays up and `GET /api/health` returns `503` (no false positives for the reverse proxy).

### Middleware Stack

```
helmet → cors → express.json (2mb) → express.urlencoded
→ express-rate-limit (on auth routes)
→ authMiddleware (on protected routes)
```

### Controllers

| Controller | Responsibility |
|---|---|
| `authController` | Login, me |
| `projectController` | Project CRUD, delivery date, delay analysis |
| `taskController` | Task CRUD, module delete |
| `developerController` | Developer CRUD |
| `dashboardController` | Global + per-project KPI aggregation |
| `clientAccessController` | Share link CRUD, token regeneration, client data (sanitized) |
| `exportController` | CSV / XLSX / PDF export streams |

### Delivery Health Logic

Active delivery date priority: `target_delivery_date → revised_delivery_date → original_delivery_date`.

Health states:

| State | Meaning |
|---|---|
| `ON_TRACK` | Before/at target with acceptable progress |
| `AT_RISK` | Blocked/hold tasks affecting delivery |
| `DUE_SOON` | Within 7 days of target |
| `OVERDUE` | Past active delivery date |
| `COMPLETED` | Project finished |

Delay analysis returns: primary driver, contributing factors, and recommendations.

---

## 9. API Reference

### Health

```
GET /api/health          → { ok, service, database, env, uptime }
```

### Auth

```
POST /api/auth/login     body: { username, password } → { token }
GET  /api/auth/me        → { id, username }
```

### Projects

```
GET    /api/projects
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id
PUT    /api/projects/:id/delivery-date
GET    /api/projects/:id/delay-analysis
GET    /api/projects/:id/export/tasks?format=csv|xlsx|pdf
POST   /api/projects/upload    multipart CSV/XLSX import
```

### Tasks

```
GET    /api/projects/:id/tasks
POST   /api/projects/:id/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
DELETE /api/projects/:id/modules/:moduleKey
```

### Developers

```
GET    /api/developers
GET    /api/developers/:id
POST   /api/developers
PUT    /api/developers/:id
DELETE /api/developers/:id
```

### Dashboard

```
GET /api/dashboard/global
GET /api/dashboard/global/export?format=csv|xlsx|pdf
GET /api/dashboard/:projectId
```

### Client Portal (no JWT)

```
GET  /api/client/:token              project + health (sanitized)
GET  /api/client/:token/tasks        task list (sanitized)
GET  /api/client/:token/delay-analysis

GET    /api/client-access
POST   /api/client-access
PUT    /api/client-access/:id
DELETE /api/client-access/:id
POST   /api/client-access/:id/regenerate
```

---

## 10. Key Features

- **Phase → Module → Task** hierarchy (no sprint layer)
- **Task Board** — hierarchical table + drag-and-drop Kanban
- **Calendar** — month / week / list views (FullCalendar)
- **Gantt / Timeline** — scale: day / week / month / quarter
- **Project Dashboard** — KPIs, delivery health, delay analysis
- **Delivery Health** — ON_TRACK / AT_RISK / DUE_SOON / OVERDUE / COMPLETED with root-cause analysis
- **CSV Import** — flexible format with module/task rows and status aliases
- **Export** — CSV, XLSX, PDF for tasks and global dashboard
- **Client Portal** — read-only share links (optionally password-protected), API-sanitized responses
- **Dark / Light theme** — persisted in `localStorage`
- **Role-based permissions** — `<Can>` component gates UI; server validates independently
- **Admin seeding** — default credentials created on first run

---

## 11. Design System

Tokens defined in `client/src/theme.js`.

### Colors

| Token | Hex | Usage |
|---|---|---|
| Primary | `#4F46E5` | CTAs, active filters, links |
| Success | `#22C55E` | Completed, on track |
| Warning | `#F59E0B` | Due soon, medium priority |
| Danger | `#EF4444` | Overdue, blocked, high |
| Text | `#0F172A` | Headings, body |
| Text secondary | `#64748B` | Subtitles, captions |
| Border | `#E5E7EB` | Cards, inputs |
| Sidebar | `#0B1220` → `#111827` | Gradient nav |

### Shape & Spacing

- 8px grid (MUI spacing)
- Card radius: 16px · Button/input: 10–12px · Badges: full round
- Toolbar control height: 36px · Content max-width: 1600px

### Motion

- Fast transitions: 250ms ease · Sidebar: 300ms ease

---

## 12. Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+

### Development

```bash
# 1. Clone and install
cd server && npm install
cd ../client && npm install

# 2. Configure server env
cp server/.env.example server/.env
# edit: DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET

# 3. Configure client env (optional — Vite proxies /api by default)
cp client/.env.example client/.env

# 4. Start backend  (http://localhost:5004)
cd server && npm run dev

# 5. Start frontend  (http://localhost:5173)
cd client && npm run dev
```

Default admin credentials (seeded on first run):
```
Username: admin
Password: admin123
```
Change these immediately via Settings → User Management.

### Tests

```bash
cd server && npm test
```

---

## 13. Environment Variables

### Server (`server/.env`)

| Variable | Default | Required |
|---|---|---|
| `PORT` | `5004` | |
| `HOST` | `0.0.0.0` | |
| `NODE_ENV` | `development` | |
| `DB_HOST` | `localhost` | ✅ |
| `DB_PORT` | `3306` | |
| `DB_USER` | `root` | ✅ |
| `DB_PASS` | _(empty)_ | ✅ |
| `DB_NAME` | `dev_task_tracker` | ✅ |
| `JWT_SECRET` | _(dev default)_ | ✅ (32+ chars in prod) |
| `ADMIN_USERNAME` | `admin` | |
| `ADMIN_PASSWORD` | `admin123` | |
| `CLIENT_APP_URL` | `http://localhost:5173` | |
| `CORS_ORIGINS` | `http://localhost:5173,...` | ✅ in prod |
| `DB_SYNC_ALTER` | `false` | |
| `JSON_BODY_LIMIT` | `2mb` | |

### Client (`client/.env`)

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | _(same-origin `/api`)_ | Set for separate API host |

---

## 14. Deployment

### PM2 + Apache

```bash
# Build frontend
cd client && npm run build

# Start API with PM2
cd server && npm run pm2:start

# Reload (zero-downtime)
npm run pm2:reload

# Status / logs
npm run pm2:status
npm run pm2:logs
```

PM2 config: `ecosystem.config.cjs`

Apache acts as a reverse proxy in front of Express on `:5004`. Express serves `client/dist` as static files for the SPA.

### Production Checklist

- [ ] Set strong `JWT_SECRET` (≥32 chars, not a dev default)
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGINS` to your domain
- [ ] Change default `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- [ ] Build client: `npm run build` in `client/`
- [ ] Verify `GET /api/health` returns `{ ok: true }`

---

## 15. Related Docs

| Document | Content |
|---|---|
| [PROJECT.md](./PROJECT.md) | Technical setup, stack summary, dev commands |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Full UI/UX spec — screens, workflow, tokens, components |
| [sample_flexible_modules_tasks.csv](./sample_flexible_modules_tasks.csv) | Example CSV import file |

---

*Generated from codebase analysis — covers client, server, auth, data model, and deployment.*
