# Local Docker Compose

This setup runs the app locally with separate containers for the React frontend, Express backend, MySQL, and MongoDB.

## Start

```bash
docker compose up --build
```

## Stop

```bash
docker compose down
```

To remove Docker database volumes and start with empty databases:

```bash
docker compose down -v
```

## URLs

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api-docs
- MySQL from host: `localhost:3307`
- MongoDB from host: `localhost:27018`

Inside Docker, services use container DNS names:

- MySQL: `mysql:3306`
- MongoDB: `mongo:27017`

## Environment

`docker-compose.yml` includes local defaults. To override them, copy `.env.docker.example` to `.env` and edit values as needed.

The frontend build uses:

```bash
VITE_API_URL=http://localhost:3000
```

The backend uses:

```bash
PORT=3000
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb://mongo:27017/expenses_activity
```

## Demo Login

The Docker MySQL init script creates one demo admin user:

- Email: `admin.docker@example.com`
- Password: `DockerDemo123!`

## Database Initialization

The Docker MySQL database is separate from any local MySQL database.

`backend/sql/init.sql` is mounted into the MySQL container at `/docker-entrypoint-initdb.d/init.sql`.

This script runs only when the `mysql_data` Docker volume is first created. It creates:

- users
- accounts
- favorite_movements
- expenses
- budgets
- categories
- concepts

It also inserts the required category/concept catalog data plus demo accounts, favorite movements, budgets, and expenses so the main app pages can be tested immediately.

After signing in with the demo admin account, the login event is written to MongoDB by the existing Activity module, so the Actividad page can be tested immediately as well.

To reset the Docker database and rerun `init.sql`:

```bash
docker compose down -v
docker compose up --build
```

MongoDB activity logs are stored in the `mongo_data` Docker volume.
