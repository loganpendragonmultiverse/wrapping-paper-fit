# Wrapping Paper Fit

Check an ordinary rectangular gift box with standard meeting end flaps or a generous end allowance. Compare box axes and both sheet orientations. This is a measured cutting plan; materials and folding technique still matter.

This is a small, local-first browser tool for household measurements.

## Start in three minutes

1. Download the release ZIP and extract it. Open `index.html` in a current browser. The packaged file includes its styles and scripts and works offline.
2. Choose cm, mm or inches, then enter your measurements. Changing units does not convert numbers.
3. Choose **Calculate plan**. Read the diagram, numeric results and assumptions before using the plan.
4. Choose **Save plan** to keep a named copy in this browser, or **Export current plan** to download it. **Print measured guide** prints the visible plan without the editor.

If your browser blocks file-origin storage, run `python -m http.server 8000` in the extracted folder and open `http://localhost:8000`. This local server needs no Internet access. Opening source `index.html` requires a local server because source modules are separate files; the release ZIP is directly openable.

## What it includes

Rectangular gift boxes, supplied sheet dimensions, seam overlap, practical cut-edge tolerance, box-axis and sheet-orientation comparison with cutting diagrams.

The example is synthetic and included in `examples/example.json`. Import it to review the backup format. Plans can be reopened or deleted; deleting a plan offers Undo until the next successful change. Saving an opened plan makes another copy, so earlier measurements stay available. At most 100 plans are saved; export before pruning older ones.

## Backups and privacy

No accounts, analytics, uploads or runtime network requests. The source link opens GitHub only when you choose it. Browser storage is local to this browser and origin. Private mode, browser cleanup and storage eviction can remove it; it is not a permanent backup. Export JSON regularly and keep copies outside the browser. Printing or exporting may reveal the names and measurements you entered.

Import accepts only this tool’s version 1 schema, at most 100 plans and 1 MB JSON. A preview shows the replacement count and requires confirmation before saving. Imports replace the saved list, so export the current list first. Cancel or Escape leaves it unchanged. Invalid imports never write. Unreadable storage remains unchanged and blocks normal saving/export until a valid backup is reviewed for explicit replacement; the original bytes can be downloaded. A changed value in another tab blocks stale saves. A rejected browser write leaves the current in-memory list unchanged.

## Wrapping assumptions

Standard meeting flaps require a fold height no greater than cross-width. The paper extends (fold height + supplied overlap)/2 past each box end, before the cut-edge tolerance. Cut along the box is box axis + fold height + overlap + twice the tolerance. The seam direction is twice the cross-section sides + overlap + twice the tolerance. The generous recipe adds one extra cross-width along the box. The supplied overlap applies to both seam and end flaps. For a 30 Ã— 20 Ã— 10 cm box, 3 cm overlap and zero tolerance, a standard 43 Ã— 63 cm cut fits a 65 Ã— 45 cm sheet after rotation. Add practical tolerance for real folds and paper. Select an orientation to inspect its cutting diagram.

## Limits

Measurements are rectangular and user supplied. Results cannot establish physical suitability or safety. Numeric marks round to 0.001 units; actual tools and materials may be less precise. Drawings are schematic and must never be measured as full-scale templates. Each result includes the specific geometry assumptions. There is no remote sync or automatic unit conversion.

## Development and contributions

Node.js 22 or newer and Python 3 are used for tests and packaging. Run `npm ci` to install the pinned development tools before running the checks below. The distributed browser app has no runtime dependencies.

```sh
npm ci
npm test
npm run check
npm run build
```

The build creates `dist/index.html`, `dist/wrapping-paper-fit-1.0.1.zip` and `dist/SHA256SUMS`. See [TESTING.md](TESTING.md), [DEVELOPMENT.md](DEVELOPMENT.md) and [CONTRIBUTING.md](CONTRIBUTING.md). Supported behavior is defined by the tests and documented acceptance flows; browser/platform results belong in the release evidence rather than assumed compatibility claims.

MIT licensed. Fixes and useful ideas are welcome; no response or maintenance schedule is promised.

## Development checks

The extracted ZIP opens directly from its root `index.html`. Its `source/` directory contains the original module-based entry point, package metadata, source code, scripts, tests, examples, workflows and documentation. To develop or rebuild the extracted source, change into `source/` before running the commands below.

Use Node.js 22 or newer and Python 3. Install development-only dependencies with `npm ci`, then run `npm test`, `npm run check` and `npm run build`. For browser acceptance, install the pinned test browsers with `npx playwright install chromium firefox webkit`, then run `npm run test:browser`. CI repeats source checks on Linux, Windows and macOS, and browser acceptance uses Chromium, Firefox and WebKit. These checks do not establish testing on physical phones or every supported OS/browser combination.

`npm run format` applies the repository formatter. The formatter and browser harness are development tools; the distributed application runs without them, accounts or an Internet connection.
