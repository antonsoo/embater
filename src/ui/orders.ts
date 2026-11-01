import { TERMS, term } from "../content/terms";
import { fmtModules, type Pediment, STEPS } from "../core/common";
import { DORIC_LEVELS, type DoricSpacing, doricElevation } from "../core/doric";
import { shaftSpan } from "../core/geometry";
import {
  type BaseKind,
  CLEAR,
  IONIC_HEIGHT,
  type IonicSpacing,
  ionicCapitalUnits,
  ionicElevation,
} from "../core/ionic";
import {
  FEET_RANGE,
  feetKey,
  type Order,
  type OrderState,
  ordersHash,
  ordersNotice,
  readOrders,
} from "../core/orders-state";
import { RULES } from "../core/rules";
import { tuscanElevation } from "../core/tuscan";
import type { Bounds, Elevation } from "../core/types";
import { renderElevation } from "../draw/render";
import { roofCsv, roofDrawing, roofSvg } from "../draw/roof";
import { roofStudy } from "../roof-study";
import { termCard } from "./card";
import { $, esc } from "./dom";
import { connectSourceCards, VocabularySource } from "./vocabulary-source";

function readHash(): OrderState {
  return readOrders(location.hash);
}
function writeHash(state: OrderState): void {
  history.replaceState(null, "", ordersHash(state));
}

interface Built {
  roof: Pediment | null;
  elevation: Elevation;
  detail: Bounds;
  baseDetail: Bounds | null;
  derivation: string;
  facts: [string, string][];
}

const ORDINAL = ["", "", "", "", "tetrastyle", "", "hexastyle", "", "octastyle"];

function readingTable(ruleId: string): string {
  const r = RULES.get(ruleId);
  if (!r?.reading) return "";
  return `<table class="readings"><caption>What the numbers say in the sources</caption>
<tr><th scope="row">Manuscripts</th><td>${esc(r.reading.manuscripts)}</td></tr>
<tr><th scope="row">Printed today</th><td>${esc(r.reading.printed)} <span class="muted">(${esc(r.reading.editor)})</span></td></tr>
</table><p class="reading-note">${esc(r.reading.note)}</p>`;
}

function build(s: OrderState): Built {
  if (s.order === "doric") {
    const e = doricElevation({
      columns: s.columns,
      spacing: s.doricSpacing,
      moduleFeet: s.feet.doric,
    });
    const physical = shaftSpan(e.pieces);
    const spans = e.layout.spans.map(fmtModules).join(" + ");
    const rule = s.doricSpacing === "diastyle" ? "doric-module" : "doric-systyle";
    const per = s.doricSpacing === "diastyle" ? "two triglyphs" : "one triglyph";
    const vitruvianTotal = s.columns !== 8;
    const derivation = `<h2>Why ${fmtModules(e.layout.width)} modules?</h2>
<p>A triglyph is one module wide and each metope a module and a half, so triglyph centres repeat every <b>2½</b> modules. Put a triglyph over every column, ${per} between columns, and one more over the wider middle span. The column centres then sit</p>
<p class="sum">${spans} = <b>${fmtModules(e.layout.width - 2)}</b></p>
<p>modules apart from end to end. For the nominal span, add half an ordinary column, one module, at each end: <b>${fmtModules(e.layout.width)}</b>.</p>
<p>The corner shafts are then made a fiftieth thicker (III.3.11), while this model keeps their axes fixed. Their visible foot span is ${fmt(physical.width)} modules. The nominal rhythm and the enlarged shaft outlines are separate measurements; the passages do not uniquely settle how the two instructions should be joined.</p>
<p><button type="button" class="read-source" data-source-rule="corner-columns">Read the corner addition on printed page 67</button></p>
${vitruvianTotal ? readingTable(rule) : `<p class="reading-note">Vitruvius gives totals only for four and six columns. Eight columns, as on the Parthenon, follow from the same rhythm.</p>`}`;
    const facts: [string, string][] = [
      [
        "Nominal front",
        `${fmtModules(e.layout.width)} modules = ${fmt(e.layout.width * s.feet.doric)} Roman feet`,
      ],
      [
        "Visible shaft span",
        `${fmt(physical.width)} modules = ${fmt(physical.width * s.feet.doric)} ft, including the corner addition`,
      ],
      ["Column", `14 modules = ${fmt(e.taper.columnFeet)} ft, 7 ordinary diameters`],
      [
        "Top of shaft",
        `${e.taper.parts[0]}/${e.taper.parts[1]} of the bottom${e.taper.columnFeet > 50 ? "; modern stepped continuation above 50 feet" : ""} (III.3.12)`,
      ],
      ["Tympanum", `${fmtModules(e.tympanum)} modules; roof pitch ${e.pitchDegrees.toFixed(1)}°`],
      ["Steps", `${STEPS}, each 9½ inches = ${fmtModules(9.5 / 12 / s.feet.doric)} module`],
    ];
    const a1 = e.axes[1] ?? 8;
    return {
      roof: e.roof,
      elevation: e,
      detail: { x0: -1.5, x1: a1 + 1.4, y0: 10.6, y1: DORIC_LEVELS.coronaTop + 2.2 },
      baseDetail: null,
      derivation,
      facts,
    };
  }
  if (s.order === "tuscan") {
    const e = tuscanElevation({ widthFeet: s.feet.tuscan });
    const derivation = `<h2>Why 21 diameters?</h2>
<p>The Tuscan temple is planned from its site, not from a module. Its width is five sixths of its length. The column is a third of the width high, and its lower diameter a seventh of that height. So the width is 3 × 7 = <b>21</b> diameters.</p>
<p>The front columns stand on the lines of the walls: the outer walls, and the walls between three cellae of 3, 4 and 3 tenths. The middle opening is 8.4 diameters wide, far too wide for a stone beam. That is why the beams are timber, and why Vitruvius worries about them rotting.</p>`;
    const facts: [string, string][] = [
      ["Width", `21 diameters = ${s.feet.tuscan} Roman feet`],
      ["Column", `7 diameters = ${fmt((7 * s.feet.tuscan) / 21)} ft`],
      ["Top of shaft", "¾ of the bottom (IV.7.3)"],
      ["Eaves", "a quarter of the column's height beyond the walls (IV.7.5)"],
    ];
    const a1 = e.axes[1] ?? 6;
    return {
      roof: null,
      elevation: e,
      detail: { x0: -2.2, x1: a1 + 1, y0: 4.6, y1: e.roofBase + 2.6 },
      baseDetail: { x0: -1.2, x1: 1.2, y0: -0.5, y1: 1.4 },
      derivation,
      facts,
    };
  }
  const e = ionicElevation({
    order: s.order,
    columns: s.columns,
    spacing: s.ionicSpacing,
    base: s.base,
    moduleFeet: s.feet.ionic,
    sculptedFrieze: s.carved,
  });
  const physical = shaftSpan(e.pieces);
  const clear = CLEAR[s.ionicSpacing];
  const middle = s.ionicSpacing === "eustyle" ? 3 : clear;
  const n = s.columns;
  const parts =
    s.ionicSpacing === "eustyle"
      ? `${n} × 1 + ${n - 2} × 2¼ + 3`
      : `${n} × 1 + ${n - 1} × ${fmtModules(clear)}`;
  const vitruvian = s.ionicSpacing === "eustyle";
  const derivation = `<h2>Why ${fmtModules(e.front.width)} modules?</h2>
<p>For the Ionic and Corinthian, Vitruvius's module is the column's lower diameter. Before the corner addition, a nominal <i>${s.ionicSpacing}</i> front gives each intercolumniation ${fmtModules(clear)} diameters wide${middle !== clear ? ", the middle one 3" : ""}. Count the columns and the spaces between them:</p>
<p class="sum">${parts} = <b>${fmtModules(e.front.width)}</b></p>
${vitruvian ? readingTable("eustyle") : ""}
<p>The ordinary column is ${fmtModules(IONIC_HEIGHT[s.ionicSpacing])} diameters tall${s.order === "corinthian" ? ", plus ⅔ for the Corinthian capital, which is a whole diameter high where the Ionic is a third" : ""}. Closer spacing means more slender columns: Vitruvius says wide gaps let the air 'eat' a column's apparent thickness, so they need stouter shafts.</p>
<p>The corner shaft’s diameter is 1.02 times the ordinary one (III.3.11). This model retains the nominal axes, so the visible shaft span is ${fmt(physical.width)} ordinary diameters. Bases and capitals use each column’s own diameter. Their tops stay level and the shaft length accommodates those larger members; that joining convention is modern.</p>
<p><button type="button" class="read-source" data-source-rule="corner-columns">Read the corner addition on printed page 67</button> <button type="button" class="read-source" data-source-rule="ionic-epistyle">Read architrave heights on printed page 72</button></p>`;
  const scrollReading =
    s.order === "ionic"
      ? `<p>The two-turn volute is a modern schematic: it continues the half-eye decrease through eight quarters about one fixed eye centre. Vitruvius does not state that total or locate a complete set of compass centres. <button type="button" class="read-source" data-source-rule="volute-figure">Read the promised figure on printed page 72</button> <a href="${esc(term("volute")?.deeper?.url ?? "https://antonsoo.github.io/gonia/volute.html")}">Compare a later twelve-arc compass construction in Gonia</a>.</p>`
      : "";
  const cap = ionicCapitalUnits(e.taper.columnFeet);
  const facts: [string, string][] = [
    [
      "Nominal front",
      `${fmtModules(e.front.width)} ordinary diameters = ${fmt(e.front.width * s.feet.ionic)} Roman feet`,
    ],
    [
      "Visible shaft span",
      `${fmt(physical.width)} ordinary diameters = ${fmt(physical.width * s.feet.ionic)} ft`,
    ],
    ["Column", `${fmtModules(e.height)} ordinary diameters = ${fmt(e.taper.columnFeet)} ft`],
    [
      "Top of shaft",
      `${e.taper.parts[0]}/${e.taper.parts[1]} of the bottom${e.taper.columnFeet > 50 ? "; modern stepped continuation above 50 feet" : ""} (III.3.12)`,
    ],
    [
      "Architrave",
      `${fmt(e.epistyle.height)} diameter: ${e.epistyle.rule}${e.epistyle.extrapolated ? ", continuing the text's pattern" : ""} (III.5.8)`,
    ],
    ...(s.order === "ionic"
      ? ([
          [
            "Abacus",
            `${cap.abacus > 1.1 ? "1 + 1/9" : "1 + 1/18"} of each column’s own lower diameter (III.5.5, III.5.7)`,
          ],
        ] as [string, string][])
      : []),
    ["Tympanum", `${fmt(e.tympanum)} diameters; roof pitch ${e.pitchDegrees.toFixed(1)}°`],
  ];
  const a0 = e.axes[0] ?? 0.5;
  return {
    roof: e.roof,
    elevation: e,
    detail: { x0: -1.3, x1: a0 + 1.5, y0: e.shaftTop - 1.1, y1: e.entablatureTop + 0.5 },
    baseDetail: { x0: a0 - 1.1, x1: a0 + 1.1, y0: -0.45, y1: 1.1 },
    derivation: derivation + scrollReading,
    facts,
  };
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, "");
}

function partsOf(e: Elevation): string[] {
  const seen = new Set<string>();
  for (const p of e.pieces) if (TERMS.has(p.part)) seen.add(p.part);
  return [...seen];
}

function segment(name: string, legend: string, options: [string, string][], value: string): string {
  const items = options
    .map(
      ([v, label]) =>
        `<label><input type="radio" name="${name}" value="${v}"${v === value ? " checked" : ""}><span>${label}</span></label>`,
    )
    .join("");
  return `<fieldset class="seg"><legend>${legend}</legend><div class="seg-row">${items}</div></fieldset>`;
}

export function mountOrders(root: HTMLElement): void {
  let s = readHash();
  let sharedSizeNotice = ordersNotice(location.hash, s);
  let roofEnlarged = false;
  root.innerHTML = `
<section class="lede">
  <h1>Build the temple from one measure</h1>
  <p>Vitruvius divides a Doric front into 42 parts and calls one part the <span lang="grc">ἐμβατήρ</span>, the module. Every column, beam and groove below is computed from it, following his own numbers. Select any part to read its Greek and Latin name.</p>
</section>
<section class="bench">
  <form class="controls" aria-label="Drawing controls"></form>
  <div class="plate-wrap">
    <figure class="plate" id="plate"></figure>
    <p id="roof-view-actions" class="roof-view-actions" hidden><button type="button" id="roof-enlarge" aria-pressed="false">Enlarge roof</button> <span>Dashed blue: your trial height. Red h: the triangular field’s height.</span></p>
    <p class="readout" id="readout" aria-hidden="true">Point at a part to see its name; select it to read about it.</p>
    <p class="legend"><span class="ink-text">Black</span>: features with cited dimensions in this drawing model. <span class="ink-chosen">Grey</span>: illustrative profiles and geometry. <span class="ink-dim">Red</span>: measurements in modules. A prescribed height does not determine every contour or width.</p>
<section class="roof-reading" id="roof-reading" hidden aria-labelledby="roof-heading">
  <div><h2 id="roof-heading">How tall is the ornament?</h2>
  <p>Vitruvius gives a precise rule: the corner ornaments equal the triangular field’s height, <i>h</i>; the middle one is 9<i>h</i>/8. Move the envelope, then match the rule.</p>
  <fieldset class="seg"><legend>Measure an ornament</legend><div class="seg-row"><label><input type="radio" name="roof-target" value="corner" checked><span>Corner</span></label><label><input type="radio" name="roof-target" value="middle"><span>Middle</span></label></div></fieldset>
  <label class="slider"><span>Blue <b id="roof-trial-target">corner</b> trial: <output id="roof-trial-out">0.5</output> × h</span><input type="range" name="roof-trial" min="0.125" max="1.5" step="0.025" value="0.5" aria-label="Blue trial height"></label>
  <button type="button" id="roof-match">Match Vitruvius’s corner height</button>
  <button type="button" id="roof-eighth">Try a middle ornament only h/8 tall</button>
  <p id="roof-result" role="status"></p>
  <p><span lang="la">tam alta, quantum</span>: “as high as”. <span lang="la">altiora octava parte quam</span>: “higher by an eighth than”. The eighth is the increase, so the middle height is h + h/8.</p>
  <p>The grey palmette outline is invented. Its total height, including its plinth, follows the rule. Grey levelling wedges, corner insets and the cornice’s normal thickness are modern drawing choices. This is a proportional reading, not a surveyed temple.</p></div>
  <div><div id="roof-measures"></div>
  <blockquote><p lang="la">acroteria angularia tam alta, quantum est tympanum medium, mediana altiora octava parte quam angularia.</p><p>“The corner ornaments as high as the middle of the tympanum; the middle ornaments an eighth higher than the corner ones.”</p><cite>Vitruvius III.5.12, Krohn 1912, p. 74. English is modern.</cite></blockquote>
  <button type="button" data-source-rule="sima-acroteria">Read complete printed page 74</button>
  <p class="roof-actions"><button type="button" id="roof-svg">Save roof SVG</button> <button type="button" id="roof-csv">Save measurements CSV</button> <button type="button" id="roof-study">Save illustrated reading</button> <button type="button" id="roof-cancel" hidden>Cancel reading</button> <button type="button" id="roof-link">Copy roof link</button></p>
  <p id="roof-file-status" role="status"></p></div>
</section>
  </div>
  <aside class="side">
    <div class="card" id="card"></div>
    <div class="key"><h2>Parts in this drawing</h2><ul id="key"></ul></div>
  </aside>
</section>
<section class="drill-source" id="drill-source" aria-labelledby="drill-source-title" hidden></section>
<section class="below">
  <div class="derivation" id="derivation"></div>
  <dl class="facts" id="facts"></dl>
</section>`;
  const form = $(".controls", root) as HTMLFormElement;
  const plate = $("#plate", root);
  const card = $("#card", root);
  const source = new VocabularySource($("#drill-source", root));
  connectSourceCards(card, source);
  const roofReading = $("#roof-reading", root);
  connectSourceCards(roofReading, source);
  connectSourceCards($("#derivation", root), source);
  const key = $("#key", root);
  const readout = $("#readout", root);
  let current: Built | null = null;
  let cardIdentity = "";
  let derivationHtml = "";
  let readingController: AbortController | undefined;

  function showName(part: string | null | undefined): void {
    const t = part ? term(part) : undefined;
    const w = t?.words[0];
    readout.innerHTML = t
      ? `<b>${esc(t.english)}</b>${w ? ` <span lang="${w.lang}">${esc(w.word)}</span>${w.romanized ? ` <i>${esc(w.romanized)}</i>` : ""}: ${esc(w.literal)}` : ""}`
      : "Point at a part to see its name; select it to read about it.";
  }

  function controls(): string {
    const order = segment(
      "order",
      "Order",
      [
        ["doric", "Doric"],
        ["ionic", "Ionic"],
        ["corinthian", "Corinthian"],
        ["tuscan", "Tuscan"],
      ],
      s.order,
    );
    const columns =
      s.order === "tuscan"
        ? ""
        : segment(
            "columns",
            "Columns",
            [
              ["4", "4"],
              ["6", "6"],
              ["8", "8"],
            ],
            String(s.columns),
          );
    const spacing =
      s.order === "doric"
        ? segment(
            "spacing",
            "Spacing",
            [
              ["diastyle", "Two triglyphs"],
              ["systyle", "One triglyph"],
            ],
            s.doricSpacing,
          )
        : s.order === "tuscan"
          ? ""
          : segment(
              "spacing",
              "Spacing",
              [
                ["pycnostyle", "Pycnostyle"],
                ["systyle", "Systyle"],
                ["eustyle", "Eustyle"],
                ["diastyle", "Diastyle"],
              ],
              s.ionicSpacing,
            );
    const base =
      s.order === "ionic" || s.order === "corinthian"
        ? segment(
            "base",
            "Base",
            [
              ["attic", "Attic"],
              ["ionic", "Ionic"],
            ],
            s.base,
          ) +
          segment(
            "frieze",
            "Frieze",
            [
              ["plain", "Plain"],
              ["carved", "Carved"],
            ],
            s.carved ? "carved" : "plain",
          )
        : "";
    const k = feetKey(s.order);
    const r = FEET_RANGE[k];
    const feet = `<label class="slider"><span>${r.label}: <output id="feet-out">${s.feet[k]}</output> Roman feet</span>
<input type="range" name="feet" min="${r.min}" max="${r.max}" step="${r.step}" value="${s.feet[k]}"></label>`;
    const view = segment(
      "view",
      "View",
      [
        ["front", "Front"],
        ["detail", "Detail"],
        ...(s.order !== "tuscan" ? ([["roof", "Roof proportions"]] as [string, string][]) : []),
      ],
      s.view,
    );
    const dims = `<label class="check"><input type="checkbox" name="dims"${s.dims ? " checked" : ""}> Measurements</label>`;
    return (
      order +
      columns +
      spacing +
      base +
      feet +
      view +
      dims +
      `<p class="order-size-note" id="order-size-note" role="status"${sharedSizeNotice ? "" : " hidden"}>${esc(sharedSizeNotice)}</p>`
    );
  }

  function select(part: string | null, closeSource = true): void {
    if (closeSource) source.close(false);
    if (s.part !== part && readingController) {
      readingController.abort();
      readingController = undefined;
      ($("#roof-study", root) as HTMLButtonElement).disabled = false;
      $("#roof-cancel", root).hidden = true;
      $("#roof-file-status", root).textContent =
        "Selected part changed. Save the reading again to keep these choices.";
    }
    s.part = part;
    for (const el of plate.querySelectorAll(".sel")) el.classList.remove("sel");
    for (const el of key.querySelectorAll("[aria-pressed]"))
      el.setAttribute("aria-pressed", "false");
    if (part) {
      for (const el of plate.querySelectorAll(`[data-part="${CSS.escape(part)}"]`))
        el.classList.add("sel");
      key.querySelector(`[data-part="${CSS.escape(part)}"]`)?.setAttribute("aria-pressed", "true");
    }
    const word = part ?? (s.view === "roof" ? "acroterion" : "embater");
    const identity = `${part ? "selected" : "intro"}:${word}`;
    if (identity !== cardIdentity) {
      const entry = term(word);
      card.innerHTML = entry
        ? `${part ? "" : '<p class="card-hint">Select a part of the drawing, or a name below.</p>'}${termCard(entry, { sourceActions: true })}`
        : "";
      cardIdentity = identity;
    }
    writeHash(s);
  }

  function draw(): void {
    const cancelled = Boolean(readingController);
    readingController?.abort();
    readingController = undefined;
    ($("#roof-study", root) as HTMLButtonElement).disabled = false;
    $("#roof-cancel", root).hidden = true;
    $("#roof-file-status", root).textContent = cancelled
      ? "Drawing changed. Save the reading again to keep these choices."
      : "";
    current = build(s);
    const e = current.elevation;
    const title = `${s.order} ${s.order === "tuscan" ? "temple" : ORDINAL[s.columns]} front`;
    const roofVisible = s.view === "roof" && current.roof !== null;
    roofReading.hidden = !roofVisible;
    $("#roof-view-actions", root).hidden = !roofVisible;
    plate.classList.toggle("roof-enlarged", roofVisible && roofEnlarged);
    plate.tabIndex = roofVisible && roofEnlarged ? 0 : -1;
    const enlargeButton = $("#roof-enlarge", root);
    enlargeButton.textContent = roofEnlarged ? "Fit roof" : "Enlarge roof";
    enlargeButton.setAttribute("aria-pressed", String(roofEnlarged));
    if (s.view === "roof" && current.roof) {
      const roof = current.roof;
      plate.innerHTML = roofDrawing(roof, s.trial, s.dims, s.trialTarget);
      plate.classList.add("is-detail");
      const trialInput = root.querySelector<HTMLInputElement>('[name="roof-trial"]');
      if (trialInput) trialInput.value = String(s.trial);
      $("#roof-trial-out", root).textContent = String(s.trial);
      $("#roof-trial-target", root).textContent = s.trialTarget;
      $("#roof-match", root).textContent = `Match Vitruvius’s ${s.trialTarget} height`;
      for (const input of root.querySelectorAll<HTMLInputElement>('[name="roof-target"]'))
        input.checked = input.value === s.trialTarget;
      const prescribedRatio = s.trialTarget === "middle" ? 9 / 8 : 1;
      const difference = (s.trial / prescribedRatio - 1) * 100;
      $("#roof-result", root).textContent =
        difference === 0
          ? `The blue envelope now matches the ${s.trialTarget} rule: ${s.trialTarget === "middle" ? "h + h/8 = 9h/8" : "h"}.`
          : `Your trial is ${fmt(Math.abs(difference))}% ${difference < 0 ? "shorter" : "taller"} than the ${s.trialTarget} rule. Change the columns or spacing to see h change with the front.`;
      const unitFeet = s.feet[feetKey(s.order)];
      $("#roof-measures", root).innerHTML =
        `<table class="readings"><caption>Current roof in Roman feet</caption><thead><tr><th scope="col">Part</th><th scope="col">Rule</th><th scope="col">Feet</th></tr></thead><tbody>${[
          ["Corona front", "9h", roof.tympanum * 9],
          ["Triangular field", "h", roof.tympanum],
          ["Corner ornament", "h", roof.tympanum],
          ["Middle ornament", "9h/8", (roof.tympanum * 9) / 8],
          [`Blue ${s.trialTarget} trial`, `${s.trial}h`, roof.tympanum * s.trial],
        ]
          .map(
            ([name, rule, value]) =>
              `<tr><th scope="row">${name}</th><td>${rule}</td><td>${fmt(Number(value) * unitFeet)}</td></tr>`,
          )
          .join("")}</tbody></table>`;
    } else if (s.view === "front") {
      plate.innerHTML = renderElevation(e, { id: "front", title, dims: s.dims });
      plate.classList.remove("is-detail");
    } else {
      const upper = renderElevation(e, {
        id: "detail",
        title: `${title}, detail of the corner bay`,
        dims: false,
        view: current.detail,
        margin: 0.15,
      });
      const base = current.baseDetail
        ? `<div class="detail-base">${renderElevation(e, { id: "detail-base", title: "base", dims: false, view: current.baseDetail, margin: 0.1 })}</div>`
        : "";
      plate.innerHTML = `<div class="detail-grid${base ? "" : " single"}"><div class="detail-upper">${upper}</div>${base}</div>`;
      plate.classList.add("is-detail");
    }
    const parts = partsOf(
      s.view === "roof" && current.roof ? { ...e, pieces: current.roof.pieces } : e,
    );
    key.innerHTML = parts
      .map((id) => {
        const t = term(id);
        if (!t) return "";
        const native = t.words[0];
        return `<li><button type="button" data-part="${id}" aria-pressed="false"><span class="key-en">${esc(t.english)}</span>${
          native ? ` <span class="key-native" lang="${native.lang}">${esc(native.word)}</span>` : ""
        }</button></li>`;
      })
      .join("");
    if (derivationHtml !== current.derivation) {
      $("#derivation", root).innerHTML = current.derivation;
      derivationHtml = current.derivation;
    }
    $("#facts", root).innerHTML = current.facts
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
      .join("");
    select(s.part && parts.includes(s.part) ? s.part : null, false);
  }

  form.innerHTML = controls();
  draw();

  form.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement;
    sharedSizeNotice = "";
    $("#order-size-note", root).hidden = true;
    const k = feetKey(s.order);
    switch (target.name) {
      case "order":
        s.order = target.value as Order;
        if (s.order === "tuscan" && s.view === "roof") s.view = "front";
        break;
      case "columns":
        s.columns = Number(target.value) as 4 | 6 | 8;
        break;
      case "spacing":
        if (s.order === "doric") s.doricSpacing = target.value as DoricSpacing;
        else s.ionicSpacing = target.value as IonicSpacing;
        break;
      case "base":
        s.base = target.value as BaseKind;
        break;
      case "frieze":
        s.carved = target.value === "carved";
        break;
      case "feet":
        s.feet[k] = Number(target.value);
        $("#feet-out", root).textContent = target.value;
        break;
      case "view":
        s.view = target.value === "roof" ? "roof" : target.value === "detail" ? "detail" : "front";
        break;
      case "dims":
        s.dims = target.checked;
        break;
    }
    if (target.name === "order") {
      const focused = document.activeElement === target;
      form.innerHTML = controls();
      if (focused)
        form
          .querySelector<HTMLInputElement>(`[name="order"][value="${s.order}"]`)
          ?.focus({ preventScroll: true });
    }
    draw();
  });

  $("#roof-enlarge", root).addEventListener("click", () => {
    roofEnlarged = !roofEnlarged;
    draw();
    if (roofEnlarged) plate.focus({ preventScroll: true });
  });
  roofReading.addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.name === "roof-trial") s.trial = Number(input.value);
    else if (input.name === "roof-target")
      s.trialTarget = input.value === "middle" ? "middle" : "corner";
    else return;
    $("#roof-file-status", root).textContent = "";
    draw();
  });
  function saveRoof(contents: string, mime: string, extension: string): void {
    const url = URL.createObjectURL(new Blob([contents], { type: mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `embater-${s.order}-roof.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    $("#roof-file-status", root).textContent =
      `Roof ${extension.toUpperCase()} prepared from the current drawing.`;
  }
  roofReading.addEventListener("click", async (event) => {
    const id = (event.target as Element).closest("button")?.id;
    const roof = current?.roof;
    if (!roof) return;
    if (id === "roof-match") {
      s.trial = s.trialTarget === "middle" ? 9 / 8 : 1;
      draw();
    } else if (id === "roof-eighth") {
      s.trialTarget = "middle";
      s.trial = 1 / 8;
      draw();
    } else if (id === "roof-cancel") {
      readingController?.abort();
      readingController = undefined;
      ($("#roof-study", root) as HTMLButtonElement).disabled = false;
      $("#roof-cancel", root).hidden = true;
      $("#roof-file-status", root).textContent = "Reading cancelled. You can save it again.";
    } else if (id === "roof-study" && current) {
      readingController?.abort();
      const controller = new AbortController();
      readingController = controller;
      ($("#roof-study", root) as HTMLButtonElement).disabled = true;
      $("#roof-cancel", root).hidden = false;
      $("#roof-file-status", root).textContent =
        "Preparing the current drawing, complete source pages, fonts and licenses…";
      const deadline = setTimeout(
        () =>
          controller.abort(new Error("The reading did not finish. Reconnect and save it again.")),
        45000,
      );
      try {
        const html = await roofStudy(
          structuredClone(s),
          current.elevation,
          roof,
          controller.signal,
        );
        if (readingController !== controller) return;
        saveRoof(html, "text/html;charset=utf-8", "html");
      } catch (error) {
        if (readingController !== controller) return;
        const reason = controller.signal.aborted ? controller.signal.reason : error;
        if (!controller.signal.aborted) controller.abort(error);
        $("#roof-file-status", root).textContent =
          reason instanceof Error
            ? reason.message
            : "The reading could not be saved. Reconnect and try again.";
      } finally {
        clearTimeout(deadline);
        if (readingController === controller) {
          readingController = undefined;
          ($("#roof-study", root) as HTMLButtonElement).disabled = false;
          $("#roof-cancel", root).hidden = true;
        }
      }
    } else if (id === "roof-svg")
      saveRoof(roofSvg(roof, s.trial, s.dims, s.trialTarget, s), "image/svg+xml", "svg");
    else if (id === "roof-csv")
      saveRoof(
        roofCsv(roof, s.feet[feetKey(s.order)], s.trial, s.trialTarget, s),
        "text/csv;charset=utf-8",
        "csv",
      );
    else if (id === "roof-link") {
      try {
        await navigator.clipboard.writeText(location.href);
        $("#roof-file-status", root).textContent =
          "Roof link copied, including the blue trial and selected part.";
      } catch {
        $("#roof-file-status", root).textContent =
          "Copy the current address from your browser to share this roof.";
      }
    }
  });

  plate.addEventListener("click", (event) => {
    const el = (event.target as Element).closest("[data-part]");
    const part = el?.getAttribute("data-part") ?? null;
    if (part && TERMS.has(part)) select(part === s.part ? null : part);
  });
  plate.addEventListener("pointerover", (event) => {
    const part = (event.target as Element).closest("[data-part]")?.getAttribute("data-part");
    for (const el of plate.querySelectorAll(".hov")) el.classList.remove("hov");
    if (part)
      for (const el of plate.querySelectorAll(`[data-part="${CSS.escape(part)}"]`))
        el.classList.add("hov");
    showName(part);
  });
  plate.addEventListener("pointerleave", () => {
    for (const el of plate.querySelectorAll(".hov")) el.classList.remove("hov");
    showName(null);
  });
  key.addEventListener("click", (event) => {
    const part = (event.target as Element).closest("button")?.dataset.part;
    if (part) select(part === s.part ? null : part);
  });
  key.addEventListener("pointerover", (event) => {
    const part = (event.target as Element).closest("button")?.dataset.part;
    for (const el of plate.querySelectorAll(".hov")) el.classList.remove("hov");
    if (part)
      for (const el of plate.querySelectorAll(`[data-part="${CSS.escape(part)}"]`))
        el.classList.add("hov");
  });
  window.addEventListener("hashchange", () => {
    s = readHash();
    sharedSizeNotice = ordersNotice(location.hash, s);
    form.innerHTML = controls();
    draw();
  });
}
