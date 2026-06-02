# Sprint 0 Cleanup Report

Generated: 2026-05-30

Scope: low-risk dead code cleanup only, based on `CODEBASE_AUDIT_REPORT.md`.

## Files Changed

- `backend/.gitignore`
  - Populated the previously empty backend ignore file with backend-local ignores for dependencies, env files, logs, coverage, build output, and `.DS_Store`.
  - Rationale: the audit flagged the file as empty. Keeping it empty provides no value, and these entries match normal backend-generated artifacts without affecting source behavior.

- `frontend/index.html`
  - Changed favicon reference from `/icon.png` to `/favicon.png`.
  - Rationale: `frontend/public/icon.png` does not exist; `frontend/public/favicon.png` does exist and is now the active favicon target.

- `frontend/src/components/DashboardPage.jsx`
  - Removed the unused `amount` parameter from `getAvailableBudgetKpiColor`.
  - Rationale: ESLint identified it as unused, and the function only uses `percent`.

- `frontend/src/utils/auth.js`
  - Changed `catch (error)` to `catch` in `getUser`.
  - Rationale: ESLint identified `error` as unused; behavior is unchanged.

- `frontend/src/styles/typography.js`
  - Removed the duplicate `color: Theme.sidebarText` key from `buttonStyle`.
  - Rationale: duplicate object keys are dead/confusing and the remaining value is identical.

- `frontend/src/theme/theme.js`
  - Removed the unused `darkTheme` export.
  - Rationale: static scan found no imports or runtime usage. The app has no theme switching behavior to preserve.

- `frontend/src/components/ActivityPage.jsx`
  - Removed stale labels and icon mappings for `account.reactivated`, `budget.created`, and `favorite.updated`.
  - Rationale: backend emitters were checked and do not emit these event types.

- `frontend/src/App.css`
  - Removed `.ticks`.
  - Rationale: confirmed unused in `frontend/src`.

- `frontend/src/index.css`
  - Removed unused selectors:
    - `.budget-page-subtitle`
    - `.onboarding-guidance` from the `.onboarding-card, .onboarding-guidance` selector
    - `.budget-sticky-left`
    - `.mobile-topbar-version`
    - `.user-meta-version`
    - `.expense-form-card .expense-field-type`
    - `.favorite-movements-empty`
  - Rationale: confirmed unused in `frontend/src`; live selectors sharing the same blocks were preserved.

## Files Removed

Each removed asset filename was searched across source/docs/config outside `node_modules` and `frontend/dist` before deletion.

- `frontend/src/assets/Finance-App-1.png`
- `frontend/src/assets/brand/dexforge-icon.png`
- `frontend/src/assets/brand/dexforge-logo-compact.png`
- `frontend/src/assets/brand/dexforge-logo-horizontal.png`
- `frontend/src/assets/favicon.png`
- `frontend/src/assets/hero.png`
- `frontend/src/assets/icon.png`
- `frontend/src/assets/react.svg`
- `frontend/src/assets/vite.svg`
- `frontend/public/favicon.svg`
- `frontend/public/icons.svg`

## Items Intentionally Left Untouched

- `frontend/public/favicon.png`
  - Kept because `frontend/index.html` now references it.

- `.DS_Store` files
  - Left untouched because they were not part of the audited Phase 1 list. `backend/.gitignore` now prevents backend-local `.DS_Store` churn.

- Existing hook lint findings
  - Left untouched because changing effect behavior belongs to Phase 2 lint stabilization and could alter UI/data loading behavior.

- Existing `no-extra-boolean-cast` findings in `UsersPage.jsx`
  - Left untouched because they were not listed as approved Sprint 0 changes and are Phase 2 lint cleanup.

- Design-system, architecture, component split, API, route, and database concerns
  - Left untouched by request.

## Verification

- Confirmed removed CSS selectors no longer appear in `frontend/src`.
- Confirmed removed stale activity events only appeared in `ActivityPage.jsx` and are not emitted by backend controllers.
- Confirmed removed asset filenames no longer appear in source/docs/config after deletion.
- Confirmed `frontend/index.html` references an existing public favicon.

## Lint Result

Command run:

```bash
npm run lint
```

Result: failed with 28 remaining problems.

Issues fixed compared with the audit:

- `frontend/src/components/DashboardPage.jsx:627` unused `amount` parameter fixed.
- `frontend/src/utils/auth.js:25` unused `error` binding fixed.
- `frontend/src/styles/typography.js:33` duplicate `color` key fixed.

Issues remaining:

- 24 errors.
- 4 warnings.
- Remaining categories:
  - `react-hooks/set-state-in-effect`
  - `react-hooks/exhaustive-deps`
  - `no-extra-boolean-cast`

These remaining lint findings were intentionally not changed because they are outside the approved low-risk Phase 1 cleanup scope.
