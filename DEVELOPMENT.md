# Development

The release ZIP keeps its directly-openable app at the root and a complete rebuildable repository tree in `source/`. From an extracted ZIP, run development and build commands inside `source/`; its original `index.html` uses the readable modules in `src/`.

## Bounded v1 scope

Rectangular gift boxes, supplied sheet dimensions, seam overlap, practical cut-edge tolerance, box-axis and sheet-orientation comparison with cutting diagrams.

Architecture: browser DOM built from validated values, pure geometry in `src/core.js`, browser persistence and interactions in `src/app.js`, no runtime dependencies. The packaged entry point inlines the readable modules and CSS, leaving source alongside it. JSON is parsed as data, never executed. User text is inserted as text or escaped before result rendering.

## Acceptance before release / Gold assessment

- Verify mathematical examples and boundary failures with `npm test`; run syntax checks and build.
- Independently review geometry assumptions, user input, imports, stale-tab writes, corrupt storage preservation and failure recovery.
- Exercise keyboard form submission, saved-plan reopen/delete/undo, current-plan export, saved backup roundtrip, replacement preview/cancel/Escape, invalid files and storage failure against source and the exact release ZIP.
- Inspect desktop and narrow layouts, result tables and printed output in actual browsers. Verify direct `file:` package entry without network access and local HTTP flows where file-origin storage is unavailable.
- Verify repository checks, release commit/tag, artifact checksums and public links separately. A passing build does not assign Gold.

No shared catalog, release register, owner records or unrelated working copies are written by this project. Scope completion rather than additional features defines acceptance.
