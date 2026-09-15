# Excel Export Assumptions

The reference workbook named:

```text
We need data like this covering all the terms with the mentioned calculation formulas.xlsx
```

was used as the layout reference for the evaluated report download.

The exporter follows the visible grouped structure from the workbook:

- `A:H` general cycle details
- `I:P` Water Filling Then Steam Input Start
- `Q:S` Step_1&2 Heating
- `T:AA` Step_3,4,5 Sterilization
- `AB:AJ` Step_6,7&8 Cooling
- `AK` Remarks
- `AL` Status

## Preserved Ambiguity

The brief separately asks for:

- `Min From R1B Report`
- `Minimum`

For Cooling, both fields are preserved in the schema and Excel output.

For this MVP, `AE` is populated from the lowest Flow reading directly observed in R1B during Cooling Start To End Of Cycle when no separate summary-level minimum field is parsed from R1B. Calculated cooling minimum is still written separately in `AF`; the fields remain separate because their business meanings may diverge later.

## Heating Section

The supplied PDF exposes reliable timestamps:

- Steam Input
- Sterilization Start

The reference workbook maps Heating start to Cycle Start, so Heating is currently mapped to:

```text
Cycle Start -> Sterilization Start
```

The current Excel output records Heating timing only because the requested Excel column group for Heating contains only:

- Start Time
- End Time
- Total Minutes

## Future Workbook Alignment

If the reference workbook changes, inspect:

- merged heading layout
- exact labels
- formulas
- comments
- any special colors
- separate meaning of Cooling `Min From R1B Report`

Then update:

```text
backend/app/exports/excel_report.py
backend/app/tests/test_excel_export.py
```
