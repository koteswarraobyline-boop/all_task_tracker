# Requirements Document

## Introduction

This document defines the requirements for the Role-Based Access Control (RBAC) system for the Task Tracker SaaS dashboard. The system introduces two roles — Super Admin and Client — without duplicating any existing pages. The Super Admin retains full existing functionality and gains user/link management capabilities. Clients access projects through UUID-based shareable links with no login required, and see a read-only view of the same components the admin uses. The implementation targets the existing React + Vite + MUI frontend (`client/`) and the Node.js/Express + Sequelize backend (`server/`).

## Glossary

- **Super_Admin**: The authenticated administrator role with full read/write access to all system features.
- **Client**: A read-only viewer who accesses a project via a shareable UUID token link, with no login required.
- **Share_Link**: A URL containing a UUID token that grants a Client read-only access to a specific project. Example: `/client/:token`.
- **Token**: A UUID v4 string stored in the database that uniquely identifies a Share_Link.
- **Role_Context**: A React Context that holds the current viewer's role (`superadmin` | `client`) and associated metadata.
- **Permission**: A named capability string (e.g., `task.edit`, `project.delete`) that controls whether a UI element is rendered or an API action is permitted.
- **Can_Component**: A React wrapper component `<Can permission="...">` that renders its children only when the current role holds the given permission.
- **Client_Access_Record**: A database record linking a Token to a Project, with metadata: client name, company, email, expiry date, status (active/disabled), and link activity timestamps.
- **Permission_Hook**: A React hook (`usePermission`) that returns a boolean indicating whether the current role holds a given permission.
- **Protected_Route**: A React Router route that redirects or blocks access based on the current role.
- **User_Management_Page**: An admin-only page for creating, viewing, and managing Client_Access_Records.
- **Share_Project_Dialog**: A dialog opened from a project card/page for generating and managing the Share_Link for that project.
- **Expired_Link**: A Share_Link whose expiry date is in the past.
- **Disabled_Link**: A Share_Link whose status has been set to `disabled` by the Super_Admin.

---

## Requirements

### Requirement 1: Role Context and Permission System

**User Story:** As a developer integrating this system, I want a centralized role context and permission layer, so that all UI components and routes can consistently check the current viewer's access level without duplicating logic.

#### Acceptance Criteria

1. THE Role_Context SHALL expose the current viewer's role (`superadmin` or `client`), a permission-check function, and — when the role is `client` — the associated Client_Access_Record metadata (client name, company, project ID).
2. WHEN the application mounts on any route other than `/client/:token`, THE Role_Context SHALL default to role `superadmin`.
3. WHEN the application mounts on a `/client/:token` route, THE Role_Context SHALL resolve the token before rendering child routes and set role to `client` if the token is valid.
4. THE Permission_Hook `usePermission(permission: string)` SHALL return `true` if the current role holds the given permission and `false` otherwise.
5. THE Can_Component `<Can permission="...">` SHALL render its children only when `usePermission` returns `true` for the given permission string, and render nothing otherwise.
6. THE Role_Context SHALL define the following permission set for `superadmin`: `project.create`, `project.delete`, `project.share`, `task.edit`, `task.delete`, `task.assign`, `task.status`, `developer.manage`, `csv.upload`, `report.export`, `settings.view`, `users.manage`.
7. THE Role_Context SHALL define the following permission set for `client`: `report.export.pdf`, `task.view`, `task.search`, `task.filter`, `task.sort`.
8. IF a permission string not in the defined set is checked, THEN THE Permission_Hook SHALL return `false`.

---

### Requirement 2: Super Admin Authentication

**User Story:** As a Super Admin, I want to log in with a username and password, so that I can securely access the full administrative dashboard.

#### Acceptance Criteria

1. THE System SHALL provide a `/login` route that renders a login form with username and password fields.
2. WHEN a Super Admin submits valid credentials, THE System SHALL issue a signed JWT stored in `localStorage` and redirect to `/projects`.
3. WHEN a Super Admin submits invalid credentials, THE System SHALL display an error message and not issue a token.
4. WHILE a valid JWT is present in `localStorage`, THE System SHALL treat the viewer as `superadmin` on all non-client routes.
5. WHEN a Super Admin logs out, THE System SHALL remove the JWT from `localStorage` and redirect to `/login`.
6. IF a non-client route is accessed without a valid JWT, THEN THE System SHALL redirect the viewer to `/login`.
7. THE Server SHALL validate the JWT on all non-public API endpoints and return HTTP 401 if the token is missing or invalid.
8. THE Server SHALL store admin credentials as a bcrypt-hashed password and reject plaintext comparisons.

---

### Requirement 3: Client Shareable Link Access

**User Story:** As a Super Admin, I want to generate secure shareable links for clients, so that clients can view project data without needing a login account.

#### Acceptance Criteria

1. THE System SHALL generate Share_Links using UUID v4 tokens that do not expose internal database IDs.
2. WHEN a client opens a valid Share_Link (`/client/:token`), THE System SHALL display the project in read-only mode without requiring any login.
3. WHEN a client opens an Expired_Link, THE System SHALL display the message "This shared project has expired." and render no project data.
4. WHEN a client opens a Disabled_Link, THE System SHALL display the message "This project is no longer shared." and render no project data.
5. WHEN a client opens a `/client/:token` route with a token that does not exist in the database, THE System SHALL display a "Link not found." error message.
6. THE Server SHALL expose a public endpoint `GET /api/client/:token` that returns project data and Client_Access_Record metadata without requiring JWT authentication.
7. THE `GET /api/client/:token` endpoint SHALL NOT return internal database IDs or admin-only fields in its response.
8. WHILE a client is viewing a shared project, THE System SHALL record the last-opened timestamp on the Client_Access_Record.

---

### Requirement 4: Share Project Dialog

**User Story:** As a Super Admin, I want a "Share Project" dialog on every project card and project page, so that I can generate, copy, regenerate, and revoke client access links in one place.

#### Acceptance Criteria

1. WHEN viewing a project card on the Projects page, THE System SHALL display a "Share Project" button visible only to `superadmin`.
2. WHEN the Super_Admin clicks "Share Project", THE System SHALL open the Share_Project_Dialog for that project.
3. THE Share_Project_Dialog SHALL contain: a "Generate Secure Link" button, a read-only URL display field, a "Copy Link" button, a "Regenerate Link" button, a "Disable Link" button, an expiry date picker, and a read-only toggle.
4. WHEN the Super_Admin clicks "Generate Secure Link" for a project that has no active token, THE System SHALL create a new Client_Access_Record with a new UUID token and display the full shareable URL.
5. WHEN the Super_Admin clicks "Regenerate Link", THE System SHALL invalidate the existing token and create a new UUID token for the same Client_Access_Record, and update the URL display.
6. WHEN the Super_Admin clicks "Disable Link", THE System SHALL set the Client_Access_Record status to `disabled` and update the button state to indicate the link is disabled.
7. WHEN the Super_Admin clicks "Copy Link", THE System SHALL copy the displayed URL to the clipboard and show a confirmation snackbar.
8. WHEN the Super_Admin sets an expiry date in the dialog, THE System SHALL persist the expiry date on the Client_Access_Record.

---

### Requirement 5: User Management Page

**User Story:** As a Super Admin, I want a User Management page to oversee all client access links, so that I can audit and manage client access across all projects from a single location.

#### Acceptance Criteria

1. THE System SHALL provide a `/users` route accessible only to `superadmin` that renders the User_Management_Page.
2. IF a `client` role attempts to navigate to `/users`, THEN THE System SHALL redirect to the client's project view.
3. THE User_Management_Page SHALL display a table with columns: Client Name, Company, Project, Created Date, Last Opened, Status, and an Actions column.
4. THE Actions column SHALL contain buttons: Copy Link, Disable/Enable, Delete, and Regenerate Link.
5. THE User_Management_Page SHALL include a form or dialog to create a new Client_Access_Record with fields: Client Name, Company, Email, Project (dropdown of existing projects), and Expiry Date.
6. WHEN the Super_Admin creates a new Client_Access_Record, THE System SHALL generate a UUID token, persist the record, and display the new share URL.
7. WHEN the Super_Admin clicks "Delete" on a Client_Access_Record, THE System SHALL permanently remove the record and its associated token.
8. WHEN the Super_Admin clicks "Disable" on an active Client_Access_Record, THE System SHALL set its status to `disabled` and update the table row immediately.
9. WHEN the Super_Admin clicks "Enable" on a disabled Client_Access_Record, THE System SHALL set its status to `active` and update the table row immediately.
10. THE User_Management_Page table SHALL display whether each Share_Link is active, disabled, or expired.

---

### Requirement 6: Admin-Only UI Gating

**User Story:** As a system architect, I want all destructive and write actions to be hidden from clients using the Can_Component, so that the same page components serve both roles without duplicate implementations.

#### Acceptance Criteria

1. WHILE the role is `client`, THE System SHALL hide: all delete buttons, all edit buttons, all upload buttons, all "Add" floating action buttons, all context menus with write actions, the TaskDetailsDrawer edit fields (Status, Developer, Actual Hours, Phase, Week, Est. Days, Dependencies, Remarks), the CSV upload button and UploadProject page, the Settings sidebar link, the Developers sidebar link, the User Management sidebar link.
2. WHILE the role is `superadmin`, THE System SHALL render all of the above elements without restriction.
3. THE Can_Component SHALL gate each restricted UI element individually without removing the read-only display of the same data.
4. WHILE the role is `client`, THE TaskDetailsDrawer SHALL open in read-only mode, displaying all task fields as static text instead of editable inputs.
5. WHILE the role is `client`, THE System SHALL hide the "Upload New Project" button on the Projects page.
6. WHILE the role is `client`, THE System SHALL hide the delete icon on each project card.
7. WHEN a `client` directly navigates to `/projects/upload` or `/settings` or `/developers`, THE System SHALL redirect to the client's project task board.

---

### Requirement 7: Client Sidebar and Navigation

**User Story:** As a Client viewing a shared project, I want a simplified sidebar showing only the views relevant to me, so that I am not exposed to admin-only navigation items.

#### Acceptance Criteria

1. WHILE the role is `client`, THE Layout_Component SHALL render the sidebar with only: Task Board, Dashboard, and Reports navigation items for the active project.
2. WHILE the role is `client`, THE Layout_Component SHALL hide sidebar items: Projects list, Developers, Settings, and User Management.
3. WHILE the role is `client`, THE Layout_Component top navbar SHALL display the project name, client name, and company name instead of the admin workspace breadcrumb.
4. WHILE the role is `client`, THE Layout_Component SHALL hide the notifications icon, the user profile avatar menu, and the theme toggle icon.
5. WHILE the role is `client`, THE Layout_Component SHALL hide the global search bar or render it as a task-scoped search only.

---

### Requirement 8: Client Task Viewing

**User Story:** As a Client, I want to view, search, filter, and sort tasks within the shared project, so that I can track the project status without needing admin access.

#### Acceptance Criteria

1. WHILE the role is `client`, THE ProjectTaskBoard SHALL render all tasks as read-only rows.
2. WHILE the role is `client` and a task row is clicked, THE System SHALL open the TaskDetailsDrawer in read-only mode.
3. WHILE the role is `client`, THE ProjectTaskBoard SHALL support task search by task name or ID.
4. WHILE the role is `client`, THE ProjectTaskBoard SHALL support filtering tasks by status, priority, and module.
5. WHILE the role is `client`, THE ProjectTaskBoard SHALL support sorting tasks by any visible column.
6. WHILE the role is `client`, THE System SHALL hide the status change dropdown, developer assignment dropdown, and all inline edit controls within the task board.

---

### Requirement 9: Report Export for Clients

**User Story:** As a Client, I want to export or print the project report, so that I can share project status with my own stakeholders.

#### Acceptance Criteria

1. WHILE the role is `client`, THE Reports page SHALL be accessible at the client's project report route.
2. WHERE the PDF export feature is enabled, THE System SHALL allow clients to trigger a PDF export of the current report view.
3. WHILE the role is `client`, THE Reports page SHALL hide any admin-only data manipulation controls.
4. WHILE the role is `client`, THE System SHALL allow the browser print dialog to be triggered from the Reports page.

---

### Requirement 10: Backend API Security

**User Story:** As a system architect, I want all write-capable API endpoints to be protected by JWT authentication, so that clients cannot bypass the UI to mutate data.

#### Acceptance Criteria

1. THE Server SHALL apply JWT middleware to all endpoints under `/api/projects`, `/api/tasks`, `/api/developers`, and `/api/dashboard` that perform create, update, or delete operations.
2. IF a request to a write endpoint is received without a valid JWT, THEN THE Server SHALL return HTTP 401 with a `{"error": "Unauthorized"}` body.
3. THE Server SHALL NOT apply JWT middleware to `GET /api/client/:token` and `POST /api/auth/login`.
4. THE Server SHALL validate that the token passed to `GET /api/client/:token` is a valid UUID v4 string before querying the database.
5. IF the token from `GET /api/client/:token` is found but the associated link is expired or disabled, THEN THE Server SHALL return HTTP 403 with a status field indicating `"expired"` or `"disabled"`.
6. THE Server SHALL apply rate limiting to `POST /api/auth/login` to prevent brute-force attacks, rejecting more than 10 requests per minute per IP with HTTP 429.
7. THE Server SHALL apply rate limiting to `GET /api/client/:token` to prevent enumeration attacks, rejecting more than 60 requests per minute per IP with HTTP 429.

---

### Requirement 11: Client_Access_Record Data Model

**User Story:** As a developer, I want a well-defined database model for client access records, so that the system can reliably store, query, and validate share link data.

#### Acceptance Criteria

1. THE Client_Access_Record model SHALL contain fields: `id` (integer, PK), `token` (UUID string, unique, not null), `projectId` (integer FK → projects.id), `clientName` (string, not null), `company` (string, nullable), `email` (string, nullable), `status` (enum: `active` | `disabled`, default `active`), `expiresAt` (datetime, nullable), `lastOpenedAt` (datetime, nullable), `createdAt`, `updatedAt`.
2. THE Server SHALL enforce uniqueness of the `token` field at the database level.
3. WHEN a new Client_Access_Record is created, THE Server SHALL generate the UUID token server-side, never accepting a client-supplied token value.
4. WHEN `expiresAt` is non-null and is in the past, THE Server SHALL treat the link as expired for any access check.
5. THE Server SHALL cascade-delete all Client_Access_Records associated with a project when that project is deleted.
