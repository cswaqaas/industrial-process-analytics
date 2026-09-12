# industrial-process-analytics

Fast MVP for analyzing paired SURDRY sterilization reports:

- `R1A.pdf`: cycle summary report
- `R1B.pdf`: instant data report

The parser test fixtures belong in `backend/app/tests/fixtures/R1A.pdf` and `backend/app/tests/fixtures/R1B.pdf`.

## Business Rule

Default configurable rule:

- parameter: `flow`
- operator: `<`
- threshold: `59.0`
- consecutive samples: `3`
- phase: `ANY_ACTIVE_PHASE`
- severity: `warning`

`Stopped` phase is excluded from `ANY_ACTIVE_PHASE`, so `0.0` stopped-flow rows do not create noise. Three eligible consecutive readings below 59 trigger on the third reading and continuous violations are grouped into one alert event.

Known sample alert:

- `23:39:55 -> 58.9`
- `23:40:05 -> 58.5`
- `23:40:15 -> 58.4`

Expected trigger time: `23:40:15`.

## Expected Metadata For Supplied Fixtures

- Retort: `1`
- Cycle No.: `327`
- Date: `01/08/2026 23:24:09`
- Product: `Recipe AL Cans Static MOCHA 22`
- Recipe No.: `6`
- Batch No.: `Mocha 225`
- Operator: `Raheem`
- Containers: `64`
- Cycle Start: `23:24:09`
- Steam Input: `23:29:03`
- Sterilization Start: `23:45:11`
- Cooling Start: `00:14:25`
- End of Cycle: `00:58:11`

Midnight rollover is handled so times after midnight become `2026-08-02`.

## Architecture

- Backend: FastAPI, SQLAlchemy, PostgreSQL, pdfplumber, Pandas-ready analytics layer
- Frontend: Next.js, TypeScript, Recharts
- Deployment: Docker Compose
- Parsers, analytics, rule engine, repositories, and API routes are independent modules

## Local Setup

Detailed laptop instructions are available in:

```text
docs/RUN_ON_LAPTOP.md
```

Development notes are available in:

```text
docs/DEVELOPMENT.md
```

Feature documentation:

```text
docs/BULK_IMPORT.md
docs/EXCEL_EXPORT.md
docs/EVALUATION_RULES.md
docs/EXCEL_EXPORT_ASSUMPTIONS.md
```

Copy the two PDFs:

```powershell
Copy-Item R1A.pdf backend/app/tests/fixtures/R1A.pdf
Copy-Item R1B.pdf backend/app/tests/fixtures/R1B.pdf
```

Run everything:

```powershell
docker compose up --build
```

Backend: `http://localhost:8000`

Frontend: `http://localhost:3000`

Run backend tests:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m pytest
```

PDF-backed tests skip until the fixture files are present.

## Acceptance Tests Covered

- R1A Retort/Cycle/timeline metadata
- R1B all-page parsing and known low-flow sequence
- decimal comma normalization
- stopped readings and active-flow exclusion
- three-consecutive rule triggering
- two readings do not trigger
- valid readings reset counters
- long violations group into one event
- `23:40:15` deterministic trigger
- midnight rollover
- duplicate-cycle protection
- R1A/R1B mismatch validation

## Parser Assumptions

- R1A labels include recognizable text such as Retort, Cycle, Product, Recipe No., Batch No., Operator, Containers, Cycle Start, Steam Input, Sterilization Start, Cooling Start, and End of Cycle.
- R1B rows begin with `HH:MM:SS` and include numeric columns in the order temperature, product temperature, pressure, F value, flow, water level, followed by phase/state text.
- Repeated table headers are ignored because rows must start with a clock time.
- Malformed R1B pages produce parse warnings; a report with no parsed readings raises a validation error.

## Future Improvements

- Tune PDF extraction against more report variants.
- Add editable rule forms with validation and reprocessing.
- Add phase duration analytics and cross-cycle trends.
- Add CSV export and audit warning views.
- Add screenshots after running with the real fixtures.
