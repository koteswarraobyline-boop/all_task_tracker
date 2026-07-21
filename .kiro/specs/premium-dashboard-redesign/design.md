# Design Document: Premium Dashboard Redesign

## Overview

The goal is to elevate the DevTask Tracker frontend from a functional CRUD dashboard to a premium, award-winning SaaS UI indistinguishable from Linear, Vercel, or Stripe. The entire visual layer is replaced while all existing data, API calls, routing, and business logic are preserved. The stack remains React 19 + MUI 9 + Framer Motion 12 + Recharts 3 + Vite. No new npm dependencies are added.

The redesign is additive and surgical: `theme.js` is enriched with a full Design Token system; `index.css` adds font loading, shimmer keyframes, and scrollbar polish; shared components are upgraded in place; and pages are refactored one-by-one to consume the new tokens.

---

## Architecture

### Component Hierarchy

```
App
├── ThemeProvider (theme.js — enriched with full token set)
├── CssBaseline (index.css — Inter font, shimmer, scrollbar)
└── Router
    └── Layout (Sidebar + Navbar shell)
        ├── Sidebar (floating card, 16px inset)
        │   ├── BrandLogo
        │   ├── NavSection (WORKSPACE)
        │   │   ├── NavItem (Projects)
        │   │   └── NavItem (Developers)
        │   ├── NavSection (ACTIVE PROJECT — conditional)
        │   │   ├── ProjectContextCard
        │   │   └── NavItem × 3 (Task Board, Dashboard, Reports)
        │   └── UserProfileBlock + NavItem (Settings)
        └── Navbar (floating glass bar, 16px inset)
            ├── Breadcrumb
            ├── SearchBar (expandable)
            ├── QuickAddButton
            ├── NotificationsBell + Dropdown
            ├── DarkModeToggle
            └── UserAvatarMenu
        └── <main> (page content area)
            ├── Projects
            ├── UploadProject
            ├── ProjectTaskBoard
            │   └── (embeds Dashboard inline for Overview tab)
            ├── Dashboard
            ├── Reports
            ├── Developers
            └── Settings
```

### Key Architectural Decisions

1. **Token-first approach**: All color, spacing, and typography values flow from `theme.js`. No hardcoded hex strings in component files — only `theme.palette.*` references.
2. **Framer Motion page wrapper**: A `PageTransition` wrapper component is inserted in `App.jsx` around `<Routes>` using `AnimatePresence mode="wait"`.
3. **Component co-location**: New sub-components (e.g., `NavItem`, `ProjectContextCard`, `UserProfileBlock`) are extracted as local functions within their parent file rather than new files, keeping the file count stable.
4. **Animation variants file**: Shared Framer Motion variant objects (`containerVariants`, `cardVariants`, `pageVariants`) are defined in a new `client/src/animations.js` module and imported where needed.
5. **CSS custom properties**: Shimmer keyframe and scrollbar styles are declared in `index.css` and consumed by MUI `sx` props using `animation: 'shimmer 1.5s infinite'`.

---

## Components and Interfaces

### theme.js (enriched)

The existing `getCustomTheme(mode)` function is extended with:

```js
// Shadow scale
const shadows = {
  card:    'light: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  cardHover: 'light: 0 8px 24px -6px rgba(99,102,241,0.18), 0 0 0 1px rgba(99,102,241,0.12)',
  modal:   'light: 0 24px 64px rgba(0,0,0,0.10)'
};

// Typography additions (on top of existing scale)
h4: { fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.025em' },
h6: { fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.01em' },
caption: { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' },

// Shape
borderRadius: 20,

// Component overrides (additions)
MuiCard: hover elevation via boxShadow transition
MuiButton: gradient fills, translateY hover/active
MuiDrawer: level-3 shadow
MuiChip: Status chips via sx prop patterns
```

### animations.js (new file)

```js
export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

export const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } }
};

export const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

export const drawerVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.25 } }
};
```

### Layout.jsx (Sidebar + Navbar)

**Sidebar changes:**
- Desktop sidebar: `borderRadius: '24px'`, `top: 16`, `left: 16`, `height: 'calc(100vh - 32px)'`, `width: DRAWER_WIDTH - 24`
- `NavItem` extracted as a local component accepting `{ icon, label, path, active }` — renders ListItemButton with animated background transition
- Active item: `bgcolor: 'primary.main'`, `color: 'white'`
- Hover item: `bgcolor: 'rgba(99,102,241,0.08)'` in light, `rgba(99,102,241,0.06)` in dark
- Section labels: `Typography variant="overline"` with 0.7rem size, `#6B7280`, `letterSpacing: '0.08em'`
- `ProjectContextCard`: surface `#f8fafc` (light) / `#1f293720` (dark), `borderRadius: 12`, left border `3px solid primary.main`
- `UserProfileBlock`: avatar + name + "Project Manager" role label pinned above Settings nav

**Navbar changes:**
- Positioned as `position: fixed`, `top: 16`, `right: 16`, `left: {md: DRAWER_WIDTH + 8}`, `borderRadius: '20px'`
- Background: `rgba(255,255,255,0.7)` light / `rgba(17,24,39,0.7)` dark + `backdropFilter: 'blur(16px)'`
- Border: `1px solid rgba(0,0,0,0.06)` light / `rgba(255,255,255,0.06)` dark
- `SearchBar`: width transitions `300px → 420px` on focus via `transition: 'width 0.2s ease'`
- `QuickAddButton`: small primary button labeled "+ Quick Add", gradient bg, placed between search and notification icon

### CountUpNumber (new local utility component)

Used inside KPI cards to animate number from 0 to target:

```jsx
function CountUpNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    // requestAnimationFrame-based count-up with easeOut
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setDisplay(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return <>{display}</>;
}
```

### KPI Card pattern

```jsx
<motion.div variants={cardVariants}>
  <Card sx={{
    p: 3,
    borderRadius: '20px',
    border: 'none',
    boxShadow: SHADOW.card,
    transition: 'all 0.25s cubic-bezier(0.25,0.8,0.25,1)',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: SHADOW.cardHover }
  }}>
    <Stack direction="row" justifyContent="space-between">
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
          <CountUpNumber value={numericValue} />
        </Typography>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.8 }}>
          <TrendUpIcon sx={{ fontSize: 13, color: accentColor }} />
          <Typography variant="caption" color="text.secondary">{desc}</Typography>
        </Stack>
      </Box>
      <Avatar sx={{ bgcolor: `${accentColor}15`, color: accentColor, width: 40, height: 40 }}>
        {icon}
      </Avatar>
    </Stack>
  </Card>
</motion.div>
```

### Table (ProjectTaskBoard)

Key structural changes:
- `TableHead` background: `#0f172a` (light) or `#1e293b` (dark), white text, 700 weight
- `TableRow` alternating: `nth-of-type(odd)` gets `rgba(0,0,0,0.015)` background
- Row hover: `backgroundColor: 'rgba(99,102,241,0.04)'` + reveal quick-action column
- Status chips: `{ bgcolor: statusColor + '1A', color: statusColor, border: '1px solid ' + statusColor + '33', borderRadius: '9999px', fontWeight: 700 }`
- Developer cell: `Avatar` (32px, initials) + dev name text
- Priority chips: P0 → `{ bg: '#FEF2F2', color: '#EF4444' }`, P1 → amber, P2 → blue, P3 → green
- Progress bar in parent rows: `LinearProgress height={4}` rounded, success color
- Sticky header: `TableContainer` with `maxHeight: 'calc(100vh - 300px)'`, `overflow: 'auto'`, `TableHead` `position: 'sticky', top: 0, zIndex: 1`

### Chart components (Recharts wrappers)

All chart cards receive the same container treatment:
```jsx
<Card sx={{ p: 3, borderRadius: '20px', boxShadow: SHADOW.card }}>
  <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
  <ResponsiveContainer width="100%" height={280}>
    {/* chart */}
  </ResponsiveContainer>
</Card>
```

Custom Tooltip component:
```jsx
const PremiumTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper sx={{ p: 1.5, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: SHADOW.card }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {payload.map(p => (
        <Typography key={p.name} variant="body2" sx={{ fontWeight: 700, color: p.color }}>
          {p.name}: {p.value}
        </Typography>
      ))}
    </Paper>
  );
};
```

Bar chart gradient fills use SVG `<defs><linearGradient>` inside the Recharts SVG.

### TaskDetailsDrawer

```jsx
<Drawer anchor="right" open={open} onClose={onClose}
  PaperProps={{ sx: { width: { xs: '100%', sm: 500 }, overflow: 'hidden' } }}
  SlideProps={{ direction: 'left' }}
>
  {/* Framer Motion wrapper on the content box */}
  <AnimatePresence>
    {open && (
      <motion.div variants={drawerVariants} initial="hidden" animate="visible" exit="exit"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        {/* Scrollable body */}
      </motion.div>
    )}
  </AnimatePresence>
</Drawer>
```

---

## Data Models

No data model changes. The redesign is purely visual. All existing API shapes, Redux state (if any), and prop interfaces remain identical. Component props that change:

| Component | Changed Props |
|---|---|
| `EmptyState` | Adds optional `secondaryActionText` + `onSecondaryActionClick` |
| `SkeletonCard` | Adds `variant` prop: `'kpi' | 'chart' | 'table'` |
| `Layout` | No prop changes — internal refactor only |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Theme tokens completeness across modes

*For any* theme mode (`'light'` or `'dark'`), calling `getCustomTheme(mode)` should return a theme object whose `palette` contains all required Design Token keys (`background.default`, `background.paper`, `primary.main`, `secondary.main`, `success.main`, `warning.main`, `error.main`, `text.primary`, `text.secondary`, `divider`) each with non-null, non-empty string values.

**Validates: Requirements 1.2, 1.3**

---

### Property 2: Typography scale completeness

*For any* theme mode, the theme object's `typography` should include variants `h4`, `h6`, `body2`, `caption` each with the correct `fontSize` and `fontWeight` values as specified in Requirement 1.7.

**Validates: Requirements 1.7**

---

### Property 3: KPI Card renders all required elements

*For any* KPI card rendered with a `label`, `value`, `description`, and `icon` prop, the rendered output should contain: the label text, the numeric value, the description text, and the icon element — all present in the DOM.

*Edge case*: When `value === 0`, the numeric display should still render the zero value (not null or undefined).

**Validates: Requirements 4.4, 4.7**

---

### Property 4: CountUpNumber reaches target value

*For any* positive integer target value passed to `CountUpNumber`, after the animation duration has elapsed, the displayed number should equal exactly the target value (no rounding down on the final frame).

**Validates: Requirements 4.5**

---

### Property 5: Status pill renders correct color for every status

*For any* task status string from the set `['Upcoming', 'Assigned', 'In Development', 'Code Review', 'Testing', 'Completed', 'Blocked', 'On Hold']`, the `getStatusStyle()` function should return an object with non-empty, non-null `bgcolor`, `color`, and `border` fields — and the returned `color` value should be a valid CSS color string.

**Validates: Requirements 5.4**

---

### Property 6: Developer cell renders for assigned and unassigned tasks

*For any* task object, if `task.developer` is non-null the developer cell should contain the developer's name; if `task.developer` is null the cell should render the "Unassigned" fallback — never crashing or rendering nothing.

**Validates: Requirements 5.5**

---

### Property 7: Priority chip color scheme covers all priority levels

*For any* priority value from `['P0', 'P1', 'P2', 'P3']`, the priority chip renderer should return a style object with distinct, non-null `color` and `bgcolor` values. The P0 color should be red (`#EF4444`), P1 amber, P2 blue, P3 green.

**Validates: Requirements 5.6**

---

### Property 8: Progress bar value is a correct percentage

*For any* parent group row with `totalTasks > 0`, the `completionPct` value passed to `LinearProgress` should equal `Math.round((completedTasks / totalTasks) * 100)` and be bounded between 0 and 100 inclusive.

**Validates: Requirements 5.7**

---

### Property 9: Drawer save-status indicator reflects all states

*For any* `saveStatus` value from `['saved', 'saving', 'error']`, the drawer header should render a non-empty indicator element — "Saved ✓" for `'saved'`, a spinner for `'saving'`, and an error indicator for `'error'`.

**Validates: Requirements 7.3**

---

### Property 10: Drawer workflow stepper activeStep matches status

*For any* `status` value contained in `STATUS_STEPS`, the `activeStep` prop passed to the MUI `Stepper` should equal `STATUS_STEPS.indexOf(status)`. For status values not in `STATUS_STEPS` (e.g., `'Blocked'`, `'On Hold'`), the stepper should not render (or render with `activeStep = -1` hidden gracefully).

**Validates: Requirements 7.4**

---

### Property 11: Hours progress bar is bounded and correct

*For any* pair of `(actualHours, estimatedHours)` where `estimatedHours > 0`, the `progressPct` value should equal `Math.min(Math.round((actualHours / estimatedHours) * 100), 100)`. When `estimatedHours === 0` and `status === 'Completed'`, `progressPct` should equal `100`. When `estimatedHours === 0` and status is not Completed, `progressPct` should equal `0`.

**Validates: Requirements 7.5**

---

### Property 12: Project card stat values match source data

*For any* project object with defined stat fields (`totalTasks`, `completed`, `inDevelopment`, `pending`, `blocked`, `upcoming`), the rendered Project Card's stat chips should display values equal to the corresponding fields of the project object — no transformation or rounding applied.

**Validates: Requirements 10.3**

---

### Property 13: Task filter produces correctly filtered results

*For any* combination of active status filters and a search query, the `filteredTasks` array should contain only tasks that satisfy ALL active filter criteria simultaneously:
1. If `activeStatusFilters` is non-empty, every task in the result must have `status` in `activeStatusFilters`.
2. If `searchQuery` is non-empty, every task in the result must have `taskId`, `taskName`, or `module` containing the query string (case-insensitive).
3. If `activeTab` is a specific phase name, every task must have `task.phase === activeTab`.

**Validates: Requirements 12.3**

---

### Property 14: Developer card stats match task aggregation

*For any* developer and a list of tasks, the developer card's displayed stats should equal the directly computed values: `assignedTasks = tasks.filter(t => t.developerId === dev.id).length`, `completedTasks = assigned tasks with status 'Completed'`, etc. No caching or approximation should alter these counts.

**Validates: Requirements 13.4**

---

### Property 15: Report productivity KPI calculation is correct

*For any* list of tasks where `totalTasks > 0`, the Productivity Index displayed on the Reports page should equal `Math.round((completedTasks.length / totalTasks) * 100)`. When `totalTasks === 0`, the Productivity Index should display `0%` rather than NaN or undefined.

*Edge case*: When `totalTasks === 0`, division by zero must be guarded.

**Validates: Requirements 14.2**

---

### Property 16: Upload validation identifies all invalid rows

*For any* set of CSV preview rows and a column mapping, the `runPreviewValidation()` function should:
1. Return `isValid: false` and a non-empty `errors` array if `mapping.taskName` is empty.
2. Return at least one error for every row where the mapped `taskName` cell is empty or whitespace-only.
3. Return at least one error for every pair of rows sharing the same `taskId` value (duplicate detection).
4. Return at least one error for every row with an unparseable date in the mapped date columns.
5. Return `isValid: true` and an empty `errors` array for a correctly mapped set of valid rows.

**Validates: Requirements 16.6**

---

## Error Handling

### Theme fallbacks
- If Inter font fails to load, the `font-family` stack falls back to `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` defined in `index.css`.

### Component error boundaries
- The existing error handling in page components (try/catch in useEffect, Snackbar alerts) is preserved unchanged.
- The `CountUpNumber` component handles `value = 0` and `value = NaN` gracefully: zero displays 0 without animation; NaN falls back to 0.

### Animation safety
- All Framer Motion `motion.div` wrappers check `typeof window !== 'undefined'` is not needed since this is a client-only app, but `AnimatePresence` is wrapped at the router level to avoid mount/unmount conflicts.
- The `drawerVariants` animation only runs when the `open` prop changes; there is no risk of lingering animation state.

### Dark mode persistence
- Theme mode preference is read from `localStorage` on app init and written on every toggle — this already exists in `App.jsx` and is unchanged.

### Reduced motion
- Framer Motion respects `prefers-reduced-motion` automatically via its built-in `useReducedMotion()` hook. Page transition and card animation variants are wrapped in a check so they return instant transitions when the OS preference is set.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are used. Unit tests catch concrete rendering bugs and edge cases; property tests verify universal invariants across generated inputs.

### Unit Testing (example-based)

Use **Vitest** + **React Testing Library** (already available via Vite ecosystem). Unit tests focus on:
- Theme shape (Properties 1 and 2 can be implemented as pure unit tests over the theme object)
- Conditional rendering (sidebar project card, empty states, disabled buttons)
- User interaction events (row click opens drawer, filter chip toggles filter)
- KPI card rendering (all required DOM elements present)

Example unit test file locations:
- `client/src/__tests__/theme.test.js`
- `client/src/__tests__/components/KpiCard.test.jsx`
- `client/src/__tests__/components/TaskDetailsDrawer.test.jsx`
- `client/src/__tests__/pages/Reports.test.jsx`

### Property-Based Testing

Use **fast-check** (install: `npm install --save-dev fast-check`). Each correctness property is implemented as a single property-based test with a minimum of 100 iterations.

Property test file: `client/src/__tests__/properties.test.js`

Tag format per test: `// Feature: premium-dashboard-redesign, Property N: <property title>`

Example structure:
```js
import fc from 'fast-check';
import { getCustomTheme } from '../theme';

// Feature: premium-dashboard-redesign, Property 1: Theme tokens completeness across modes
test('theme has all required tokens for both modes', () => {
  fc.assert(fc.property(fc.constantFrom('light', 'dark'), (mode) => {
    const theme = getCustomTheme(mode);
    const required = ['primary.main', 'secondary.main', 'background.default', ...];
    return required.every(key => /* deep-get key from theme.palette */ !== null);
  }), { numRuns: 100 });
});

// Feature: premium-dashboard-redesign, Property 13: Task filter produces correctly filtered results
test('filteredTasks satisfies all active filter criteria', () => {
  fc.assert(fc.property(
    fc.array(taskArbitrary, { minLength: 0, maxLength: 50 }),
    fc.array(fc.constantFrom(...ALL_STATUSES), { minLength: 0, maxLength: 3 }),
    fc.string(),
    (tasks, activeFilters, query) => {
      const result = applyFilters(tasks, activeFilters, query, 'all');
      return result.every(t =>
        (activeFilters.length === 0 || activeFilters.includes(t.status)) &&
        (query.trim() === '' || [t.taskId, t.taskName, t.module].some(f => f?.toLowerCase().includes(query.toLowerCase())))
      );
    }
  ), { numRuns: 100 });
});
```

### Test Configuration

Run tests with: `npx vitest --run` (single pass, no watch mode).

Each property-based test runs a **minimum of 100 iterations** (fast-check default). Complex properties (filter logic, validation) run 200 iterations.

### Coverage Targets

- Theme and pure utility functions: 100% line coverage
- Component rendering (unit): happy path + key edge cases
- Property tests: all 16 correctness properties implemented
