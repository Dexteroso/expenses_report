# Codebase Audit Report

Generated: 2026-05-30

Scope: `frontend`, `backend`, `activity-service`, `docs`, and root project files. Dependency folders and generated frontend build output were excluded from source findings unless explicitly noted.

No application files were modified during this audit.

## Commands Used

- `rg --files`
- `find . -path './frontend/node_modules' -prune -o -path './backend/node_modules' -prune -o -path './activity-service/node_modules' -prune -o -path './frontend/dist' -prune -o -type f -empty -print`
- `npm run lint` in `frontend`
- Static import/reference scans for React components, CSS selectors, assets, repeated style literals, and backend module usage.

## Executive Summary

The codebase is functional but is accumulating frontend duplication and backend controller/data-access coupling that will make long-term scaling harder. The highest-value cleanup areas are:

1. Centralize frontend layout/card/form/table/modal primitives into a design system.
2. Consolidate theme tokens; there are currently multiple token sources and many hard-coded colors, spacing, font sizes, radii, and shadows.
3. Split large backend controllers into service/repository layers and standardize on one data-access strategy per domain.
4. Remove dead frontend assets/selectors and stale activity event labels.
5. Fix frontend lint failures before using lint as a CI gate.

## Empty Files

Source scan excluding `node_modules` and `frontend/dist` found one empty file:

- `backend/.gitignore`

The initial all-files scan also found empty files inside dependency packages and generated output, but those are not application-source issues.

## Duplicate Code Blocks

### Repeated frontend card style blocks

Multiple pages define nearly identical `cardStyle` objects inline:

- `frontend/src/components/AccountsPage.jsx:23`
- `frontend/src/components/UsersPage.jsx:9`
- `frontend/src/components/BudgetPage.jsx:34`
- `frontend/src/components/RealVsBudgetPage.jsx:43`
- `frontend/src/components/ActivityPage.jsx:64`

Common repeated shape:

```js
{
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: '12px',
  padding: '16px',
  boxShadow: theme.shadow,
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
}
```

Recommendation: move this into a shared `AppCard`, `PageCard`, or `Surface` component/style API. `frontend/src/components/ui/AppCard.jsx` already exists but is mostly auth-focused.

### Repeated full-page scroll layout

The page layout block using `display: 'grid'`, `gridTemplateRows: 'auto minmax(0, 1fr)'`, `height: 'calc(100vh - 96px)'`, and `overflow: 'hidden'` is repeated in:

- `frontend/src/components/ActivityPage.jsx:120`
- `frontend/src/components/BudgetPage.jsx` via the same page layout pattern
- `frontend/src/components/RealVsBudgetPage.jsx:281`

Recommendation: centralize as a `PageShell` or `DataPageLayout` component.

### Repeated month/category constants

Month/category definitions are duplicated instead of centralized:

- Month names:
  - `frontend/src/components/DateInput.jsx:3`
  - `frontend/src/components/ActivityPage.jsx:41`
  - `frontend/src/components/ExpensesTable.jsx:211`
- Short month labels:
  - `frontend/src/components/BudgetPage.jsx:9`
  - `frontend/src/components/ExpensesTable.jsx:166`
- Full month options:
  - `frontend/src/components/DashboardPage.jsx:15`
  - `frontend/src/components/RealVsBudgetPage.jsx:8`
- Category display order:
  - `frontend/src/components/BudgetPage.jsx:10`
  - `frontend/src/components/RealVsBudgetPage.jsx:23`

Recommendation: move to `frontend/src/constants/date.js` and `frontend/src/constants/categories.js`.

### Repeated backend formatting/activity helpers

Backend controllers duplicate small domain helpers:

- `formatDateOnly` exists in:
  - `backend/src/controllers/accountsController.js:56`
  - `backend/src/controllers/expensesController.js:216`
- `buildFavoriteActivityMetadata` exists in:
  - `backend/src/controllers/favoriteMovementsController.js:67`
  - `backend/src/controllers/expensesController.js:205`

Recommendation: move common formatting and activity metadata builders into shared utility modules.

### Repeated test setup

Backend tests repeatedly register/login users and create accounts using similar request blocks. Duplication appears across:

- `backend/tests/accounts.test.js`
- `backend/tests/activity.test.js`
- `backend/tests/expenses.test.js`
- `backend/tests/favoriteMovements.test.js`
- `backend/tests/validation.test.js`

Recommendation: introduce test factories/helpers for authenticated users, accounts, categories/concepts, and favorite movements.

## Unused Components

No unused React components were found by import graph. Every file under `frontend/src/components/**/*.jsx` has at least one importer:

- Page components are imported by `frontend/src/App.jsx`.
- UI components are imported by page/auth/dashboard components.

However, several UI components are narrowly scoped and should be generalized:

- `AppCard` currently exposes auth-specific CSS variables (`--auth-card-*`).
- `PrimaryButton` uses auth-specific CSS variables (`--auth-primary-*`, `--auth-button-*`) while being used across the app.
- `TextInput` uses auth-specific CSS variables while also being a general input primitive.

## Unused Imports

Frontend ESLint found two true unused variable/import-style issues:

- `frontend/src/components/DashboardPage.jsx:627` - `amount` is defined but never used.
- `frontend/src/utils/auth.js:25` - `error` is defined but never used.

No unused backend CommonJS imports were found by static require-usage scan.

## Dead Code

### Unused theme export

- `frontend/src/theme/theme.js:20` exports `darkTheme`, but it is not imported anywhere.

This is dead code unless dark mode is planned soon. If dark mode is planned, the app needs an actual theme provider/toggle rather than an unused export.

### Duplicate typography systems

There are two active typography token modules:

- `frontend/src/styles/typography.js`
- `frontend/src/theme/typography.js`

Most pages import `styles/typography`, while `AuthLayout` imports `theme/typography`. This split makes token drift likely.

### Unused CSS selectors

Selectors defined but not referenced outside their own CSS definitions:

- `frontend/src/App.css:164` - `.ticks`
- `frontend/src/index.css:840` - `.budget-page-subtitle`
- `frontend/src/index.css:997` - `.onboarding-guidance`
- `frontend/src/index.css:2018` - `.budget-sticky-left`
- `frontend/src/index.css:2553` - `.mobile-topbar-version`
- `frontend/src/index.css:2555` - `.user-meta-version`
- `frontend/src/index.css:2619` - `.expense-form-card .expense-field-type`
- `frontend/src/index.css:3828` - `.favorite-movements-empty`

### Unused/stale activity event labels

`frontend/src/components/ActivityPage.jsx` defines labels/icons for events that the backend does not emit:

- `account.reactivated`
- `budget.created`
- `favorite.updated`

Backend currently emits `account.created`, `account.updated`, `account.deactivated`, `budget.updated`, `favorite.created`, `favorite.deleted`, and `favorite.used`, but not the three events above.

### Unused or likely stale assets

Static reference scan found these assets not referenced from `frontend/src`:

- `frontend/src/assets/Finance-App-1.png`
- `frontend/src/assets/brand/dexforge-icon.png`
- `frontend/src/assets/brand/dexforge-logo-compact.png`
- `frontend/src/assets/brand/dexforge-logo-horizontal.png`
- `frontend/src/assets/favicon.png`
- `frontend/src/assets/hero.png`
- `frontend/src/assets/icon.png`
- `frontend/src/assets/react.svg`
- `frontend/src/assets/vite.svg`

Public assets not referenced from source:

- `frontend/public/favicon.png`
- `frontend/public/favicon.svg`
- `frontend/public/icons.svg`

Also, `frontend/index.html:5` references `/icon.png`, but no `frontend/public/icon.png` exists. This likely produces a missing favicon request in production.

## Lint Findings

`npm run lint` in `frontend` failed with 31 problems:

- 27 errors
- 4 warnings

Notable categories:

- Synchronous state updates inside effects:
  - `frontend/src/App.jsx:41`
  - `frontend/src/App.jsx:346`
  - `frontend/src/App.jsx:351`
  - `frontend/src/App.jsx:362`
  - `frontend/src/components/AccountsPage.jsx:90`
  - `frontend/src/components/AddExpenseForm.jsx:191`
  - `frontend/src/components/AddExpenseForm.jsx:212`
  - `frontend/src/components/AddExpenseForm.jsx:229`
  - `frontend/src/components/AddExpenseForm.jsx:245`
  - `frontend/src/components/AuthPage.jsx:46`
  - `frontend/src/components/BudgetPage.jsx:92`
  - `frontend/src/components/DateInput.jsx:104`
  - `frontend/src/components/FavoriteMovementsCard.jsx:39`
  - `frontend/src/components/UsersPage.jsx:65`
- Missing hook dependencies:
  - `frontend/src/components/AddExpenseForm.jsx:207`
  - `frontend/src/components/DateInput.jsx:106`
  - `frontend/src/components/ExpensesTable.jsx:116`
  - `frontend/src/components/UsersPage.jsx:66`
- Redundant boolean casts:
  - `frontend/src/components/UsersPage.jsx:274`
  - `frontend/src/components/UsersPage.jsx:275`
  - `frontend/src/components/UsersPage.jsx:283`
  - `frontend/src/components/UsersPage.jsx:285`
  - `frontend/src/components/UsersPage.jsx:306`
  - `frontend/src/components/UsersPage.jsx:354`
  - `frontend/src/components/UsersPage.jsx:355`
  - `frontend/src/components/UsersPage.jsx:395`
  - `frontend/src/components/UsersPage.jsx:396`
  - `frontend/src/components/UsersPage.jsx:399`
- Duplicate object key:
  - `frontend/src/styles/typography.js:33` has duplicate `color`.
- Unused variables:
  - `frontend/src/components/DashboardPage.jsx:627`
  - `frontend/src/utils/auth.js:25`

## Repeated Styles

### Inline style proliferation

The frontend mixes large inline style objects, CSS classes in `index.css`, scoped CSS in `PortfolioPage.css`, and small UI components. This makes style reuse hard to enforce.

High-duplication examples:

- Card surfaces repeated across account, user, budget, report, activity, movement, and favorite views.
- Modal overlays repeat `rgba(15, 23, 42, 0.45)` and similar fixed positioning.
- Table cell/header styles repeat across account, user, budget, and report tables.
- Field label styles repeat `fontSize: 12`, bold weight, and theme text colors.
- Button styles exist both in `PrimaryButton`, `styles/typography.js` (`buttonStyle`), raw `<button>` elements, and CSS classes.

Recommendation: centralize primitives:

- `PageShell`
- `PageHeader`
- `Surface` / `Card`
- `Modal`
- `DataTable`
- `Field`
- `Button`
- `EmptyState`
- `StatusMessage`

## Repeated Colors, Fonts, and Sizing Definitions

Static scan found many repeated literal tokens despite existing theme files.

Most repeated color literals:

- `#fff` - 60 occurrences
- `#0f172a` - 35 occurrences
- `#64748b` - 29 occurrences
- `#11A9CC` - 18 occurrences
- `#f8fafc` - 17 occurrences
- `#e2e8f0` - 14 occurrences
- `#384f7f` - 13 occurrences
- `#b91c1c` - 12 occurrences
- `#2563EB` - 12 occurrences
- `#94a3b8` - 12 occurrences

Repeated sizing/font tokens:

- `fontSize: 12` - 28 occurrences
- `13px` font size - 26 occurrences
- `12px` font size - 23 occurrences
- `14px` font size - 17 occurrences
- `8px` radius - 18 occurrences
- `12px` radius - 10 occurrences
- `8px` spacing - 27 occurrences
- `10px` spacing - 34 occurrences

Recommendation: consolidate into one token source and consume via CSS variables or a theme object:

- `color.text.primary`, `color.text.muted`, `color.border.default`, `color.surface.default`, `color.status.error`
- `space.1` through `space.8`
- `radius.sm`, `radius.md`, `radius.lg`, `radius.pill`
- `font.size.xs/sm/md/lg`
- `shadow.card`, `shadow.modal`, `shadow.focus`

## Components to Centralize Into a Design System

The existing UI folder is a good start, but the primitives are too auth/dashboard-specific. These should be generalized:

- `PrimaryButton` -> design-system `Button` with variants: primary, secondary, ghost, danger, icon.
- `TextInput` -> design-system `Input`, plus `Select`, `Textarea`, `NumberInput`, and `DateInput`.
- `AppCard` / `DashboardCard` -> single `Card` or `Surface` primitive with density variants.
- Page headers currently duplicated -> `PageHeader`.
- Empty/onboarding cards -> `EmptyState` and `OnboardingPrompt`.
- Modal overlays/content -> `Modal`.
- Tables and mobile list fallbacks -> `DataTable` plus `ResponsiveRecordList`.
- Status/error text -> `Alert` or `InlineMessage`.
- KPI/dashboard cards -> `MetricCard`.

Priority order:

1. `Button`, `Input`, `Card`, `Modal`
2. `PageShell`, `PageHeader`, `DataTable`
3. `EmptyState`, `MetricCard`, `StatusMessage`

## Architecture Concerns

### Backend controllers are too large and own too many responsibilities

Large controllers combine validation, persistence, formatting, activity logging, response shaping, and business rules:

- `backend/src/controllers/expensesController.js` - 658 lines
- `backend/src/controllers/authController.js` - 354 lines
- `backend/src/controllers/accountsController.js` - 363 lines
- `backend/src/controllers/usersController.js` - 321 lines
- `backend/src/controllers/favoriteMovementsController.js` - 288 lines
- `backend/src/controllers/budgetsController.js` - 257 lines

This makes behavior harder to test in isolation and encourages duplication. Introduce service modules such as `expensesService`, `accountsService`, `budgetsService`, and repositories for database access.

### Mixed data-access patterns in the same backend

The backend mixes raw MySQL pool queries and Sequelize models:

- Raw pool usage:
  - `backend/src/controllers/authController.js:4`
  - `backend/src/controllers/usersController.js:1`
  - `backend/src/controllers/categoriesController.js:1`
  - `backend/src/controllers/conceptsController.js:1`
  - `backend/src/utils/onboardingStatus.js:1`
  - `backend/src/utils/systemAccounts.js:1`
- Sequelize usage:
  - `backend/src/controllers/accountsController.js:1`
  - `backend/src/controllers/expensesController.js:1`
  - `backend/src/controllers/budgetsController.js:1`
  - `backend/src/controllers/reportsController.js:1`
  - `backend/src/models/sequelize/*`

This increases transaction-boundary risk and makes migrations/model ownership unclear. Pick one pattern per bounded domain or introduce repository interfaces that hide the persistence mechanism.

### Activity logging is split across backend and activity-service

There are two `ActivityLog` model definitions:

- `backend/src/models/activityLogModel.js`
- `activity-service/src/activityLogModel.js`

The backend also writes directly to Mongo via `backend/src/utils/activityLogger.js`, while `activity-service` exposes a separate logging endpoint. This creates ambiguity about the source of truth and schema evolution.

Recommendation: either make activity-service the only write path or remove the service and keep activity logging inside the backend. If the service remains, share the schema through a package or contract.

### Frontend `App.jsx` is too broad

`frontend/src/App.jsx` is 740 lines and owns routing, shell layout, auth state, onboarding flows, navigation, logout modal, movement page composition, and branding. This will become a bottleneck as routes and onboarding flows grow.

Recommendation: split into:

- `AppRoutes`
- `AuthenticatedLayout`
- `SidebarNav`
- `MobileNav`
- `OnboardingProvider`
- `MovementPage`
- `LogoutModal`

### Large frontend page components mix data, presentation, and workflows

Examples:

- `frontend/src/components/AddExpenseForm.jsx` - 799 lines
- `frontend/src/components/BudgetPage.jsx` - 794 lines
- `frontend/src/components/RealVsBudgetPage.jsx` - 738 lines
- `frontend/src/components/DashboardPage.jsx` - 692 lines
- `frontend/src/components/ExpensesTable.jsx` - 681 lines

Recommendation: extract hooks for API/data behavior and split presentational subcomponents. Example hooks:

- `useExpenses`
- `useAccounts`
- `useBudgets`
- `useRealVsBudgetReport`
- `useActivityLogs`

### Frontend API contract is scattered

Many components manually construct URLs with `API_BASE_URL` and `authFetch`. There is no typed/domain API client layer.

Recommendation: centralize API calls by domain:

- `frontend/src/api/accounts.js`
- `frontend/src/api/expenses.js`
- `frontend/src/api/budgets.js`
- `frontend/src/api/reports.js`
- `frontend/src/api/activity.js`

This would simplify error handling, loading states, and future contract changes.

### CSS architecture is concentrated and hard to govern

`frontend/src/index.css` is 5,280 lines. Combined with inline styles and smaller CSS files, this makes it hard to know where a style should live or whether a selector is still safe to remove.

Recommendation: after design-system primitives exist, split styles by primitive/page or migrate shared styling to component-scoped modules.

## Recommended Cleanup Roadmap

### Phase 1: Low-risk dead code cleanup

- Remove unused CSS selectors after visual verification.
- Remove unused assets or move them to an archive if they are placeholders.
- Fix `frontend/index.html:5` to reference an existing public icon.
- Remove `darkTheme` or implement actual theme switching.
- Remove stale activity event labels/icons or add backend events if they are product requirements.

### Phase 2: Lint stabilization

- Fix unused variables and duplicate object key.
- Address hook dependency warnings.
- Decide whether `react-hooks/set-state-in-effect` should be enforced as configured; many current data-fetching effects trip it.
- Add frontend lint to CI once clean.

### Phase 3: Design-system extraction

- Generalize `PrimaryButton`, `TextInput`, and `AppCard`.
- Add `Modal`, `PageShell`, `PageHeader`, `DataTable`, and `StatusMessage`.
- Replace repeated `cardStyle`, modal, table, and form field patterns.
- Consolidate typography/theme files into one token system.

### Phase 4: Backend service/repository split

- Extract validation and service logic from large controllers.
- Standardize persistence boundaries.
- Consolidate activity metadata builders.
- Decide whether `activity-service` or backend owns activity writes.

## Residual Risk

This was a static audit plus frontend lint run. I did not run backend tests or build commands because the request was for an audit/report only and no code changes. Some dead-code findings, especially assets and CSS selectors, should be verified visually before deletion.
