# Task Tracker — Timeline Page Overview

Full documentation for the **Project Timeline** (Gantt) page.  
This is an existing Task Tracker feature, now connected to the **project-plan top bar** so it sits alongside Overview, Hierarchy, Roadmap, Team, and Comments.

---

## How to open

1. Log in → **Projects** → open a project  
2. Sidebar **Work → Timeline**, or the dark plan top bar → **Timeline**

| Item | Value |
|------|--------|
| **URL** | `/projects/:id/timeline` |
| **Page file** | `client/src/pages/ProjectTaskTimeline.jsx` |
| **Gantt component** | `client/src/components/ProjectGantt/ProjectGantt.jsx` |
| **Scale presets** | `client/src/components/ProjectGantt/ganttScales.js` |
| **Data mapper** | `client/src/utils/ganttMapper.js` |
| **Library** | `@svar-ui/react-gantt` |

**Client portal:** the same timeline can load via shared client token (read-only when the role is `client`).

---

## Purpose

Show a **schedule / delivery roadmap** of project work over time:

- Phases / modules / tasks as bars on a calendar axis  
- Start → due (end) dates  
- Status-colored bars  
- Filters, grouping, zoom, drag-to-reschedule (when permitted)  
- Quick analytics (progress, deadlines, overdue, workload)

It is **not** the dependency Roadmap page (`/roadmap`). Timeline = **dates on a Gantt**. Roadmap = **dependency sequence steps**.

---

## Page layout (top → bottom)

```
Project plan top bar (Overview · Timeline · Team · Hierarchy · Roadmap · Comments)
        ↓
Page title: “Project Timeline”
Subtitle: project name · Roadmap of phases and delivery
View switcher: List | Kanban | Timeline | Calendar   + Refresh
        ↓
Summary KPI cards (8)
        ↓
Analytics panel (4 cards)
        ↓
Filters toolbar (sticky)
        ↓
Gantt chart (main workspace)
        ↓
Task details drawer / assign dialog (as needed)
```

---

## Shared plan controls

Same as other plan pages:

| Control | Behavior |
|---------|----------|
| **Plan tabs** | Jump between Overview / Timeline / Team / Hierarchy / Roadmap / Comments |
| **View as** | Filter plan context to one developer (via workspace context where wired) |
| **View only / Editing** | Unlock gate (password; default `Byline`) |

JWT + RBAC still apply. Clients cannot edit.

---

## View switcher

Toggle group on the page header:

| Mode | Navigates to |
|------|----------------|
| List | Task Board list (`/projects/:id/tasks`) |
| Kanban | Task Board kanban |
| **Timeline** | Current page |
| Calendar | `/projects/:id/calendar` |

---

## Summary KPI cards

Eight compact cards across the top:

| Key | Label | Notes |
|-----|--------|------|
| `total` | Total Tasks | Work tasks (excludes pure module rows where applicable) |
| `completed` | Completed | Status = Completed |
| `inProgress` | In Progress | Pipeline aggregate |
| `development` | In Development | Status = In Development |
| `testing` | Testing | Status = Testing |
| `blocked` | Blocked | Status = Blocked |
| `overdue` | Overdue | Past due and not completed |
| `completionPct` | Completion | Project % complete |

Colors follow the design system (blue primary, green completed, red overdue/blocked).

---

## Analytics panel

Four cards under the KPIs:

1. **Project Progress** — % bar + “completed this week” count  
2. **Upcoming Deadlines** — up to 5 tasks due this week  
3. **Overdue Tasks** — up to 5 overdue names  
4. **Team Workload** — per-developer open / done (top contributors)

---

## Filters toolbar

Sticky filter bar above the Gantt:

| Filter | Description |
|--------|-------------|
| **Search** | Task name / id text search |
| **Status** | All or a status bucket (`STATUS_FILTER_OPTIONS`) |
| **Priority** | High / Medium / Low / Critical |
| **Developer** | Assignee |
| **Date from / to** | Range on start/due |
| **Group by** | Epic / module (or options from Gantt mapper) |
| **Reset** | Clears filters back to defaults |

Active filter count is tracked for UX feedback.

**Default filters:**

```text
statusKey: all
priorities: []
developerId: ''
search: ''
sortBy: dueDate
sortOrder: asc
```

---

## Gantt chart features

Built with **SVAR React Gantt** (`ProjectGantt`).

### Time scales

| Preset | What you see |
|--------|----------------|
| **Day** | Month header + day numbers |
| **Week** | Month header + week numbers (W#) |
| **Month** | Year + month names |
| **Quarter** | Year + Q1–Q4 |

Zoom in / out cycles through related cell widths (`ZOOM_LEVELS`).

### Chart controls

- **Zoom in / Zoom out**  
- **Today** — scroll to current date  
- **Sidebar** — show/hide task name column  
- **Group by** — organize rows (e.g. by epic/module)  
- Bar **tooltips** — id, name, description; block/hold reason when relevant  

### Bar colors (by status)

Typical mapping (see `STATUS_BAR_COLORS` in `ganttMapper.js`):

| Status | Intent |
|--------|--------|
| Completed | Green |
| In Development / In Progress | Primary blue |
| Testing | Blue / info |
| Blocked | Amber / danger treatment |
| Overdue incomplete | Danger red emphasis |
| Not started / Upcoming | Gray |

### Interactions (when `task.edit` permitted)

| Action | Result |
|--------|--------|
| Click bar / row | Opens **Task Details Drawer** |
| Drag bar / resize dates | Calls `api.updateTask` with new start/due |
| Quick complete | Sets Completed + 100% progress |
| Assign | Dialog to pick developer |
| Context / more menu | Edit, open, assign, complete, comments |

Clients and users without edit permission get a **read-only** Gantt.

---

## Data loading

### Admin / internal user

1. Resolve project from `useProjectId()`  
2. `api.getProjects()` → find project  
3. Parallel: project tasks + developers list  
4. Map tasks → Gantt tasks via `buildGanttData`

### Client (share link)

- `api.getClientTasks(token, sharePassword?)`  
- Read-only; no assign / date drag edits  

### Update path

- `api.updateTask(taskId, { startDate, dueDate, … })` after Gantt drag  
- Drawer save refreshes local task list  

---

## Empty & error states

| State | UI |
|-------|-----|
| Loading | Centered spinner |
| Load error | Alert + **Retry** |
| No tasks | EmptyState — prompt to upload/create dated tasks; **Open Board** if editable |

Tasks need **start and/or due dates** to appear meaningfully on the timeline.

---

## Related components

| Component | Path | Role |
|-----------|------|------|
| `ProjectPlanTopbar` | `components/ProjectPlanTopbar.jsx` | Dark plan tabs + View as + unlock |
| `ProjectWorkspaceProvider` | `context/ProjectWorkspaceContext.jsx` | WBS / view-as / unlock for plan chrome |
| `ProjectGantt` | `components/ProjectGantt/ProjectGantt.jsx` | Gantt UI + zoom + context actions |
| `TaskDetailsDrawer` | `components/TaskDetailsDrawer.jsx` | View / edit task side panel |
| `EmptyState` | `components/EmptyState.jsx` | No-data placeholder |
| `PaginationBar` | *(not primary on Timeline)* | Used on other plan pages |

---

## Utilities used

| Utility | Role |
|---------|------|
| `taskManagementConstants.js` | Status filters, priorities, `filterAndSortTasks`, `computeTaskStats`, overdue helpers |
| `ganttMapper.js` | Task → Gantt rows, date conversion, bar colors, group options |
| `developerDisplay.js` | Consistent developer names |
| `usePermission` / `useRole` | Edit gate + client vs admin |

---

## What Timeline is vs other plan pages

| Page | Question it answers |
|------|---------------------|
| **Overview** | How is the program doing overall? |
| **Hierarchy** | What is the WBS tree (Phase → Module → Task)? |
| **Roadmap** | What is the **dependency order** (sequence steps)? |
| **Team** | Who owns work and how allocated are they? |
| **Comments** | What notes / discussions exist on nodes? |
| **Timeline** | **When** does work run on the calendar (Gantt)? |
| **Board** | Status workflow (list / Kanban) |
| **Calendar** | Calendar month/week of dates |
| **Analytics** | Delivery health / delay analysis (`/dashboard`) |

---

## Design system notes

Timeline should stay visually consistent with Overview / Hierarchy / Roadmap / Team:

- Page background `#F6F8FC`  
- Cards white + border `#E2E8F0`  
- Primary accent `#2563EB`  
- Success green / warning amber / danger red only where semantic  
- Dark plan top bar `#111827` with active tab `#2563EB`  

No purple-heavy accents, gradients, or neon colors on new work.

---

## Quick test checklist

- [ ] Open `/projects/:id/timeline` — plan top bar shows **Timeline** active  
- [ ] Summary cards and analytics panel load with task stats  
- [ ] Filters change which bars appear  
- [ ] Day / Week / Month / Quarter (or zoom) changes the scale  
- [ ] Click a bar → Task Details Drawer opens  
- [ ] Drag dates (as editor) → persists via API and refreshes  
- [ ] View switcher → List / Kanban / Calendar navigates correctly  
- [ ] Empty project shows EmptyState  
- [ ] Client share link is read-only  
- [ ] Board / Calendar / Analytics still work independently  

---

## Related docs

- `NEW_PLAN_PAGES.md` — all plan pages index  
- `MISSING_VS_LUMO.md` — Lumo gap analysis  
- `LUMO_INTEGRATION.md` — integration notes  

---

*Timeline overview for Task Tracker — Gantt schedule view inside the project plan.*
