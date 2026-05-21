# Activity Service

Date: 2026-05-21

The project now includes a dedicated Activity Service as a low-risk microservice extraction. Its responsibility is intentionally narrow: receive audit/activity events from the main backend and persist them to MongoDB.

## Service Boundary

The application is split into these Docker services:

- `frontend`: React/Vite build served by nginx.
- `backend`: main Express API for auth, users, accounts, movements, budgets, reports, catalogs, and reads from activity logs.
- `activity-service`: dedicated Express microservice for writing activity/audit events.
- `mysql`: relational source of truth for financial data.
- `mongo`: activity/audit log storage.

## API

The activity service exposes:

```text
GET /health
POST /activity/logs
```

`POST /activity/logs` accepts the same activity payload currently used by the main backend logger:

```json
{
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com"
  },
  "eventType": "expense.created",
  "entityType": "expense",
  "entityId": 123,
  "description": "Expense created",
  "metadata": {}
}
```

## Fallback Behavior

The main backend sends activity events to `ACTIVITY_SERVICE_URL` when that variable is configured. If the service is unavailable, times out, or returns an error, the backend falls back to the existing local MongoDB logger.

This keeps the user-facing app resilient: activity logging should not break login, movement creation, account updates, budget saves, or other financial workflows.

## Docker Compose

`docker-compose.yml` starts the activity service with:

```yaml
activity-service:
  build:
    context: ./activity-service
  environment:
    PORT: 3001
    MONGO_URI: mongodb://mongo:27017/expenses_activity
```

The backend uses the internal service URL:

```yaml
ACTIVITY_SERVICE_URL: http://activity-service:3001
```

## Production Safety

The service is additive. Existing activity reads remain in the main backend, and existing MongoDB persistence is retained as a fallback. This was chosen to satisfy the microservice requirement without changing current UX/UI flows or moving high-risk business logic close to the delivery deadline.
