# Expenses Report — Project Status

## Current phase
Week 5 of 5 (Final integration and delivery phase)

Current focus:
- Production stabilization
- Real-device responsive polish
- Security hardening
- Final documentation
- Presentation readiness
- Testing expansion
- Deployment validation
- Performance and monitoring review
- UX/UI consistency
- Guided first-user onboarding flow
- iOS Safari mobile UX fixes
- Real-device onboarding validation

Recently completed:
- Minimal backend security hardening from final review
- npm audit review completed with 0 vulnerabilities
- Dockerized multi-service architecture
- VPS production deployment (DigitalOcean)
- Real iPhone responsive validation
- Swagger final route documentation review
- Mobile navigation redesign
- Mobile movement list redesign
- Frequent movements feature (`Movimientos Frecuentes`)
- Financial insights widget
- Responsive/mobile optimization
- Guided onboarding flow for first-time users
- Dashboard onboarding/navigation helper
- Mobile onboarding modal overlays
- Real-device iOS Safari input behavior fixes
- Mobile financial dashboard polish
- Variaciones responsive redesign
- AddExpenseForm mobile UX improvements
- Frequent movements UX rename (`Movimientos Frecuentes`)
- iOS input zoom prevention improvements
- JWT auth hardening
- Rate limiting + helmet
- Activity/audit logging module

Remaining goals before final delivery:
- README professionalization
- Final screenshots and demo material
- Monitoring/profiling documentation
- Architecture explanation
- Reflection/documentation deliverables

---

## App overview
Full-stack personal finance web app:

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL
- ORM migration: Sequelize started incrementally
- Auth: JWT + bcrypt
- API Docs: Swagger
- Testing: Jest + Supertest

Main capabilities:
- Movimientos (expenses/income)
- Cuentas (accounts)
- Presupuesto (budget)
- Variaciones (real vs budget)
- Dashboard (Resumen)
- Usuarios (admin)
- Actividad (audit log)

---

## Backend status

### Auth
- Register
- Login
- Forgot password email flow with generic account-safe response
- Reset password
- JWT authentication
- bcrypt hashing

### Middleware
- express.json()
- cors
- CORS allows local Vite frontend (`http://localhost:5173`) and production frontend through `FRONTEND_URL`
- helmet
- rate limiting (general + auth)
- authMiddleware
- adminMiddleware

### Deployment configuration
- Backend server port now uses `process.env.PORT || 3000`.
- Backend CORS supports cloud frontend deployment through `FRONTEND_URL`.
- Swagger server URL can be configured with `API_URL`.
- App is prepared for separate frontend/backend cloud deployment without changing API routes.
- Production startup now validates required environment variables and fails fast without printing secret values.
- Production password reset email requires Resend environment variables and never returns reset tokens in API responses.
- Production deployments must override Docker demo/default secrets with explicit environment values.

### Swagger / OpenAPI documentation
- Swagger final route documentation review completed.
- Swagger tags are defined for:
  - Auth
  - Users
  - Expenses
  - Accounts
  - Budgets
  - Reports
  - Activity
  - Favorite Movements
  - Categories
  - Concepts
- Missing route docs added for:
  - Activity
  - Favorite Movements
  - Categories
  - Concepts
- Protected endpoints document bearer JWT auth.
- Public catalog/auth endpoints explicitly opt out of bearer auth where appropriate.
- Request bodies, query parameters, path parameters, examples, and relevant error responses were reviewed.
- Validation after Swagger review:
  - OpenAPI spec generates successfully: 20 paths / 25 operations
  - `/api-docs/` responds with HTTP 200 in local smoke test
  - Backend tests pass: 7 suites / 39 tests

### Local Docker Compose
- Docker Compose added for local multi-service execution.
- Services included:
  - React/Vite frontend served through nginx
  - Express backend
  - MySQL 8
  - MongoDB 7
- Frontend container maps to `http://localhost:5173`.
- Backend container maps to `http://localhost:3000`.
- MySQL maps host port `3307` to container port `3306` to avoid local MySQL conflicts.
- MongoDB maps host port `27018` to container port `27017` to avoid local Mongo conflicts.
- Backend container uses Docker service names for database connections:
  - `DB_HOST=mysql`
  - `MONGO_URI=mongodb://mongo:27017/expenses_activity`
- Docker secrets are not baked into Dockerfiles; local defaults can be overridden with `.env`.
- Docker usage is documented in `DOCKER.md`.
- `.env.docker.example` added with local Docker defaults and demo login notes.
- `backend/sql/init.sql` added as the Docker MySQL fresh-volume initialization script.
- Docker MySQL initialization creates the existing app tables, category/concept catalog, one demo admin user, demo accounts, demo budgets, and demo expenses.
- Docker MySQL initialization also creates and seeds `favorite_movements` demo presets for the Movimientos Frecuentes feature.
- `backend/sql/init.sql` is mounted into `/docker-entrypoint-initdb.d/init.sql` and runs only when the MySQL Docker volume is first created.
- Docker demo data is enough to validate Dashboard, Movimientos, Presupuesto, Variaciones, Cuentas, and Usuarios immediately.
- Actividad can be validated after first login because the existing MongoDB Activity module records the login event.
- Demo Docker admin login:
  - `admin.docker@example.com`
  - `DockerDemo123!`
- Validation after Docker setup:
  - `docker compose config` passes
  - Backend tests pass: 6 suites / 35 tests
  - Frontend production build passes

### Protected routes
- /api/expenses
- /api/accounts
- /api/budgets
- /api/reports
- /api/activity

### Complementary NoSQL module
- MongoDB added as a complementary NoSQL module for activity/audit logs only.
- Activity logs are stored in MongoDB through Mongoose.
- MySQL remains the core financial database and source of truth for users, expenses, accounts, budgets, categories, concepts, and reports.
- Core financial data was not migrated to MongoDB.

### Sequelize ORM migration
- Sequelize integration started as an incremental migration over the existing MySQL database.
- `mysql2` is retained as the Sequelize MySQL driver and for modules that still use raw queries.
- Phase 1 migrated only the Accounts module to Sequelize.
- Accounts now use Sequelize models/methods while preserving existing `/api/accounts` routes and response shapes.
- Phase 2 migrated only the Expenses module to Sequelize.
- Expenses now use Sequelize models/methods while preserving existing `/api/expenses` routes and response shapes.
- Phase 3 migrated only the Budgets module to Sequelize.
- Budgets now use Sequelize models/methods while preserving existing `/api/budgets` routes and response shapes.
- Phase 4 migrated only the Reports module to Sequelize.
- Reports now use Sequelize for real-vs-budget report queries and aggregations.
- Accounts, Expenses, Budgets, and Reports are now on Sequelize.
- Lightweight Sequelize `User` model added only to support `Account belongsTo User` / `User hasMany Accounts` associations.
- Sequelize `Expense`, `Category`, and `Concept` models added for expense associations.
- Sequelize `Budget` model added with associations to `User` and `Concept`; category context is still resolved through `Concept -> Category` because the existing `budgets` table has no `category_id` column.
- No schema regeneration, forced sync, table drops, or core data migration were performed.
- Auth, Users, Categories/Concepts controllers, and MongoDB Activity remain on existing implementations.

### Activity / Audit system

Purpose:
- Track important user and system actions.
- Provide audit visibility and operational traceability.
- Complement the relational financial core without replacing it.

MongoDB usage:
- MongoDB is used only for activity/event documents.
- Implemented through Mongoose models and utility-based logging.

Tracked events:
- auth.login_success
- auth.login_failed
- expense.created
- expense.updated
- expense.deleted
- account.created
- account.updated
- account.deactivated
- budget.updated
- user.updated
- user.activated
- user.deactivated

Frontend activity module:
- Dedicated "Actividad" page
- Sidebar access for authenticated users
- Period filters:
  - Hoy
  - Ayer
  - Últimos 3 días
  - Últimos 7 días
  - Últimos 30 días
  - Todo
- Compact audit-style activity rows
- Left-aligned readability optimization
- Rich metadata display

Permissions:
- Regular users:
  - can only view their own activity
- Admin users:
  - can query all activity logs using `allUsers=true`

Technical implementation:
- MongoDB connection:
  - backend/src/config/mongo.js
- Activity model:
  - backend/src/models/activityLogModel.js
- Activity logger utility:
  - backend/src/utils/activityLogger.js
- Activity routes:
  - backend/src/routes/activityRoutes.js
- Activity controller:
  - backend/src/controllers/activityController.js

### Admin endpoints
- GET /api/users
- PUT /api/users/:id
- PATCH /api/users/:id/deactivate
- PATCH /api/users/:id/activate

### Important decision
- Backend uses req.user.id (JWT)
- user_id is NOT trusted from frontend

---

## Frontend status

### Deployment configuration
- Frontend API calls now use centralized `frontend/src/utils/api.js`.
- `API_BASE_URL` uses `import.meta.env.VITE_API_URL || 'http://localhost:3000'`.
- Netlify SPA routing is supported with `frontend/public/_redirects` containing `/* /index.html 200`.
- Local development continues to work through the localhost fallback.
- Production frontend successfully deployed on DigitalOcean VPS.
- Application validated from real iPhone Safari sessions.
- Mobile navigation drawer redesigned for mobile-native UX.
- Mobile KPI donut cards optimized for narrow screens.
- Mobile Movimientos layout redesigned from desktop table into stacked mobile rows.
- Mobile header/safe-area spacing optimized for iPhone notch devices.
- Mobile date filter overflow issues corrected.
- Guided onboarding flow validated on mobile devices.
- iOS Safari form interaction issues identified and corrected.
- Dashboard onboarding overlay/modal flow implemented.
- Real-device onboarding validation completed.

### Movimientos
- Create / Edit / Delete
- Filters (date + category)
- CSV export
- Delete confirmation modal
- Movimientos Frecuentes V1:
  - users can save up to 5 frequent movement presets
  - presets store emoji, alias, color, type, category, concept, description, and account
  - presets do not store amount
  - clicking a frequent movement pre-fills the existing movement form with today's date and leaves amount empty
  - frequent movement creation reuses the existing AddExpenseForm in a dedicated mode
- Backend support:
  - `GET /api/favorite-movements`
  - `POST /api/favorite-movements`
  - `DELETE /api/favorite-movements/:id`
  - favorites are scoped by `req.user.id`
- Sorted DESC (latest first)
- Backend controller migrated from raw mysql2 queries to Sequelize in Phase 2
- Mobile movement list redesign:
  - desktop table preserved on desktop
  - mobile uses stacked responsive movement rows
  - edit action optimized for touch interaction
  - first-user onboarding integration added
  - onboarding form highlight flow implemented
  - onboarding completion flow implemented
  - frequent movements UX renamed from "Favoritos" to "Frecuentes"
  - mobile form action layout optimized for narrow widths
  - mobile form validation UX improved
  - amount input sanitization added
  - iOS Safari mobile form behavior optimized

### Presupuesto
- Editable grid
- Annual summary
- Category detail table
- Bulk save
- Backend controller migrated from raw mysql2 queries to Sequelize in Phase 3

### Variaciones
- Monthly / Acumulado / Trimestre / Semestre / Anual
- KPI cards
- Internal table scroll
- Sticky headers
- mobile filter layout redesigned
- negative financial values highlighted using semantic danger styling
- responsive financial KPI polish completed
- mobile table header alignment improved
- Backend real-vs-budget report migrated from raw mysql2 queries to Sequelize in Phase 4

### Dashboard (Resumen)
- KPI donut cards
- Top categories
- Latest movements
- Financial Insights widget integrated.
- Mobile KPI donut responsiveness optimized.
- grouped mobile KPI card layout implemented
- KPI financial labels simplified for readability
- negative balance styling added for financial clarity
- onboarding exploration helper added
- donut spacing/alignment optimized for narrow screens

### Cuentas
- Create
- Edit
- Deactivate (soft delete)
- Modal UX
- Credit/Debit localized
- onboarding welcome flow integrated
- first-account redirect flow implemented
- Backend controller migrated from raw mysql2 queries to Sequelize in Phase 1

### Usuarios (Admin)
- Edit users
- Activate / deactivate
- Role management
- Self-deactivation blocked

### Actividad
- Sidebar link visible to all authenticated users
- Period filters: Hoy, Ayer, Últimos 3 días, Últimos 7 días, Últimos 30 días, Todo
- Compact activity rows: time · action · details
- Activity page rows are left-aligned for audit readability
- Regular users see their own logs
- Admin users can retrieve all users' logs through the backend `allUsers=true` query
- Activity logs now include richer metadata for login, user updates, budget updates, and expense events

---

## UI / UX decisions

### Sidebar
- Fixed
- Active highlight
- Logout confirmation modal

### Layout finding (important)
Root issue:
- Layout shift caused by vertical scrollbar

Fix:
html {
  scrollbar-gutter: stable;
}

body {
  overflow-y: scroll;
}

### Tables
- Scroll inside container
- No global horizontal scroll
- Sticky headers when needed

### Mobile responsiveness
Implemented and validated on real iPhone devices:
- responsive header redesign
- safe-area notch handling
- responsive dashboard KPI cards
- responsive filters/forms
- responsive mobile navigation drawer
- responsive movement list redesign
- overflow prevention
- viewport fixes
- real-device Safari validation
- onboarding modal/lightbox UX implemented
- contextual onboarding guidance added
- responsive onboarding overlays validated on iPhone
- iOS Safari input zoom issue mitigation implemented
- mobile-first onboarding flow optimized

Important finding:
- Chrome responsive emulation did not fully match real iPhone Safari behavior.
- Final responsive validation was performed on real mobile hardware.

---

## Typography (pending standardization)
Need central file:
frontend/src/styles/typography.js

Target:
- pageTitle
- sectionTitle
- cardTitle

Current issue:
- Mixed h1/h2/div styles
- inconsistent font sizes

---

## Currency
- MXN formatting implemented

---

## Latest verification
- Backend `npm test`: 7 suites / 39 tests passing.
- Backend `npm audit`: 0 vulnerabilities.
- Frontend `npm run build`: passing.
- `docker compose config`: passing.
- Inputs do NOT include currency symbol while editing
- Display uses: $1,234.56
- Real iPhone Safari onboarding flow validated
- Mobile onboarding overlays validated
- iOS Safari input interaction fixes validated
- Responsive onboarding flow validated across narrow mobile widths

---

## Security status

Implemented:
- JWT auth
- bcrypt hash
- authMiddleware
- adminMiddleware
- helmet
- rate limiting
- SQL placeholders
- no password in responses
- soft delete (users/accounts)
- production startup environment validation
- stricter expense, budget, report, concept, and user ID validation
- npm audit completed with 0 vulnerabilities

Pending:
- XSS sanitization review

---

## Testing (NEW)

Stack:
- Jest
- Supertest

Files:
- backend/tests/auth.test.js
- backend/tests/expenses.test.js
- backend/tests/favoriteMovements.test.js
- backend/tests/middleware.test.js
- backend/tests/activity.test.js

Current status:
- 7 test suites passing
- 39 tests passing

### Favorite movements tests
- GET /api/favorite-movements without token → 401
- POST /api/favorite-movements creates a preset
- Regular user favorite query is scoped to own presets
- Favorite preset limit is enforced at 5 per user

### Activity tests
- GET /api/activity without token → 401
- GET /api/activity with token → 200
- Creating an expense creates an activity log
- Regular user activity query is scoped to own logs
- Login success logs include user identity metadata

### Auth tests
- Register
- Login (valid)
- Login (invalid)
- Protected route without token

### Expenses tests
- GET with token
- POST valid expense
- POST invalid expense

### Middleware tests
- Protected routes without token → 401
- Admin routes:
  - user token → 403
  - admin token → 200

### Accounts tests
- Create account
- Get accounts
- Update account
- Deactivate account
- Verify deactivated account is not returned

### Validation tests
- Expenses:
  - missing date → 400
  - amount <= 0 → 400
  - missing category_id → 400
  - missing account_id → 400
  - invalid type → 400
- Accounts:
  - missing bank_name → 400
  - missing last_four → 400
  - invalid account_type → 400
  - credit without billing_cycle_end_day → 400
- Users:
  - invalid role update → 400
  
### Important improvement
Previously:
- Invalid data → DB error (500)

Now:
- Backend validates first
- Returns 400
- Prevents DB failure

### Recent improvement
- Removed hardcoded IDs from `expenses.test.js`.
- Test setup now validates register/login responses.
- Test account is created dynamically through `POST /api/accounts`.
- Category/concept IDs are queried dynamically from the database.
- Cleanup order: expenses → accounts → users.

---

## Database

Main tables:
- users
- accounts
- categories
- concepts
- expenses
- budgets
- favorite_movements

Rules:
- categories/concepts are shared catalog
- user data always filtered by req.user.id

---

## Known gaps / next steps

High priority before final delivery:
- Portfolio-style final PDF
- Final screenshots and demo video
- Final responsive QA pass
- Architecture diagrams/documentation
- Reflection and technical reasoning write-up
- Presentation/demo preparation
- Final onboarding UX polish
- Final iPhone Safari UX validation

Medium priority:
- Typography standardization
- Monitoring/profiling documentation
- PM2/process management evaluation
- Backend performance review
- Query optimization review
- Centralized logging review

Stretch goals:
- Service separation planning
- Future microservice roadmap
- CI/CD pipeline exploration
- Automated deployment workflow

---

## Architecture note (important)

Current architecture:
- Modular monolith

Ready to evolve into microservices:
- auth-service
- expenses-service
- accounts-service
- budget/report-service

---

## Final delivery requirements (PDF)

Must include:
- Working code
- Screenshots / demo
- Portfolio-style document
- Technical explanation
- Security explanation
- Testing explanation
- Reflection
- Docker architecture explanation
- VPS deployment explanation
- Testing evidence
- Responsive/mobile validation evidence
- Onboarding UX explanation
- Real-device iPhone Safari validation evidence
- UX/UI decision rationale
- Security measures implemented
- Architecture decisions and tradeoffs
- Reflection on debugging and optimization process

---

## Key takeaway

Project status:
- Full-stack application deployed in production-like infrastructure
- Dockerized multi-service architecture completed
- Real-device mobile validation completed
- Strong authentication/security foundation implemented
- Modular backend architecture implemented
- Comprehensive CRUD + reporting functionality completed
- Automated backend testing implemented
- Responsive/mobile UX significantly polished
- Guided onboarding UX implemented
- Real-device onboarding validation completed
- iPhone Safari UX issues addressed
- Mobile-first onboarding experience implemented
- Product-style UX polish significantly expanded

Current final focus:
- delivery quality
- documentation quality
- presentation quality
- production hardening
- final validation and polish
