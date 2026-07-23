# Implementation Plan: RBAC Client Access

## Overview

Implement a two-role RBAC system (Super Admin + Client) on the existing Task Tracker app. Tasks proceed bottom-up: data models → backend auth/token routes → frontend context layer → UI gating → new pages — ending with full wiring. No pages are duplicated; existing components are wrapped with `<Can>` for permission-based rendering.

## Tasks

- [ ] 1. Backend: Add ClientAccessRecord model and associations
  - Create `server/src/models/clientAccessRecord.js` with fields: `id`, `token` (UUID v4, unique), `projectId` (FK), `clientName`, `company`, `email`, `status` (enum: active/disabled), `expiresAt`, `lastOpenedAt`
  - Create `server/src/models/adminCredential.js` with fields: `id`, `username` (unique), `passwordHash`
  - Register both models in `server/src/models/index.js`
  - Add `ClientAccessRecord.belongsTo(Project, { onDelete: 'CASCADE' })` and `Project.hasMany(ClientAccessRecord)` associations in `index.js`
  - Add a database seed/init function that creates a default admin credential (bcrypt-hashed) on first startup if none exists
  - _Requirements: 11.1, 11.2, 11.5, 2.8_

  - [ ]* 1.1 Write property test for token uniqueness (Property 7)
    - **Property 7: Token uniqueness**
    - Generate N ClientAccessRecords via the create service function; assert all token values are distinct
    - **Validates: Requirements 3.1, 11.2**
    - Tag: `Feature: rbac-client-access, Property 7: token uniqueness`

  - [ ]* 1.2 Write property test for cascade deletion (Property 11)
    - **Property 11: Cascade deletion of access records**
    - For any project with one or more associated ClientAccessRecords, deleting the project should remove all records
    - **Validates: Requirements 11.5**
    - Tag: `Feature: rbac-client-access, Property 11: cascade delete`

- [ ] 2. Backend: Auth routes (login + JWT middleware)
  - Install `jsonwebtoken`, `bcryptjs`, `express-rate-limit` packages
  - Create `server/src/middleware/auth.js` — JWT verification middleware that extracts Bearer token, verifies with secret, attaches `req.admin` or returns HTTP 401
  - Create `server/src/controllers/authController.js` with `login` handler: validate body, find admin by username, `bcrypt.compare`, sign and return JWT on success, 401 on failure
  - Create `server/src/routes/authRoutes.js` with `POST /api/auth/login` (rate limited: 10 req/min per IP)
  - Apply `auth` middleware to all write operations in `projectRoutes.js`, `taskRoutes.js`, `developerRoutes.js` (POST, PUT, DELETE only — GET routes remain open)
  - Register `authRoutes` in `server/src/app.js`
  - _Requirements: 2.1–2.8, 10.1–10.3, 10.6_

  - [ ]* 2.1 Write property test for write endpoint authorization (Property 9)
    - **Property 9: Write endpoints require JWT**
    - For each write endpoint (POST/PUT/DELETE on /api/projects, /api/tasks, /api/developers), a request with no Authorization header should return HTTP 401
    - **Validates: Requirements 10.1, 10.2**
    - Tag: `Feature: rbac-client-access, Property 9: write endpoint authorization`

  - [ ]* 2.2 Write property test for rate limiting (Property 12)
    - **Property 12: Login rate limiting**
    - Sending 11 sequential POST /api/auth/login requests from the same IP should return HTTP 429 on the 11th
    - **Validates: Requirements 10.6**
    - Tag: `Feature: rbac-client-access, Property 12: login rate limiting`

- [ ] 3. Backend: Client token public endpoint
  - Create `server/src/controllers/clientAccessController.js` with handlers:
    - `validateToken(req, res)` — `GET /api/client/:token`: validate UUID v4 format (400 if invalid), query DB, check status/expiry, update `lastOpenedAt`, return project + clientMeta without internal IDs
    - `createAccessRecord(req, res)` — `POST /api/client-access` (admin only): generate UUID v4 server-side, create record
    - `listAccessRecords(req, res)` — `GET /api/client-access` (admin only): list all records with project names
    - `updateAccessRecord(req, res)` — `PUT /api/client-access/:id` (admin only): update status/expiresAt
    - `regenerateToken(req, res)` — `POST /api/client-access/:id/regenerate` (admin only): replace token with new UUID
    - `deleteAccessRecord(req, res)` — `DELETE /api/client-access/:id` (admin only)
  - Create `server/src/routes/clientAccessRoutes.js` with rate limiting (60 req/min per IP on GET /api/client/:token)
  - Register routes in `server/src/app.js`
  - _Requirements: 3.1–3.8, 4.4–4.8, 5.6–5.9, 10.3–10.7_

  - [ ]* 3.1 Write property test for token round-trip integrity (Property 4)
    - **Property 4: Token round-trip integrity**
    - For any created ClientAccessRecord, GET /api/client/:token returns 200 with same projectId and clientName
    - **Validates: Requirements 3.1, 11.1, 11.3**
    - Tag: `Feature: rbac-client-access, Property 4: token round-trip`

  - [ ]* 3.2 Write property test for expired link rejection (Property 5)
    - **Property 5: Expired link rejection**
    - For any ClientAccessRecord with expiresAt set to a past date, the endpoint returns HTTP 403 with status: "expired"
    - **Validates: Requirements 3.3, 10.5**
    - Tag: `Feature: rbac-client-access, Property 5: expired link rejection`

  - [ ]* 3.3 Write property test for disabled link rejection (Property 6)
    - **Property 6: Disabled link rejection**
    - For any ClientAccessRecord with status=disabled, the endpoint returns HTTP 403 with status: "disabled"
    - **Validates: Requirements 3.4, 10.5**
    - Tag: `Feature: rbac-client-access, Property 6: disabled link rejection`

  - [ ]* 3.4 Write property test for invalid token format (Property 13)
    - **Property 13: Invalid token format rejected before DB query**
    - For any string that is not a valid UUID v4, GET /api/client/:token returns HTTP 400
    - **Validates: Requirements 10.4**
    - Tag: `Feature: rbac-client-access, Property 13: invalid token format`

  - [ ]* 3.5 Write property test for token regeneration (Property 8)
    - **Property 8: Regeneration invalidates old token**
    - After regenerating a ClientAccessRecord's token, the old token returns 404 and the new token returns 200
    - **Validates: Requirements 4.5**
    - Tag: `Feature: rbac-client-access, Property 8: regeneration invalidates old token`

- [ ] 4. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Frontend: Role Context and permission system
  - Create `client/src/context/permissions.js` — exports `PERMISSIONS` map (two Sets: superadmin, client) as defined in the design
  - Create `client/src/context/RoleContext.jsx` — React Context with `RoleProvider` component:
    - On mount: if path starts with `/client/`, call `GET /api/client/:token`, set `role='client'` + `clientMeta` on success, set error state on 403/404
    - Otherwise: read JWT from `localStorage`; if valid/non-expired set `role='superadmin'`; expose `hasPermission(permission)` using the `PERMISSIONS` map
  - Create `client/src/hooks/usePermission.js` — exports `usePermission(permission)` hook
  - Create `client/src/components/Can.jsx` — `<Can permission="..." fallback={null}>` component
  - Wrap the entire app in `<RoleProvider>` in `client/src/App.jsx`
  - _Requirements: 1.1–1.8_

  - [ ]* 5.1 Write property test for client role lacking destructive permissions (Property 1)
    - **Property 1: Permission set disjointness for destructive actions**
    - For each permission in the destructive set, hasPermission returns false when role=client
    - **Validates: Requirements 1.6, 1.7**
    - Tag: `Feature: rbac-client-access, Property 1: client lacks destructive permissions`

  - [ ]* 5.2 Write property test for client role having read permissions (Property 2)
    - **Property 2: Permission set completeness for client read actions**
    - For each permission in the client read set, hasPermission returns true when role=client
    - **Validates: Requirements 1.7, 8.1–8.5**
    - Tag: `Feature: rbac-client-access, Property 2: client has read permissions`

  - [ ]* 5.3 Write property test for unknown permissions always denied (Property 3)
    - **Property 3: Unknown permission always denied**
    - For any string not in either permission set, hasPermission returns false for both roles
    - Use fast-check `fc.string()` filtered to exclude all known permission strings
    - **Validates: Requirements 1.8**
    - Tag: `Feature: rbac-client-access, Property 3: unknown permissions denied`

  - [ ]* 5.4 Write property test for Can component conditional rendering (Property 10)
    - **Property 10: Can component renders conditionally**
    - For any (role, permission) pair, <Can permission={p}> renders children iff PERMISSIONS[role].has(p)
    - **Validates: Requirements 1.5, 6.1, 6.2**
    - Tag: `Feature: rbac-client-access, Property 10: Can renders conditionally`

- [ ] 6. Frontend: Protected routes and Login page
  - Create `client/src/components/ProtectedRoute.jsx` — reads JWT from `localStorage`, checks expiry, redirects to `/login` if missing/expired
  - Create `client/src/pages/LoginPage.jsx` — MUI form with username + password fields, calls `POST /api/auth/login`, stores JWT in `localStorage`, navigates to `/projects`; displays error message on 401
  - Add `api.login(username, password)` method to `client/src/services/api.js`
  - Wrap all admin `<Route>` entries in `App.jsx` with `<ProtectedRoute>` (all routes except `/login` and `/client/:token`)
  - Add `/login` route and `/users` route to the router in `App.jsx`
  - Add logout handler that clears `localStorage` JWT and navigates to `/login`
  - _Requirements: 2.1–2.7, 6.7_

- [ ] 7. Frontend: ClientShell and error pages
  - Create `client/src/pages/ClientShell.jsx` — mounted at `/client/:token`; on mount fetches token via `api.getClientProject(token)` (new API method); while loading shows full-screen spinner; on error state shows appropriate error page; on success renders role-aware project layout
  - Create `client/src/pages/LinkExpiredPage.jsx` — renders "This shared project has expired." with project icon
  - Create `client/src/pages/LinkDisabledPage.jsx` — renders "This project is no longer shared." with appropriate icon  
  - Create `client/src/pages/LinkNotFoundPage.jsx` — renders "Link not found." with appropriate icon
  - Add `api.getClientProject(token)` method to `client/src/services/api.js`
  - Register `/client/:token/*` route in `App.jsx` pointing to `ClientShell`
  - _Requirements: 3.2–3.5_

- [ ] 8. Frontend: Role-aware Layout (sidebar + navbar)
  - Update `client/src/components/Layout.jsx` to consume `RoleContext`:
    - When `role === 'client'`: render only the active project sub-nav (Task Board, Dashboard, Reports); hide Projects, Developers, Settings, User Management sidebar items; hide notifications icon, user avatar menu, and theme toggle; show top navbar with project name + clientMeta.clientName + clientMeta.company
    - When `role === 'superadmin'`: keep all existing sidebar and navbar elements; add "User Management" link pointing to `/users`
  - _Requirements: 7.1–7.5_

- [ ] 9. Frontend: UI gating with Can component across existing pages
  - Wrap the following in `<Can permission="...">` (renders nothing for client role):
    - `Projects.jsx`: "Upload New Project" button → `<Can permission="csv.upload">`, delete icon on each project card → `<Can permission="project.delete">`
    - `Projects.jsx`: "Share Project" button on each card → `<Can permission="project.share">`
    - `ProjectTaskBoard.jsx`: status change dropdown → `<Can permission="task.status">`, developer assignment → `<Can permission="task.assign">`, all inline edit controls → `<Can permission="task.edit">`
    - `TaskDetailsDrawer.jsx`: wrap all editable `TextField` / `Select` fields in `<Can permission="task.edit">` fallback; when `role === 'client'`, render field values as static `Typography` elements instead
    - `Developers.jsx`: add/edit/delete developer controls → `<Can permission="developer.manage">`
    - `Reports.jsx`: admin-only export/manipulation controls → `<Can permission="report.export">` for CSV; PDF export button visible to client → `<Can permission="report.export.pdf">`
  - _Requirements: 6.1–6.6, 8.6, 9.2–9.3_

- [ ] 10. Frontend: Share Project dialog
  - Create `client/src/components/ShareProjectDialog.jsx`:
    - Props: `{ open, onClose, project }`
    - On open, call `GET /api/client-access?projectId={id}` to fetch existing record if any
    - Render: URL read-only `TextField`, "Generate Secure Link" button (calls `POST /api/client-access`), "Copy Link" `IconButton` (uses Clipboard API with toast confirmation), "Regenerate Link" button (calls `POST /api/client-access/:id/regenerate`), "Disable Link" / "Enable Link" toggle (calls `PUT /api/client-access/:id`), MUI `DatePicker` for expiry date
    - Show generated URL as `window.location.origin + '/client/' + token`
  - Add "Share Project" button to each project card in `Projects.jsx` wrapped in `<Can permission="project.share">`
  - _Requirements: 4.1–4.8_

- [ ] 11. Frontend: User Management page
  - Create `client/src/pages/UserManagement.jsx`:
    - Fetch all ClientAccessRecords via `GET /api/client-access`
    - Render MUI `Table` with columns: Client Name, Company, Project, Created Date, Last Opened, Status, Actions
    - Actions cell: Copy Link `IconButton`, Disable/Enable `IconButton`, Delete `IconButton`, Regenerate `IconButton`
    - "Add Client Link" button opens a `Dialog` form with fields: Client Name, Company, Email, Project (dropdown from `api.getProjects()`), Expiry Date
    - On successful create, show generated URL in a success snackbar and refresh the table
  - Add "User Management" sidebar link in `Layout.jsx` visible only to `superadmin`
  - _Requirements: 5.1–5.10_

- [ ] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Wire everything together in App.jsx
  - Ensure `<RoleProvider>` wraps `<ThemeProvider>` + `<Router>` so RoleContext is available to all routes
  - Verify route structure:
    - `/login` → `<LoginPage>` (no ProtectedRoute)
    - all admin routes → wrapped in `<ProtectedRoute>`
    - `/users` → `<ProtectedRoute><UserManagement /></ProtectedRoute>`
    - `/client/:token` → `<ClientShell>` (no ProtectedRoute — public)
  - Confirm `Layout` is not rendered wrapping `ClientShell` — ClientShell renders its own simplified layout
  - Confirm `Layout` is not rendered for `/login`
  - Verify default redirect from `/` goes to `/projects` when authenticated, `/login` when not
  - _Requirements: 1.2, 1.3, 2.6, 5.1, 6.7_

- [ ] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** (install: `npm install --save-dev fast-check` in `client/`)
- Unit/integration tests use **Vitest** + **@testing-library/react**
- Server-side tests use **Vitest** or **Jest** with **supertest** for HTTP assertions
- All property tests run a minimum of 100 iterations
- Checkpoints at tasks 4, 12, and 14 ensure incremental validation
- `ClientShell` renders its own layout (not the admin `Layout` wrapper) to give clients the stripped-down sidebar
