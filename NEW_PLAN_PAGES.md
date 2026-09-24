# Task Tracker — New Plan Pages Overview

Documentation for the **Lumo-inspired project plan pages** added to Task Tracker.  
These screens sit **inside a project** and work alongside existing Board, Calendar, Timeline, and Analytics.

---

## How to open them

1. Log in → **Projects** → open a project  
2. Use the **dark top bar** (tabs) or the **sidebar** under Plan / Work  

| Tab | URL |
|-----|-----|
| Overview | `/projects/:id/overview` |
| Timeline | `/projects/:id/timeline` |
| Team | `/projects/:id/team` |
| Hierarchy | `/projects/:id/hierarchy` |
| Roadmap | `/projects/:id/roadmap` |
| Comments | `/projects/:id/comments` |

**Analytics** (existing dashboard) remains at `/projects/:id/dashboard`.  
**Task Board** remains at `/projects/:id/tasks`.

---

## Shared controls (all plan pages)

### Project plan top bar
Dark bar under the page title:

- **Tabs:** Overview · Timeline · Team · Hierarchy · Roadmap · Comments  
- **View as:** Everyone or a specific developer (filters the plan)  
- **View only / Editing:** unlock with password (default `Byline`, or `EDIT_UNLOCK_PASSWORD` in `server/.env`)

JWT + RBAC still apply. Unlock is an extra edit gate, not a replacement for permissions.

### First load
If the WBS tree is empty, open **Overview** and click **Sync** to materialize Phase → Module → Task into `nodes`.

---

## Page-by-page

### 1. Overview — `/projects/:id/overview`

**File:** `client/src/pages/ProjectProgramOverview.jsx`

**Purpose:** Program health at a glance.

**Includes:**
- Program schedule strip (phases, progress, Today marker, kick-off / delivery)
- KPI strip: Complete %, In progress, Days left, Past due  
- Quick stats: Phases, Tasks, Done, Progress, Modules  
- Phase cards (click → Hierarchy for that phase)  
- Pagination for phase cards  
- Sync + Analytics buttons  

---

### 2. Hierarchy — `/projects/:id/hierarchy`

**File:** `client/src/pages/ProjectHierarchy.jsx`

**Purpose:** Full work breakdown (WBS).

**Includes:**
- One phase per page  
- Nested nodes: phase → module/category → task  
- Type badges, progress, status, owner, depends / Waiting on  
- Expand / collapse  
- Pagination across phases (`?phase=:nodeId`)  

---

### 3. Roadmap — `/projects/:id/roadmap`

**File:** `client/src/pages/ProjectRoadmap.jsx`

**Purpose:** Dependency sequence (not status Kanban).

**Includes:**
- Columns = Sequence step 1, 2, 3…  
- Task cards with owner, priority, status  
- **Waiting on:** when blockers are incomplete  
- Pagination of sequence steps  
- Prev/Next inside a column when it has many tasks  

---

### 4. Team — `/projects/:id/team`

**File:** `client/src/pages/ProjectTeam.jsx`

**Purpose:** Capacity and ownership for this project.

**Includes:**
- Member cards: role, allocation %, task / done / blocked counts  
- **View as** from a card (filters the whole plan)  
- Link to developer profile  
- Pagination of members  

---

### 5. Comments — `/projects/:id/comments`

**File:** `client/src/pages/ProjectComments.jsx`

**Purpose:** Project comment hub.

**Includes:**
- General comments + node-linked comments  
- Resolve / Reopen / Delete (when unlocked + permitted)  
- Breadcrumb location  
- Pagination  
- Jump to Hierarchy  

---

### 6. Timeline (existing + plan bar)

**File:** `client/src/pages/ProjectTaskTimeline.jsx`  
**Full doc:** [`TIMELINE_OVERVIEW.md`](./TIMELINE_OVERVIEW.md)

Existing Gantt/timeline view, with the **plan top bar** added so you can switch Overview / Hierarchy / Roadmap without leaving the plan context.

**Includes:**
- Summary KPI cards + analytics panel (progress, deadlines, overdue, workload)  
- Filters: search, status, priority, developer, date range, group by  
- SVAR Gantt: Day / Week / Month / Quarter scales, zoom, Today  
- Drag dates / assign / complete (when permitted)  
- Task Details Drawer  
- View switcher → List / Kanban / Calendar  

---

## Supporting UI components

| Component | Path | Role |
|-----------|------|------|
| `ProjectPlanTopbar` | `client/src/components/ProjectPlanTopbar.jsx` | Dark tabs + View as + View only |
| `ProgramPhaseTimeline` | `client/src/components/ProgramPhaseTimeline.jsx` | Overview schedule strip |
| `ProjectWorkspaceBar` | `client/src/components/ProjectWorkspaceBar.jsx` | Unlock dialog helpers / ViewAs banner |
| `PaginationBar` | `client/src/components/PaginationBar.jsx` | Shared pagination footer |

---

## Context & hooks

| File | Role |
|------|------|
| `client/src/context/ProjectWorkspaceContext.jsx` | Loads WBS, View as, unlock state |
| `client/src/hooks/useClientPagination.js` | Client-side list pagination |
| `client/src/hooks/useProjectId.js` | Resolves current project id |

---

## Backend (APIs used by these pages)

Base: `/api/projects/:id/…` (JWT required)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/wbs` | Tree, metrics, roadmap layers, team |
| `POST` | `/wbs/sync` | Rebuild nodes from tasks |
| `POST` | `/edit-unlock` | Unlock editing |
| `GET/POST/PUT/DELETE` | `/comments` | Comment hub |
| `POST/PUT/DELETE` | `/nodes` | Hierarchy CRUD |
| `POST/DELETE` | `/nodes/:id/dependencies` | Dependency links |

**Tables:** `nodes`, `node_dependencies`, `comments`  
**Also:** `developers.allocation`, optional `projects.edit_unlock_password`

**Sync service:** `server/src/services/wbsSyncService.js`  
**Tree / metrics:** `server/src/services/wbsTreeService.js`  
**Controller:** `server/src/controllers/wbsController.js`

---

## What was preserved

These existing features were **not** replaced:

- Multi-project management  
- Task Board (table + Kanban)  
- Calendar  
- Gantt Timeline  
- Delivery health / delay analysis (Analytics)  
- Client portal + share links  
- CSV / XLSX / PDF import & export  
- Estimated / actual hours  
- Dark / light theme  
- JWT + RBAC  

---

## Quick test checklist

- [ ] Open a project → Overview loads and shows Sync  
- [ ] Click Sync → phases/tasks appear  
- [ ] Top bar switches Overview / Hierarchy / Roadmap / Team / Comments  
- [ ] View as filters tasks to one person  
- [ ] View only → unlock with `Byline` → Editing  
- [ ] Hierarchy paginates phases  
- [ ] Roadmap shows Waiting on when deps are incomplete  
- [ ] Comments add / resolve / paginate  
- [ ] Board / Calendar / Analytics still work  

---

## Related docs

- `TIMELINE_OVERVIEW.md` — full Timeline / Gantt page overview  
- `MISSING_VS_LUMO.md` — gap analysis vs Lumo  
- `LUMO_INTEGRATION.md` — integration notes  

---

*Generated for the Lumo-inspired plan pages in Task Tracker.*
