export const project = {
  title: "Wrapping Paper Fit",
  tagline: "Check the sheet before cutting.",
  intro:
    "Check an ordinary rectangular gift box with standard meeting end flaps or a generous end allowance. Compare box axes and both sheet orientations. This is a measured cutting plan; materials and folding technique still matter.",
  fields: [
    ["name", "Gift name", "text", "Book box"],
    ["unit", "Units", "unit", "cm"],
    ["length", "Box length", "number", 30],
    ["width", "Box width", "number", 20],
    ["height", "Box height", "number", 10],
    ["sheetw", "Sheet width", "number", 70],
    ["sheeth", "Sheet length", "number", 100],
    ["overlap", "Seam and end-flap overlap", "number", 3],
    ["tolerance", "Extra allowance per cut edge", "number", 1],
  ],
  scope:
    "Rectangular gift boxes, supplied sheet dimensions, seam overlap, practical cut-edge tolerance, box-axis and sheet-orientation comparison with cutting diagrams.",
  slug: "wrapping-paper-fit",
};

export function number(
  value,
  label,
  { zero = false, max = 1000000, integer = false } = {},
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < (zero ? 0 : 0.001) ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new Error(
      `${label} must be ${integer ? "a whole number " : ""}between ${zero ? 0 : integer ? 1 : 0.001} and ${max}.`,
    );
  return value;
}
export function validate(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan))
    throw new Error("Each plan must be an object.");
  const expected = project.fields.map((f) => f[0]);
  if (
    Object.keys(plan).length !== expected.length ||
    Object.keys(plan).some((k) => !expected.includes(k))
  )
    throw new Error("Plan fields do not match this tool.");
  const out = {};
  for (const [key, label, type] of project.fields) {
    const value = plan[key];
    if (type === "text") {
      if (typeof value !== "string" || !value.trim() || value.length > 120)
        throw new Error(`${label} must contain 1–120 characters.`);
      out[key] = value.trim();
    } else if (type === "unit") {
      if (!["cm", "mm", "in"].includes(value))
        throw new Error("Choose cm, mm or inches.");
      out[key] = value;
    } else
      out[key] = number(value, label, {
        zero: [
          "gapx",
          "gapy",
          "hookx",
          "hooky",
          "overlap",
          "tolerance",
        ].includes(key),
        max: type === "integer" ? 10 : 1000000,
        integer: type === "integer",
      });
  }
  calculate(out);
  return out;
}
export function parseBackup(text) {
  if (typeof text !== "string" || text.length > 1000000)
    throw new Error("Backup exceeds the 1 MB text limit.");
  let b;
  try {
    b = JSON.parse(text);
  } catch {
    throw new Error("This is not valid JSON.");
  }
  if (
    !b ||
    b.tool !== project.slug ||
    b.version !== 1 ||
    !Array.isArray(b.plans) ||
    b.plans.length > 100 ||
    Object.keys(b).some((k) => !["tool", "version", "plans"].includes(k))
  )
    throw new Error(
      "Choose a version 1 backup from this tool with at most 100 plans.",
    );
  return b.plans.map(validate);
}
export function backup(plans) {
  return JSON.stringify(
    { tool: project.slug, version: 1, plans: plans.map(validate) },
    null,
    2,
  );
}
export function atLeast(a, b) {
  return a + Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b)) * 8 >= b;
}
export function round(value) {
  return Math.round(value * 1000) / 1000;
}

export function calculate(p) {
  const dims = [p.length, p.width, p.height],
    labels = ["length", "width", "height"],
    rows = [];
  for (let a = 0; a < 3; a++)
    for (let b = 0; b < 3; b++)
      if (a !== b) {
        const h = 3 - a - b;
        for (const method of [
          "Standard meeting flaps",
          "Generous end allowance",
        ]) {
          // Ordinary top/bottom end flaps are modeled only with fold height no
          // greater than the cross-width. The other axis permutation handles
          // the opposite cross-section orientation.
          if (method === "Standard meeting flaps" && dims[h] > dims[b])
            continue;
          const extra = method === "Generous end allowance" ? dims[b] : 0;
          const along = dims[a] + dims[h] + p.overlap + extra + 2 * p.tolerance;
          const around = 2 * (dims[b] + dims[h]) + p.overlap + 2 * p.tolerance;
          for (const rotate of [false, true]) {
            const cutw = rotate ? around : along,
              cuth = rotate ? along : around;
            rows.push({
              label: `${method}: ${labels[a]} along box; ${labels[b]} across face; ${labels[h]} fold height${rotate ? "; sheet rotated" : ""}`,
              method,
              along: dims[a],
              across: dims[b],
              height: dims[h],
              rotated: rotate,
              cutw: round(cutw),
              cuth: round(cuth),
              remainingw: round(p.sheetw - cutw),
              remainingh: round(p.sheeth - cuth),
              fit: atLeast(p.sheetw, cutw) && atLeast(p.sheeth, cuth),
              area: cutw * cuth,
            });
          }
        }
      }
  return rows.sort((a, b) => Number(b.fit) - Number(a.fit) || a.area - b.area);
}
