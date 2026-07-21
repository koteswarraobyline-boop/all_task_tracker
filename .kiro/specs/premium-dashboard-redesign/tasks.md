# Implementation Plan: Premium Dashboard Redesign

## Overview

Incremental upgrade of the DevTask Tracker frontend from a functional dashboard to a premium SaaS UI. Each task targets a specific file or component, builds on the previous step, and ends with everything wired together. No new runtime npm packages are added; fast-check is the only new devDependency.

## Tasks

- [ ] 1. Set up testing infrastructure and shared animation module
  - Install fast-check as a devDependency: `npm install --save-dev fast-check` in `client/`
  - Create `client/src/animations.js` with `pageVariants`, `containerVariants`, `cardVariants`, and `drawerVariants` exported as named constants
  - Create `client/src/__tests__/` directory structure
  - Create `client/src/__tests__/properties.test.js` as an empty scaffold with imports and test file header
  - _Requirements: 17.1, 17.2, 17.3_

- [ ] 2. Upgrade theme.js with full Design Token system
  - [ ] 2.1 Enrich `client/src/theme.js` with shadow scale constants (`SHADOW.card`, `SHADOW.cardHover`, `SHADOW.modal`), updated MuiCard hover box-shadow override, updated MuiButton gradient + translateY hover/active overrides, and updated typography variants (h4 1.6rem/800, h6 0.95rem/700, caption 0.75rem/600/uppercase/0.05em letter-spacing)
    - _Requirements: 1.2, 1.3, 1.5, 1.6, 1.7, 4.3, 6.1, 18.1, 18.2, 18.6_

  - [ ]* 2.2 Write property tests for theme token completeness (Properties 1 and 2)
    - **Property 1: Theme tokens completeness across modes**
    - **Property 2: Typography scale completeness**
    - **Validates: Requirements 1.2, 1.3, 1.7**
    - Test file: `client/src/__tests__/theme.test.js`

- [ ] 3. Upgrade index.css with Inter font, shimmer animation, and scrollbar polish
  - Add Google Fonts `@import` for Inter (400, 500, 600, 700, 800 weights) at the top of `client/src/index.css`
  - Add `@keyframes shimmer` gradient sweep animation
  - Add premium custom scrollbar styles (6px, rounded, primary-tint thumb on hover)
  - Add `.theme-transition` class with 300ms transition covering background-color, color, border-color, box-shadow
  - _Requirements: 1.1, 1.4, 9.2_

- [ ] 4. Create CountUpNumber utility component and shared PremiumTooltip
  - [ ] 4.1 Add `CountUpNumber` as a named export in `client/src/components/SkeletonCard.jsx` (or a new `client/src/components/CountUpNumber.jsx`) — implement requestAnimationFrame count-up with cubic ease-out; handle `value = 0` and `value = NaN` edge cases
    - _Requirements: 4.5_

  - [ ]* 4.2 Write property test for CountUpNumber reaches target value (Property 4)
    - **Property 4: CountUpNumber reaches target value**
    - **Validates: Requirements 4.5**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 4.3 Add `PremiumTooltip` as a named export in `client/src/components/PremiumTooltip.jsx` — render a Paper with 12px border-radius, 1px soft border, label in caption, values in bold body2 with payload color
    - _Requirements: 6.3_

- [ ] 5. Upgrade EmptyState component
  - Refactor `client/src/components/EmptyState.jsx` to accept an optional `secondaryActionText` and `onSecondaryActionClick` prop; add a secondary outlined button below the primary CTA when the prop is provided
  - Ensure the Framer Motion entrance animation uses `scale: 0.95 → 1` and `opacity: 0 → 1` from `cardVariants` in `animations.js`
  - Update border style to `dashed`, `primary.light` color, 16px border-radius container
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 6. Upgrade SkeletonCard component
  - Refactor `client/src/components/SkeletonCard.jsx` to accept a `variant` prop: `'kpi'` (default) | `'chart'` | `'table'`
  - `variant='kpi'`: existing two-column layout (rectangular value block + circular icon)
  - `variant='chart'`: chart container shape with variable-height animated bar columns using the `shimmer` CSS class
  - `variant='table'`: 5 rows, each row with 5 rectangular skeleton blocks at column widths
  - Apply shimmer animation class from `index.css` to all Skeleton elements
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 7. Checkpoint — Ensure all foundational components and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Upgrade Layout.jsx — Sidebar redesign
  - [ ] 8.1 Extract a `NavItem` local component inside `Layout.jsx` accepting `{ icon, label, path, active, onClick }` — renders `ListItemButton` with animated background: active → `primary.main` / hover → `rgba(99,102,241,0.08)` light or `rgba(99,102,241,0.06)` dark, `transition: 'all 0.2s'`
    - _Requirements: 2.3, 2.4, 2.7_

  - [ ] 8.2 Update the desktop sidebar `Box` styles: `top: 16`, `left: 16`, `borderRadius: '24px'`, `height: 'calc(100vh - 32px)'`, level-1 shadow, `border: '1px solid'` divider
    - _Requirements: 2.1, 2.10_

  - [ ] 8.3 Update the brand header block: gradient text using `background: linear-gradient(135deg, primary.main, secondary.main)` with `-webkit-background-clip: text`; add `WORKSPACE` section label in `overline` typography above the Projects/Developers nav group
    - _Requirements: 2.2, 2.5_

  - [ ] 8.4 Update the Active Project section: add `ACTIVE PROJECT` section label; update `ProjectContextCard` to have `borderRadius: 12`, left border `3px solid primary.main`, project name in `primary.main`, client name with BusinessIcon
    - _Requirements: 2.5, 2.6_

  - [ ] 8.5 Add `UserProfileBlock` at the bottom of the sidebar above Settings: render a small Avatar (32px) with initials, user name in `subtitle2`, role label "Project Manager" in `caption` color `text.secondary`
    - _Requirements: 2.9_

- [ ] 9. Upgrade Layout.jsx — Navbar redesign
  - [ ] 9.1 Update Navbar `AppBar` styles: `borderRadius: '20px'`, `backdrop-filter: blur(16px)`, semi-transparent background, soft border — matching the design spec in `Components and Interfaces`
    - _Requirements: 3.1_

  - [ ] 9.2 Update breadcrumb: show "Workspace" in `text.secondary` when no active project, or "Projects › [name]" with the parent segment muted and current segment in `text.primary`
    - _Requirements: 3.2_

  - [ ] 9.3 Update search bar: add CSS `transition: 'width 0.2s ease'` with `onFocus` expanding from 300px to 420px and `onBlur` collapsing back; wrap with `Box` that holds the width state
    - _Requirements: 3.3, 3.4_

  - [ ] 9.4 Add `QuickAddButton` to the right side of the search bar: a small `Button` variant="contained" labeled "+ Quick Add", gradient primary background, placed between search and notification icon
    - _Requirements: 3.8_

  - [ ] 9.5 Verify notification dropdown renders full list with read/unread styling and "Mark all read" action; verify user menu renders name, email, settings link, and logout
    - _Requirements: 3.6, 3.7_

- [ ] 10. Upgrade KPI Card pattern across Dashboard and ProjectTaskBoard
  - [ ] 10.1 Create a reusable `KpiCard` component exported from `client/src/components/KpiCard.jsx` accepting `{ label, value, description, icon, accentColor }` — implement the full pattern from the design document: `CountUpNumber`, tinted avatar, trend icon, level-1/level-2 shadow hover, `cardVariants` motion wrapper
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 10.2 Write property test for KPI Card renders all required elements (Property 3)
    - **Property 3: KPI Card renders all required elements**
    - **Validates: Requirements 4.4, 4.7**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 10.3 Replace the inline KPI card code in `Dashboard.jsx` with `<KpiCard />` imports; replace the inline KPI card code in `ProjectTaskBoard.jsx` with `<KpiCard />` imports
    - _Requirements: 11.1, 12.2_

- [ ] 11. Upgrade ProjectTaskBoard table
  - [ ] 11.1 Update `TableHead` style in `ProjectTaskBoard.jsx`: background `#0f172a` (light) / `#1e293b` (dark), white text, weight 700, font-size 14px; add `position: 'sticky', top: 0, zIndex: 1` to the `TableHead` element; wrap `TableContainer` with `maxHeight: 'calc(100vh - 300px)', overflow: 'auto'`
    - _Requirements: 5.1, 5.8_

  - [ ] 11.2 Add alternating row background: odd rows `rgba(0,0,0,0.015)` light / `rgba(255,255,255,0.015)` dark via `TableRow sx`; add hover highlight `rgba(99,102,241,0.04)`; add quick-action reveal on hover (opacity 0 → 1 on the actions cell within 150ms)
    - _Requirements: 5.2, 5.3_

  - [ ] 11.3 Extract `getStatusStyle()` into a standalone exported function in `client/src/utils/statusUtils.js`; update status chip rendering to use `{ bgcolor: color + '1A', color, border: '1px solid ' + color + '33', borderRadius: '9999px' }`
    - _Requirements: 5.4_

  - [ ]* 11.4 Write property test for status pill color coverage (Property 5)
    - **Property 5: Status pill renders correct color for every status**
    - **Validates: Requirements 5.4**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 11.5 Update developer cell: render `Avatar` (32px with `bgcolor: dev.color`) + developer name text side by side; render "Unassigned" fallback Avatar (gray) when `task.developer` is null
    - _Requirements: 5.5_

  - [ ]* 11.6 Write property test for developer cell rendering (Property 6)
    - **Property 6: Developer cell renders for assigned and unassigned tasks**
    - **Validates: Requirements 5.5**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 11.7 Update priority chip rendering: P0 `{bg: '#FEF2F2', color: '#EF4444'}`, P1 amber, P2 blue, P3 green; extract to `getPriorityStyle(priority)` helper in `statusUtils.js`
    - _Requirements: 5.6_

  - [ ]* 11.8 Write property test for priority chip color coverage (Property 7)
    - **Property 7: Priority chip color scheme covers all priority levels**
    - **Validates: Requirements 5.6**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 11.9 Verify `hierarchicalData` computation: ensure `completionPct = Math.round((completedTasks / totalTasks) * 100)` is correctly computed and bounded; extract this calculation into a pure function `computeGroupProgress(tasks)` in `client/src/utils/taskUtils.js`
    - _Requirements: 5.7_

  - [ ]* 11.10 Write property test for progress bar value invariant (Property 8)
    - **Property 8: Progress bar value is a correct percentage**
    - **Validates: Requirements 5.7**
    - Test file: `client/src/__tests__/properties.test.js`

- [ ] 12. Extract and upgrade filter logic
  - [ ] 12.1 Extract the `filteredTasks` filter logic from `ProjectTaskBoard.jsx` into a pure exported function `applyTaskFilters(tasks, activeStatusFilters, searchQuery, activeTab)` in `client/src/utils/taskUtils.js`
    - _Requirements: 12.3_

  - [ ]* 12.2 Write property test for task filter correctness (Property 13)
    - **Property 13: Task filter produces correctly filtered results**
    - **Validates: Requirements 12.3**
    - Test file: `client/src/__tests__/properties.test.js`

- [ ] 13. Checkpoint — Ensure all component and utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Upgrade TaskDetailsDrawer
  - [ ] 14.1 Update `TaskDetailsDrawer.jsx` header styles: Task ID in caption typography, task name in h6, auto-save indicator with three states (`'saved'` → green "Saved ✓" with SuccessIcon; `'saving'` → spinner + "Saving…"; `'error'` → red error text)
    - _Requirements: 7.3_

  - [ ]* 14.2 Write property test for drawer save-status indicator (Property 9)
    - **Property 9: Drawer save-status indicator reflects all states**
    - **Validates: Requirements 7.3**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 14.3 Update the Stepper in `TaskDetailsDrawer.jsx`: verify `activeStep = STATUS_STEPS.indexOf(status)` is correctly computed; for statuses outside STATUS_STEPS ('Blocked', 'On Hold') conditionally hide the stepper
    - _Requirements: 7.4_

  - [ ]* 14.4 Write property test for drawer stepper activeStep (Property 10)
    - **Property 10: Drawer workflow stepper activeStep matches status**
    - **Validates: Requirements 7.4**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 14.5 Extract the `progressPct` calculation in `TaskDetailsDrawer.jsx` into a pure exported function `computeHoursProgress(actualHours, estimatedHours, status)` in `taskUtils.js`; handle zero estimatedHours and Completed status edge cases
    - _Requirements: 7.5_

  - [ ]* 14.6 Write property test for hours progress calculation (Property 11)
    - **Property 11: Hours progress bar is bounded and correct**
    - **Validates: Requirements 7.5**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 14.7 Update editable fields to use `borderRadius: 14` TextField style; update read-only metadata grid to use labeled chips in 2-column layout; update drawer Paper/body styles: independent scroll with thin custom scrollbar, width 500px desktop / 100% mobile
    - _Requirements: 7.6, 7.7, 7.8, 7.9_

- [ ] 15. Upgrade Chart components
  - [ ] 15.1 Update all Recharts chart containers in `Dashboard.jsx` and `Reports.jsx` to use `PremiumTooltip` (created in Task 4.3); update grid colors, stroke widths, dot radii per design spec; add SVG `<linearGradient>` definitions for bar and area fills
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [ ] 15.2 Wrap each chart card in `Dashboard.jsx` and `Reports.jsx` with consistent `Card` styles: `p: 3`, `borderRadius: '20px'`, level-1 shadow, h6 title 16px above chart area
    - _Requirements: 6.6, 6.7_

- [ ] 16. Upgrade Dashboard page
  - [ ] 16.1 Replace inline KPI card blocks with `<KpiCard />` components (from Task 10.1); replace loading state inline skeletons with `<SkeletonCard variant="kpi" />` and `<SkeletonChart />` components
    - _Requirements: 11.1, 11.5_

  - [ ] 16.2 Update page header: back button (IconButton with BackIcon), project name in h4 typography, descriptive subtitle in body2, "Task Board" shortcut Button (primary contained, right-aligned)
    - _Requirements: 11.6_

  - [ ] 16.3 Wrap the entire page content in `motion.div` using `containerVariants` from `animations.js` to enable staggered card entrance
    - _Requirements: 4.2_

- [ ] 17. Upgrade Projects page
  - [ ] 17.1 Update page header: h4 title + body2 subtitle on the left, "Upload New Project" Button (primary contained, gradient, box-shadow) on the right
    - _Requirements: 10.1_

  - [ ] 17.2 Update Project Card: h5 project name, client name with `BusinessIcon`, 2×3 mini stat chip grid, "Last Sync" timestamp; add `cardVariants` motion wrapper with `containerVariants` stagger on the Grid
    - _Requirements: 10.2, 10.3_

  - [ ]* 17.3 Write property test for project card stat values (Property 12)
    - **Property 12: Project card stat values match source data**
    - **Validates: Requirements 10.3**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 17.4 Update Project Card action area: two full-width equal-width Buttons ("Open Board" primary contained, "Metrics" secondary outlined); apply level-2 card hover shadow
    - _Requirements: 10.4, 10.5_

- [ ] 18. Upgrade Developers page
  - [ ] 18.1 Update page header: h4 title, body2 subtitle, "Add Developer" Button (primary gradient with AddIcon)
    - _Requirements: 13.1_

  - [ ] 18.2 Add `containerVariants` + `cardVariants` stagger animation to the developer cards Grid
    - _Requirements: 13.2_

  - [ ] 18.3 Update Developer Card: 56px Avatar with `boxShadow: '0 0 12px ${dev.color}80'` glow; h6 name; body2 email with MailIcon; 2×2 task stat chip grid
    - _Requirements: 13.3, 13.4_

  - [ ]* 18.4 Write property test for developer card stats aggregation (Property 14)
    - **Property 14: Developer card stats match task aggregation**
    - **Validates: Requirements 13.4**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 18.5 Replace the inline empty state `Paper` in `Developers.jsx` with the `<EmptyState />` component; update the Add/Edit dialog header to use a gradient primary color strip
    - _Requirements: 13.5, 13.6_

- [ ] 19. Upgrade Reports page
  - [ ] 19.1 Update page header: BackIcon button, "Project Reports" h4 title, subtitle with a gradient icon
    - _Requirements: 14.1_

  - [ ] 19.2 Replace inline KPI cards with `<KpiCard />` components; extract the productivity calculation into a pure function `computeProductivity(tasks)` in `taskUtils.js`
    - _Requirements: 14.2_

  - [ ]* 19.3 Write property test for report productivity KPI calculation (Property 15)
    - **Property 15: Report productivity KPI calculation is correct**
    - **Validates: Requirements 14.2**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 19.4 Update all charts with `PremiumTooltip`, gradient fills, and consistent card container styles (from Task 15)
    - _Requirements: 14.3, 14.4, 14.5_

- [ ] 20. Upgrade Settings page
  - Update `Settings.jsx` header to use a gear icon in `primary.main`, h4 title, body2 subtitle
  - Update the Database Statistics card to show each stat row as Avatar + label on left, large count on right, separated by Dividers
  - Update Environment Variables card to use rounded Paper rows with monospace value text
  - Update Personalization card with labeled toggle switches each having title + description sub-label
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 21. Upgrade UploadProject page
  - [ ] 21.1 Update the MUI `Stepper` to apply `primary.main` color to the active step icon; update step label typography to match the caption scale
    - _Requirements: 16.1_

  - [ ] 21.2 Update the drag-and-drop file zone: dashed border 2px `primary.light` → `primary.main` on hover/drag; `transform: scale(1.01)` + border glow on drag-over; show filename, file size, and a green checkmark `SuccessIcon` when a file is selected
    - _Requirements: 16.2, 16.3_

  - [ ] 21.3 Verify `AnimatePresence` with `mode="wait"` is properly wrapping step content with `slideVariants` transitions
    - _Requirements: 16.4_

  - [ ] 21.4 Extract the `runPreviewValidation()` logic into a pure exported function `validateCsvPreview(rows, mapping)` in `client/src/utils/csvValidation.js` returning `{ errors: string[], warnings: string[], isValid: boolean }`
    - _Requirements: 16.6_

  - [ ]* 21.5 Write property test for upload validation logic (Property 16)
    - **Property 16: Upload validation identifies all invalid rows**
    - **Validates: Requirements 16.6**
    - Test file: `client/src/__tests__/properties.test.js`

  - [ ] 21.6 Update the "Confirm Import" button: disabled + grayed when `!validationReport.isValid`; active with green gradient background + `boxShadow: '0 4px 14px 0 rgba(34,197,94,0.3)'` when valid
    - _Requirements: 16.7_

- [ ] 22. Add page transition animations
  - In `client/src/App.jsx`, wrap `<Routes>` with Framer Motion `<AnimatePresence mode="wait">`; add a `<PageTransition>` wrapper component that applies `pageVariants` from `animations.js` to each routed page
  - Add `useReducedMotion()` check inside `animations.js`: if `prefersReducedMotion` is true, all variant transition durations are set to 0
  - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [ ] 23. Upgrade ProjectTaskBoard page — remaining styling
  - [ ] 23.1 Update the tab bar: apply pill-shaped active indicator using `indicator` styles on the MUI `Tabs`; update Tab typography to `fontWeight: 650, fontSize: '0.88rem'`
    - _Requirements: 12.1_

  - [ ] 23.2 Update the filter bar: wrap in a surface `Paper` with `p: 2`, `borderRadius: '16px'`, `border: '1px solid divider'`; style filter chips using `getStatusStyle()` colors; add inline "No results" EmptyState when `filteredTasks.length === 0`
    - _Requirements: 12.4, 12.6_

  - [ ] 23.3 Wire `applyTaskFilters()` (from Task 12.1) into the `filteredTasks` `useMemo` in `ProjectTaskBoard.jsx`, replacing the inline filter logic
    - _Requirements: 12.3_

- [ ] 24. Final wiring and integration pass
  - Import and use `KpiCard` in all pages that previously used inline card patterns
  - Ensure all pages use `motion.div` with `pageVariants` for the outer container (consistent with Task 22)
  - Verify all Snackbar toast notifications are positioned `{ vertical: 'bottom', horizontal: 'right' }` with `variant="filled"` Alerts
  - Ensure `TaskDetailsDrawer` is wired to receive `computeHoursProgress` from `taskUtils.js`
  - _Requirements: 11.1, 12.2, 18.3, 18.4_

- [ ] 25. Final checkpoint — Ensure all tests pass and visual review
  - Run `npx vitest --run` and ensure all property tests and unit tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property test tasks annotate their property number and requirement reference
- Checkpoints at tasks 7, 13, and 25 ensure incremental validation
- The `utils/` directory (`taskUtils.js`, `statusUtils.js`, `csvValidation.js`) extracts pure functions that enable property testing without React rendering
- No tasks deploy, benchmark, or require manual UX review — all tasks are executable by a coding agent
