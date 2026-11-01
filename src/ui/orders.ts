import { TERMS, term } from "../content/terms";
import { fmtModules, STEPS } from "../core/common";
import { DORIC_LEVELS, type DoricSpacing, doricElevation } from "../core/doric";
import {
  type BaseKind,
  CLEAR,
  IONIC_HEIGHT,
  type IonicSpacing,
  ionicCapitalUnits,
  ionicElevation,
} from "../core/ionic";
import { RULES } from "../core/rules";
import { tuscanElevation } from "../core/tuscan";
import type { Bounds, Elevation } from "../core/types";
import { renderElevation } from "../draw/render";
import { termCard } from "./card";
import { $, esc } from "./dom";
import { connectSourceCards, VocabularySource } from "./vocabulary-source";

type Order = "doric" | "ionic" | "corinthian" | "tuscan";

interface State {
  order: Order;
  columns: 4 | 6 | 8;
  doricSpacing: DoricSpacing;
  ionicSpacing: IonicSpacing;
  base: BaseKind;
  carved: boolean;
  /** Doric module, Ionic/Corinthian lower diameter, or Tuscan temple width, in Roman feet. */
  feet: Record<"doric" | "ionic" | "tuscan", number>;
  view: "front" | "detail";
  dims: boolean;
  part: string | null;
}

const DEFAULTS: State = {
  order: "doric",
  columns: 6,
  doricSpacing: "diastyle",
  ionicSpacing: "eustyle",
  base: "attic",
  carved: false,
  feet: { doric: 1.5, ionic: 2.5, tuscan: 60 },
  view: "front",
  dims: true,
  part: null,
};

const FEET_RANGE = {
  doric: { min: 0.5, max: 4, step: 0.25, label: "One module" },
  ionic: { min: 1, max: 6, step: 0.25, label: "Lower diameter" },
  tuscan: { min: 20, max: 100, step: 5, label: "Temple width" },
} as const;

function feetKey(order: Order): "doric" | "ionic" | "tuscan" {
  return order === "corinthian" ? "ionic" : order;
}

function readHash(): State {
  const s: State = structuredClone(DEFAULTS);
  const params = new URLSearchParams(location.hash.slice(1));
  const order = params.get("order");
  if (order === "doric" || order === "ionic" || order === "corinthian" || order === "tuscan")
    s.order = order;
  const cols = Number(params.get("columns"));
  if (cols === 4 || cols === 6 || cols === 8) s.columns = cols;
  const spacing = params.get("spacing");
  if (spacing === "diastyle" || spacing === "systyle") s.doricSpacing = spacing;
  if (spacing && spacing in CLEAR) s.ionicSpacing = spacing as IonicSpacing;
  const base = params.get("base");
  if (base === "attic" || base === "ionic") s.base = base;
  s.carved = params.get("frieze") === "carved";
  const feet = Number(params.get("feet"));
  const key = feetKey(s.order);
  const range = FEET_RANGE[key];
  if (feet >= range.min && feet <= range.max) s.feet[key] = feet;
  s.view = params.get("view") === "detail" ? "detail" : "front";
  s.dims = params.get("dims") !== "off";
  const part = params.get("part");
  s.part = part && TERMS.has(part) ? part : null;
  return s;
}

function writeHash(s: State): void {
  const p = new URLSearchParams();
  p.set("order", s.order);
  if (s.order !== "tuscan") p.set("columns", String(s.columns));
  if (s.order === "doric") p.set("spacing", s.doricSpacing);
  if (s.order === "ionic" || s.order === "corinthian") {
    p.set("spacing", s.ionicSpacing);
    p.set("base", s.base);
    if (s.carved) p.set("frieze", "carved");
  }
  p.set("feet", String(s.feet[feetKey(s.order)]));
  if (s.view === "detail") p.set("view", "detail");
  if (!s.dims) p.set("dims", "off");
  if (s.part) p.set("part", s.part);
  history.replaceState(null, "", `#${p.toString()}`);
}

interface Built {
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

function build(s: State): Built {
  if (s.order === "doric") {
    const e = doricElevation({
      columns: s.columns,
      spacing: s.doricSpacing,
      moduleFeet: s.feet.doric,
    });
    const spans = e.layout.spans.map(fmtModules).join(" + ");
    const rule = s.doricSpacing === "diastyle" ? "doric-module" : "doric-systyle";
    const per = s.doricSpacing === "diastyle" ? "two triglyphs" : "one triglyph";
    const vitruvianTotal = s.columns !== 8;
    const derivation = `<h2>Why ${fmtModules(e.layout.width)} modules?</h2>
<p>A triglyph is one module wide and each metope a module and a half, so triglyph centres repeat every <b>2½</b> modules. Put a triglyph over every column, ${per} between columns, and one more over the wider middle span. The column centres then sit</p>
<p class="sum">${spans} = <b>${fmtModules(e.layout.width - 2)}</b></p>
<p>modules apart from end to end. The front is measured at the column feet, so add half a column, one module, at each end: <b>${fmtModules(e.layout.width)}</b>.</p>
${vitruvianTotal ? readingTable(rule) : `<p class="reading-note">Vitruvius gives totals only for four and six columns. Eight columns, as on the Parthenon, follow from the same rhythm.</p>`}`;
    const facts: [string, string][] = [
      [
        "Front",
        `${fmtModules(e.layout.width)} modules = ${fmt(e.layout.width * s.feet.doric)} Roman feet`,
      ],
      ["Column", `14 modules = ${fmt(e.taper.columnFeet)} ft, 7 diameters`],
      ["Top of shaft", `${e.taper.parts[0]}/${e.taper.parts[1]} of the bottom (III.3.12)`],
      ["Tympanum", `${fmtModules(e.tympanum)} modules; roof pitch ${e.pitchDegrees.toFixed(1)}°`],
      ["Steps", `${STEPS}, each 9½ inches = ${fmtModules(9.5 / 12 / s.feet.doric)} module`],
    ];
    const a1 = e.axes[1] ?? 8;
    return {
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
  const clear = CLEAR[s.ionicSpacing];
  const middle = s.ionicSpacing === "eustyle" ? 3 : clear;
  const n = s.columns;
  const parts =
    s.ionicSpacing === "eustyle"
      ? `${n} × 1 + ${n - 2} × 2¼ + 3`
      : `${n} × 1 + ${n - 1} × ${fmtModules(clear)}`;
  const vitruvian = s.ionicSpacing === "eustyle";
  const derivation = `<h2>Why ${fmtModules(e.front.width)} modules?</h2>
<p>For the Ionic and Corinthian, Vitruvius's module is the column's lower diameter. In a <i>${s.ionicSpacing}</i> front each intercolumniation is ${fmtModules(clear)} diameters wide${middle !== clear ? ", the middle one 3" : ""}. Count the columns and the spaces between them:</p>
<p class="sum">${parts} = <b>${fmtModules(e.front.width)}</b></p>
${vitruvian ? readingTable("eustyle") : ""}
<p>The column is ${fmtModules(IONIC_HEIGHT[s.ionicSpacing])} diameters tall${s.order === "corinthian" ? ", plus ⅔ for the Corinthian capital, which is a whole diameter high where the Ionic is a third" : ""}. Closer spacing means more slender columns: Vitruvius says wide gaps let the air 'eat' a column's apparent thickness, so they need stouter shafts.</p>`;
  const cap = ionicCapitalUnits(e.taper.columnFeet);
  const facts: [string, string][] = [
    [
      "Front",
      `${fmtModules(e.front.width)} diameters = ${fmt(e.front.width * s.feet.ionic)} Roman feet`,
    ],
    ["Column", `${fmtModules(e.height)} diameters = ${fmt(e.taper.columnFeet)} ft`],
    ["Top of shaft", `${e.taper.parts[0]}/${e.taper.parts[1]} of the bottom (III.3.12)`],
    [
      "Architrave",
      `${fmt(e.epistyle.height)} diameter: ${e.epistyle.rule}${e.epistyle.extrapolated ? ", continuing the text's pattern" : ""} (III.5.8)`,
    ],
    ...(s.order === "ionic"
      ? ([
          ["Abacus", `${cap.abacus > 1.1 ? "1 + 1/9" : "1 + 1/18"} diameters (III.5.5, III.5.7)`],
        ] as [string, string][])
      : []),
    ["Tympanum", `${fmt(e.tympanum)} diameters; roof pitch ${e.pitchDegrees.toFixed(1)}°`],
  ];
  const a0 = e.axes[0] ?? 0.5;
  return {
    elevation: e,
    detail: { x0: -1.3, x1: a0 + 1.5, y0: e.shaftTop - 1.1, y1: e.entablatureTop + 0.5 },
    baseDetail: { x0: a0 - 1.1, x1: a0 + 1.1, y0: -0.45, y1: 1.1 },
    derivation,
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
  root.innerHTML = `
<section class="lede">
  <h1>Build the temple from one measure</h1>
  <p>Vitruvius divides a Doric front into 42 parts and calls one part the <span lang="grc">ἐμβατήρ</span>, the module. Every column, beam and groove below is computed from it, following his own numbers. Select any part to read its Greek and Latin name.</p>
</section>
<section class="bench">
  <form class="controls" aria-label="Drawing controls"></form>
  <div class="plate-wrap">
    <figure class="plate" id="plate"></figure>
    <p class="readout" id="readout" aria-hidden="true">Point at a part to see its name; select it to read about it.</p>
    <p class="legend"><span class="ink-text">Black</span>: features with cited dimensions in this drawing model. <span class="ink-chosen">Grey</span>: illustrative profiles and geometry. <span class="ink-dim">Red</span>: measurements in modules. A prescribed height does not determine every contour or width.</p>
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
  const key = $("#key", root);
  const readout = $("#readout", root);
  let current: Built | null = null;

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
      ],
      s.view,
    );
    const dims = `<label class="check"><input type="checkbox" name="dims"${s.dims ? " checked" : ""}> Measurements</label>`;
    return order + columns + spacing + base + feet + view + dims;
  }

  function select(part: string | null): void {
    source.close(false);
    s.part = part;
    for (const el of plate.querySelectorAll(".sel")) el.classList.remove("sel");
    for (const el of key.querySelectorAll("[aria-pressed]"))
      el.setAttribute("aria-pressed", "false");
    if (part) {
      for (const el of plate.querySelectorAll(`[data-part="${CSS.escape(part)}"]`))
        el.classList.add("sel");
      key.querySelector(`[data-part="${CSS.escape(part)}"]`)?.setAttribute("aria-pressed", "true");
      const t = term(part);
      card.innerHTML = t ? termCard(t, { sourceActions: true }) : "";
    } else {
      const intro = term("embater");
      card.innerHTML = intro
        ? `<p class="card-hint">Select a part of the drawing, or a name below.</p>${termCard(intro, { sourceActions: true })}`
        : "";
    }
    writeHash(s);
  }

  function draw(): void {
    current = build(s);
    const e = current.elevation;
    const title = `${s.order} ${s.order === "tuscan" ? "temple" : ORDINAL[s.columns]} front`;
    if (s.view === "front") {
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
    const parts = partsOf(e);
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
    $("#derivation", root).innerHTML = current.derivation;
    $("#facts", root).innerHTML = current.facts
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
      .join("");
    select(s.part && parts.includes(s.part) ? s.part : null);
  }

  form.innerHTML = controls();
  draw();

  form.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement;
    const k = feetKey(s.order);
    switch (target.name) {
      case "order":
        s.order = target.value as Order;
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
        s.view = target.value === "detail" ? "detail" : "front";
        break;
      case "dims":
        s.dims = target.checked;
        break;
    }
    if (target.name === "order") form.innerHTML = controls();
    draw();
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
    form.innerHTML = controls();
    draw();
  });
}
