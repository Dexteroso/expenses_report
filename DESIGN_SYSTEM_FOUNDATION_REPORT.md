# Design System Foundation Report

Generated: 2026-06-02

Scope: DexForge v2.0 Sprint 0 design-system foundation only. Existing production screens were not migrated to the new components.

## Source Priority Used

1. `dexforge_ui_design_system.xlsx`
2. Current frontend implementation

The spreadsheet was treated as the official design reference. The current codebase was used to preserve compatibility and document conflicts.

## Files Created

### Tokens

- `frontend/src/design-system/tokens/colors.js`
- `frontend/src/design-system/tokens/gradients.js`
- `frontend/src/design-system/tokens/typography.js`
- `frontend/src/design-system/tokens/spacing.js`
- `frontend/src/design-system/tokens/radius.js`
- `frontend/src/design-system/tokens/shadows.js`
- `frontend/src/design-system/tokens/zIndex.js`
- `frontend/src/design-system/tokens/index.js`

### Components

- `frontend/src/design-system/components/Button.jsx`
- `frontend/src/design-system/components/Card.jsx`
- `frontend/src/design-system/components/Input.jsx`
- `frontend/src/design-system/components/Modal.jsx`
- `frontend/src/design-system/components/PageHeader.jsx`
- `frontend/src/design-system/components/PageShell.jsx`
- `frontend/src/design-system/components/index.js`

### Playground and Barrel Export

- `frontend/src/design-system/DesignSystemPlayground.jsx`
- `frontend/src/design-system/index.js`

## Files Modified

- `frontend/src/App.jsx`
  - Added a development-only `/dev/design-system` route.
  - The route is gated by `import.meta.env.DEV`.
  - Production app routing remains unchanged.

## Tokens Extracted From Spreadsheet

- Backgrounds:
  - App background: `#F3F4F6`
  - Surface: `#FFFFFF`
  - Disabled/surface muted: `#F8FAFC`

- Brand colors and gradients:
  - Primary cyan: `#11A9CC`
  - Primary hover: `#0E95B5`
  - Sidebar/mobile gradient: `#582888` to `#557EFA`

- Typography:
  - Font family: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  - Heading: `40px`, bold, `#11A9CC`
  - Subtitle: `20px`, bold, `#666666`
  - Body: `12px`, normal, `#666666`

- Cards:
  - Desktop primary card radius: `30px`
  - Mobile primary card radius: `50px`
  - Desktop card padding: `24px`
  - Mobile card padding: `20px`
  - Card shadow: `0 18px 45px rgba(15, 23, 42, 0.12)`

- Buttons:
  - Primary background: `#11A9CC`
  - Primary hover background: `#0E95B5`
  - Disabled background: `#F8FAFC`
  - Disabled text: `#94A3B8`
  - Disabled border: `#E2E8F0`
  - Danger background: `#EF4444`
  - Height: `48px`
  - Radius: `15px`

- Inputs:
  - Active background: `#FFFFFF`
  - Active border: `#11A9CC`
  - Disabled border: `#E2E8F0`
  - Text: `#374151`
  - Disabled text: `#94A3B8`
  - Height: `30px`
  - Radius: `15px`

- Layout:
  - Content max width: `1380px`
  - Desktop content padding: `24px`
  - Sidebar width: `240px`
  - Mobile drawer width: `82vw`, max `320px`

- Shadows and z-index:
  - Table shadow: `0 12px 32px rgba(15,23,42,0.10)`
  - Modal shadow: `0 24px 60px rgba(15,23,42,0.18)`
  - Drawer shadow: `0 18px 45px rgba(15,23,42,0.20)`
  - Table/modal z-index: `400`
  - Drawer z-index: `500`
  - Dashboard z-index: `600`

## Components Created

- `Button`
  - Variants: `primary`, `secondary`, `ghost`, `danger`, `icon`
  - Supports `disabled` and `isLoading`

- `Card`
  - Variants: `default`, `compact`, `metric`

- `Input`
  - Supports label, disabled state, helper text, and error text

- `Modal`
  - Token-based overlay/card example component

- `PageHeader`
  - Supports eyebrow, title, subtitle, and actions

- `PageShell`
  - Token-based app background and centered content container

## Playground Route

- Route: `/dev/design-system`
- Dev-only gate: `import.meta.env.DEV`
- Displays:
  - Button variants
  - Card variants
  - Input states
  - Modal example
  - PageHeader example
  - PageShell example
  - Token previews for colors, typography, spacing, radius, shadows, and z-index

## Conflicts Between Spreadsheet and Current Code

- Heading color:
  - Spreadsheet: `#11A9CC`
  - Current code: many production page headers use `#0f172a` or `#384f7f`
  - Resolution: design-system token follows spreadsheet; existing pages were not changed.

- Body text color:
  - Spreadsheet: `#666666`
  - Current code: commonly uses `#64748b`, `#6b7280`, and `#374151`
  - Resolution: spreadsheet body color was included, and current-compatible text colors were also tokenized.

- Card radius:
  - Spreadsheet: `30px` desktop, `50px` mobile
  - Current code: auth cards align closely, while many page cards use `12px`, `16px`, or `28px`
  - Resolution: design-system card tokens follow spreadsheet; existing pages were not migrated.

- Modal z-index:
  - Spreadsheet: modal z-index `400`
  - Current code: production modals commonly use `1000`
  - Resolution: foundation token follows spreadsheet; production modal behavior was not changed.

- Sidebar width:
  - Spreadsheet: `240px`
  - Current `App.jsx`: `170px`
  - Resolution: token captures spreadsheet value; production shell was not modified.

- Button hover height:
  - Spreadsheet row lists active button height `48px` and hover height `44px`, while notes also say hover transform should not push content.
  - Current code keeps min-height stable and uses `translateY(-1px)`.
  - Resolution: foundation keeps stable `48px` height to preserve layout stability; conflict documented.

## Items Intentionally Left For Later

- Migrating existing pages to the new design-system components.
- Replacing current `frontend/src/theme/*` files.
- Consolidating existing CSS in `frontend/src/index.css`.
- Creating data table, select, textarea, alert, drawer, and metric-specific production components.
- Resolving documented design conflicts.
- Code splitting the new playground or existing large frontend bundle.

## Validation Results

### Lint

Command:

```bash
npm run lint
```

Result:

- Passed
- `0` errors
- `0` warnings

### Build

Command:

```bash
npm run build
```

Result:

- Passed
- Vite emitted an existing large chunk warning for the app bundle.

### Local Browser Verification

Dev server:

```bash
npm run dev -- --host 127.0.0.1
```

Verified:

- `/dev/design-system`
  - Rendered `Design System`
  - Rendered playground buttons and cards

- `/auth`
  - Rendered `Inicia sesión`

- `/portfolio`
  - Rendered `Administrador de Finanzas Personales`

- `/dashboard`
  - Redirected unauthenticated users to auth and rendered `Inicia sesión`

Playground screenshot:

![Design system playground](/private/tmp/dexforge-design-system-playground.png)
