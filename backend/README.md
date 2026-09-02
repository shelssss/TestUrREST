# Backend — API Management & Monitoring

FastAPI + SQLAlchemy + Alembic. Exposes the REST API the React frontend
consumes, and proxies outbound requests so every call is measured and logged.

## Setup (once)

```bash
cd backend
cp .env.example .env          # required -- .env is not committed

python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Configuration is read from `.env`. It defaults to SQLite, so no database
server is needed. To use PostgreSQL, change one line (and
`pip install asyncpg`):

```ini
DATABASE_URL=postgresql+asyncpg://apim:apim@localhost:5432/apim
```

## Create the schema

```bash
./.venv/Scripts/python.exe -m alembic upgrade head
```

`alembic downgrade base` reverses it; `alembic check` reports drift between
the migrations and the ORM models.

## Run

```bash
./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

- Interactive API docs: <http://localhost:8000/docs>
- Health probe: <http://localhost:8000/health>

## Test

```bash
./.venv/Scripts/python.exe -m pytest -q      # 70 tests, runs on SQLite
./.venv/Scripts/python.exe -m pytest -v      # per-test names
```

## Trying it by hand

`/docs` is the fastest route — every endpoint is executable from the browser.
The same flow with curl:

```bash
# 1. Create a project
curl -X POST localhost:8000/api/projects -H 'Content-Type: application/json' \
  -d '{"name":"eBay","environment":"production","base_url":"https://jsonplaceholder.typicode.com"}'

# 2. Register an endpoint  (use the id from step 1)
curl -X POST localhost:8000/api/projects/$PROJECT_ID/endpoints \
  -H 'Content-Type: application/json' \
  -d '{"method":"GET","path":"/posts/1","target_url":"https://jsonplaceholder.typicode.com/posts/1","enabled":true}'

# 3. Send it through the proxy  (use the id from step 2)
curl -X POST localhost:8000/api/projects/$PROJECT_ID/requests \
  -H 'Content-Type: application/json' \
  -d '{"method":"GET","endpoint_id":"'$ENDPOINT_ID'","headers":{"Authorization":"Bearer secret"},"query_parameters":{}}'

# 4. Read the log it produced
curl "localhost:8000/api/projects/$PROJECT_ID/logs?limit=10"
curl "localhost:8000/api/projects/$PROJECT_ID/logs/$REQUEST_ID"

# 5. Aggregated analytics
curl "localhost:8000/api/projects/$PROJECT_ID/analytics?range=24h"
```

## Two behaviours worth knowing

**A dead target is data, not an error.** If the target API times out or
refuses the connection, `POST /requests` still returns `200` with
`status_code: null` and a populated `error`, and the attempt is logged.
That is deliberate: "the target was down" is exactly what a monitoring
platform exists to record.

**Credentials are redacted before storage, not on display.** `Authorization`,
`Cookie`, `Set-Cookie`, `X-API-Key` and friends are masked at capture time,
as are secret-looking query keys and JSON body fields. The plaintext never
reaches the database, so there is no "reveal" path in the API.

## SSRF guard

`BLOCK_PRIVATE_NETWORK_TARGETS` is `false` in the local `.env` so you can
proxy to `127.0.0.1` while developing. **Set it to `true` anywhere real.**
With it on, the proxy refuses loopback, private, and link-local targets --
including `169.254.169.254`, the cloud metadata endpoint -- so a user-supplied
URL cannot be used to reach inside your network.

## Layout

```
app/
  api/         route handlers, thin -- they delegate to services
  services/    business logic (proxy, logging, analytics, CRUD)
  models/      SQLAlchemy ORM
  schemas/     Pydantic request/response contracts
  database/    engine + session
  core/        config, error handling
  utils/       redaction, URL validation
alembic/       migrations
tests/         70 tests
```
