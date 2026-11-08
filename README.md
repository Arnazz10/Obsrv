# Obsrv

Obsrv is an AI-powered global observability platform for log monitoring, built as an academic full-stack project for an Advanced SQL course.

## Stack

- **Database:** Oracle Database 23ai Free in Docker
- **Backend:** Node.js + Express + node-oracledb
- **Embeddings:** Gemini text-embedding-004 by default, OpenAI embeddings supported as a fallback option
- **Frontend:** Next.js + Tailwind CSS + shadcn-style UI primitives + Recharts
- **Log generator:** Standalone Python script

## Repository layout

- `schema.sql` — Oracle DDL, materialized view, and grants
- `backend/` — Express API and Oracle pool
- `frontend/` — Next.js observability UI
- `generate_logs.py` — standalone log generator

## 1) Start Oracle Database 23ai Free

```bash
docker run -d -p 1521:1521 -e ORACLE_PWD=YourPass123 --name oracle23ai \
  container-registry.oracle.com/database/free:latest
```

The default service name is typically `FREEPDB1`.

## 2) Create the schema

Connect with SQL*Plus or SQLcl and run:

```sql
@schema.sql
```

A quick smoke test after loading the schema:

```sql
SELECT COUNT(*) FROM regions;
SELECT COUNT(*) FROM services;
SELECT COUNT(*) FROM logs;
```

## 3) Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Important variables:

- `ORACLE_USER`
- `ORACLE_PASSWORD`
- `ORACLE_CONNECTION_STRING`
- `GEMINI_API_KEY`
- `EMBEDDING_PROVIDER` (`gemini` or `openai`)
- `NEXT_PUBLIC_BACKEND_URL`
- `INGESTION_URL`

## 4) Install, seed and run

```bash
npm install
npm run seed      # backfills 48h of multi-region history (add `-- --reset` to replace existing rows)
npm run dev       # API :4000 + web :3000 + live log simulator
```

Open http://localhost:3000. With no embedding API key the backend uses a built-in offline embedder
(`EMBEDDING_PROVIDER=local`), so semantic search works out of the box. Set `EMBEDDING_PROVIDER=gemini` or
`openai` plus a key for provider embeddings — re-seed afterwards, since vectors from different providers are not comparable.

Run the pieces separately if you prefer:

```bash
npm run dev -w backend       # API
npm run dev -w frontend      # web
npm run simulate -w backend  # live traffic (or: python3 generate_logs.py)
```

## Pages

| Route | What it does |
| --- | --- |
| `/` | Landing page with live error map and stats |
| `/overview` | KPIs, regional error map, hourly trend, anomaly detection, live stream, service health |
| `/logs` | Security Events: filter by region, service, severity, time and text; live tail; event drawer with raw JSON and related events |
| `/logs/[service]` | Per-service history and regional breakdown |
| `/search` | Threat Search: plain-language semantic search over Oracle vectors |
| `/incidents` | Active anomalies and critical events, acknowledge them, draft status updates |

## Deploy the frontend to Vercel

The Next.js frontend lives in `frontend/` inside this npm workspace. In Vercel, import this repository and set:

- **Root Directory:** `frontend`
- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (default)
- **Output Directory:** leave the Next.js default
- **Environment Variable:** `NEXT_PUBLIC_BACKEND_URL=https://<your-public-backend-host>`

Set `NEXT_PUBLIC_BACKEND_URL` for Production and Preview, then redeploy after changing it. The value must be the public base URL of the Express API, with no trailing slash. In production, the frontend reports a clear configuration error if this variable is missing instead of sending API requests to a visitor's local machine.

Vercel hosts the frontend only. Deploy the Express backend and Oracle database separately, and set the backend's `CORS_ORIGIN` to the Vercel site origin (for example, `https://your-project.vercel.app`). Configure `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECTION_STRING`, and `GEMINI_API_KEY` on the backend host. Keep database credentials and embedding API keys out of Vercel's frontend environment.

Vercel's monorepo setup uses the app's directory as its Root Directory; the repository root lockfile identifies the npm workspace/package manager. See [Vercel's monorepo setup](https://vercel.com/docs/monorepos) and [build configuration](https://vercel.com/docs/builds/configure-a-build).

## API endpoints

- `POST /api/logs/ingest`
- `GET /api/logs/search?q=<text>&severity=&limit=`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/anomalies`
- `GET /api/logs?region=&service=&severity=C,E&text=&since_minutes=&from=&to=&limit=&offset=`
- `GET /api/logs/:id` (event plus related events by vector distance)
- `GET /api/meta`
- `GET /api/logs/service/:service`

## Notes

- All log timestamps are returned in the log's own region timezone using `AT TIME ZONE region_tz`.
- The Oracle schema includes:
  - sequences for `log_id` and `alert_id`
  - indexes on `log_time`, `service_id`, and `severity`
  - `v_critical_errors`
  - `mv_hourly_errors` refreshed on commit
  - object grants for viewer, analyst, and admin access patterns
- The backend uses Gemini embeddings by default; set `EMBEDDING_PROVIDER=openai` if you prefer OpenAI.
