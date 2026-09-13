# Development Guide

This document explains how `industrial-process-analytics` is structured so future development is easier and safer.

## Project Purpose

The app analyzes paired SURDRY sterilization process PDF reports:

- `R1A.pdf`: cycle summary report
- `R1B.pdf`: instant data report with time-series readings

The system imports both PDFs, validates that they belong to the same cycle, stores normalized data in PostgreSQL, calculates flow analytics, applies configurable rules, and shows the results in a single dashboard.

## Technology Stack

- Frontend: Next.js, React, TypeScript
- Charts: Recharts
- Backend: FastAPI, Python
- Database: PostgreSQL
- ORM: SQLAlchemy
- Migrations: Alembic
- PDF parsing: pdfplumber
- Data processing: Python services, Pandas-ready structure
- Deployment: Docker Compose

## Directory Structure

```text
backend/
  app/
    api/              FastAPI routes
    analytics/        Analytics calculations
    models/           SQLAlchemy database models
    parsers/          Independent PDF parsers
    repositories/     Database query helpers
    rules/            Generic rule engine
    schemas/          Pydantic request/response/domain schemas
    services/         Application workflows such as ingestion
    tests/            Unit and integration tests
  alembic/            Database migration setup

frontend/
  app/                Next.js App Router pages and global styles
  charts/             Recharts components
  components/         Dashboard components
  services/           API client
  types/              Shared frontend types

docs/                 Project documentation
```

## Runtime Architecture

Docker Compose starts three services:

- `db`: PostgreSQL database
- `backend`: FastAPI API server on port `8000`
- `frontend`: Next.js dashboard on port `3000`

The browser talks to the frontend at:

```text
http://localhost:3000
```

The frontend calls the backend at:

```text
http://localhost:8000
```

The backend connects to PostgreSQL using `DATABASE_URL` from `docker-compose.yml`.

## Main User Flow

1. User opens the dashboard.
2. User selects `R1A.pdf` and `R1B.pdf`.
3. Frontend sends both files to `POST /api/uploads/analyze`.
4. Backend parses `R1A.pdf` for cycle metadata.
5. Backend parses all pages of `R1B.pdf` for instant readings.
6. Backend validates Retort and Cycle Number.
7. Backend handles decimal commas and midnight rollover.
8. Backend stores one normalized cycle and all measurements.
9. Backend calculates analytics.
10. Backend applies enabled rules.
11. Frontend shows cycle details, charts, analytics, alerts, and rule settings.

## Backend API

Important endpoints:

```text
POST /api/uploads/analyze
GET  /api/dashboard
GET  /api/cycles
GET  /api/cycles/{id}
GET  /api/cycles/{id}/measurements
GET  /api/cycles/{id}/analytics
GET  /api/cycles/{id}/alerts
GET  /api/rules
POST /api/rules
PUT  /api/rules/{id}
```

Route definitions live in:

```text
backend/app/api/routes.py
```

## Database Tables

### cycles

Stores one production cycle.

Important fields:

- `retort_no`
- `cycle_no`
- `cycle_date`
- `product`
- `recipe_no`
- `batch_no`
- `operator`
- `containers`
- `cycle_start`
- `steam_input`
- `sterilization_start`
- `cooling_start`
- `cycle_end`
- `source_r1a_file`
- `source_r1b_file`

Duplicate protection is based on:

```text
retort_no + cycle_no + cycle_date
```

### measurements

Stores every instant reading from `R1B.pdf`.

Important fields:

- `cycle_id`
- `recorded_at`
- `elapsed_seconds`
- `temperature`
- `product_temperature`
- `pressure`
- `f_value`
- `flow`
- `water_level`
- `phase`
- `machine_state`
- `source_page`
- `source_row`

`source_page` and `source_row` are kept for auditability.

### rules

Stores configurable rule settings.

Important fields:

- `name`
- `parameter`
- `operator`
- `threshold`
- `consecutive_count`
- `phase`
- `severity`
- `enabled`
- `configuration_json`

### alert_events

Stores grouped alert events.

Important fields:

- `cycle_id`
- `rule_id`
- `phase`
- `first_violation_at`
- `triggered_at`
- `resolved_at`
- `min_value`
- `average_value`
- `sample_count`
- `severity`
- `status`
- `details_json`

## Parser Design

Parsers are intentionally independent from the API and database.

Base interface:

```text
backend/app/parsers/base.py
```

R1A parser:

```text
backend/app/parsers/r1a_parser.py
```

R1B parser:

```text
backend/app/parsers/r1b_parser.py
```

Shared parsing utilities:

```text
backend/app/parsers/utils.py
```

### R1A Parser Responsibilities

The R1A parser extracts cycle-level metadata:

- Retort
- Cycle Number
- Report date/time
- Product
- Recipe Number
- Batch Number
- Operator
- Containers
- Phase timestamps
- Sterilization time

### R1B Parser Responsibilities

The R1B parser extracts every instant reading from all pages.

It handles:

- repeated page headers
- two-column reading layout
- European decimal commas
- stopped/heating/holding/cooling phases
- source page and row tracking

## Important Parser Assumptions

Current R1B parsing assumes each reading starts with:

```text
HH:MM:SS
```

Current numeric order:

```text
temperature
product_temperature
pressure
f_value
flow
water_level
```

If future PDFs change column order, update:

```text
backend/app/parsers/r1b_parser.py
```

And add a fixture test before changing the parser.

## Midnight Rollover

Some cycles start before midnight and end after midnight.

Example:

```text
Cycle Start: 23:24:09
Cooling Start: 00:14:25
End of Cycle: 00:58:11
```

The backend converts after-midnight times to the next date.

Logic lives in:

```text
backend/app/parsers/utils.py
backend/app/services/ingestion.py
```

## Ingestion Service

The main import workflow lives in:

```text
backend/app/services/ingestion.py
```

Responsibilities:

- run both parsers
- validate R1A/R1B match
- avoid duplicate imports
- normalize reading timestamps
- sort two-column R1B readings into real cycle order
- save cycle and measurements
- create parse warnings
- apply default and enabled rules
- persist alert events

Keep this service focused on orchestration. Do not put low-level PDF parsing or frontend logic here.

## Rule Engine

Rule logic lives in:

```text
backend/app/rules/engine.py
```

The rule engine is generic. It is not hard-coded only for flow.

Current default rule:

```text
parameter: flow
operator: <
threshold: 59.0
consecutive_count: 3
phase: ANY_ACTIVE_PHASE
severity: warning
```

`ANY_ACTIVE_PHASE` excludes `Stopped`, because stopped flow is normally `0.0` and should not create meaningless alerts.

Continuous violations are grouped into one alert event. The system should not create a new alert every 10 seconds.

## Analytics

Analytics logic lives in:

```text
backend/app/analytics/service.py
```

Current calculations:

- overall cycle average flow
- active-process average flow
- heating average flow
- holding average flow
- cooling average flow
- minimum flow
- maximum flow
- low-flow alert event count

Stopped phase is excluded from active-process average.

## Frontend Structure

The main dashboard is:

```text
frontend/components/DashboardClient.tsx
```

No-SSR wrapper:

```text
frontend/components/DashboardNoSsr.tsx
```

Home page:

```text
frontend/app/page.tsx
```

Flow chart:

```text
frontend/charts/FlowChart.tsx
```

API client:

```text
frontend/services/api.ts
```

Shared types:

```text
frontend/types/domain.ts
```

The dashboard is loaded as a browser-only component to avoid hydration errors caused by browser extensions injecting attributes before React loads.

## Dashboard Tabs

The single dashboard includes:

- `Overview`
- `Upload Reports`
- `Cycle Report`
- `Flow Analytics`
- `Alerts`
- `Rules & Settings`

Avoid creating separate workflows unless there is a strong reason. The app is intended to be usable from one dashboard.

## Chart Design Notes

The flow chart should stay operator-friendly:

- show trend line, not only scattered dots
- show threshold line at `59 L/s`
- show red low-flow zone
- highlight alert trigger points
- include clear tooltip values
- keep phase filtering visible

Chart code:

```text
frontend/charts/FlowChart.tsx
```

## Testing

Run tests:

```powershell
python -m pytest
```

Expected result:

```text
15 passed
```

Important test files:

```text
backend/app/tests/test_parsers_with_fixtures.py
backend/app/tests/test_ingestion_service.py
backend/app/tests/test_rules.py
```

PDF fixtures:

```text
backend/app/tests/fixtures/R1A.pdf
backend/app/tests/fixtures/R1B.pdf
```

## Development Rules

Follow these rules when extending the project:

- Keep parsers independent from API/database code.
- Keep analytics independent from parser code.
- Keep the rule engine generic.
- Do not hard-code business rules inside parsers.
- Add or update tests when parser behavior changes.
- Preserve source page and row for parsed readings.
- Do not silently ignore malformed report rows.
- Avoid duplicate cycle imports.
- Keep frontend API-driven.

## Adding A New Rule Parameter

Example: add pressure rule support.

1. Make sure `measurements.pressure` is populated.
2. Confirm frontend `RuleEditor` includes `pressure`.
3. Confirm rule engine can read the attribute name.
4. Add a test in `backend/app/tests/test_rules.py`.
5. Upload a sample report and verify alerts.

The rule engine already supports operators:

```text
<
<=
>
>=
==
!=
```

## Adding A New PDF Format

Recommended process:

1. Add the new PDF as a fixture.
2. Write expected parser tests first.
3. Update or create a parser module.
4. Keep old fixture tests passing.
5. Add parser warnings for malformed rows.
6. Verify upload through the dashboard.

## Running The App

See:

```text
docs/RUN_ON_LAPTOP.md
```

Additional feature documents:

```text
docs/BULK_IMPORT.md
docs/EXCEL_EXPORT.md
docs/EVALUATION_RULES.md
docs/EXCEL_EXPORT_ASSUMPTIONS.md
```

Common command:

```powershell
docker compose up -d --build
```

Open:

```text
http://localhost:3000
```

## Known Limitations

- Existing cycles are not automatically recalculated after changing a rule.
- Rule settings affect new uploads.
- Parser is tuned for the supplied SURDRY report format.
- There is no user authentication yet.
- There is no advanced permissions system.
- There is no PLC integration.
- There is no AI/ML prediction.

## Good Future Improvements

- Add reprocess button for existing cycles after rule changes.
- Add parser warning display in the dashboard.
- Add export to CSV or Excel.
- Add phase duration analytics.
- Add trend comparison across many cycles.
- Add report PDF generation from dashboard views.
- Add database migrations for future schema changes instead of relying on startup table creation.
