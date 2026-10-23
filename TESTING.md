# Testing

Run `npm test`, `npm run check` and `npm run build` with Node.js 22+ and Python 3. Core tests cover examples, boundaries, strict schema validation and backup roundtrips. They do not prove browser interaction or print layout.

Browser acceptance: serve source locally and exercise calculation, invalid form values, saved plan creation/reopen/delete/undo, export and confirmed replacement import. Test malformed JSON, wrong tool/version, oversize files, extra fields, non-finite/negative inputs and limits. Cancel import and press Escape; existing data must remain unchanged. Seed invalid browser storage and confirm saving/export refusal and raw-byte download; a valid import must require explicit replacement. Modify storage in another tab and confirm stale-write refusal. Simulate quota failure and confirm old records survive.

Open the built ZIP’s extracted `index.html` directly while offline. Verify controls and downloadable backup contents, then repeat via local HTTP. Review at desktop and 390px widths. Use keyboard alone, browser zoom and print preview. Numeric result columns must remain legible and the printout must show units, coordinate origin and assumptions. Never treat the schematic as a scale template.

Release evidence must identify tested browsers, actual artifact digest, reviewer findings and remaining gaps. No browser or Gold completion claim is inferred from unit tests.
