import { PLAN_PLATES } from "../content/plan-plates";
import { PLAN_CARDS, TERMS, term } from "../content/terms";
import { flankPeriods, midYear, slenderSummary, vitruvianFlank } from "../core/evidence";
import {
  CLEAR_SPACINGS,
  type ClearSpacing,
  flankChoices,
  PLAN_TYPES,
  type PlanType,
  plan,
} from "../core/plan";
import { RULES } from "../core/rules";
import { EXCLUDED, FLANKS, PERSEUS_FETCHED, SLENDER } from "../data/temples";
import { attachTooltips, type DotPoint, renderDotChart, year } from "../draw/charts";
import { renderElevation } from "../draw/render";
import { planHash, planReading, planSvg, verified } from "../plan-export";
import { termCard } from "./card";
import { $, esc } from "./dom";
import { claimsTable, planPassages } from "./plan-reading";

const LABELS: Record<PlanType, string> = {
  "in-antis": "In antis",
  prostyle: "Prostyle",
  amphiprostyle: "Amphiprostyle",
  peripteral: "Peripteral",
  pseudodipteral: "Pseudodipteral",
  dipteral: "Dipteral",
  hypaethral: "Hypaethral",
};

const short = (name: string) => name.replace(/^[^,]+, /, "").replace(/^Temple of /, "");

function typeCard(type: PlanType, columns: number, inner: number): string {
  const card = PLAN_CARDS[type];
  if (!card) return "";
  const count =
    inner > 0
      ? `${columns} columns on the outer ring, ${inner} on the inner.`
      : `${columns} columns${columns > 8 ? " on the ring" : ""}.`;
  const rules = card.rules
    .map((id) => RULES.get(id))
    .filter((r) => r !== undefined)
    .map(
      (r) =>
        `<details class="rule"><summary>Vitruvius ${esc(r.cite)}</summary><p class="rule-la" lang="la">${esc(r.latin)}</p><p class="rule-en">${esc(r.english)}</p>${
          r.reading
            ? `<p class="rule-page">Manuscripts: ${esc(r.reading.manuscripts)}. Printed: ${esc(r.reading.printed)}, ${esc(r.reading.editor)}. ${esc(r.reading.note)}</p>`
            : ""
        }<p class="rule-page">Krohn 1912, ${r.pageEnd ? `pp. ${r.page}–${r.pageEnd}` : `p. ${r.page}`}</p></details>`,
    )
    .join("");
  const w = card.word;
  return `<article class="card-body"><h2 class="card-title">${esc(card.english)}</h2>
<div class="word"><p class="word-head"><span class="word-native" lang="${w.lang}">${esc(w.word)}</span> <span class="word-rom">${esc(w.romanized ?? "")}</span></p><p class="word-literal">${esc(w.literal)}</p><p class="word-source">${esc(w.source)}</p></div>
<p class="card-note">${esc(card.note)}</p><p class="card-count">${esc(count)}</p>${rules}</article>`;
}

function flankChart(): string {
  const points: DotPoint[] = FLANKS.map((r) => ({
    id: r.name,
    x0: r.start,
    x1: r.end,
    y: r.flank,
    series: "single",
    shape: "circle",
    hollow: r.status !== "ok",
    tip: `${r.name}, ${r.date}: 6 × ${r.flank}. Perseus: “${r.quote}”${r.note ? ` ${r.note}` : ""}${r.status !== "ok" ? " (Perseus flags the restoration as uncertain.)" : ""}`,
  }));
  const label = (name: string, text: string, side: NonNullable<DotPoint["labelSide"]>) => {
    const p = points.find((q) => q.id === name);
    if (p) {
      p.label = text;
      p.labelSide = side;
    }
  };
  label("Selinus, Temple C", "Selinus C", "above");
  label("Athens, Temple of Hephaistos", "Hephaisteion", "below");
  label("Delphi, Temple of Apollo", "Delphi, on Archaic foundations", "above");
  label("Priene, Temple of Athena", "Priene", "below");
  label("Aegina, Temple of Aphaia", "Aphaia", "below");
  return renderDotChart({
    id: "flanks",
    title: "Columns on the long side of six-column Greek temples, by date",
    points,
    references: [
      { y0: 13, label: "13: twice the front, plus one", strong: false },
      { y0: 12, label: "12: 'doubled', an error", strong: false },
      { y0: vitruvianFlank(6), label: "11: Vitruvius", strong: true },
    ],
    x: [-800, -100],
    y: [10, 18],
    xTicks: [-800, -700, -600, -500, -400, -300, -200],
    yTicks: [10, 11, 12, 13, 14, 15, 16, 17, 18],
    yTitle: "Columns on each long side",
  });
}

function slenderChart(): string {
  const points: DotPoint[] = SLENDER.map((r) => ({
    id: r.name,
    x0: r.start,
    x1: Math.min(r.end, 200),
    y: r.ratio,
    series: r.order === "Doric" ? "doric" : "ionic",
    shape: r.order === "Doric" ? "circle" : "diamond",
    hollow: r.estimated,
    tip: `${r.name} (${r.order}), ${r.date}: ${r.height} m ÷ ${r.diameter} m = ${r.ratio.toFixed(2)} diameters${r.estimated ? ", from estimated measurements" : ""}. Perseus: “${r.quote}”`,
  }));
  const label = (name: string, text: string, side: NonNullable<DotPoint["labelSide"]>) => {
    const p = points.find((q) => q.id === name);
    if (p) {
      p.label = text;
      p.labelSide = side;
    }
  };
  label("Athens, Parthenon", "Parthenon", "right");
  label('Poseidonia, "Temple of Poseidon"', "Paestum, 'Poseidon'", "below");
  label("Athens, Erechtheion, north porch", "Erechtheion", "left");
  label("Didyma, Hellenistic Temple of Apollo", "Didyma", "above");
  return renderDotChart({
    id: "slender",
    title: "Column height in lower diameters, by date",
    points,
    references: [
      { y0: 8.5, y1: 10, label: "Vitruvius's Ionic: 8½–10", strong: false },
      { y0: 7, label: "Vitruvius's Doric: 7", strong: true },
      { y0: 6, label: "His 'first' Doric: 6", strong: false },
    ],
    x: [-620, 220],
    y: [3.5, 12.5],
    xTicks: [-600, -500, -400, -300, -200, -100, 0, 100, 200],
    yTicks: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    yTitle: "Height ÷ lower diameter",
  });
}

export function mountPlans(root: HTMLElement): void {
  const params = new URLSearchParams(location.hash.slice(1));
  const requested = params.get("type");
  let type: PlanType = PLAN_TYPES.includes(requested as PlanType)
    ? (requested as PlanType)
    : "peripteral";
  let clear: ClearSpacing = CLEAR_SPACINGS.includes(Number(params.get("clear")) as ClearSpacing)
    ? (Number(params.get("clear")) as ClearSpacing)
    : 2;
  let flank = flankChoices(type).includes(Number(params.get("flank")))
    ? Number(params.get("flank"))
    : undefined;
  let part: string | null = null;
  const periods = flankPeriods(FLANKS);
  const doubled = FLANKS.filter((r) => r.flank === 12 && r.status === "ok").sort(
    (a, b) => midYear(a) - midYear(b),
  );
  const doric = slenderSummary(SLENDER, "Doric");
  const ionic = slenderSummary(SLENDER, "Ionic");
  const [early, classical, late] = periods;
  const lateAtRule = late?.counts.filter((c) => c === vitruvianFlank(6)).length ?? 0;
  const doubledFrom = Math.min(...doubled.map((r) => r.start));
  const doubledTo = Math.max(...doubled.map((r) => r.end));

  root.innerHTML = `
<section class="lede">
  <h1>Seven plans, and the buildings before the rule</h1>
  <p>Vitruvius names seven kinds of temple plan and gives each a Greek name. Choose one, then change what his description leaves open. Inspect the Latin, the calculations and the drawing choices separately. Below, compare his rules with measured temples.</p>
</section>
<section class="bench">
  <form class="controls" aria-label="Plan type">
    <fieldset class="seg"><legend>Plan</legend><div class="seg-row">${PLAN_TYPES.map(
      (t) =>
        `<label><input type="radio" name="type" value="${t}"${t === type ? " checked" : ""}><span>${LABELS[t]}</span></label>`,
    ).join("")}</div></fieldset>
    <div class="plan-choices"><label for="plan-spacing">Clear space between columns<select id="plan-spacing">${CLEAR_SPACINGS.map((v) => `<option value="${v}"${v === clear ? " selected" : ""}>${v} D · ${v === 1.5 ? "pycnostyle" : v === 2 ? "systyle" : "diastyle"}</option>`).join("")}</select></label><label id="flank-choice" for="plan-flank" hidden>Columns on each long side · a drawing choice<select id="plan-flank"></select></label></div>
  </form>
  <div class="plate-wrap"><figure class="plate plan-plate" id="plan"></figure><p id="plan-measure" class="legend" aria-live="polite"></p>
  <p class="legend">Front at the bottom. <span class="ink-text">Black columns</span>: the type’s arrangement within the selected model. <span class="ink-chosen">Grey</span>: illustrative geometry. Spacing and some counts are choices; the table below gives their basis. Hatching: porches and the walk round the cella.</p></div>
  <aside class="side"><div class="card" id="plan-card"></div><div class="card part-card" id="part-card" hidden></div>
  <div class="key"><h2>Parts of the plan</h2><ul id="plan-key"></ul></div></aside>
</section>
<section class="plan-reading" id="reading">
  <h2>What do the words actually fix?</h2>
  <p>Try prostyle, then amphiprostyle: rear columns appear, but the cella keeps its length. Try dipteral with 15, then 17 columns down each side: the inner count changes from the editor’s 34 to the manuscripts’ 38. The text and the assumed geometry must be examined together.</p>
  <div id="plan-ledger" aria-live="polite"></div>
  <div class="plan-actions"><button type="button" id="save-plan">Save illustrated reading</button><button type="button" id="cancel-plan" hidden>Cancel save</button><button type="button" id="save-plan-svg">Save diagram (SVG)</button></div>
  <p id="plan-save-status" role="status">The illustrated reading includes the selected plan, Latin, English and complete cited pages. It opens offline.</p>
  <label for="plan-link">Link to these choices</label><div class="plan-share"><input id="plan-link" type="text" readonly><button type="button" id="copy-plan">Copy plan link</button></div><p id="plan-copy-status" role="status"></p>
  <details class="plan-transcription"><summary>Read the Latin and English together</summary><div id="plan-passages"></div></details>
  <div class="plan-source"><div><h3>Check the printed edition</h3><p>Krohn’s 1912 text, including the editor’s apparatus. These are complete pages, retained with the offline edition.</p><label for="plan-source-page">Printed page</label><select id="plan-source-page">${PLAN_PLATES.map((p) => `<option value="${p.page}"${p.page === 63 ? " selected" : ""}>${p.page} · ${p.page === 62 ? "in antis; prostyle begins" : p.page === 63 ? "prostyle and the other types" : p.page === 64 ? "rear access; column spacing" : p.page === 66 ? "34 or 38 inner columns" : p.page === 69 ? "double the spaces" : p.page === 85 ? "cella proportions begin" : "cella proportions continue"}</option>`).join("")}</select><button id="plan-source-zoom" type="button" aria-pressed="false">Enlarge page</button><p id="plan-source-status" role="status"></p><p><a id="plan-source-original" href="https://archive.org/details/vitruviidearchit00vitr_1">Original scan at Internet Archive</a></p></div><div id="plan-source-frame" tabindex="0" role="region" aria-label="Printed source page; scroll or use arrow keys when enlarged"><img id="plan-source-image" alt="" hidden></div></div>
</section>
<section class="evidence" id="evidence">
  <h2>Vitruvius against the buildings</h2>
  <p><a href="./compare.html">Count the columns beside the rule →</a></p>
  <p class="evidence-lede">Vitruvius wants the long side of a peripteral temple to have twice as many intercolumniations as the front: six columns across, eleven down the side. He calls temples that simply double the columns a mistake, because "the length then appears to run on by one intercolumniation more than it should" (III.4.3). The Perseus Digital Library's catalogue of Greek buildings lists ${FLANKS.length} six-column peripteral temples with their column counts.</p>
  <figure class="chart" id="chart-flanks">${flankChart()}
    <figcaption>Each dot is a temple at the middle of its Perseus date range; the bar spans the range. Hollow: Perseus calls the restoration uncertain. Dots on one row are nudged apart to stay visible. Hover or focus a dot for the catalogue's own wording.</figcaption>
  </figure>
  <div class="findings">
    <p>Before 500 BCE the median long side has <b>${early?.median}</b> columns (${early?.n} temples, ${early?.min}–${early?.max}). In the fifth century it is <b>${classical?.median}</b> (${classical?.n} temples). From 400 BCE on, ${lateAtRule} of the ${late?.n} temples have exactly <b>${vitruvianFlank(6)}</b>, Vitruvius's number; the exception, Delphi, was rebuilt on the foundations of its Archaic predecessor.</p>
    <p>The "doubled" plan he calls an error, six by twelve, appears ${doubled.length} times, all dated between ${-doubledFrom} and ${-doubledTo} BCE: ${doubled.map((r) => esc(short(r.name))).join(", ")}. The later records in this catalogue fit his rule more often. That pattern alone does not establish which buildings influenced his prescription.</p>
  </div>
  <figure class="chart" id="chart-slender">${slenderChart()}
    <figcaption><span class="swatch doric"></span> Doric, circles. <span class="swatch ionic"></span> Ionic, diamonds. Hollow: Perseus gives estimates. Height is the whole column, capital included, divided by the lower diameter.</figcaption>
  </figure>
  <div class="findings">
    <p>Vitruvius makes a Doric column 7 diameters tall and says the first Doric columns, modelled on a man's foot, were 6 (IV.1.6, IV.3.4). Every Doric temple here is stouter than both: <b>${doric.min.toFixed(1)} to ${doric.max.toFixed(1)}</b> diameters, across ${doric.n} temples from the sixth to the fourth century. His Ionic rules fare better: the measured Ionic columns run from <b>${ionic.min.toFixed(1)} to ${ionic.max.toFixed(1)}</b>, in and around his 8½–10.</p>
  </div>
  <details class="data">
    <summary>The data, the exclusions and the method</summary>
    <p>Source: Perseus Art &amp; Archaeology catalogue, building type "Temple", fetched ${esc(PERSEUS_FETCHED)} (CC BY-SA 3.0 US, Tufts University). <code>scripts/perseus_fetch.py</code> stores each entry's fields and page hash; <code>scripts/build_temples.py</code> holds the hand-read counts and refuses to run unless each quoted sentence appears verbatim in its entry. Perseus is a curated selection, not a census of Greek temples; dates are the catalogue's.</p>
    <table class="data-table"><caption>Six-column peripteral temples</caption><thead><tr><th scope="col">Temple</th><th scope="col">Date</th><th scope="col">Columns</th><th scope="col">Perseus says</th></tr></thead><tbody>
    ${[...FLANKS]
      .sort((a, b) => midYear(a) - midYear(b))
      .map(
        (r) =>
          `<tr><td><a href="${esc(r.url)}">${esc(r.name)}</a>${r.status !== "ok" ? " <em>(uncertain)</em>" : ""}</td><td>${esc(r.date)}</td><td>6 × ${r.flank}</td><td>“${esc(r.quote)}”${r.note ? ` ${esc(r.note)}` : ""}</td></tr>`,
      )
      .join("")}
    </tbody></table>
    <table class="data-table"><caption>Left out</caption><tbody>${Object.entries(EXCLUDED)
      .map(([name, why]) => `<tr><td>${esc(name)}</td><td>${esc(why)}</td></tr>`)
      .join("")}</tbody></table>
    <table class="data-table"><caption>Column proportions</caption><thead><tr><th scope="col">Temple</th><th scope="col">Date</th><th scope="col">Order</th><th scope="col">Height ÷ diameter</th><th scope="col">Perseus says</th></tr></thead><tbody>
    ${SLENDER.map((r) => `<tr><td><a href="${esc(r.url)}">${esc(r.name)}</a></td><td>${esc(r.date)}</td><td>${r.order}</td><td>${r.height} ÷ ${r.diameter} = ${r.ratio.toFixed(2)}${r.estimated ? " (estimated)" : ""}</td><td>“${esc(r.quote)}”</td></tr>`).join("")}
    </tbody></table>
    <p class="muted">Date axis: ${year(-800)} to ${year(200)}. Periods are assigned by the middle of each date range.</p>
  </details>
</section>`;

  const plate = $("#plan", root);
  const card = $("#plan-card", root);
  const partCard = $("#part-card", root);
  const key = $("#plan-key", root);

  function selectPart(id: string | null): void {
    part = id;
    for (const el of plate.querySelectorAll(".sel")) el.classList.remove("sel");
    for (const el of key.querySelectorAll("[aria-pressed]"))
      el.setAttribute("aria-pressed", "false");
    const t = id ? term(id) : undefined;
    if (id && t) {
      for (const el of plate.querySelectorAll(`[data-part="${CSS.escape(id)}"]`))
        el.classList.add("sel");
      key.querySelector(`[data-part="${CSS.escape(id)}"]`)?.setAttribute("aria-pressed", "true");
      partCard.innerHTML = termCard(t);
      partCard.hidden = false;
    } else {
      partCard.hidden = true;
    }
  }

  function draw(): void {
    const p = plan(type, { clear, flank });
    plate.innerHTML = renderElevation(p, {
      id: "plan",
      title: `${LABELS[type]} temple plan`,
      dims: false,
      margin: 0.6,
    });
    card.innerHTML = typeCard(type, p.columns, p.innerColumns);
    $("#plan-measure", root).textContent = p.body
      ? `Body ${p.body.width} × ${p.body.length} D. Cella allocation ${p.body.cella} D; clear floor ${p.body.clearWidth} × ${p.body.clearLength} D.`
      : `${p.front} × ${p.flank} outer arrangement: ${p.columns} columns${p.innerColumns ? `; ${p.innerColumns} on the inner ring` : ""}.`;
    $("#plan-ledger", root).innerHTML = claimsTable(p);
    $("#plan-passages", root).innerHTML = planPassages(p);
    const choices = flankChoices(type);
    $("#flank-choice", root).hidden = !choices.length;
    $("#plan-flank", root).innerHTML = choices
      .map((v) => `<option value="${v}"${v === p.flank ? " selected" : ""}>${v} columns</option>`)
      .join("");
    const link = new URL(location.href);
    link.hash = planHash(p);
    ($("#plan-link", root) as HTMLInputElement).value = link.href;
    $("#plan-copy-status", root).textContent = "";
    const parts = [...new Set(p.pieces.map((x) => x.part))].filter((id) => TERMS.has(id));
    key.innerHTML = parts
      .map((id) => {
        const t = term(id);
        const native = t?.words[0];
        return t
          ? `<li><button type="button" data-part="${id}" aria-pressed="false"><span class="key-en">${esc(t.english)}</span>${native ? ` <span class="key-native" lang="${native.lang}">${esc(native.word)}</span>` : ""}</button></li>`
          : "";
      })
      .join("");
    selectPart(part && parts.includes(part) ? part : null);
  }

  draw();
  window.addEventListener("hashchange", () => {
    const incoming = new URLSearchParams(location.hash.slice(1));
    if (!incoming.has("type")) return;
    const name = incoming.get("type") as PlanType;
    type = PLAN_TYPES.includes(name) ? name : "peripteral";
    const spacing = Number(incoming.get("clear")) as ClearSpacing;
    clear = CLEAR_SPACINGS.includes(spacing) ? spacing : 2;
    const count = Number(incoming.get("flank"));
    flank = flankChoices(type).includes(count) ? count : undefined;
    for (const radio of root.querySelectorAll<HTMLInputElement>('input[name="type"]'))
      radio.checked = radio.value === type;
    ($("#plan-spacing", root) as HTMLSelectElement).value = String(clear);
    draw();
  });
  root.querySelector("form")?.addEventListener("input", (e) => {
    const input = e.target as HTMLInputElement;
    if (input.name === "type" && PLAN_TYPES.includes(input.value as PlanType)) {
      type = input.value as PlanType;
      flank = undefined;
    } else if (input.id === "plan-spacing") clear = Number(input.value) as ClearSpacing;
    else if (input.id === "plan-flank") flank = Number(input.value);
    else return;
    draw();
  });
  plate.addEventListener("click", (e) => {
    const id = (e.target as Element).closest("[data-part]")?.getAttribute("data-part") ?? null;
    if (id && TERMS.has(id)) selectPart(id === part ? null : id);
  });
  key.addEventListener("click", (e) => {
    const id = (e.target as Element).closest("button")?.dataset.part;
    if (id) selectPart(id === part ? null : id);
  });
  for (const id of ["#chart-flanks", "#chart-slender"]) attachTooltips($(id, root));

  $("#copy-plan", root).addEventListener("click", async () => {
    const input = $("#plan-link", root) as HTMLInputElement;
    try {
      await navigator.clipboard.writeText(input.value);
      $("#plan-copy-status", root).textContent = "Plan link copied.";
    } catch {
      input.focus();
      input.select();
      $("#plan-copy-status", root).textContent = "Select and copy this plan link.";
    }
  });
  function save(content: string, mime: string, name: string): void {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $("#save-plan-svg", root).addEventListener("click", () => {
    save(planSvg(plan(type, { clear, flank })), "image/svg+xml", `embater-${type}.svg`);
  });
  let saveRequest = 0;
  const saveButton = $("#save-plan", root) as HTMLButtonElement;
  const cancel = $("#cancel-plan", root);
  cancel.addEventListener("click", () => {
    saveRequest++;
    saveButton.disabled = false;
    cancel.hidden = true;
    $("#plan-save-status", root).textContent = "Save cancelled. No file was downloaded.";
  });
  saveButton.addEventListener("click", async () => {
    const request = ++saveRequest;
    const snapshot = plan(type, { clear, flank });
    saveButton.disabled = true;
    cancel.hidden = false;
    $("#plan-save-status", root).textContent =
      `Preparing the ${snapshot.type} reading with ${snapshot.clear} D clear spacing…`;
    try {
      const html = await planReading(snapshot);
      if (request !== saveRequest) return;
      save(html, "text/html", `embater-${snapshot.type}-reading.html`);
      $("#plan-save-status", root).textContent =
        `Saved ${snapshot.type}: ${snapshot.clear} D clear${snapshot.flank ? `, ${snapshot.front} × ${snapshot.flank} outer columns` : ""}, with complete cited pages.`;
    } catch (error) {
      if (request === saveRequest)
        $("#plan-save-status", root).textContent =
          error instanceof Error ? error.message : "The reading could not be saved.";
    } finally {
      if (request === saveRequest) {
        saveButton.disabled = false;
        cancel.hidden = true;
      }
    }
  });
  let sourceRequest = 0;
  let sourceUrl: string | undefined;
  let enlarged = false;
  const sourceImage = $("#plan-source-image", root) as HTMLImageElement;
  const sourceFrame = $("#plan-source-frame", root);
  const zoom = $("#plan-source-zoom", root) as HTMLButtonElement;
  function sizeSource(): void {
    sourceImage.style.width = enlarged ? `${sourceImage.naturalWidth}px` : "auto";
    sourceImage.style.maxWidth = enlarged ? "none" : "100%";
    sourceImage.style.maxHeight = enlarged ? "none" : "100%";
    zoom.setAttribute("aria-pressed", String(enlarged));
    zoom.textContent = enlarged ? "Fit page" : "Enlarge page";
  }
  async function loadSource(): Promise<void> {
    const request = ++sourceRequest;
    const selected = Number(($("#plan-source-page", root) as HTMLSelectElement).value);
    const plate = PLAN_PLATES.find((p) => p.page === selected);
    if (!plate) return;
    sourceImage.hidden = true;
    zoom.disabled = true;
    $("#plan-source-status", root).textContent = `Loading printed page ${selected}…`;
    ($("#plan-source-original", root) as HTMLAnchorElement).href = plate.url;
    try {
      const bytes = await verified(`${import.meta.env.BASE_URL}${plate.path}`, plate.sha256);
      if (request !== sourceRequest) return;
      const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
      }
      if (request !== sourceRequest) {
        URL.revokeObjectURL(url);
        return;
      }
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      sourceUrl = url;
      sourceImage.src = url;
      sourceImage.alt = `Complete printed page ${selected} of Krohn’s 1912 Vitruvius`;
      await sourceImage.decode();
      if (request !== sourceRequest) return;
      sourceImage.hidden = false;
      zoom.disabled = false;
      sizeSource();
      sourceFrame.scrollTo(0, 0);
      $("#plan-source-status", root).textContent =
        `Printed page ${selected}. ${selected === 66 ? "The apparatus at line 4 gives xxxiv Phil.: xxxviii in the manuscripts." : selected === 63 ? "Amphiprostyle is section 4; the ringed types follow below." : selected === 86 ? "The cella and porch sentence continues at the top." : "Read the full page beside the transcription."}`;
    } catch (error) {
      if (request === sourceRequest)
        $("#plan-source-status", root).textContent =
          error instanceof Error ? error.message : "Could not load this source page.";
    }
  }
  $("#plan-source-page", root).addEventListener("change", () => {
    void loadSource();
  });
  zoom.addEventListener("click", () => {
    enlarged = !enlarged;
    sizeSource();
  });
  void loadSource();
}
