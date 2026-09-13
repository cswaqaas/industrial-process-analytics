# Bulk Import

Bulk import supports ZIP upload for batch processing.

## Supported Input

Upload one `.zip` file from the dashboard `Bulk Batch` tab.

The ZIP may contain nested folders, for example:

```text
Batch-001/
  Cycle-327/
    report-A.pdf
    report-B.pdf
  Cycle-328/
    report-A.pdf
    report-B.pdf
```

The scanner does not depend on exactly one folder depth. It recursively scans for PDFs.

## Classification

PDFs are classified by document content, not filename.

Current report types:

- `A`: cycle summary report
- `B`: instant data report
- `UNKNOWN`: unsupported or unclear document

Classifier module:

```text
backend/app/services/report_classifier.py
```

## Pairing

Reports are paired by metadata:

- Retort number
- Cycle number

The architecture leaves room for production date, batch number, recipe, product, and folder context.

Pairing module:

```text
backend/app/services/pairing.py
```

## Error Handling

Bulk processing continues when one cycle fails.

Possible result statuses:

- `PROCESSED`
- `FAILED_PARSING`
- `MISSING_A`
- `MISSING_B`
- `AMBIGUOUS_PAIR`
- `PAIRING_ERROR`

## ZIP Safety

The backend prevents unsafe ZIP paths such as:

```text
../../something.pdf
```

Limits are defined in:

```text
backend/app/services/bulk_ingestion.py
```

Current protections:

- file count limit
- ZIP size limit
- individual file size limit
- total extracted size limit
- PDF-only processing
- uploaded files are never executed

## API

```text
POST /api/batches/upload
GET  /api/batches
GET  /api/batches/{id}
GET  /api/batches/{id}/cycles
GET  /api/batches/{id}/summary
GET  /api/batches/{id}/export.xlsx
```
