# Requirements Document

## Introduction

This feature enhances the client-facing dashboard and project management capabilities of the existing Task Tracker application (React + Vite + MUI v9 frontend, Express + Sequelize + MySQL backend). The changes span three interconnected areas:

1. **Client Dashboard Redesign** — a cleaner, professional project view that hides all internal developer/admin information from clients, while surfacing project progress, timelines, due dates, and public updates.
2. **Due Date Management System** — each project now stores an original expected due date (set at creation) and an updateable active due date (set/extended by admins), preserving full history.
3. **Overdue Detection & Admin Extension Flow** — automatic overdue detection based on the active due date, with a red warning indicator visible to both admins and clients, and an admin interface to extend the deadline while preserving history.

The existing tech stack is: React + Vite + Material UI v9, Express.js + Sequelize + MySQL, JWT auth with `admin`/`client` roles, and client access via share-token routes (`/client/:token`).

---

## Glossary

- **Client_Dashboard**: The read-only project view exposed to clients via a share-token URL (`/client/:token`). Rendered by `ClientOverview`, `ClientShell`, and `ProjectTaskBoard` pages.
- **Admin_Dashboard**: The internal project management UI available only to authenticated admins. Rendered by `Dashboard`, `Projects`, and related admin pages.
- **Project**: A Sequelize `Project` model row in the `projects` table, linked to tasks, client access records, and developers.
- **Original_Due_Date**: The immutable deadline recorded when a project is first created. Stored in the `original_due_date` column.
- **Active_Due_Date**: The latest/current deadline for a project. Updated by admins when extending an overdue project. Stored in the `active_due_date` column.
- **Public_Update**: A free-text message set by admins that is visible to clients in the Client_Dashboard. Stored in the `public_update` column of the `projects` table.
- **Overdue_Status**: The computed state when the current date exceeds the Active_Due_Date and the project status is not `Completed`. Surfaced as a visual warning in both Admin_Dashboard and Client_Dashboard.
- **Share_Token**: A UUID-v4 stored in `client_access_records.token` that grants read-only client access to a specific project.
- **Role_Context**: The JWT-based role system (`admin`, `client`) already implemented in `RoleContext.jsx` and enforced via `authMiddleware`.
- **Progress_Bar**: A MUI `LinearProgress` component displaying the ratio of completed tasks to total tasks for a project.
- **Due_Date_Extension**: An admin action that sets a new Active_Due_Date on a project that is currently overdue, preserving the Original_Due_Date.

---

## Requirements

---

### Requirement 1: Client Information Isolation

**User Story:** As a client, I want to see only project-relevant information in my dashboard, so that internal developer details, team assignments, and admin controls are never exposed to me.

#### Acceptance Criteria

1. WHEN the Client_Dashboard renders any project view, THE Client_Dashboard SHALL exclude developer names, developer email addresses, developer color codes, team assignment details, internal remarks, and developer-to-task assignment mappings from all UI components.
2. WHEN the Client_Dashboard renders any project view, THE Client_Dashboard SHALL exclude all admin-only controls including task creation buttons, task status-change dropdowns, developer assignment dropdowns, sprint management controls, CSV import/export buttons, and project deletion options.
3. WHEN the `GET /client/:token/tasks` API endpoint returns task data, THE API SHALL omit the `developer.name`, `developer.email`, `developer.color`, and `developerId` fields from the task payload delivered to the client.
4. WHEN the `GET /client/:token` API endpoint returns project metadata, THE API SHALL omit any field derived from the internal developer or team model from the `project` and `clientMeta` response objects.
5. THE Client_Dashboard SHALL display a visible "Read Only" badge or label on every page of the client view to communicate access level to the client.

---

### Requirement 2: Client Project View — Visible Information

**User Story:** As a client, I want to see my project's name, status, progress, timeline, and public updates in a clean interface, so that I have full transparency on delivery without seeing internal team details.

#### Acceptance Criteria

1. WHEN the Client_Dashboard loads a project, THE Client_Dashboard SHALL display the Project Name, Project Status chip, Progress Bar, and Progress Percentage prominently in the page header.
2. WHEN the Client_Dashboard loads a project, THE Client_Dashboard SHALL display the Original_Due_Date labeled as "Expected Due Date" and, if an Active_Due_Date differs from the Original_Due_Date, SHALL also display the Active_Due_Date labeled as "Updated Due Date".
3. WHEN the Client_Dashboard loads a project, THE Client_Dashboard SHALL display the Task Progress as a count of completed tasks out of total tasks (e.g., "12 / 30 tasks completed").
4. WHEN a Public_Update is set on the project, THE Client_Dashboard SHALL display the Public_Update text in a visually distinct "Project Update" card or section.
5. WHEN no Public_Update is set on the project, THE Client_Dashboard SHALL hide the Public_Update section rather than displaying an empty placeholder.
6. WHEN the project is in Overdue_Status, THE Client_Dashboard SHALL display a red warning indicator labeled "Overdue" alongside the due date information.

---

### Requirement 3: Due Date Management — Data Model

**User Story:** As an admin, I want each project to store an original due date and an updatable active due date, so that deadline history is preserved when extensions are granted.

#### Acceptance Criteria

1. THE Project model SHALL store an `original_due_date` column of type `DATEONLY`, nullable, representing the first deadline set for the project.
2. THE Project model SHALL store an `active_due_date` column of type `DATEONLY`, nullable, representing the current/latest deadline for the project.
3. THE Project model SHALL store a `public_update` column of type `TEXT`, nullable, containing the latest client-visible update message.
4. WHEN a project is created with a due date provided, THE System SHALL set both `original_due_date` and `active_due_date` to that value.
5. WHEN a project is created without a due date, THE System SHALL set both `original_due_date` and `active_due_date` to `null`.
6. WHEN the admin updates the Active_Due_Date via a Due_Date_Extension, THE System SHALL update only `active_due_date` and SHALL NOT modify `original_due_date`.
7. THE `GET /projects` API response SHALL include `originalDueDate`, `activeDueDate`, `publicUpdate`, and `isOverdue` fields for every project row.
8. THE `GET /client/:token` and `GET /client/:token/tasks` API responses SHALL include `originalDueDate`, `activeDueDate`, `publicUpdate`, and `isOverdue` fields in the `project` object.

---

### Requirement 4: Overdue Detection

**User Story:** As a system stakeholder (admin or client), I want projects to be automatically flagged as overdue when the current date exceeds the active due date, so that delayed projects are immediately visible.

#### Acceptance Criteria

1. WHEN the current date exceeds the project's `active_due_date` AND the project status is not `Completed`, THE System SHALL compute `isOverdue` as `true` for that project.
2. WHEN the project status is `Completed` OR the project has no `active_due_date`, THE System SHALL compute `isOverdue` as `false` regardless of dates.
3. WHEN `isOverdue` is `true`, THE Admin_Dashboard project list and project detail header SHALL display a red "Overdue" warning indicator.
4. WHEN `isOverdue` is `true`, THE Client_Dashboard SHALL display a red "Overdue" warning indicator near the due date section.
5. THE overdue computation SHALL be performed server-side before serializing the API response, so that both admin and client API consumers receive a consistent `isOverdue` boolean.
6. WHEN `isOverdue` is `false`, THE Admin_Dashboard and Client_Dashboard SHALL NOT display any overdue warning indicator.

---

### Requirement 5: Admin Due Date Extension

**User Story:** As an admin, I want to extend a project's deadline when it becomes overdue, so that I can communicate a revised delivery date to the client without losing the original deadline record.

#### Acceptance Criteria

1. WHEN the admin views an overdue project in the Admin_Dashboard, THE Admin_Dashboard SHALL display a "Extend Deadline" action (button or menu item) that opens a date-picker dialog.
2. WHEN the admin submits a Due_Date_Extension with a new date, THE Admin_Dashboard SHALL call a `PATCH /projects/:id/due-date` API endpoint with the new date.
3. WHEN `PATCH /projects/:id/due-date` receives a valid future date, THE System SHALL update `active_due_date` to the new date, SHALL NOT modify `original_due_date`, and SHALL return the updated project object including both `originalDueDate` and `activeDueDate`.
4. IF the date submitted to `PATCH /projects/:id/due-date` is in the past, THEN THE System SHALL return a `400` error with a descriptive message.
5. IF the date submitted to `PATCH /projects/:id/due-date` is earlier than or equal to the existing `active_due_date`, THEN THE System SHALL return a `400` error indicating the new date must be later than the current active due date.
6. WHEN the admin successfully extends the deadline, THE Admin_Dashboard SHALL refresh the project display to show the new Active_Due_Date and remove the overdue warning if the extension resolves the overdue condition.
7. THE Admin_Dashboard project detail page SHALL always display both the Original_Due_Date (labeled "Original Due Date") and the Active_Due_Date (labeled "Current Due Date") when the two dates differ.

---

### Requirement 6: Admin Public Update Management

**User Story:** As an admin, I want to publish a text update on a project that clients can see in their dashboard, so that I can communicate progress notes and announcements transparently.

#### Acceptance Criteria

1. WHEN the admin views a project in the Admin_Dashboard, THE Admin_Dashboard SHALL provide a "Public Update" text field or edit control to set or modify the project's `public_update` message.
2. WHEN the admin saves a Public_Update via the Admin_Dashboard, THE Admin_Dashboard SHALL call `PATCH /projects/:id/public-update` with the new message text.
3. WHEN `PATCH /projects/:id/public-update` receives a non-empty string, THE System SHALL update the `public_update` field and return the updated project object.
4. WHEN `PATCH /projects/:id/public-update` receives an empty string or `null`, THE System SHALL set `public_update` to `null` (clearing the update).
5. WHEN a Public_Update is saved, THE Client_Dashboard SHALL reflect the updated message on next load without requiring a page refresh of an already-open session beyond a standard data reload.

---

### Requirement 7: Admin Dashboard — Full Project Management View

**User Story:** As an admin, I want a complete project management interface including developer assignments, internal notes, progress management, due date management, and overdue monitoring, so that I can run projects efficiently from a single view.

#### Acceptance Criteria

1. THE Admin_Dashboard project detail view SHALL display all existing fields: Project Name, Client Name, Project Status, task breakdown, developer team members, assigned developers per task, internal remarks per task, and estimated/actual hours.
2. THE Admin_Dashboard SHALL display the `original_due_date` and `active_due_date` for each project, using labels "Original Due Date" and "Current Due Date" respectively.
3. WHEN a project has `isOverdue` equal to `true`, THE Admin_Dashboard project list SHALL visually distinguish that project row or card with a red "Overdue" chip or indicator.
4. THE Admin_Dashboard project list SHALL include a filterable "Overdue" status option that shows only overdue projects when selected.
5. THE Admin_Dashboard project detail view SHALL include the Public_Update management control described in Requirement 6.
6. WHEN the admin updates a project's status to `Completed`, THE System SHALL set `isOverdue` to `false` for that project in subsequent API responses.

---

### Requirement 8: Role Separation Enforcement

**User Story:** As a system operator, I want all client-facing API endpoints to enforce that developer-identifying and admin-only data is never leaked, so that role boundaries are maintained at the API layer, not just the UI.

#### Acceptance Criteria

1. WHEN a request arrives at `GET /client/:token/tasks`, THE System SHALL return task objects where each task's `developer` sub-object contains only `id` and `color` (no `name`, no `email`), or omits the `developer` field entirely if no developer is assigned.
2. WHEN a request arrives at `GET /client/:token`, THE System SHALL return a `project` object that does not contain `members`, `manager`, `teamMembers`, or any developer-identifying array or object.
3. THE client-token API endpoints (`/client/:token` and `/client/:token/tasks`) SHALL NOT require or accept an `Authorization` header and SHALL reject requests that include a valid admin JWT with the same response they would give to any anonymous request, so that there is no privilege escalation path via client-token routes.
4. WHEN any unauthenticated or client-token request attempts to access `GET /projects`, `POST /projects/upload`, `DELETE /projects/:id`, `PATCH /projects/:id/due-date`, or `PATCH /projects/:id/public-update`, THE System SHALL return a `401` Unauthorized response.

---

### Requirement 9: Project Creation — Due Date Initialization

**User Story:** As an admin, I want to set a due date when creating or importing a project, so that the original deadline is captured from the start.

#### Acceptance Criteria

1. WHEN the admin creates a project via CSV import (`POST /projects/upload`), THE System SHALL accept an optional `dueDate` field in the CSV or form payload and set both `original_due_date` and `active_due_date` to that value.
2. WHEN a project is created via CSV import and no due date is provided, THE System SHALL set both `original_due_date` and `active_due_date` to `null`.
3. THE Admin_Dashboard project creation or import flow SHALL expose a "Due Date" input field so the admin can set the initial deadline at creation time.
4. WHEN a project is created with a due date, THE due date input SHALL accept dates in `YYYY-MM-DD` format and the System SHALL validate the format before persisting.

---

### Requirement 10: Database Migration

**User Story:** As a developer deploying this feature, I want a database migration that adds the new columns to the `projects` table without breaking existing data, so that the schema upgrade is safe and reversible.

#### Acceptance Criteria

1. THE migration script SHALL add the `original_due_date` column (`DATEONLY`, nullable) to the `projects` table if it does not already exist.
2. THE migration script SHALL add the `active_due_date` column (`DATEONLY`, nullable) to the `projects` table if it does not already exist.
3. THE migration script SHALL add the `public_update` column (`TEXT`, nullable) to the `projects` table if it does not already exist.
4. WHEN the migration runs against a `projects` table that already contains rows, THE migration SHALL set `original_due_date` and `active_due_date` to `null` for all existing rows (non-destructive default).
5. THE migration script SHALL be idempotent: running it a second time on an already-migrated schema SHALL not produce an error.
