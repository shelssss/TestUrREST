# API Management & Monitoring Platform

Register your REST endpoints, send requests through the platform, and get
every call measured, logged, and analysed.

```
React + TypeScript + Vite + Tailwind
              │
              ▼
   FastAPI + SQLAlchemy + Pydantic
              │
              ▼
   PostgreSQL  (SQLite by default)
```

## Requirements

- **Python 3.11+** (developed on 3.12)
- **Node.js 18+** (developed on 23)
- No database server needed — it defaults to SQLite.

## Install and run

Clone, then use two terminals.

**Terminal 1 — backend** → <http://localhost:8000>

```bash
cd backend
cp .env.example .env          # Windows: copy .env.example .env

python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate

pip install -r requirements.txt
alembic upgrade head          # creates the database
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend** → <http://localhost:5173>

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

> On Windows without activating the venv, prefix commands with
> `./.venv/Scripts/python.exe -m` — e.g.
> `./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000`.

## Your first five minutes

**1. Create a project.** *Projects → New project.* A project is one isolated
API environment; its endpoints, logs, and analytics never mix with another's.

```
Name         My API
Environment  Development
Base URL     http://localhost:5041
```

**2. Register an endpoint.** *Endpoints → Add endpoint.*

```
Method       GET
Path         /api/orders
Target URL   http://localhost:5041/api/orders
```

Typing the path auto-fills the target from the project's base URL. Endpoints
can be disabled without deleting them.

**3. Send a request.** *API Explorer.* Pick the endpoint, add query
parameters or headers, then **Send**.

> Authorization headers need their scheme: `Bearer eyJhbGci...`, not the
> bare token. Most APIs reject a token without it.

**4. Read the response.** Status, latency, size, headers, and a JSON viewer
you can collapse and search.

**5. Inspect the log.** *Logs.* Filter by status class, method, endpoint,
date, or latency. Click a row for the full request and response.

**6. See the analytics.** *Analytics* and the project **Overview** —
volume, latency, status distribution, and per-endpoint breakdowns over
1h / 24h / 7d / 30d.

## What gets logged

Only requests that go **through** the platform. Registering an endpoint
records configuration; it does not start watching that URL. Traffic your
other applications send straight to the target API is invisible here.

The API Explorer is just one client of the proxy endpoint — anything can
use it:

```bash
curl -X POST http://localhost:8000/api/projects/$PROJECT_ID/requests \
  -H 'Content-Type: application/json' \
  -d '{"method":"GET","url":"http://localhost:5041/api/orders",
       "headers":{"Authorization":"Bearer <token>"},"query_parameters":{}}'
```

## Two behaviours worth knowing

**A dead target is data, not an error.** When the target times out or
refuses the connection, the request still returns `200` with
`status_code: null` and a populated `error`, and the attempt is logged.
"The target was down" is exactly what a monitoring tool exists to record.

**Credentials are masked in storage, not withheld from the request.** Your
real token is sent to the target in full; only the logged copy is masked.
A log showing `Bearer ********` means it *was* sent. A log showing bare
`********` means no scheme prefix was present — a common cause of 401s.

## Configuration

All settings live in `backend/.env` (see `.env.example`).

| Setting | Default | Notes |
|---|---|---|
| `DATABASE_URL` | SQLite file | PostgreSQL: `postgresql+asyncpg://user:pass@host:5432/db` — also `pip install asyncpg` |
| `BLOCK_PRIVATE_NETWORK_TARGETS` | `true` | **Keep on in production.** See below |
| `PROXY_TIMEOUT_SECONDS` | `30` | Per-request ceiling |
| `DEBUG` | `false` | Echoes SQL; very noisy |

### Security note

The backend forwards user-supplied URLs, so with
`BLOCK_PRIVATE_NETWORK_TARGETS=false` it will reach loopback, private
ranges, and `169.254.169.254` (the cloud metadata endpoint). Set it to
`false` **only** for local development against `localhost`, and never on a
deployed instance.

There is no authentication in this MVP. Do not expose it to an untrusted
network.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Every page shows an error state | Backend not running on :8000 |
| `alembic upgrade head` fails | No `.env` — copy it from `.env.example` |
| `Requests to localhost are not allowed` | Set `BLOCK_PRIVATE_NETWORK_TARGETS=false` for local targets |
| 401 from your API | Add the `Bearer ` prefix to the token |
| `Could not connect to the target API` | The target is down, or the URL is wrong |

## Tests

```bash
cd backend  && pytest -q      # 70 tests
cd frontend && npm run build  # typecheck + production build
```

## Not included

No Redis, Celery, Kafka, Elasticsearch, WebSockets, auth/JWT/OAuth, API
keys, RBAC, or alerting — this is an MVP. The architecture leaves room for
them: services are separated from routes, logs are immutable records, and
the proxy is the natural place for rate limiting and API keys later.

Docker and Docker Compose were left out at the project owner's request; run
the two processes directly as shown above.

More detail in [`backend/README.md`](backend/README.md) and
[`frontend/README.md`](frontend/README.md).
