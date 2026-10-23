import test from "node:test";
import assert from "node:assert/strict";
import {
  project,
  validate,
  calculate,
  parseBackup,
  backup,
  round,
} from "../src/core.js";
const sample = () =>
  Object.fromEntries(project.fields.map(([key, , , value]) => [key, value]));
test("example validates and backup roundtrips without losing values", () => {
  const p = sample();
  assert.deepEqual(parseBackup(backup([p])), [p]);
  assert.deepEqual(validate(p), p);
});
test("reject wrong tool/version, extra fields and non-objects", () => {
  for (const bad of [
    "null",
    "[]",
    "{}",
    JSON.stringify({ tool: "wrong", version: 1, plans: [] }),
    JSON.stringify({ tool: project.slug, version: 2, plans: [] }),
    JSON.stringify({ tool: project.slug, version: 1, plans: [], extra: true }),
  ])
    assert.throws(() => parseBackup(bad));
  for (const bad of [
    null,
    [],
    { ...sample(), extra: 1 },
    { ...sample(), unit: "ft" },
    { ...sample(), name: "  " },
    { ...sample(), name: "x".repeat(121) },
  ])
    assert.throws(() => validate(bad));
});
test("reject malformed, oversized and too many plan backups", () => {
  assert.throws(() => parseBackup("{broken"));
  assert.throws(() => parseBackup("x".repeat(1000001)));
  assert.throws(() =>
    parseBackup(
      JSON.stringify({
        tool: project.slug,
        version: 1,
        plans: Array.from({ length: 101 }, sample),
      }),
    ),
  );
});
test("strict numeric types prevent null, string, boolean and nonfinite measurements", () => {
  const key = project.fields.find((f) => f[2] === "number")[0];
  for (const value of [null, true, "5", NaN, Infinity, -1, 0, 0.00001, 1000001])
    assert.throws(() => validate({ ...sample(), [key]: value }));
});
test("escaped-looking user labels remain plain data through backup", () => {
  const p = { ...sample(), name: "<img src=x onerror=alert(1)>" };
  assert.equal(parseBackup(backup([p]))[0].name, p.name);
});

test("standard meeting flaps fit an ordinary box on 65 by 45 paper", () => {
  const p = validate({
    ...sample(),
    length: 30,
    width: 20,
    height: 10,
    sheetw: 65,
    sheeth: 45,
    overlap: 3,
    tolerance: 0,
  });
  const rows = calculate(p),
    r = rows.find(
      (r) =>
        r.method === "Standard meeting flaps" &&
        r.along === 30 &&
        r.across === 20 &&
        r.rotated,
    );
  assert.equal(r.cutw, 63);
  assert.equal(r.cuth, 43);
  assert.equal(r.fit, true);
  assert.ok(rows.some((r) => r.method === "Generous end allowance" && !r.fit));
});
test("standard and generous methods both honor seam and end overlap plus tolerance", () => {
  const p = validate({
    ...sample(),
    length: 30,
    width: 20,
    height: 10,
    sheetw: 65,
    sheeth: 65,
    overlap: 3,
    tolerance: 1,
  });
  const rows = calculate(p),
    normal = rows.find(
      (r) =>
        r.method === "Standard meeting flaps" &&
        r.along === 30 &&
        r.across === 20 &&
        !r.rotated,
    ),
    generous = rows.find(
      (r) =>
        r.method === "Generous end allowance" &&
        r.along === 30 &&
        r.across === 20 &&
        !r.rotated,
    );
  assert.equal(normal.cutw, 45);
  assert.equal(normal.cuth, 65);
  assert.equal(generous.cutw, 65);
  assert.equal(generous.cuth, 65);
  assert.equal(generous.fit, true);
});
test("tests both sheet orientations and standard cross-section fold-height assumptions", () => {
  const rows = calculate(validate(sample()));
  assert.equal(rows.length, 18);
  for (const r of rows.filter((r) => r.method === "Standard meeting flaps"))
    assert.ok(r.height <= r.across);
  for (const r of rows.filter((r) => !r.rotated)) {
    assert.ok(rows.some((q) => q.label === r.label + "; sheet rotated"));
  }
});
test("too-small paper is rejected and more allowance cannot create a fit", () => {
  const base = { ...sample(), sheetw: 20, sheeth: 20 };
  assert.ok(calculate(validate(base)).every((r) => !r.fit));
  const first = calculate(validate(sample())).filter((r) => r.fit).length,
    second = calculate(
      validate({ ...sample(), overlap: 1000, tolerance: 1000 }),
    ).filter((r) => r.fit).length;
  assert.ok(second <= first);
  assert.equal(second, 0);
});
