# Expenses Report — Project Status

## Current phase
Week 3 of 5 (Backend Node.js project)

Current focus:
- Stabilization
- Backend validation
- Basic automated testing
- Middleware audit
- Documentation readiness
- Security checklist
- UI consistency

Deferred (later course topics):
- Docker
- Microservices
- Deployment
- Monitoring / profiling

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
- Forgot password (dev flow)
- Reset password
- JWT authentication
- bcrypt hashing

### Middleware
- express.json()
- cors
- helmet
- rate limiting (general + auth)
- authMiddleware
- adminMiddleware

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

### Movimientos
- Create / Edit / Delete
- Filters (date + category)
- CSV export
- Delete confirmation modal
- Sorted DESC (latest first)
- Backend controller migrated from raw mysql2 queries to Sequelize in Phase 2

### Presupuesto
- Editable grid
- Annual summary
- Category detail table
- Bulk save
- Backend controller migrated from raw mysql2 queries to Sequelize in Phase 3

### Variaciones
- Monthly / Annual / Trimestre / Semestre / YTD
- KPI cards
- Internal table scroll
- Sticky headers
- Backend real-vs-budget report migrated from raw mysql2 queries to Sequelize in Phase 4

### Dashboard (Resumen)
- KPI donut cards
- Top categories
- Latest movements

### Cuentas
- Create
- Edit
- Deactivate (soft delete)
- Modal UX
- Credit/Debit localized
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
- Inputs do NOT include currency symbol while editing
- Display uses: $1,234.56

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

Pending:
- npm audit
- XSS sanitization review
- middleware audit (all endpoints)

---

## Testing (NEW)

Stack:
- Jest
- Supertest

Files:
- backend/tests/auth.test.js
- backend/tests/expenses.test.js
- backend/tests/middleware.test.js
- backend/tests/activity.test.js

Current status:
- 6 test suites passing
- 35 tests passing

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

Rules:
- categories/concepts are shared catalog
- user data always filtered by req.user.id

---

## Known gaps / next steps

Immediate:
- Middleware audit
- Backend validation audit (POST/PUT)
- Typography standardization
- BudgetPage scroll behavior alignment

Later (course requirement):
- Docker
- Microservices
- Deployment
- Monitoring
- Final documentation
- Presentation

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

---

## Key takeaway

Project is:
- Functionally complete for current phase
- Strong in auth, CRUD, and UI
- Now entering stabilization and quality phase (testing + validation)
