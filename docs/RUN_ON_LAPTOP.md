# Run This Project On Your Laptop

This guide explains how to run `industrial-process-analytics` on your laptop and keep it running in the background.

## What You Need Installed

Install these first:

- Docker Desktop for Windows
- Git, optional but useful
- A modern browser such as Chrome or Edge

You do not need to manually install PostgreSQL, Python packages, or Node packages if you run with Docker. Docker will run everything.

## Required Project Files

Make sure these files exist:

```text
backend/app/tests/fixtures/R1A.pdf
backend/app/tests/fixtures/R1B.pdf
docker-compose.yml
backend/Dockerfile
frontend/Dockerfile
```

The two PDFs are your test reports:

- `R1A.pdf`: cycle summary report
- `R1B.pdf`: instant data report

## Start Docker Desktop

Before running commands, open Docker Desktop and wait until it says Docker is running.

If Docker Desktop is not running, commands like `docker compose up` will fail.

## Open Terminal In The Project Folder

Open PowerShell in:

```text
C:\Users\HP\Desktop\Reports Analyzer
```

You can check you are in the right folder:

```powershell
Get-Location
```

Expected path:

```text
C:\Users\HP\Desktop\Reports Analyzer
```

## Run In The Background

Use this command:

```powershell
docker compose up -d --build
```

What this does:

- Builds the backend container
- Builds the frontend container
- Starts PostgreSQL
- Starts FastAPI backend
- Starts Next.js frontend
- Keeps everything running in the background

The `-d` means detached mode, which keeps the project running after the terminal command finishes.

## Open The Dashboard

After the containers start, open:

```text
http://localhost:3000
```

Backend API is here:

```text
http://localhost:8000
```

Backend health check:

```text
http://localhost:8000/health
```

Expected health response:

```json
{"status":"ok"}
```

## Check If Everything Is Running

Run:

```powershell
docker compose ps
```

You should see these services running:

- `db`
- `backend`
- `frontend`

Expected ports:

- Frontend: `0.0.0.0:3000->3000`
- Backend: `0.0.0.0:8000->8000`
- Database: `0.0.0.0:5432->5432`

## How To Use The Dashboard

Open:

```text
http://localhost:3000
```

Use the tabs:

- `Overview`: total cycles and alert summary
- `Upload Reports`: upload `R1A.pdf` and `R1B.pdf`
- `Cycle Report`: cycle metadata, timeline, and flow graph
- `Flow Analytics`: average, minimum, maximum, and active-process flow
- `Alerts`: low-flow alert events
- `Rules & Settings`: change alert rules

## Upload Reports

Go to the `Upload Reports` tab.

Select:

- `R1A.pdf` for Cycle Summary Report
- `R1B.pdf` for Instant Data Report

Then click:

```text
Analyze Reports
```

The app will:

- Parse both PDFs
- Match Retort and Cycle Number
- Store the cycle in PostgreSQL
- Calculate flow analytics
- Apply low-flow rules
- Show alerts and graphs

## Change Rules And Settings

Go to:

```text
Rules & Settings
```

You can change:

- Rule name
- Parameter, such as `flow`
- Operator, such as `<`
- Threshold, such as `59.0`
- Consecutive readings, such as `3`
- Phase, such as `ANY_ACTIVE_PHASE`
- Severity, such as `warning`
- Enabled or disabled

Important: changed rules apply to new uploads. Existing imported cycles are not automatically recalculated yet.

## Stop The Project

To stop the containers but keep database data:

```powershell
docker compose down
```

To start again later:

```powershell
docker compose up -d
```

## Restart After Code Changes

If you change code, run:

```powershell
docker compose up -d --build
```

Then refresh:

```text
http://localhost:3000
```

Use `Ctrl + F5` if the browser shows old content.

## View Logs

Frontend logs:

```powershell
docker compose logs frontend --tail 100
```

Backend logs:

```powershell
docker compose logs backend --tail 100
```

Database logs:

```powershell
docker compose logs db --tail 100
```

Live logs:

```powershell
docker compose logs -f
```

Press `Ctrl + C` to stop watching logs. This does not stop the containers.

## Run Backend Tests

If Python dependencies are installed locally:

```powershell
python -m pytest
```

Expected result:

```text
15 passed
```

If `pytest` is missing:

```powershell
python -m pip install -r backend/requirements.txt
python -m pytest
```

## Common Problems

### Docker Access Is Denied

Error may look like:

```text
open //./pipe/docker_engine: Access is denied
```

Fix:

- Start Docker Desktop
- Run PowerShell as Administrator
- Try again:

```powershell
docker compose up -d --build
```

### Frontend Shows Old Error Screen

Hard refresh:

```text
Ctrl + F5
```

If still broken:

```powershell
docker compose up -d --build --force-recreate frontend
```

### Port Already In Use

If port `3000`, `8000`, or `5432` is already used, another app is running on that port.

Check running containers:

```powershell
docker ps
```

Stop this project:

```powershell
docker compose down
```

### Backend Is Not Responding

Check health:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
```

Check backend logs:

```powershell
docker compose logs backend --tail 100
```

### Database Data Looks Old

The app stores data in Docker volume `postgres-data`.

Normal reset, only if you do not need old imported cycles:

```powershell
docker compose down -v
docker compose up -d --build
```

Warning: `docker compose down -v` deletes the PostgreSQL data volume for this project.

## Recommended Daily Workflow

Start:

```powershell
docker compose up -d
```

Open:

```text
http://localhost:3000
```

Stop when finished:

```powershell
docker compose down
```

Use rebuild only after code changes:

```powershell
docker compose up -d --build
```
