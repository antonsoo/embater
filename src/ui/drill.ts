import { TERMS, type Term } from "../content/terms";
import { PLATES } from "../content/world";
import { DORIC_LEVELS, doricElevation } from "../core/doric";
import { partsInView } from "../core/geometry";
import { ionicElevation } from "../core/ionic";
import { BOXES, type Boxes, distractors, grade, pickNext, tally } from "../core/leitner";
import { plan } from "../core/plan";
import type { Bounds, Elevation } from "../core/types";
import { renderElevation } from "../draw/render";
import { WORLD_DRAWINGS } from "../draw/world";
import { termCard } from "./card";
import { $, esc } from "./dom";

interface Deck {
  id: string;
  label: string;
  elevation: Elevation;
  view: Bounds;
  terms: Term[];
}

function orderView(
  e: Elevation & { shaftTop?: number; entablatureTop?: number },
  top: number,
): Bounds {
  const a0 = e.axes[0] ?? 0.5;
  return { x0: a0 - 1.8, x1: a0 + 1.9, y0: -0.4, y1: top };
}

function buildDecks(): Deck[] {
  const decks: Deck[] = [];
  const d = doricElevation({ columns: 6, spacing: "diastyle", moduleFeet: 1.5 });
  const dv = {
    x0: -1.6,
    x1: (d.axes[1] ?? 8) + 1.4,
    y0: d.bounds.y0,
    y1: DORIC_LEVELS.coronaTop + 2,
  };
  decks.push(withTerms("doric", "Doric", d, dv));
  const io = ionicElevation({
    order: "ionic",
    columns: 6,
    spacing: "eustyle",
    base: "attic",
    moduleFeet: 2.5,
    sculptedFrieze: false,
  });
  decks.push(withTerms("ionic", "Ionic", io, orderView(io, io.entablatureTop + 0.6)));
  const co = ionicElevation({
    order: "corinthian",
    columns: 6,
    spacing: "eustyle",
    base: "attic",
    moduleFeet: 2.5,
    sculptedFrieze: false,
  });
  decks.push(withTerms("corinthian", "Corinthian", co, orderView(co, co.entablatureTop + 0.6)));
  const p = plan("peripteral");
  decks.push(withTerms("plan", "Temple plan", p, p.bounds));
  for (const plate of PLATES) {
    const make = WORLD_DRAWINGS[plate.id];
    if (!make) continue;
    const e = make();
    const drawn = new Set(e.pieces.map((x) => x.part));
    decks.push({
      id: plate.id,
      label: plate.place.split(",")[0] ?? plate.id,
      elevation: e,
      view: e.bounds,
      terms: plate.terms.filter((t) => drawn.has(t.id) && t.words.length > 0),
    });
  }
  return decks;
}

function withTerms(id: string, label: string, e: Elevation, view: Bounds): Deck {
  const visible = partsInView(e.pieces, view);
  const terms = visible.map((p) => TERMS.get(p)).filter((t): t is Term => t !== undefined);
  return { id, label, elevation: e, view, terms };
}

const KEY = "embater-drill-v1";

function load(): Boxes {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Boxes) : {};
  } catch {
    return {};
  }
}

function save(boxes: Boxes): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(boxes));
  } catch {
    // Progress then lasts for this visit only.
  }
}

function nativeLabel(t: Term): string {
  const w = t.words[0];
  if (!w) return esc(t.english);
  return `<span lang="${w.lang}" class="opt-native">${esc(w.word)}</span>${w.romanized && w.romanized !== w.word ? ` <span class="opt-rom">${esc(w.romanized)}</span>` : ""}`;
}

export function mountDrill(root: HTMLElement): void {
  const decks = buildDecks();
  const fromHash = new URLSearchParams(location.hash.slice(1)).get("deck");
  let deck = decks.find((d) => d.id === fromHash) ?? decks[0];
  let mode: "name" | "find" = "name";
  let boxes = load();
  let target: string | null = null;
  let last: string | null = null;
  let answered = false;
  let right = 0;
  let asked = 0;

  root.innerHTML = `
<section class="lede">
  <h1>Learn the names</h1>
  <p>A part lights up in blue: choose its name in Greek, Latin or the builders' own language. Or take a word and find the part. Words you miss come back sooner.</p>
</section>
<section class="drill">
  <form class="controls" aria-label="Drill settings">
    <fieldset class="seg"><legend>Deck</legend><div class="seg-row">${decks
      .map(
        (d) =>
          `<label><input type="radio" name="deck" value="${d.id}"${d === deck ? " checked" : ""}><span>${esc(d.label)}</span></label>`,
      )
      .join("")}</div></fieldset>
    <fieldset class="seg"><legend>Question</legend><div class="seg-row"><label><input type="radio" name="mode" value="name" checked><span>Name it</span></label><label><input type="radio" name="mode" value="find"><span>Find it</span></label></div></fieldset>
  </form>
  <div class="drill-grid">
    <figure class="plate drill-plate" id="drill-plate"></figure>
    <div class="drill-side">
      <div class="drill-q" id="drill-q" aria-live="polite"></div>
      <div class="drill-feedback" id="drill-feedback"></div>
      <div class="drill-boxes" id="drill-boxes"></div>
    </div>
  </div>
</section>`;
  const plateEl = $("#drill-plate", root);
  const q = $("#drill-q", root);
  const fb = $("#drill-feedback", root);
  const boxesEl = $("#drill-boxes", root);

  const key = (id: string) => `${deck?.id}/${id}`;

  function renderBoxes(): void {
    if (!deck) return;
    const local: Boxes = {};
    for (const t of deck.terms) local[t.id] = boxes[key(t.id)] ?? 1;
    const counts = tally(
      deck.terms.map((t) => t.id),
      local,
    );
    const max = Math.max(1, ...counts);
    boxesEl.innerHTML = `<h2>Your boxes for this deck</h2><div class="box-row">${counts
      .map(
        (c, i) =>
          `<div class="box"><div class="box-bar" style="height:${Math.round((c / max) * 56)}px"></div><span class="box-n">${c}</span><span class="box-label">${i === 0 ? "new or missed" : i === BOXES - 1 ? "known" : `box ${i + 1}`}</span></div>`,
      )
      .join(
        "",
      )}</div><p class="muted">${asked ? `${right} of ${asked} right this session.` : "Progress is kept in this browser only."}</p>`;
  }

  function draw(): void {
    if (!deck) return;
    plateEl.innerHTML = renderElevation(deck.elevation, {
      id: `drill-${deck.id}`,
      title: `${deck.label} drawing`,
      dims: false,
      view: deck.view,
      margin: 0.4,
    });
  }

  function ask(): void {
    if (!deck || deck.terms.length < 2) return;
    answered = false;
    fb.innerHTML = "";
    for (const el of plateEl.querySelectorAll(".sel, .miss")) el.classList.remove("sel", "miss");
    const local: Boxes = {};
    for (const t of deck.terms) local[t.id] = boxes[key(t.id)] ?? 1;
    target = pickNext(
      deck.terms.map((t) => t.id),
      local,
      last,
      Math.random,
    );
    last = target;
    const t = TERMS.get(target) ?? deck.terms.find((x) => x.id === target);
    if (!t) return;
    if (mode === "name") {
      for (const el of plateEl.querySelectorAll(`[data-part="${CSS.escape(target)}"]`))
        el.classList.add("sel");
      const options = [
        target,
        ...distractors(
          deck.terms.map((x) => x.id),
          target,
          3,
          Math.random,
        ),
      ].sort(() => Math.random() - 0.5);
      q.innerHTML = `<h2>What is the part in blue called?</h2><div class="options">${options
        .map((id) => {
          const term = deck?.terms.find((x) => x.id === id);
          return term
            ? `<button type="button" class="opt" data-id="${id}">${nativeLabel(term)}</button>`
            : "";
        })
        .join("")}</div>`;
    } else {
      q.innerHTML = `<h2>Find this part in the drawing</h2><p class="find-word">${nativeLabel(t)}</p><p class="muted">${esc(t.words[0]?.literal ?? "")}</p>`;
    }
    renderBoxes();
  }

  function answer(id: string): void {
    if (!deck || !target || answered) return;
    answered = true;
    const ok = id === target;
    asked += 1;
    if (ok) right += 1;
    boxes = grade(boxes, key(target), ok);
    save(boxes);
    for (const el of plateEl.querySelectorAll(`[data-part="${CSS.escape(target)}"]`))
      el.classList.add("sel");
    if (!ok)
      for (const el of plateEl.querySelectorAll(`[data-part="${CSS.escape(id)}"]`))
        el.classList.add("miss");
    for (const b of q.querySelectorAll<HTMLButtonElement>(".opt")) {
      b.disabled = true;
      if (b.dataset.id === target) b.classList.add("is-right");
      else if (b.dataset.id === id) b.classList.add("is-wrong");
    }
    const t = deck.terms.find((x) => x.id === target);
    fb.innerHTML = `<p class="verdict ${ok ? "ok" : "no"}">${ok ? "Right." : "Not quite."}</p>${t ? termCard(t, { rules: false }) : ""}<button type="button" class="next">Next word</button>`;
    renderBoxes();
    fb.querySelector<HTMLButtonElement>(".next")?.focus({ preventScroll: true });
  }

  draw();
  ask();

  root.querySelector("form")?.addEventListener("input", (e) => {
    const input = e.target as HTMLInputElement;
    if (input.name === "deck") {
      deck = decks.find((d) => d.id === input.value) ?? deck;
      last = null;
      history.replaceState(null, "", `#deck=${deck?.id}`);
      draw();
    } else {
      mode = input.value === "find" ? "find" : "name";
    }
    ask();
  });
  q.addEventListener("click", (e) => {
    const id = (e.target as Element).closest<HTMLButtonElement>(".opt")?.dataset.id;
    if (id) answer(id);
  });
  plateEl.addEventListener("click", (e) => {
    if (mode !== "find" || answered) return;
    const id = (e.target as Element).closest("[data-part]")?.getAttribute("data-part");
    if (id) answer(id);
  });
  fb.addEventListener("click", (e) => {
    if ((e.target as Element).closest(".next")) ask();
  });
}
