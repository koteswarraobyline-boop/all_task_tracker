# Lumo-inspired features — integration notes

Added to Task Tracker without replacing the existing multi-project architecture.

## What was added

### Backend
- Models: `nodes`, `node_dependencies`, `comments`
- `developers.allocation` (0–100)
- `projects.edit_unlock_password` (optional; else env `EDIT_UNLOCK_PASSWORD` / default `Byline`)
- WBS sync from existing Phase → Module → Task rows (`wbsSyncService`)
- APIs under `/api/projects/:id/…`:
  - `GET /wbs`, `POST /wbs/sync`
  - `POST /edit-unlock`
  - CRUD `/nodes`, dependency add/remove (cycle check)
  - CRUD `/comments`

### Frontend (per project)
- **Overview** `/projects/:id/overview` — phase rail, Today, KPIs, phase cards
- **Hierarchy** — WBS browser, one phase per page
- **Roadmap** — dependency sequence columns + Waiting on
- **Team** — allocation bars + View as
- **Comments** — hub with resolve/reopen
- Global **View as** + **View only / Editing** unlock (JWT RBAC still required)
- Sidebar + project tabs updated; old dashboard kept as **Analytics**

### Preserved
Task board, calendar, Gantt, client portal, CSV/export, delay analysis, hours, theme, JWT.

## Unlock password
Set `EDIT_UNLOCK_PASSWORD` in `server/.env`, or per-project `edit_unlock_password`. Default unlock password: `Byline`.

## First load
Opening Overview syncs WBS if `nodes` is empty. Use **Resync WBS** after big CSV imports.
