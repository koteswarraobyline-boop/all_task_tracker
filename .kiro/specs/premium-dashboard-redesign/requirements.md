# Requirements Document

## Introduction

This document defines the requirements for redesigning the existing DevTask Tracker SaaS dashboard into a premium, award-winning UI that matches the visual quality of Linear, Vercel, Stripe, and Notion. The redesign targets the React + Vite frontend (client/) and covers all shared components (Sidebar, Navbar, Cards, Tables, Charts) and all pages (Dashboard, Developers, Projects, ProjectTaskBoard, Reports, Settings, UploadProject). The existing MUI + Framer Motion + Recharts stack is retained; no new libraries are added. All functional behavior is preserved — only the visual layer and motion layer are upgraded.

## Glossary

- **Dashboard_App**: The full React + Vite frontend application located in `client/`.
- **Layout**: The shared shell component (`Layout.jsx`) containing the Sidebar and Navbar.
- **Sidebar**: The left-hand collapsible navigation panel rendered inside Layout.
- **Navbar**: The floating top app bar rendered inside Layout.
- **KPI_Card**: A metric summary card showing a single numeric value with label and icon.
- **Chart**: Any Recharts-based chart component (BarChart, LineChart, PieChart, AreaChart).
- **Table**: The MUI Table or DataGrid used in ProjectTaskBoard and DeveloperPerformance.
- **Drawer**: The TaskDetailsDrawer slide-in panel.
- **EmptyState**: The illustrated empty-state component shown when data is absent.
- **Skeleton**: The shimmer loading placeholder component.
- **Status_Pill**: A small rounded badge showing a task's current status.
- **Primary_Color**: `#6366F1` (Indigo).
- **Design_Token**: A named CSS custom property or JS constant from the theme used consistently across all components.
- **Theme**: The MUI theme object created in `theme.js`.
- **Dark_Mode**: The alternative palette activated when `mode === 'dark'`.
- **Inter_Font**: The Inter typeface loaded via Google Fonts or Fontsource.
- **Glass_Effect**: A frosted-glass visual treatment using `backdrop-filter: blur()` and semi-transparent backgrounds.
- **Framer_Motion**: The animation library already installed (`framer-motion`).

---

## Requirements

### Requirement 1: Design Token System and Theme Foundation

**User Story:** As a developer, I want a centralized design token system, so that all visual properties (colors, spacing, radii, shadows, typography) are defined once and consumed consistently across every component.

#### Acceptance Criteria

1. THE Dashboard_App SHALL load Inter font as the sole typeface across all text elements.
2. THE Theme SHALL expose Design_Tokens for background (`#F5F7FB`), surface (`#FFFFFF`), Primary_Color (`#6366F1`), secondary (`#3B82F6`), success (`#10B981`), warning (`#F59E0B`), danger (`#EF4444`), text-primary (`#111827`), text-secondary (`#6B7280`), and border (`rgba(0,0,0,0.05)`).
3. THE Theme SHALL expose equivalent Dark_Mode tokens that invert backgrounds and soften text colors.
4. WHEN the user toggles Dark_Mode, THE Dashboard_App SHALL transition all surfaces, text, and borders smoothly within 300ms using CSS transitions.
5. THE Theme SHALL define a global border-radius of 20px for cards and 99px for buttons (capsule shape).
6. THE Theme SHALL define a layered shadow scale: level-1 (resting card), level-2 (hover card with primary-color glow), level-3 (modal/drawer).
7. THE Theme SHALL define typography scale: h4 (page titles, 1.6rem, weight 800), h6 (card titles, 0.95rem, weight 700), body2 (descriptions, 0.85rem, weight 400), caption (labels, 0.75rem, weight 600, uppercase, letter-spacing 0.05em).

---

### Requirement 2: Sidebar Redesign

**User Story:** As a user, I want a premium floating sidebar with smooth interactions, so that navigation feels polished and professional.

#### Acceptance Criteria

1. THE Sidebar SHALL render as a floating panel positioned 16px from the top and left viewport edges with 24px border-radius and a level-1 shadow.
2. THE Sidebar SHALL display the brand logo icon and "DevTask Tracker" wordmark with a gradient text treatment using Primary_Color and secondary color.
3. WHEN a navigation item is active, THE Sidebar SHALL display a filled primary-color background on that item with white icon and text.
4. WHEN a navigation item is hovered, THE Sidebar SHALL animate the background to a soft primary-tint (`rgba(99,102,241,0.08)`) within 200ms.
5. THE Sidebar SHALL display section labels ("WORKSPACE", "ACTIVE PROJECT") in uppercase caption style above their respective nav groups.
6. WHEN an active project exists, THE Sidebar SHALL render a project context card with the project name in primary color and client name with a building icon.
7. THE Sidebar SHALL display nav item icons (24px Lucide or MUI Rounded) consistently left-aligned with 36px minimum width.
8. WHEN the viewport is below the `md` breakpoint, THE Sidebar SHALL render as a temporary MUI Drawer overlay activated by the hamburger button.
9. THE Sidebar SHALL render a user profile block at the bottom with an avatar, name, and role label above the Settings nav item.
10. THE Sidebar's height SHALL be `calc(100vh - 32px)` on desktop, creating a floating appearance with visible page background on all four sides.

---

### Requirement 3: Navbar Redesign

**User Story:** As a user, I want a floating frosted-glass top navbar, so that the page header always feels premium and contextually informative.

#### Acceptance Criteria

1. THE Navbar SHALL render as a floating bar positioned 16px from the top and right edges with 20px border-radius, `backdrop-filter: blur(16px)`, and a semi-transparent surface background.
2. THE Navbar SHALL display a breadcrumb on the left showing "Workspace" or "Projects › [Project Name]" using muted text for the parent and primary text for the current page.
3. THE Navbar SHALL display a search bar in the center with a magnifier icon, placeholder "Search tasks, projects…", rounded 20px shape, and a soft primary-tint border.
4. WHEN the search bar receives focus, THE Navbar SHALL expand the search bar width smoothly from 300px to 420px within 200ms.
5. THE Navbar SHALL display a notifications bell icon with a red badge showing unread count, a dark-mode toggle icon, and a user avatar on the right.
6. WHEN the user clicks the notifications bell, THE Navbar SHALL open a dropdown panel (320px wide) listing notifications with read/unread styling, "Mark all read" action, and timestamps.
7. WHEN the user clicks the user avatar, THE Navbar SHALL open a dropdown panel showing the user's name, email, "Account Settings" link, and "Logout" option.
8. THE Navbar SHALL include a "Quick Add" button (labeled "+ New Task" or "+ Quick Add") with a primary gradient background and ripple animation on click.
9. WHEN the viewport is below the `md` breakpoint, THE Navbar SHALL hide the breadcrumb text and compress the search bar to an icon-only state.

---

### Requirement 4: KPI Card Redesign

**User Story:** As a user, I want premium metric cards with animations and micro-interactions, so that key numbers feel impactful and alive.

#### Acceptance Criteria

1. THE KPI_Card SHALL have 20px border-radius, internal padding of 24px, no hard border, and a level-1 shadow.
2. WHEN the KPI_Card mounts, THE KPI_Card SHALL animate its opacity from 0 to 1 and translate from `y: 16` to `y: 0` using Framer_Motion with a staggered delay across the card set.
3. WHEN a KPI_Card is hovered, THE KPI_Card SHALL lift 2px (`translateY(-2px)`) and apply a level-2 shadow with a primary-color glow within 250ms.
4. THE KPI_Card SHALL display a metric label (caption, uppercase), a large numeric value (h4, weight 800), a trend indicator icon, and a subtitle description.
5. WHEN a KPI_Card first renders with a non-zero value, THE KPI_Card's numeric display SHALL animate (count-up) from 0 to the final value over 800ms using a spring easing.
6. THE KPI_Card SHALL display a colored icon in a soft-tinted rounded avatar (40px) aligned to the top-right corner.
7. IF a metric value is zero, THE KPI_Card SHALL render the numeric value in `text.secondary` color rather than `text.primary`.

---

### Requirement 5: Table Redesign (ProjectTaskBoard)

**User Story:** As a user, I want the task table to feel like a Notion-style premium table rather than a spreadsheet, so that browsing tasks is comfortable and visually pleasant.

#### Acceptance Criteria

1. THE Table SHALL have a sticky dark header row (`#0f172a` in light mode, `#1e293b` in dark mode) with white text, weight 700, and 14px font size.
2. THE Table SHALL alternate row backgrounds: even rows at surface white, odd rows at `rgba(0,0,0,0.015)` in light mode and `rgba(255,255,255,0.015)` in dark mode.
3. WHEN a table row is hovered, THE Table SHALL highlight the full row with a primary-tint background (`rgba(99,102,241,0.04)`) and reveal quick-action icon buttons on the far-right column within 150ms.
4. THE Table SHALL display task status as Status_Pills: rounded-full chips with colored text, colored background at 10% opacity, and a 1px colored border.
5. THE Table SHALL display developer assignment as an Avatar (32px) with colored initials background and the developer's name beside it.
6. THE Table SHALL display task priority as P0/P1/P2/P3 chips using distinct color schemes (P0 red, P1 amber, P2 blue, P3 green).
7. THE Table SHALL display a LinearProgress bar (height 4px, rounded, green) inside parent module rows showing completion percentage.
8. THE Table header SHALL remain sticky (position fixed) when scrolling vertically within the table container.
9. WHEN a row is clicked, THE Table SHALL open the TaskDetailsDrawer with a smooth slide-in from the right using Framer_Motion.
10. THE Table SHALL render parent/group rows with a slightly elevated background and a left-side expand/collapse chevron icon button.

---

### Requirement 6: Chart Redesign

**User Story:** As a user, I want charts that use modern gradients, smooth animations, and minimal grids, so that data visualization feels premium rather than utilitarian.

#### Acceptance Criteria

1. WHEN a Chart mounts, THE Chart SHALL animate its bars, lines, or pie slices from their base position to final values using a 600ms ease-out transition driven by Recharts `isAnimationActive`.
2. THE Chart SHALL use a minimal grid with `strokeDasharray="3 3"` and a low-contrast color (`#e2e8f0` in light, `#1f2937` in dark) with no axis borders.
3. THE Chart SHALL display custom tooltips with a white (or dark-surface) background, 12px border-radius, a 1px soft border, and the data value in bold with its label in muted text.
4. Bar charts SHALL use rounded top corners (`radius={[4,4,0,0]}`) and gradient fills from Primary_Color to its dark variant.
5. Line/Area charts SHALL use a stroke width of 2.5px with activated dot radius of 5px and a gradient area fill with 30% opacity at the top fading to 0% at the bottom.
6. THE Chart container card SHALL maintain consistent 24px internal padding and a level-1 shadow identical to KPI cards.
7. THE Chart title SHALL use the h6 typography token (0.95rem, weight 700) and sit 16px above the chart area.

---

### Requirement 7: Drawer Redesign (TaskDetailsDrawer)

**User Story:** As a user, I want the task details drawer to feel like a premium side panel with rich context and smooth animation, so that editing tasks is a delightful experience.

#### Acceptance Criteria

1. WHEN the Drawer opens, THE Drawer SHALL slide in from the right with a Framer_Motion spring animation (stiffness 300, damping 30) over 350ms.
2. WHEN the Drawer closes, THE Drawer SHALL slide out to the right and fade out simultaneously over 250ms.
3. THE Drawer SHALL have a header with the Task ID in caption style, task name in h6, and an auto-save status indicator ("Saved ✓" in green or "Saving…" with a spinner).
4. THE Drawer SHALL display a workflow progress stepper (Upcoming → Assigned → In Dev → Code Review → Testing → Completed) with the active step highlighted in Primary_Color.
5. THE Drawer SHALL display an hours budget progress bar with a label showing "Xh logged / Yh estimated" and turn red when actual exceeds estimated.
6. THE Drawer's editable fields (status, developer, actual hours, remarks) SHALL use the premium MUI TextField style with 14px border-radius and a soft primary-color focus ring.
7. THE Drawer SHALL display read-only metadata (module, feature, priority, due date) as labeled chips in a 2-column grid.
8. THE Drawer body SHALL be independently scrollable with a custom thin scrollbar that matches the theme.
9. THE Drawer width SHALL be 500px on desktop and 100% viewport width on mobile (`xs`).

---

### Requirement 8: Empty State Redesign

**User Story:** As a user, I want empty states to be visually engaging with helpful guidance, so that the app feels polished even when there is no data.

#### Acceptance Criteria

1. THE EmptyState SHALL display a custom SVG illustration (220px wide) centered above the title text.
2. THE EmptyState SHALL display a title in h5 typography, a descriptive body2 paragraph, a primary contained CTA button, and an optional secondary outlined button.
3. WHEN the EmptyState mounts, THE EmptyState SHALL animate with a scale from 0.95 to 1 and opacity from 0 to 1 over 400ms using Framer_Motion.
4. THE EmptyState border SHALL use `border-style: dashed` with `primary.light` color and a 2px width on a rounded (16px) container.
5. THE EmptyState background SHALL be a very subtle primary-tint (`rgba(99,102,241,0.02)`) in light mode and transparent in dark mode.

---

### Requirement 9: Loading Skeleton Redesign

**User Story:** As a user, I want shimmer skeleton placeholders that match the exact layout of the real content, so that loading states feel intentional and professional.

#### Acceptance Criteria

1. WHEN data is loading, THE Dashboard_App SHALL display Skeleton components that match the precise dimensions and positions of the real KPI cards, charts, and table rows.
2. THE Skeleton SHALL apply a shimmer animation: a gradient sweep from left to right repeating every 1.5 seconds.
3. THE SkeletonCard SHALL replicate the two-column layout of a KPI card with a rectangular block for the value and a circular block for the icon.
4. THE SkeletonChart SHALL replicate the chart container shape with variable-height animated bar columns.
5. WHEN the Skeleton is used for a table, THE Skeleton SHALL render 5 rows each with column-width-matching rectangular blocks.

---

### Requirement 10: Projects Page Redesign

**User Story:** As a user, I want the Projects directory page to display projects as premium cards with rich metadata and smooth animations, so that finding and navigating projects is intuitive.

#### Acceptance Criteria

1. THE Projects page header SHALL display a large page title and subtitle on the left, and an "Upload New Project" primary button on the right.
2. WHEN projects load, THE Projects page SHALL render each project as a Card in a 3-column grid (desktop), 2-column (tablet), 1-column (mobile) with staggered Framer_Motion entrance animations.
3. THE Project_Card SHALL display the project name (h5), client name with a building icon, a 2×3 grid of mini stat chips (Total, Completed, In Dev, Pending, Blocked, Upcoming), and a "Last Sync" timestamp at the bottom.
4. THE Project_Card action area SHALL display two full-width buttons: "Open Board" (primary contained) and "Metrics" (secondary outlined) with equal width.
5. WHEN a Project_Card is hovered, THE Project_Card SHALL lift and glow using the level-2 shadow treatment.
6. WHEN the project list is empty, THE Projects page SHALL display the EmptyState component with the upload illustration and "Upload Project CSV" CTA.

---

### Requirement 11: Dashboard Page Redesign

**User Story:** As a user, I want the project analytics dashboard to feel like a premium SaaS metrics page with animated charts and rich KPI cards, so that project health is instantly readable.

#### Acceptance Criteria

1. THE Dashboard page SHALL display 6 KPI cards in a responsive row: Total, Completed, In Progress, Testing, Blocked, Upcoming — each satisfying Requirement 4.
2. THE Dashboard page SHALL display a doughnut chart (Status Distribution) and a stacked bar chart (Developer Workload) side-by-side in the first chart row.
3. THE Dashboard page SHALL display a burnup line chart (Project Progress Timeline) and an effort-hours bar chart (Estimated vs Actual by Module) in the second chart row.
4. THE Dashboard page SHALL display a Recent Activity Timeline and a Developer Performance Matrix in the third row.
5. WHEN the Dashboard page mounts, THE Dashboard page SHALL show Skeleton components for all KPI cards and charts until data finishes loading.
6. THE Dashboard page header SHALL include a back button, the project name as a page title, a descriptive subtitle, and a "Task Board" shortcut button.

---

### Requirement 12: ProjectTaskBoard Page Redesign

**User Story:** As a user, I want the task board to have a premium tab navigation, styled filter bar, and Notion-like table, so that managing and reviewing tasks is efficient and visually consistent.

#### Acceptance Criteria

1. THE ProjectTaskBoard page SHALL display a tab bar with pill-shaped active indicator for: Overview, per-phase tabs, and Sprint Planner.
2. THE ProjectTaskBoard page SHALL display 4 KPI cards (Total, Completed, In Development, Planned) satisfying Requirement 4 above the filter bar.
3. THE filter bar SHALL display status pills as clickable filter chips using Status_Pill colors, a search text field, and a clear-filters button.
4. THE filter bar SHALL sit in a surface card with 16px padding, a 1px soft border, and 16px corner radius.
5. THE task Table SHALL satisfy all criteria from Requirement 5.
6. WHEN no tasks match the current filter, THE ProjectTaskBoard page SHALL display an inline EmptyState with a "Clear Filters" action.

---

### Requirement 13: Developers Page Redesign

**User Story:** As a user, I want the developers directory to display team members as premium avatar cards with task stats, so that the team overview is clean and informative.

#### Acceptance Criteria

1. THE Developers page header SHALL display a title, subtitle, and an "Add Developer" button with a primary gradient and a "+" icon.
2. WHEN developers load, THE Developers page SHALL render each developer as a Card in a 3-column grid with a Framer_Motion stagger animation.
3. THE Developer_Card SHALL display a 56px avatar with initials and a colored glow shadow matching the developer's accent color, their name in h6, email in body2 with a mail icon.
4. THE Developer_Card SHALL display a 2×2 grid of task stat mini-chips (Total, In Dev, Testing, Completed) with colored values.
5. WHEN the developer list is empty, THE Developers page SHALL display an EmptyState with an "Add First Developer" CTA.
6. THE Add/Edit Developer dialog SHALL have 20px border-radius, a gradient header bar in Primary_Color, and labeled color swatch grid.

---

### Requirement 14: Reports Page Redesign

**User Story:** As a user, I want the reports page to have a rich header, animated KPI cards, and gradient area charts, so that performance analytics feel executive-grade.

#### Acceptance Criteria

1. THE Reports page header SHALL display a back button, page title ("Project Reports"), and subtitle with a gradient icon accent.
2. THE Reports page SHALL display 4 KPI cards satisfying Requirement 4: Avg Completion Time, Total Estimated Effort, Total Logged Effort, Productivity Index.
3. THE Reports page SHALL display a Developer Hours BarChart (Estimated vs Logged) and a Module Distribution BarChart side by side.
4. THE Reports page SHALL display a Status Summary AreaChart spanning the full width with a gradient fill.
5. ALL Charts on the Reports page SHALL satisfy Requirement 6.

---

### Requirement 15: Settings Page Redesign

**User Story:** As a user, I want the settings page to have a clean two-column card layout with structured sections, so that workspace configuration feels organized and professional.

#### Acceptance Criteria

1. THE Settings page header SHALL display a settings gear icon in Primary_Color, a page title, and a subtitle.
2. THE Settings page SHALL display a "Database Statistics" card and an "Environment Variables" card side-by-side in a 2-column grid.
3. THE Settings page SHALL display a "Personalization" full-width card with labeled toggle switches, each having a title and a description sub-label.
4. THE Database Statistics card SHALL display each stat row as an Avatar icon + label on the left and a large count on the right, separated by dividers.
5. THE Environment Variables card SHALL display each key-value pair in a rounded Paper row with monospace value text.

---

### Requirement 16: UploadProject Page Redesign

**User Story:** As a user, I want the CSV import wizard to have a premium stepper, drag-and-drop zone, and animated step transitions, so that the upload flow feels guided and polished.

#### Acceptance Criteria

1. THE UploadProject page SHALL display a 3-step MUI Stepper with custom styled step icons using Primary_Color for active steps.
2. THE drag-and-drop file zone SHALL be a dashed-border rounded card (16px) that animates a scale-up and border glow when a file is dragged over.
3. WHEN a file is selected, THE UploadProject page SHALL display the filename, file size, and a success icon checkmark below the drop zone.
4. WHEN transitioning between wizard steps, THE UploadProject page SHALL use Framer_Motion `AnimatePresence` with slide-in/slide-out transitions.
5. THE column mapping step SHALL display DB fields on the left in a scrollable card and a live preview table on the right that updates as mappings change.
6. THE validation step SHALL display a success Alert (green) or error Alert (red) with a scrollable list of validation messages in rounded cards.
7. THE Confirm Import button SHALL be disabled and grayed out when validation errors exist, and active with a green gradient when all checks pass.

---

### Requirement 17: Page Transition Animations

**User Story:** As a user, I want smooth page transition animations when navigating between routes, so that the app feels fluid rather than jarring.

#### Acceptance Criteria

1. WHEN the user navigates to a new route, THE Dashboard_App SHALL animate the incoming page with a fade-in and a slight upward translate (`y: 16 → y: 0`) using Framer_Motion over 300ms.
2. WHEN the user navigates away from a route, THE Dashboard_App SHALL animate the outgoing page with a fade-out over 200ms.
3. THE Dashboard_App SHALL use Framer_Motion `AnimatePresence` with `mode="wait"` wrapping the route `<Routes>` block to ensure transitions do not overlap.
4. ALL page transition animations SHALL be disabled or reduced when the user's OS has `prefers-reduced-motion` set.

---

### Requirement 18: Micro-Interaction and Feedback System

**User Story:** As a user, I want every interactive element to provide immediate visual feedback, so that the app feels responsive and polished.

#### Acceptance Criteria

1. WHEN a Button is hovered, THE Button SHALL translate up by 1px and increase its shadow intensity within 200ms.
2. WHEN a Button is pressed (active state), THE Button SHALL translate down by 1px to simulate a press within 100ms.
3. WHEN an action succeeds (e.g., status update, delete), THE Dashboard_App SHALL display an MUI Snackbar toast with a filled severity Alert at the bottom-right, auto-hiding after 4 seconds.
4. WHEN an action fails, THE Dashboard_App SHALL display an error Snackbar toast with descriptive error text.
5. WHEN an IconButton is hovered, THE IconButton SHALL apply a primary-tint circular background within 150ms.
6. WHEN a Card is hovered, THE Card SHALL apply the level-2 shadow with primary-color glow within 250ms as defined in Requirement 1.
