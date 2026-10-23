import {
  project,
  validate,
  calculate,
  parseBackup,
  backup,
  round,
} from "./core.js";
const $ = (id) => document.getElementById(id),
  key = `forge:${project.slug}:v1`;
let plans = [],
  baseline = null,
  blocked = false,
  recovery = false,
  pending = null,
  undo = null,
  importSequence = 0,
  diagramChoice = -1,
  diagramSignature = "";
function tell(message, error = false) {
  $("notice").textContent = message;
  $("notice").className = `notice ${error ? "error" : ""}`;
}
function safeRead() {
  try {
    return localStorage.getItem(key);
  } catch {
    blocked = true;
    $("storage-alert").textContent =
      "Browser storage is unavailable. You can calculate and export the current plan, but cannot save plans here. Serve this folder locally if file-origin storage is blocked.";
    $("storage-alert").hidden = false;
    return null;
  }
}
function load() {
  baseline = safeRead();
  if (baseline !== null) {
    try {
      plans = parseBackup(baseline);
    } catch {
      blocked = true;
      recovery = true;
      $("storage-alert").textContent =
        "Saved data could not be read. It has not been changed. Download the original bytes, then use a valid backup to review a replacement. Saving and saved-plan export are blocked.";
      $("storage-alert").hidden = false;
      $("raw").hidden = false;
    }
  }
  renderSaved();
}
function persist(next) {
  if (blocked) {
    tell("Saving is blocked. Resolve the storage warning first.", true);
    return false;
  }
  const current = safeRead();
  if (blocked) {
    tell("Saving is blocked because browser storage could not be read.", true);
    return false;
  }
  if (current !== baseline) {
    blocked = true;
    $("storage-alert").hidden = false;
    $("storage-alert").textContent =
      "Saved data changed in another tab. Export the current plan if needed, then reload this page before saving.";
    tell("Stale write refused. Your other tab’s data was preserved.", true);
    return false;
  }
  try {
    const bytes = backup(next);
    localStorage.setItem(key, bytes);
    baseline = bytes;
    plans = next;
    renderSaved();
    return true;
  } catch (e) {
    tell(
      `Could not save: ${e.message}. Existing plans are unchanged. Download a backup before retrying.`,
      true,
    );
    return false;
  }
}
function readForm() {
  const p = {};
  for (const [name, , type] of project.fields)
    p[name] = ["number", "integer"].includes(type)
      ? Number($(name).value)
      : $(name).value;
  if (
    project.fields.some(
      ([name, , type]) =>
        ["number", "integer"].includes(type) && $(name).value.trim() === "",
    )
  )
    throw new Error("Fill every measurement field.");
  return validate(p);
}
function escape(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function svg(content) {
  return `<svg class="diagram" viewBox="0 0 640 340" role="img" aria-label="${escape($("diagram-title").textContent)}"><title>${escape($("diagram-title").textContent)}</title>${content}</svg>`;
}
function rect(x, y, w, h, fill, stroke = "#11635c") {
  return `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
}
function txt(x, y, s) {
  return `<text x="${x}" y="${y}" font-size="14">${escape(s)}</text>`;
}
function chooseDiagram(p, rows, index) {
  $("diagram-controls").hidden = false;
  $("diagram-caption").textContent = "Shown orientation: " + rows[index].label;
  const select = $("diagram-option");
  select.replaceChildren();
  rows.forEach((r, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = r.label + (r.fit ? " — fits" : " — does not fit");
    select.append(option);
  });
  select.value = index;
  select.onchange = () => {
    diagramChoice = Number(select.value);
    show(p);
  };
}
function show(p) {
  const signature = JSON.stringify(p);
  if (signature !== diagramSignature) {
    diagramChoice = -1;
    diagramSignature = signature;
  }
  const result = calculate(p),
    u = p.unit;
  $("plan-title").textContent = p.name;
  $("plan-info").textContent =
    `All measurements in ${u}. Diagram is a schematic, not a full-size drilling or cutting template.`;

  const fitting = result.filter((r) => r.fit),
    bestIndex =
      diagramChoice >= 0
        ? diagramChoice
        : Math.max(
            0,
            result.findIndex((r) => r.fit),
          ),
    best = result[bestIndex];
  chooseDiagram(p, result, bestIndex);
  $("summary").textContent = best.fit
    ? `A ${best.cutw} × ${best.cuth} ${u} cut fits your sheet.`
    : fitting.length
      ? "The selected cut does not fit. Other orientations fit; choose one below."
      : "No tested rectangular wrap fits this sheet.";
  $("details").innerHTML =
    `<table><thead><tr><th>Orientation</th><th>Required cut</th><th>Remaining sheet W / L</th><th>Result</th></tr></thead><tbody>${result.map((r) => `<tr><td>${escape(r.label)}</td><td>${r.cutw} × ${r.cuth} ${u}</td><td>${r.remainingw} / ${r.remainingh} ${u}</td><td><span class="pill ${r.fit ? "" : "no"}">${r.fit ? "Fits" : "Too small"}</span></td></tr>`).join("")}</tbody></table>`;
  const scale = Math.min(
    520 / Math.max(p.sheetw, best.cutw),
    235 / Math.max(p.sheeth, best.cuth),
  );
  $("diagram-title").textContent =
    "Sheet and selected rectangular cut, aligned at top left";
  $("diagram").innerHTML = svg(
    rect(50, 20, p.sheetw * scale, p.sheeth * scale, "#eef5ec") +
      rect(
        50,
        20,
        best.cutw * scale,
        best.cuth * scale,
        "#8bc7ba88",
        best.fit ? "#11635c" : "#813c20",
      ) +
      txt(
        50,
        290,
        `Sheet ${p.sheetw} × ${p.sheeth} ${u}; cut ${best.cutw} × ${best.cuth} ${u}`,
      ) +
      txt(
        50,
        315,
        `${best.fit ? "Cut fits" : "Cut exceeds sheet"}; allowances are included in the cut.`,
      ),
  );
  $("assumptions").textContent =
    `Assumes straight-edged paper, a closed rectangular box and a centered wrap. Standard meeting flaps use cut along box = box axis + fold height + overlap + 2 × tolerance; seam direction = 2 × (cross-width + fold height) + overlap + 2 × tolerance. Fold height must be no greater than cross-width. Each end extends (fold height + overlap)/2 before the tolerance, allowing opposite end flaps to meet with the requested overlap. Generous end allowance adds one extra cross-width along the box for deeper end folds. Your overlap ${p.overlap} ${u} applies to BOTH the seam and meeting end flaps; tolerance adds ${p.tolerance} ${u} at EACH cut edge. The diagram shows the selected cut, and the table names which box axes to use. Remaining dimensions are edge strips, not a second usable rectangle or multi-gift packing plan. Paper thickness, creasing, patterns and tape can need more allowance. Try scrap paper first for expensive sheets. Irregular boxes and decorative folds are outside scope.`;

  $("result").hidden = false;
}
function download(text, name) {
  const blob = new Blob([text], { type: "application/json" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function fill(p) {
  for (const [name] of project.fields) $(name).value = p[name];
  show(p);
}
function renderSaved() {
  const area = $("saved");
  area.replaceChildren();
  $("saved-count").textContent = `Saved plans (${plans.length}/100)`;
  if (!plans.length) {
    const p = document.createElement("p");
    p.className = "fine";
    p.textContent =
      "No plans saved yet. Calculate a plan, then choose Save plan.";
    area.append(p);
  }
  plans.forEach((p, i) => {
    const box = document.createElement("div");
    box.className = "saved-item";
    const title = document.createElement("strong");
    title.textContent = p.name;
    box.append(title);
    const info = document.createElement("p");
    info.className = "fine";
    info.textContent = `Measurements in ${p.unit}`;
    box.append(info);
    const actions = document.createElement("div");
    actions.className = "actions";
    const open = document.createElement("button");
    open.textContent = "Open";
    open.className = "secondary";
    open.onclick = () => {
      fill(p);
      tell(`Opened ${p.name}. Saving creates a separate plan.`);
    };
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.className = "danger";
    del.setAttribute("aria-label", `Delete ${p.name}`);
    del.onclick = () => {
      pending = { kind: "delete", index: i };
      $("confirm-title").textContent = "Delete this saved plan?";
      $("confirm-text").textContent =
        p.name +
        " will be removed. You can undo this deletion until another change.";
      $("confirm").showModal();
    };
    actions.append(open, del);
    box.append(actions);
    area.append(box);
  });
}
for (const [name, label, type, value] of project.fields) {
  const box = document.createElement("div");
  box.className = "field";
  const l = document.createElement("label");
  l.htmlFor = name;
  l.textContent = label;
  let input;
  if (type === "unit") {
    input = document.createElement("select");
    for (const u of ["cm", "mm", "in"]) {
      const op = document.createElement("option");
      op.value = u;
      op.textContent = u === "in" ? "inches" : u;
      input.append(op);
    }
  } else {
    input = document.createElement("input");
    input.type = type === "text" ? "text" : "number";
    if (type === "text") input.maxLength = 120;
    else {
      input.step = type === "integer" ? "1" : "any";
      input.min =
        type === "integer"
          ? "1"
          : ["gapx", "gapy", "hookx", "hooky", "overlap", "tolerance"].includes(
                name,
              )
            ? "0"
            : "0.001";
      input.max = type === "integer" ? "10" : "1000000";
    }
  }
  input.id = name;
  input.name = name;
  input.required = true;
  input.value = value;
  box.append(l, input);
  $("fields").append(box);
}
$("form").onsubmit = (e) => {
  e.preventDefault();
  try {
    show(readForm());
    tell("Plan calculated. Save it or print the measured guide when ready.");
  } catch (err) {
    tell(err.message, true);
  }
};
$("save").onclick = () => {
  try {
    if (plans.length >= 100)
      throw new Error(
        "Saved-plan limit reached. Export a backup and delete an unused plan first.",
      );
    const p = readForm();
    show(p);
    if (persist([...plans, p])) {
      undo = null;
      $("undo").hidden = true;
      tell(`Saved ${p.name}. Export a backup to keep a portable copy.`);
    }
  } catch (e) {
    tell(e.message, true);
  }
};
$("export").onclick = () => {
  if (blocked) {
    tell(
      "Saved-plan export is blocked while storage is unreadable or stale. Download the original bytes or export the current plan.",
      true,
    );
    return;
  }
  download(backup(plans), `${project.slug}-backup.json`);
  tell("Backup download requested. Keep the downloaded file somewhere safe.");
};
$("export-current").onclick = () => {
  try {
    download(backup([readForm()]), `${project.slug}-current-plan.json`);
  } catch (e) {
    tell(e.message, true);
  }
};
$("import").onchange = async (e) => {
  const sequence = ++importSequence,
    file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error("Backup exceeds 1 MB.");
    const bytes = await file.text();
    if (sequence !== importSequence) return;
    const next = parseBackup(bytes);
    pending = { kind: "import", plans: next, baseline: safeRead() };
    $("confirm-title").textContent = "Replace saved plans with this backup?";
    $("confirm-text").textContent =
      `File “${file.name}” contains ${next.length} valid plans. It will replace ${plans.length} saved plans. Export your current backup first. ${recovery ? "You are explicitly replacing unreadable storage; download its original bytes first." : ""}`;
    $("confirm").showModal();
  } catch (err) {
    if (sequence === importSequence) tell(err.message, true);
  }
};
$("confirm-apply").onclick = () => {
  if (!pending) return;
  const action = pending;
  if (action.kind === "delete") {
    const previous = plans.slice(),
      next = plans.filter((_, i) => i !== action.index);
    if (persist(next)) {
      undo = previous;
      $("undo").hidden = false;
      tell("Plan deleted. Undo is available.");
    }
  } else {
    if (safeRead() !== action.baseline) {
      tell(
        "Data changed after the import preview. Import cancelled; reload and review again.",
        true,
      );
      pending = null;
      $("confirm").close();
      return;
    }
    if (blocked && !recovery) {
      tell(
        "Reload before importing because browser storage is unavailable or changed in another tab.",
        true,
      );
      pending = null;
      $("confirm").close();
      return;
    }
    if (recovery && action.baseline !== baseline) {
      tell(
        "Saved data changed since unreadable data was loaded. Reload and review the current data before importing.",
        true,
      );
      pending = null;
      $("confirm").close();
      return;
    }
    const oldBlocked = blocked;
    blocked = false;
    baseline = action.baseline;
    if (persist(action.plans)) {
      recovery = false;
      $("raw").hidden = true;
      $("storage-alert").hidden = true;
      undo = null;
      $("undo").hidden = true;
      tell("Backup imported. Saved plans now match the reviewed file.");
    } else blocked = oldBlocked;
  }
  pending = null;
  $("confirm").close();
};
$("confirm-cancel").onclick = () => {
  importSequence++;
  pending = null;
  $("confirm").close();
};
$("confirm").addEventListener("cancel", () => {
  importSequence++;
  pending = null;
});
$("undo").onclick = () => {
  if (undo && persist(undo)) {
    undo = null;
    $("undo").hidden = true;
    tell("Deletion undone.");
  }
};
$("raw").onclick = () =>
  download(baseline ?? "", `${project.slug}-unreadable-original.json`);
$("print").onclick = () => {
  try {
    show(readForm());
    window.print();
  } catch (e) {
    tell(e.message, true);
  }
};
$("example").onclick = () => {
  const p = Object.fromEntries(
    project.fields.map(([name, , , value]) => [name, value]),
  );
  fill(p);
  tell("Example loaded. It has not been saved.");
};
window.addEventListener("storage", (e) => {
  if (e.key === key || e.key === null) {
    blocked = true;
    $("storage-alert").hidden = false;
    $("storage-alert").textContent =
      "Saved data changed in another tab. Reload before saving; export the current plan first if needed.";
  }
});
$("unit").addEventListener("change", () =>
  tell(
    "Units changed. Numeric values are unchanged: enter measurements in the selected unit. No automatic conversion is performed.",
  ),
);
load();
try {
  show(readForm());
} catch (e) {
  tell(e.message, true);
}
