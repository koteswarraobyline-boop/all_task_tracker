# Task Tracker — Project Overview (UI / UX)

Design reference for the Task Tracker application: layout, workflows, components, and interaction patterns. Use this when building screens, reviewing changes, or onboarding designers and developers.

---

## 1. Product purpose

Task Tracker is a **project delivery tool** for software teams and their clients.

| Audience | Goal |
|----------|------|
| **Admin / PM** | Plan work, assign developers, track progress, spot delays, import tasks, share read-only links |
| **Client** | See delivery health, timelines, and task status without internal notes or sensitive fields |

**Core hierarchy:** Phase → Module → Task (no sprint layer).

---

## 2. Information architecture

### Admin navigation

```
Login
├── Dashboard (global)
├── Projects
│   ├── Project list (cards / table)
│   ├── Upload / Import CSV
│   └── Per project
│       ├── Task Board (default) — table + Kanban
│       ├── Dashboard — KPIs + delivery health
│       ├── Timeline / Gantt
│       └── Calendar
├── Developers
├── Settings
└── User Management
```

### Client portal (share link)

```
Client Overview
├── Task Board (read-only)
├── Calendar
└── (No upload, edit, developers, or settings)
```

### Primary routes

| Route | Screen |
|-------|--------|
| `/projects` | Project list |
| `/projects/upload` | CSV import wizard |
| `/projects/:id/tasks` | Task Board |
| `/projects/:id/dashboard` | Project dashboard |
| `/projects/:id/timeline` | Gantt / roadmap |
| `/projects/:id/calendar` | Calendar view |
| `/client/:token` | Client overview |
| `/client/:token/tasks` | Client task board |

---

## 3. Design system

Tokens live in `client/src/theme.js` (`tokens` export).

### Color palette

| Token | Hex | Usage |
|-------|-----|--------|
| Primary | `#4F46E5` | CTAs, active filters, links |
| Primary hover | `#4338CA` | Button hover |
| Success | `#22C55E` | Completed, on track |
| Warning | `#F59E0B` | Due soon, medium priority |
| Danger | `#EF4444` | Overdue, blocked, high priority |
| Text | `#0F172A` | Headings, body |
| Text secondary | `#64748B` | Subtitles, captions |
| Border | `#E5E7EB` | Cards, inputs |
| Background | `#F8FAFC` | Page canvas |
| Card | `#FFFFFF` | Panels, tables |
| Sidebar | `#0B1220` → `#111827` | Admin nav gradient |

### Spacing & shape

- **Grid:** 8px base (MUI spacing)
- **Card radius:** 16px
- **Button / input radius:** 10–12px
- **Pills / badges:** full round (`999px`)
- **Toolbar control height:** 36px (filters, search)
- **Status chip height:** 32px
- **Content max width:** 1600px (wide boards); task board uses full width

### Typography

| Element | Style |
|---------|--------|
| Page title | 1.5–1.75rem, weight 800, letter-spacing −0.03em |
| Section title | 0.95–1rem, weight 750 |
| Body | 0.8125–0.875rem, weight 500–650 |
| Captions / filters | 0.72–0.8125rem, weight 700 |
| Overline labels | uppercase, weight 800, letter-spacing 0.8 |

### Shadows

- **Card:** `0 4px 12px rgba(0,0,0,0.06)`
- **Hover lift:** `0 12px 30px rgba(0,0,0,0.12)`
- **Dialog:** `0 16px 48px rgba(15,23,42,0.14)`

### Motion

- Fast transitions: **250ms ease**
- Sidebar: **300ms ease**
- Hover on cards/chips: slight lift or brightness change

---

## 4. Task workflow (status model)

### Active statuses

| API value | UI label | Meaning |
|-----------|----------|---------|
| Upcoming | Planned | Not started |
| Assigned | Assigned | Owner set, not in dev |
| In Development | In Development | Active build |
| Testing | Testing | QA / validation |
| Completed | Completed | Done |
| Blocked | Blocked | Stopped — requires remark |
| On Hold | On Hold | Paused — requires remark |

**Removed from UI:** Sprint, Code Review (legacy DB value maps to **Testing**).

### Status colors (task board chips)

| Status | Background | Text |
|--------|------------|------|
| Planned | `#F8FAFC` | `#64748B` |
| Assigned | `#EFF6FF` | `#2563EB` |
| In Development | `#EFF6FF` | `#2563EB` |
| Testing | `#FAF5FF` | `#9333EA` |
| Completed | `#ECFDF5` | `#059669` |
| Blocked | `#FEF2F2` | `#DC2626` |
| On Hold | `#FFF7ED` | `#EA580C` |

### Priority badges

P0 / High → red · P1 / Medium → amber · P2 / Low → blue/green

---

## 5. Key screens — UI / UX spec

### 5.1 Task Board (primary workspace)

**Purpose:** Plan, filter, and update tasks in one place.

#### Header row

- **Left:** Title “Task Board” + subtitle
- **Right:** Calendar · Import CSV · Add Task (permission-gated)

#### Filter panel (two rows inside rounded card)

**Row 1 — dimension filters (36px controls, equal height)**

| Control | Type | Behavior |
|---------|------|----------|
| Phase | Multi-select dropdown | Search phases |
| Module | Multi-select dropdown | Search modules |
| Status | Multi-select dropdown | All workflow statuses |
| Developer | Single select | Admin only |
| Priority | Single select | P0–P3 / High–Low |
| Overdue | Single select | Shows only past-due tasks |

**Row 2 — search & meta**

| Control | Behavior |
|---------|----------|
| Search Tasks | Full-text across name, ID, phase, module, dev |
| Clear All | Resets all filters + search |
| Filters badge | Shows active filter count |

#### Overdue filter UX

1. Open **Overdue** → choose **Overdue (N)**.
2. List shows tasks with **due date before today** (includes On Hold / Blocked if past due).
3. Sort: **most days late → least** (phase, module, and task order).
4. Each row shows red **`Xd late`** chip on End Date.
5. Clear via **X** on Overdue, **Clear All**, or re-open dropdown.

#### View row

- **Table | Kanban** toggle (dark pill when selected)
- **Status chips** — click to filter by status (multi-select)
- **Group by: Phase › Module** — hierarchy label (table mode)

#### Table view

- Sticky header, expandable **Phase → Module → Task** tree
- Columns: Task & Module · Task ID · Status · Developer · Start · End · Priority · Progress · Actions
- Inline status & developer edits (permission-gated)
- Row click → **Task Details** drawer
- Pagination at bottom

#### Kanban view

| Column | Statuses |
|--------|----------|
| Backlog | Upcoming, On Hold |
| To Do | Assigned |
| In Progress | In Development, Blocked |
| Testing | Testing (+ legacy Code Review) |
| Completed | Completed |

Drag-and-drop updates status when user has edit permission.

---

### 5.2 Project Dashboard

- Delivery health card (on track / at risk / overdue)
- Delay analysis drawer (primary driver, contributors, recommendations)
- KPI cards: total, completed, in progress, overdue, blocked
- Charts: status distribution, deadlines (today / tomorrow / week / overdue)
- Quick links to Task Board, Timeline, Calendar

---

### 5.3 Timeline / Gantt

- Group by: Epic (phase), Module, Milestone, Assignee, Status
- Scale: Day · Week · Month · Quarter
- Filters: status, priority, assignee, date range
- Drag bars to change dates (admin)
- Milestones as diamonds when start = due

---

### 5.4 Calendar

- Month / week / list views
- Tasks as all-day or ranged events colored by status
- Click event → task drawer

---

### 5.5 Projects list

- Card grid + table toggle
- Filters: search, status, delivery health, date range, sort
- Overdue project highlighting
- Actions: open board, dashboard, calendar, share link, import, delete

---

### 5.6 CSV import

**Recommended format:** `sample_flexible_modules_tasks.csv`

```
Record Type, ID, Parent ID, Name, Description, Status, Priority, Assignee,
Start Date, Due Date, Estimated Hours, Actual Hours, Progress %, Tags,
Dependencies, Phase
```

- **Module** rows define containers; **Task** rows use `Parent ID` to nest.
- No Sprint / Week column.
- Status aliases: Todo → Upcoming, In Progress → In Development, Review → Testing.

---

### 5.7 Client portal

**Shown:** task names, phases, modules, status, dates, progress, delivery health summary.

**Hidden (API-sanitized):** developer names (optional minimal display), remarks, hours, delay scores, edit actions.

**Tone:** calm, status-focused; overdue called out without blame language.

---

## 6. Shared components

| Component | Role |
|-----------|------|
| `TaskBoardToolbar` | Filters, search, view toggle, status chips |
| `FilterDropdown` | Rounded multi/single select with optional search |
| `HierarchicalTaskTable` | Phase/module/task tree table |
| `KanbanBoard` | DnD columns + cards |
| `TaskDetailsDrawer` | Right drawer — view / edit task |
| `DeliveryHealthCard` | Project schedule health summary |
| `DelayAnalysisDrawer` | Root-cause delay breakdown |
| `ProjectHealthBadge` | Compact ON_TRACK / AT_RISK / OVERDUE pill |
| `EmptyState` | Zero-data with optional CTA |
| `PageContainer` | Max-width + padding wrapper |

---

## 7. Interaction principles

1. **Filters persist visually** — active filters use primary tint + bold label + count badge.
2. **One primary action per zone** — e.g. Add Task is text/contained; secondary actions outlined.
3. **Progressive disclosure** — phase/module rows collapse; delay analysis in drawer not inline clutter.
4. **Safe client view** — never rely on CSS alone; sensitive fields stripped server-side.
5. **Remark required** — Blocked and On Hold status changes prompt for reason (shown on timeline).
6. **Legacy data** — old Code Review tasks display as Testing; CSV “review” imports as Testing.

---

## 8. Responsive behavior

| Breakpoint | Adaptation |
|------------|------------|
| xs | Filter rows stack; search full width; table horizontal scroll |
| sm–md | Filter chips wrap; drawer full width |
| lg+ | Task board toolbar: status chips + group-by on one row |
| xl | Projects dashboard uses multi-column grid |

Sidebar collapses to icon rail on narrow admin layouts.

---

## 9. Accessibility targets

- Semantic landmarks (`role="region"` on Kanban)
- Focus visible on toggles and filter buttons
- Color not sole indicator — overdue uses **text chip** “Xd late” plus date
- Drawer traps focus; Escape closes
- Minimum touch target ~36px on filter controls

---

## 10. Delivery health semantics

| Health | Meaning |
|--------|---------|
| ON_TRACK | Before/at target date with acceptable progress |
| AT_RISK | Due soon or blocked/hold affecting delivery |
| DUE_SOON | Within 7 days of target |
| OVERDUE | Past active delivery date |
| COMPLETED | Project finished |

Active delivery date priority: **target → revised → original → fallback**.

---

## 11. Permissions (UI impact)

| Permission | Unlocks |
|------------|---------|
| `task.edit` | Add task, import CSV, inline edits, drawer edit |
| `task.status` | Status dropdown changes |
| `task.assign` | Developer assignment |
| Client role | Read-only board + calendar + overview |

Buttons wrapped in `<Can permission="…">` — hidden, not disabled-only, when lacking access.

---

## 12. File map (design-related)

```
client/src/
├── theme.js                    Design tokens + MUI theme
├── components/
│   ├── TaskBoard/              Board toolbar, table, filters, badges
│   ├── DeliveryHealth/         Health + delay UI
│   ├── KanbanBoard.jsx         Kanban layout
│   ├── ProjectGantt/           Timeline chart
│   └── TaskDetailsDrawer.jsx   Task side panel
├── pages/
│   ├── ProjectTaskBoard.jsx    Main task workspace
│   ├── Dashboard.jsx           Project dashboard
│   ├── Projects.jsx            Project list
│   ├── ClientOverview.jsx      Client home
│   └── UploadProject.jsx       CSV wizard
└── utils/
    ├── taskManagementConstants.js   Status catalog + filters
    └── taskProgress.js              Progress % by status
```

---

## 13. What we intentionally removed

| Feature | Reason |
|---------|--------|
| Sprint / Week | Simplified planning — phase/module only |
| Code Review status | Shortened pipeline; merged into Testing |
| Sprint filter on board | Same as above |

---

## 14. Related docs

- **Technical setup:** [PROJECT.md](./PROJECT.md)
- **Sample CSV:** [sample_flexible_modules_tasks.csv](./sample_flexible_modules_tasks.csv)

---

*Last updated to reflect current Task Board filter layout, overdue sorting, and status workflow.*
