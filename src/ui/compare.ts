import { vitruvianFlank } from "../core/evidence";
import { RULES } from "../core/rules";
import { FLANKS, type FlankRow, PERSEUS_FETCHED } from "../data/temples";
import { $, esc } from "./dom";

type Reading = "gaps" | "columns";
const key = (r: FlankRow) =>
  r.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
const rule = RULES.get("flanks");
if (!rule) throw new Error("The flank rule is missing.");
const LATIN = rule.latin;
const ENGLISH = rule.english;
const witness = "https://archive.org/details/vitruviidearchit00vitr_1/page/69/mode/1up";
const attribution = `Temple records: Perseus Digital Library, Tufts University; CC BY-SA 3.0 US. Retained ${PERSEUS_FETCHED}.`;

function required(reading: Reading): number {
  return reading === "gaps" ? vitruvianFlank(6) : 12;
}

/** A count diagram, not a reconstruction: identical spacing deliberately carries no metres. */
function countDiagram(flank: number, label: string, color: string, y: number): string {
  const x = 105;
  const step = 32;
  const front = 6;
  const circles: string[] = [];
  for (let a = 0; a < flank; a++) {
    for (let b = 0; b < front; b++) {
      if (a !== 0 && a !== flank - 1 && b !== 0 && b !== front - 1) continue;
      circles.push(
        `<circle cx="${x + a * step}" cy="${y + b * step}" r="6" fill="none" stroke="${color}" stroke-width="1.6"/>`,
      );
    }
  }
  const gaps = Array.from(
    { length: flank - 1 },
    (_, i) =>
      `<path d="M${x + i * step + 7} ${y - 16}h${step - 14}" stroke="${color}" stroke-width="2"/><text x="${x + (i + 0.5) * step}" y="${y - 26}" text-anchor="middle" font-size="12">${i + 1}</text>`,
  ).join("");
  return `<g data-diagram="${flank}"><text x="${x}" y="${y - 55}" font-size="19">${esc(label)}</text>${circles.join("")}${gaps}
    <text x="${x + ((flank - 1) * step) / 2}" y="${y + 76}" text-anchor="middle" font-size="31" fill="${color}">6 × ${flank}</text>
    <text x="${x + ((flank - 1) * step) / 2}" y="${y + 104}" text-anchor="middle" font-size="16">5 spaces × ${flank - 1} spaces</text>
    <text x="22" y="${y + 74}" font-size="13">6 columns</text><text x="22" y="${y + 96}" font-size="13">5 spaces</text>
    <path d="M${x - 17} ${y}h-5v${5 * step}h5" stroke="${color}" fill="none"/>
  </g>`;
}

export function comparisonSvg(row: FlankRow, reading: Reading): string {
  const side = required(reading);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 570" role="img" aria-labelledby="count-title count-desc">
  <title id="count-title">${esc(row.name)} beside ${reading === "gaps" ? "Vitruvius’s count" : "the doubled-column reading"}</title>
  <desc id="count-desc">Six columns enclose five spaces. The selected reading gives ${side} flank columns and ${side - 1} spaces; the catalogue records ${row.flank} flank columns and ${row.flank - 1} spaces. Equal spacing is schematic, not measured.</desc>
  <rect width="760" height="570" fill="#f8f9f5"/>
  <g fill="#1f2328" font-family="Georgia, serif">
  ${countDiagram(side, reading === "gaps" ? "I. Vitruvius · double the spaces" : "I. Trial reading · double the columns", "#1f4e9c", 100)}
  ${countDiagram(row.flank, `II. ${row.name}${row.status === "uncertain" ? " (uncertain)" : ""}`, "#663d25", 375)}
  <text x="105" y="560" font-size="12">Count diagrams. Fronts at left. Spacing, orientation and outlines are illustrative.</text>
  </g></svg>`;
}

function save(content: string, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function sourceCard(row: FlankRow): string {
  return `<h3>${esc(row.name)}</h3><p class="count-date">${esc(row.date)} · ${esc(row.region ?? "Region not recorded")}</p>
  <blockquote>“${esc(row.quote)}”</blockquote>
  ${row.note ? `<p>${esc(row.note)}</p>` : ""}
  <p>${row.status === "uncertain" ? "Perseus flags this restoration as uncertain. It is excluded from the default tally." : "Perseus does not flag this column count as uncertain."}</p>
  <a href="${esc(row.url)}">Read the Perseus entry ↗</a>`;
}

function sheet(row: FlankRow, reading: Reading): string {
  const side = required(reading);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(row.name)}: count comparison</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
  <style>body{margin:3rem auto;padding:0 1.2rem;max-width:52rem;color:#232923;background:#f8f9f5;font:19px/1.6 Georgia,serif}h1,h2{line-height:1.2}svg{width:100%;height:auto}a{color:#1f4e9c;overflow-wrap:anywhere}blockquote{margin:1rem 0;border-left:2px solid #777;padding-left:1rem}.small{font-size:15px}@media print{body{margin:0;max-width:none;font-size:12pt}svg{max-height:16cm}h2{break-after:avoid}}</style></head><body>
  <h1>Count the spaces</h1><p>${esc(row.name)} beside ${reading === "gaps" ? "Vitruvius’s count" : "a trial that doubles columns"}.</p>
  ${comparisonSvg(row, reading)}
  <p>The selected reading predicts ${side} flank columns. The catalogue records ${row.flank}. Six columns enclose five spaces. Doubling five spaces gives ten, with eleven columns at their ends; doubling six columns gives twelve, with eleven spaces.</p>
  <p>These are count diagrams with equal spacing, not measured plans. Matching a count cannot show that a builder followed Vitruvius. The buildings mostly precede his first-century BCE treatise. This curated catalogue is not a census.</p>
  <h2>The building record</h2>${sourceCard(row)}
  <h2>Vitruvius III.4.3</h2><p lang="la">${esc(LATIN)}</p><p>${esc(ENGLISH)}</p>
  <p class="small">Latin: Krohn (1912), p. 69; new English translation, not independently reviewed. <a href="${witness}">Printed witness</a>.</p>
  <p class="small">${esc(attribution)} <a href="https://creativecommons.org/licenses/by-sa/3.0/us/">Data license</a>. Diagram and English: Anthony Mercer, PolyForm Noncommercial. This file contains the selected record and diagram and needs no network to read or print. External source links need a connection.</p>
  <p><a href="https://antonsoo.github.io/embater/compare.html?temple=${key(row)}&count=${reading}">Reopen this comparison</a></p></body></html>`;
}

export function mountComparison(root: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  const row =
    FLANKS.find((r) => key(r) === params.get("temple")) ??
    FLANKS.find((r) => r.name === "Selinus, Temple C");
  if (!row) throw new Error("The initial temple record is missing.");
  let selected: FlankRow = row;
  let reading: Reading = params.get("count") === "columns" ? "columns" : "gaps";
  root.innerHTML = `<section class="count-intro"><p class="count-kicker">A word changes the plan · Vitruvius III.4.3</p><h1>Count the spaces.</h1>
  <p>Six columns across the front. Twice as many along the side? Read the noun carefully: Vitruvius doubles the <i>intercolumnia</i>, the spaces between them. Try both readings, then put the rule beside a building record.</p></section>
  <section class="count-bench" aria-label="Compare a rule with a temple">
    <div class="count-drawing"><div id="count-frame" class="count-frame" tabindex="0" role="region" aria-label="Count diagram; enlarge to read and pan"><figure id="count-plate"></figure></div><button type="button" id="count-zoom" aria-pressed="false" aria-controls="count-frame">Enlarge the diagram</button><p id="count-pan-hint" class="count-limit" hidden>Swipe or focus the diagram and use the arrow keys to pan.</p><p class="count-limit">Equal spacing makes the counts visible. These are not measured plans; column counts alone do not give a building’s length or width.</p></div>
    <aside class="count-controls">
      <fieldset class="count-reading"><legend>1. What do you double?</legend><label><input type="radio" name="reading" value="gaps"${reading === "gaps" ? " checked" : ""}> The spaces · Vitruvius</label><label><input type="radio" name="reading" value="columns"${reading === "columns" ? " checked" : ""}> The columns · a trial reading</label></fieldset>
      <p id="count-equation" class="count-equation" role="status" aria-live="polite"></p>
      <label class="count-select" for="temple">2. Choose a building record</label>
      <select id="temple">${FLANKS.map((r) => `<option value="${key(r)}"${r === selected ? " selected" : ""}>${esc(r.name)}${r.status === "uncertain" ? " (?)" : ""}</option>`).join("")}</select>
      <p id="count-result" class="count-result"></p><div id="count-source" class="count-source"></div>
      <div class="count-downloads"><button type="button" id="save-count">Save illustrated reading</button><button type="button" id="save-count-svg">Save diagram (SVG)</button></div>
      <p id="count-save-status" role="status" class="muted"></p>
    </aside>
  </section>
  <section class="count-population" id="records"><div><h2>Does the catalogue agree?</h2><p>There are ${FLANKS.length} six-column temple records here. Two restorations are uncertain. Include them to see how the denominator changes; select a building to read its evidence above.</p>
    <label><input id="include-uncertain" type="checkbox"> Include uncertain restorations</label><p id="count-tally" aria-live="polite"></p><button type="button" id="save-count-csv">Save these records (CSV)</button>
    <p class="muted">A count match is not evidence of influence. Most of these buildings are centuries older than Vitruvius. Perseus is a curated catalogue, not a census. This tally tests one prescription, not the merit of a building.</p></div>
    <div id="count-records" class="count-records" aria-label="Temple records"></div>
  </section>
  <section class="count-reading-text" id="latin"><h2>The noun matters</h2><div class="count-language"><blockquote lang="la">${esc(LATIN)}</blockquote><div><p>${esc(ENGLISH)}</p><p class="muted">Vitruvius III.4.3, Krohn (1912), p. 69. New translation. <a href="${witness}">Read the printed page ↗</a></p></div></div>
  <dl class="count-words"><div><dt lang="la">intercolumnia</dt><dd>spaces between columns; neuter plural</dd></div><div><dt lang="la">totidem bis</dt><dd>twice as many; the number of spaces</dd></div><div><dt lang="la">columnarum</dt><dd>of columns; the rival count he criticizes</dd></div></dl>
  <p>His separate description of the peripteral plan is explicit: <span lang="la">senas columnas</span>, six columns at each end, and <span lang="la">cum angularibus undenas</span>, eleven along the sides including the corners (III.2.5). <a href="./plans.html#type=peripteral">Explore the seven plan types</a>.</p>
  <p class="muted">${esc(attribution)} <a href="https://creativecommons.org/licenses/by-sa/3.0/us/">License</a>. <a href="./plans.html#evidence">Date ranges, exclusions and the full method</a>.</p></section>`;
  $("#count-zoom", root).addEventListener("click", () => {
    const button = $("#count-zoom", root);
    const enlarged = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(enlarged));
    button.textContent = enlarged ? "Fit the diagram to the page" : "Enlarge the diagram";
    $("#count-frame", root).classList.toggle("count-enlarged", enlarged);
    $("#count-pan-hint", root).hidden = !enlarged;
  });
  const include = root.querySelector<HTMLInputElement>("#include-uncertain");
  const eligible = () => FLANKS.filter((r) => include?.checked || r.status === "ok");
  function refreshRecords(): void {
    const rows = eligible();
    const target = required(reading);
    const matches = rows.filter((r) => r.flank === target);
    $("#count-tally", root).textContent =
      `${matches.length} of ${rows.length} records match ${target} flank columns. ${include?.checked ? "Includes 2 uncertain restorations." : "Excludes 2 uncertain restorations."}`;
    $("#count-records", root).innerHTML = rows
      .map(
        (r) =>
          `<button type="button" data-temple="${key(r)}" aria-pressed="${r === selected}"><span>${esc(r.name)}${r.status === "uncertain" ? " (?)" : ""}</span><span class="count-record-value">6 × ${r.flank}${r.flank === target ? " · match" : ""}</span></button>`,
      )
      .join("");
  }
  function refresh(): void {
    const target = required(reading);
    $("#count-plate", root).innerHTML = comparisonSvg(selected, reading);
    $("#count-equation", root).textContent =
      reading === "gaps"
        ? "6 columns → 5 spaces → 10 spaces → 11 columns."
        : "6 columns → 12 columns → 11 spaces. One space too many for the stated rule.";
    const difference = selected.flank - target;
    $("#count-result", root).textContent =
      difference === 0
        ? `The counts agree: ${target} columns down each side.${selected.status === "uncertain" ? " This restoration is uncertain." : ""}`
        : `${selected.flank} recorded, ${target} predicted: ${Math.abs(difference)} ${difference > 0 ? "more" : "fewer"} columns down each side.${selected.status === "uncertain" ? " This restoration is uncertain." : ""}`;
    $("#count-source", root).innerHTML = sourceCard(selected);
    $("#count-save-status", root).textContent = "";
    refreshRecords();
  }
  root.querySelector(".count-reading")?.addEventListener("change", (e) => {
    reading = (e.target as HTMLInputElement).value === "columns" ? "columns" : "gaps";
    refresh();
  });
  root.querySelector("#temple")?.addEventListener("change", (e) => {
    const next = FLANKS.find((r) => key(r) === (e.target as HTMLSelectElement).value);
    if (next) {
      selected = next;
      refresh();
    }
  });
  $("#count-records", root).addEventListener("click", (e) => {
    const id = (e.target as Element).closest<HTMLButtonElement>("[data-temple]")?.dataset.temple;
    const next = FLANKS.find((r) => key(r) === id);
    if (!next) return;
    selected = next;
    const control = root.querySelector<HTMLSelectElement>("#temple");
    if (control) {
      control.value = key(selected);
      refresh();
      control.focus();
    }
  });
  include?.addEventListener("change", refreshRecords);
  $("#save-count", root).addEventListener("click", () => {
    save(
      sheet(selected, reading),
      `embater-${key(selected)}-${reading}.html`,
      "text/html;charset=utf-8",
    );
    $("#count-save-status", root).textContent =
      "Saved the diagram, selected record, Latin, translation and source links. Open the HTML file offline or print it.";
  });
  $("#save-count-svg", root).addEventListener("click", () => {
    const svg = comparisonSvg(selected, reading).replace(
      "<title",
      `<metadata>${esc(attribution)} ${esc(selected.url)} Count diagram only, not measured. Diagram: Anthony Mercer, PolyForm Noncommercial.</metadata><title`,
    );
    save(svg, `embater-${key(selected)}-${reading}.svg`, "image/svg+xml;charset=utf-8");
    $("#count-save-status", root).textContent =
      "Diagram saved with its count-only description and source attribution.";
  });
  $("#save-count-csv", root).addEventListener("click", () => {
    const cell = (v: string | number | boolean) => `"${String(v).replaceAll('"', '""')}"`;
    const csv = [
      [
        "temple",
        "date",
        "front_columns",
        "flank_columns",
        "front_spaces",
        "flank_spaces",
        "selected_reading",
        "predicted_flank",
        "matches",
        "status",
        "source_quote",
        "source_url",
        "license",
      ],
      ...eligible().map((r) => [
        r.name,
        r.date,
        r.front,
        r.flank,
        r.front - 1,
        r.flank - 1,
        reading,
        required(reading),
        r.flank === required(reading),
        r.status,
        r.quote,
        r.url,
        "Perseus / Tufts University; CC BY-SA 3.0 US",
      ]),
    ]
      .map((r) => r.map(cell).join(","))
      .join("\r\n");
    save(`${csv}\r\n`, `embater-counts-${reading}.csv`, "text/csv;charset=utf-8");
    $("#count-tally", root).textContent += " Records saved as CSV.";
  });
  refresh();
}
