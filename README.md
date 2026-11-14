# Dukaan: shop billing and inventory

![CI/CD Pipeline](https://github.com/sonishifa/dukaan-inventory/actions/workflows/pipeline.yml/badge.svg)

**Live app:** https://dukaan-inventory.vercel.app
**Health check:** https://dukaan-inventory.vercel.app/api/health

Dukaan replaces a shop's notebook. The owner adds products once; every bill is
totalled automatically and reduces stock at the same moment. Stock can never go
below zero, products running low are flagged, and daily and monthly sales reports
are worked out in Indian Standard Time.

The application is intentionally small. The focus of the project is the delivery
pipeline around it: Docker, automated tests against a real database, versioned
database migrations, preview deployments with sample data, and health-checked
deployments to Vercel through GitHub Actions.

## Features

- Add, edit and remove products (name, price, stock, low-stock alert level)
- Create a bill by picking products and quantities; the total is calculated automatically
- Stock reduces automatically when a bill is saved, and a bill is refused if stock is short
- Low-stock list for products at or below their alert level
- Bill history with date, time and amount, and a printable receipt for each bill
- Daily and monthly sales reports with best sellers and a day-by-day breakdown

## Architecture

```mermaid
flowchart LR
  user([Shop owner<br/>browser]) --> vercel
  subgraph vercel[Vercel]
    pages[Next.js pages<br/>Today, New bill, Products, Bills, Reports]
    api[REST API<br/>/api/products, /api/bills,<br/>/api/reports, /api/health]
    pages --> api
  end
  api --> db[(PostgreSQL<br/>Neon)]

  dev([Developer]) -- push / pull request --> gh[GitHub]
  gh --> ci[GitHub Actions pipeline]
  ci -- lint, tests, build --> ci
  ci -- docker compose smoke test --> ci
  ci -- migrations --> db
  ci -- vercel deploy + health check --> vercel
  ci -- push image --> ghcr[(GitHub Container<br/>Registry)]
```

**How it fits together.** The app is a single Next.js project. The pages are the
user interface; the API routes under `src/app/api` hold all the logic and talk to
PostgreSQL through `src/lib`. Business rules (bill totals, validation, low-stock
detection) live in `src/lib/billing.js` as plain functions with no database, so
they are easy to unit test. Money is stored as whole paise (integers) to avoid
rounding errors.

**The stock rule.** A bill reduces stock with a conditional update inside one
transaction: `UPDATE products SET stock = stock - qty WHERE id = ? AND stock >= qty`.
If two bills race for the last unit, PostgreSQL locks the row for the first one and
the second one finds the condition false, so only one bill succeeds. If any line on
a bill is short, the whole bill is rolled back. A `CHECK (stock >= 0)` constraint is
a second safety net at the database level.

**Docker and Vercel.** Vercel does not run Docker containers; it runs the app as
serverless functions. Docker is used for local development (`docker compose up`)
and inside the pipeline, where the image is built and smoke-tested on every push,
then published to GitHub Container Registry from `main`.

### Environments

| Environment | Where it runs | Database | Data |
|---|---|---|---|
| Local | `docker compose up` or `npm run dev` | Postgres container | Sample products |
| CI | GitHub Actions | Postgres service container, created fresh per run | Created by tests |
| Preview | Vercel preview URL, one per pull request | Neon database (shared with production) | Sample products |
| Production | https://dukaan-inventory.vercel.app | Neon database, created from Vercel Storage | Shop data |

Preview and production currently share one Neon database, so each preview run also
adds the sample products to production (existing names are skipped). To separate
them, create a `preview` branch in Neon and set the `PREVIEW_DATABASE_URL` secret to
its connection string.

## Tech stack

| Part | Choice |
|---|---|
| Frontend and API | Next.js 16 (App Router), React 19 |
| Database | PostgreSQL 16 (Neon in the cloud), `pg` driver |
| Tests | Vitest, with coverage thresholds enforced in CI |
| Lint | ESLint with the Next.js config |
| Container | Docker (multi-stage, non-root), docker compose |
| CI/CD | GitHub Actions |
| Hosting | Vercel |
| Image registry | GitHub Container Registry |

## Run it locally

### Option 1: Docker (one command)

Requires Docker Desktop.

```bash
docker compose up --build
```

Open http://localhost:3000. The container runs the migrations and loads sample
products on start. Stop with `Ctrl+C`; remove the database with `docker compose down -v`.

### Option 2: Node.js

Requires Node.js 20.9 or newer.

```bash
npm install
docker compose up -d db          # or use any PostgreSQL 16 database
cp .env.example .env.local       # contains DATABASE_URL for the local database
export DATABASE_URL=postgres://dukaan:dukaan@localhost:5432/dukaan
npm run migrate                  # create the tables
npm run seed                     # optional: sample products
npm run dev                      # http://localhost:3000
```

On Windows PowerShell use `$env:DATABASE_URL="postgres://dukaan:dukaan@localhost:5432/dukaan"` instead of `export`.

## Tests

```bash
npm run test:unit          # pure logic, no database needed
npm run test:integration   # needs DATABASE_URL pointing at a test database
npm run test:coverage      # everything, with a coverage report in coverage/
npm run lint
```

Integration tests run against a real PostgreSQL database and cover, among others:

- the bill total is correct and stock reduces after every bill
- a bill is refused when stock is short, and nothing changes in the database
- if one line of a bill is short, the whole bill is rolled back
- two bills racing for the last unit: exactly one succeeds
- stock can never go below zero, even with a direct database update
- low-stock products are detected
- reports total correctly and group days in Indian time

Integration tests empty the tables they use, so always point them at a test
database, never at real data.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | App and database status, plus the deployed commit |
| GET | `/api/products` | All products |
| POST | `/api/products` | Add a product `{ name, price, stock, lowStockLimit }` (price in rupees) |
| GET / PUT / DELETE | `/api/products/:id` | Read, update (any field) or remove a product |
| GET | `/api/products/low-stock` | Products at or below their alert level |
| GET | `/api/bills?limit=50` | Recent bills |
| POST | `/api/bills` | Create a bill `{ items: [{ productId, quantity }] }` |
| GET | `/api/bills/:id` | One bill with its items |
| GET | `/api/reports/daily?date=2026-11-05` | Sales for one day (default today) |
| GET | `/api/reports/monthly?month=2026-11` | Sales for a month with a daily breakdown |

Errors always have the shape `{ "error": { "code", "message", "details" } }`.
Creating a bill with too little stock returns `409 OUT_OF_STOCK` with the products that are short.

```bash
curl -X POST http://localhost:3000/api/bills \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":4,"quantity":2},{"productId":9,"quantity":5}]}'
```

## Database migrations

Table changes are never made by hand. Each change is a new numbered SQL file in
`migrations/`, for example `003_add_discount_to_bills.sql`. `npm run migrate` applies
any files that have not run yet and records them in the `schema_migrations` table.
The pipeline runs it against the preview or production database before every deployment.

Rules: never edit a migration that has been merged; add a new one instead.

## CI/CD pipeline

Defined in `.github/workflows/pipeline.yml`.

| Trigger | Jobs |
|---|---|
| Every push to any branch | Lint, test and build, then Docker build and smoke test |
| Pull request to `main` | The above, then deploy a preview (migrate and seed the preview DB, deploy, health check, comment the link on the PR) |
| Push to `main` (merged PR) | The above, then migrate production, deploy to production, health check, publish the Docker image |

Each job only runs if the jobs before it passed, and `main` is protected so a pull
request cannot be merged until the checks pass. A failing test therefore never
reaches production. Setting up the secrets, Vercel and Neon is described in
[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md).

## Project structure

```
.github/workflows/pipeline.yml   CI/CD pipeline
docker/entrypoint.sh             container start-up: migrate, optional seed, start server
migrations/                      versioned SQL schema changes
scripts/                         migrate, seed and health-check scripts
src/app/                         pages and API routes (Next.js App Router)
src/components/                  shared UI (navigation, receipt)
src/lib/                         business logic and database access
tests/unit/                      tests for pure logic
tests/integration/               tests against a real PostgreSQL database
Dockerfile, docker-compose.yml   container build and local stack
```

## Team

| Name | Roll number | Main responsibility |
|---|---|---|
| Member 1 | | |
| Member 2 | | |
| Member 3 | | |
