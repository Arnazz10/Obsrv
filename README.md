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

## 4) Install dependencies

From the repository root:

```bash
npm install
```

This installs the backend and frontend workspace dependencies.

## 5) Run the backend and frontend

### Backend

```bash
npm run dev -w backend
```

### Frontend

```bash
npm run dev -w frontend
```

### Run both together

From the repository root:

```bash
npm run dev
```

## 6) Start the log generator

```bash
python3 generate_logs.py
```

The generator emits log events every 1-2 seconds and posts them to the ingestion API.

## API endpoints

- `POST /api/logs/ingest`
- `GET /api/logs/search?q=<text>`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/anomalies`
- `GET /api/logs?region=&service=&severity=&from=&to=`
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
