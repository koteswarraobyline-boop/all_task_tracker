# Task Tracker

Production project-management application for tracking multi-project development work with admin and client portal views.

## Stack

- **Frontend:** React 19, Vite, MUI 9, Recharts, FullCalendar, PrimeReact
- **Backend:** Node.js, Express 4, Sequelize, MySQL
- **Auth:** JWT (admin), UUID share links (client, read-only)
- **Deploy:** PM2, Apache reverse proxy, API port `5004`
- **Production:** https://tasktracker.legatolxp.online

## Related docs

- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** — UI/UX design reference (screens, workflow, tokens, components)
- Sample CSV: [sample_flexible_modules_tasks.csv](./sample_flexible_modules_tasks.csv)

## Key features

- Phase → Module → Task hierarchy
- Task board (table + Kanban), calendar, Gantt/timeline, dashboard
- Project delivery dates (original / revised / target) with centralized delay intelligence
- **Project Delay Analysis:** delivery health, primary delay driver, contributors, recommendations
- Client portal (read-only) with sanitized API responses
- CSV import, share links, role-based permissions

## Development

```bash
# Backend
cd server
npm install
npm run dev

# Frontend
cd client
npm install
npm run dev

# Tests
cd server && npm test

# Production build
cd client && npm run build
```

## API health

`GET /api/health` — returns `503` when MySQL is unavailable (does not falsely report healthy).

## Delay analysis endpoints

- Admin: `GET /api/projects/:id/delay-analysis`
- Client: `GET /api/client/:token/delay-analysis` (sanitized)
