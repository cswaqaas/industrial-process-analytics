# Evaluation Rules

This document explains section calculations, comments, and final OK / NOT OK status.

## Default Flow Rule

Current default rule:

```text
parameter: flow
operator: <
threshold: 59.0
consecutive_count: 3
phase: ANY_ACTIVE_PHASE
severity: warning
```

`ANY_ACTIVE_PHASE` excludes `Stopped`.

## Alert Behavior

Three consecutive eligible readings below `59.0 L/s` trigger an alert on the third reading.

Example:

```text
23:39:55 -> 58.9
23:40:05 -> 58.5
23:40:15 -> 58.4
```

Trigger:

```text
23:40:15
```

Continuous low-flow readings are grouped into one alert event.

## Section Definitions

Section definitions live in:

```text
backend/app/analytics/evaluation_service.py
```

Current sections:

```text
WATER_FILLING: Cycle Start -> Steam Input
HEATING: Steam Input -> Sterilization Start
STERILIZATION: Sterilization Start -> Cooling Start
COOLING: Cooling Start -> End Of Cycle
```

Heating currently records timing only. This is intentional because the supplied report exposes reliable `Steam Input` and `Sterilization Start` boundaries, while detailed industrial step boundaries should be refined by domain users later.

## Statistics

For sections with flow evaluation:

- minimum flow
- maximum flow
- median flow
- average flow
- reading count

Missing flow values are excluded.

If a section has no readings:

- statistics are `null`
- status is not faked with zero values
- comment says readings are missing

## Comments

Compliant section:

```text
OK - All evaluated flow readings comply.
```

Violation section:

```text
Low flow detected: readings below configured limit starting HH:MM:SS, triggered HH:MM:SS.
```

## Status

Section status:

- `OK`
- `NOT OK`

Final workbook status is `NOT OK` if any evaluated section is `NOT OK`.

## Reprocessing

Endpoint:

```text
POST /api/cycles/{id}/reprocess
```

Reprocessing:

- reuses stored measurements
- recalculates evaluations
- reruns rules
- replaces alert events safely
- does not duplicate measurements
