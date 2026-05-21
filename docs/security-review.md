# Security Review

Date: 2026-05-21

This review documents the security checks added for the project requirement to prevent common attacks such as XSS and SQL injection.

## Automated Regression Coverage

Dedicated security tests were added in `backend/tests/security.test.js`.

Covered cases:

- Login treats SQL injection payloads as plain credentials and does not return a JWT.
- Expense query filters reject SQL-like values before database access.
- Route parameters reject SQL-like identifiers.
- XSS-like account names are returned only as JSON data, not HTML.
- Frontend source does not use direct HTML injection APIs such as `dangerouslySetInnerHTML` or `innerHTML`.

Validation command:

```bash
cd backend
npm test
```

Result on 2026-05-21:

```text
Test Suites: 8 passed, 8 total
Tests:       51 passed, 51 total
```

## Dependency Audit Commands

The following scripts were added:

```bash
cd backend
npm run security:audit

cd frontend
npm run security:audit
```

## Dependency Audit Results

Frontend audit result after non-forced `npm audit fix`:

```text
found 0 vulnerabilities
```

Backend audit result after non-forced `npm audit fix`:

```text
2 moderate severity vulnerabilities
```

Remaining backend advisory:

- `uuid <11.1.1`, reported through `sequelize`.
- npm only offers `npm audit fix --force`, which would install `sequelize@3.30.0`.
- That is a breaking downgrade from the current Sequelize 6 dependency, so it was not applied.

## Risk Decision

The non-forced audit fixes were applied because they update transitive packages without requiring breaking dependency changes. The forced Sequelize downgrade was intentionally not applied because it risks breaking the existing ORM models and controller behavior.

The remaining backend advisory is tracked as dependency risk, while the implemented regression tests directly cover the PDF requirement for SQL injection and XSS-style payload handling.

## Additional Verification

Frontend production build was also run after the dependency fix:

```bash
cd frontend
npm run build
```

Result:

```text
build passed
```

Vite still reports an existing bundle-size warning for a JavaScript chunk larger than 500 kB. That warning is performance-related, not an XSS or SQL injection finding.
