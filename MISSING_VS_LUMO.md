# What Task Tracker is missing vs Lumo Tracker

This document compares **Task Tracker** (`task_tarker`) with **Lumo Tracker** (`lumo/lumo-tracker`) and lists features Lumo has that Task Tracker does not (or only has in a weaker form).

**Lumo** = single-program delivery plan (phase → … → task) with team/management views.  
**Task Tracker** = multi-project tool with admin + client portal, board/calendar/Gantt, delay analysis.

---

## Quick summary

| Area | Lumo | Task Tracker today | Gap |
|------|------|--------------------|-----|
| Hierarchy depth | 6 levels (`phase` → `stage` → `function` → `module` → `category` → `task`) | 3 levels (Phase → Module → Task) | **Missing deep WBS** |
| Data model | Normalized `nodes` + FKs | Flat `tasks` + string phase/module | **Missing unified node tree** |
| Dependencies | `node_dependencies` table | Free-text `dependencies` string | **Missing proper dependency graph** |
| Comments | `comments` table + Comments hub | Task `remarks` only (no comment system) | **Missing comments hub** |
| Team capacity | `allocation` % on members | Developers (no allocation %) | **Missing allocation** |
| Person lens | Global **View as** filter | Board filter by assignee only | **Missing View as** |
| Edit gate | **View only** + password unlock | Admin edits freely; client is share-link RO | **Missing edit unlock** |
| Roles | Team vs Management passwords | JWT admin + client share token | Different model (see below) |
| Overview | Phase strip + Today + days-to-delivery + past due | Dashboard KPIs + delivery health | **Missing Lumo-style Program Overview** |
| Roadmap | Dependency **sequence columns** | Status Kanban / Gantt | **Missing dependency roadmap** |
| Hierarchy UI | Dedicated Hierarchy tab (1 phase/page) | Hierarchical task table on board | **Partial** (different UX) |
| Review links | `review_links` per node | Not present | **Missing** |
| Suggested work | `suggested` flag on nodes | Not present | **Missing** |

---

## 1. Database / data model gaps

### 1.1 Normalized hierarchy (`nodes`)

**Lumo tables**

| Table | Purpose |
|-------|---------|
| `team_members` | Roster: name, role, **allocation** |
| `nodes` | Every level of the tree (phase / stage / function / module / category / task) |
| `node_dependencies` | Task A depends on Task B (FK links) |
| `comments` | Per-node + **general** comments (`node_id` NULL) |
| `review_links` | Review URLs / credentials attached to a node |

**Task Tracker tables (core)**

| Table | Purpose |
|-------|---------|
| `projects` | Multi-project |
| `tasks` | Flat rows; phase/module as columns; `record_type` for module vs task |
| `developers` | Assignees (no allocation %) |
| `client_access_records` | Client share links |
| `admin_credentials` | JWT admin login |

**Missing in Task Tracker**

- A single **tree table** (`nodes` with `parent_id`) for all hierarchy levels.
- Support for **stage / function / category** (and optional middle levels) between phase and task.
- Row-level CRUD on hierarchy nodes (Lumo updates individual rows; Task Tracker stores structure mostly as fields on `tasks`).

### 1.2 Real dependency links (`node_dependencies`)

| | Lumo | Task Tracker |
|---|------|--------------|
| Storage | Join table `node_id` ↔ `depends_on_id` | `tasks.dependencies` **STRING** |
| UI | `depends:` / `Waiting on:` on cards | Free-text + Gantt arrow parsing |
| Roadmap | Columns by dependency **layer** | No sequence-by-dependency view |

**Missing:** first-class dependency graph (add/remove links, block detection from incomplete deps, sequence roadmap).

### 1.3 Comments system (`comments`)

**Lumo has**

- Comments on any node (phase / category / task).
- **General comments** (no node).
- Resolve / reopen.
- Status-change notes (`status_from` → `status_to`).
- Dedicated **Comments** tab with jump → Hierarchy.

**Task Tracker has**

- `remarks` on a task (required for Blocked / On Hold).
- No `comments` table, no global comments feed, no resolve workflow.

**Missing:** threaded/program comments hub, node-linked comments, general comments, resolve/reopen.

### 1.4 Team allocation

**Lumo:** `team_members.allocation` (0–100%) shown on Team cards.  
**Task Tracker:** `developers` has name, email, role, team, skills, status — **no allocation %**.

**Missing:** capacity / allocation tracking per person.

### 1.5 Review links & suggested tasks

**Lumo**

- `review_links` (label, url, username, password flag, note) on a node.
- `nodes.suggested` flag for suggested work.

**Task Tracker:** neither exists.

---

## 2. Auth & access gaps (vs Lumo’s model)

Lumo is **not** multi-user JWT. It uses shared passwords:

| Role | Behavior |
|------|----------|
| **Team** | Sees owners; can unlock edit with `EDIT_PASSWORD`; **View as** person |
| **Management** | Read-focused; owners hidden; no Team tab; can add general comments |
| **Edit unlock** | Default **View only**; password unlocks editing |

**Task Tracker has instead**

- JWT admin (full edit).
- Client portal via UUID share link (read-only, sanitized).

So Task Tracker is stronger for multi-project admin/client, but **missing Lumo’s patterns**:

1. **View only ↔ Editing** toggle with a separate unlock password.
2. **View as: Everyone / Person** — filters the whole plan (Overview, Hierarchy, Roadmap, Timeline) to one owner.
3. **Team vs Management** presentation (hide assignees from management, different Comments behavior).

---

## 3. UI / view gaps (what you see in Lumo screenshots)

### 3.1 Overview — Program health strip

Lumo Overview includes:

- Horizontal **phase timeline** (Phase 0…N) with per-phase progress bars and date ranges.
- Orange **Today** vertical marker.
- Milestones: **Kick-off** and **Final delivery**.
- KPIs: % closed, in progress, **calendar days to delivery**, **past due** count.
- Phase grid cards → drill into categories/tasks.
- Counts: phases, tasks, done, overall %, categories.

**Task Tracker has:** project dashboard, delivery health / delay analysis, Gantt overview — but **not** this single-program phase strip with Today + days-to-delivery + past-due strip.

**Missing UI:** Program Overview (phase rail + program KPIs).

### 3.2 Hierarchy tab

Lumo Hierarchy:

- Full WBS: **PHASE → CATEGORY → TASK** (and deeper types in DB).
- **One phase per page** with pagination (Phase 2 of 17…).
- Badges: type, progress %, priority, comment count.
- Task cards: owner, priority, status (Done / In Progress / Blocked), description, **`depends:`** pill, comments.

**Task Tracker has:** HierarchicalTaskTable + Kanban on Task Board (Phase → Module → Task).

**Missing / weaker:** dedicated Hierarchy browsing UX, category level, depends pills + comment counts on each node, phase pagination.

### 3.3 Roadmap — dependency sequence (not status Kanban)

Lumo Roadmap:

> Tasks arranged by dependency sequence — each column can only start once the previous column’s tasks are complete.

- Columns = **Sequence step 1…N** (computed from dependency depth).
- Cards show phase/category breadcrumb, owner, priority, status.
- **Waiting on: [task]** when blockers are not Done.

**Task Tracker has:** Kanban by **status**, Gantt with dependency arrows.

**Missing:** dependency-layer Roadmap view + “Waiting on” blocking UX.

### 3.4 Team tab with capacity + View as

Lumo Team:

- Cards with avatar, role, **allocation bar**, task counts.
- Click → member detail; button **View as {name}** filters the whole app.

**Task Tracker has:** Developers list/detail, assignee filters on boards.

**Missing:** allocation UI + global View-as lens from Team.

### 3.5 Timeline (owner-colored bars + allocation overlay)

Lumo Timeline: custom bar chart by phase/owner, zoom (day/week/month), optional allocation display, blocked styling.

**Task Tracker has:** FullCalendar + @svar Gantt (often richer for scheduling).

**Gap is smaller here** — Task Tracker timeline is capable; Lumo’s version is tighter to owner colors + View as.

### 3.6 Comments tab

Covered in §1.3 — **fully missing** as a product surface in Task Tracker.

### 3.7 Top bar controls

Lumo top bar:

- Tabs: Overview | Timeline | Team | Hierarchy | Roadmap | Comments  
- **View as** dropdown  
- **View only / Editing** unlock  
- Log out  

**Task Tracker top/side nav:** multi-project admin shell + client shell — different product shape, but those three Lumo controls are **not** replicated inside a project.

---

## 4. Feature checklist — implement to “catch up” to Lumo

Use this as a backlog. Priority is suggested for delivery-plan parity.

### P0 — Core model (needed for almost everything above)

- [ ] Introduce a **tree/nodes** model (or extend hierarchy beyond Phase → Module → Task) with `parent_id` + `type`.
- [ ] Add **`node_dependencies`** (or equivalent join table); migrate off free-text-only deps (keep text as import helper if needed).
- [ ] Add **`comments`** table (node-linked + general) with resolve/reopen.
- [ ] Add **allocation** on developers/team members.

### P1 — Views Lumo screenshots show

- [ ] **Program Overview**: phase timeline + Today + kick-off/final delivery + days remaining + past due + phase cards.
- [ ] **Hierarchy** page: browse by phase (pagination), show categories, depends + comment counts.
- [ ] **Roadmap**: columns by dependency sequence + “Waiting on”.
- [ ] **Comments** hub with jump-to-node.
- [ ] **View as** person filter applied across Overview / Hierarchy / Roadmap / Timeline.
- [ ] **View only / Edit unlock** (password) for team-style editing.

### P2 — Nice-to-have parity

- [ ] `review_links` on tasks/nodes.
- [ ] `suggested` work items.
- [ ] Management vs Team presentation rules (hide owners, general comments, hide Team tab).
- [ ] Seed/reset script from a structured `seed.json` into normalized tables (Lumo-style).

---

## 5. What Task Tracker already has (do not treat as “missing”)

These exist in Task Tracker and are often **stronger** than Lumo — keep them when adding Lumo features:

- Multi-project management  
- Client portal + share links + sanitized API  
- Rich status workflow (Assigned, In Development, Testing, On Hold, …)  
- Delivery health / delay analysis  
- Calendar views  
- CSV/XLSX/PDF import & export  
- Estimated / actual hours  
- JWT admin + RBAC (`Can`)  
- Dark/light theme  

Lumo is a **single branded program tracker**; Task Tracker is a **multi-project platform**. The gaps above are about bringing Lumo’s **delivery-plan UX and normalized WBS/comments/deps** into Task Tracker — not replacing what you already built.

---

## 6. Side-by-side hierarchy

```
Lumo (normalized nodes)
  Phase
    └── Stage / Function / Module / Category  (flexible middle layers)
          └── Task  (+ dependsOn[], comments[], reviewLinks[])

Task Tracker (today)
  Project
    └── Phase (string / grouping)
          └── Module (record_type = module)
                └── Task (record_type = task)
                      · dependencies = free text
                      · remarks = text (not a comment system)
```

---

## 7. File references (for implementers)

**Lumo**

- Schema: `lumo/lumo-tracker/server/src/db.js`
- Tabs: `client/src/App.jsx`, `Topbar.jsx`
- Views: `pages/Overview.jsx`, `Hierarchy.jsx`, `Roadmap.jsx`, `Team.jsx`, `Comments.jsx`, `Timeline.jsx`
- Phase strip: `components/PhaseTimeline.jsx`
- Auth unlock / View as: `server/src/routes/auth.js`, `context/AppContext.jsx`

**Task Tracker**

- Models: `server/src/models/task.js`, `developer.js`, `project.js`
- Docs: `PROJECT_README.md`, `PROJECT_OVERVIEW.md`
- Board / Gantt: `pages/ProjectTaskBoard.jsx`, `components/ProjectGantt/`

---

*Generated by comparing Task Tracker with Lumo Tracker (screenshots + code). Update this file as gaps are closed.*
