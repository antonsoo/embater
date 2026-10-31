import { verified } from "../assets";
import { DOOR_PLATES } from "../content/doorway-plates";
import { DOOR_TERMS, type DoorTerm } from "../content/doorway-reading";
import {
  DEFAULT_DOOR,
  type DoorState,
  doorCsv,
  doorFromHash,
  doorHash,
  doorJson,
  doorway,
  otherReading,
  parseDoorJson,
} from "../core/doorway";
import {
  DOOR_ASSUMPTIONS,
  doorPassages,
  doorTable,
  doorwayReading,
  saveDoorFile,
} from "../doorway-export";
import { doorCorner, doorNumber, doorPlate, savedDoorSvg } from "../draw/doorway";
import { $, esc } from "./dom";

export function mountDoorways(root: HTMLElement): void {
  let state: DoorState = { ...DEFAULT_DOOR };
  let notice = "";
  try {
    state = doorFromHash(location.hash);
  } catch (e) {
    notice = `${e instanceof Error ? e.message : "This drawing link is invalid."} Showing the initial drawing.`;
  }
  let selected: DoorTerm = "opening",
    version = 0,
    importVersion = 0;
  let saving: AbortController | null = null;
  root.innerHTML = `<section class="lede door-lede"><h1>A half changes the doorway</h1><p>Vitruvius divides a temple’s height into three and a half parts. How many belong to its doorway? A supplied <span lang="la">semis</span>, “half”, changes the answer. Draw both readings under one ceiling, then try the top corners yourself.</p></section>
<p id="door-notice" role="status">${esc(notice)}</p>
<section class="door-desk" id="door-desk" aria-label="Doorway drawing desk">
<div class="door-controls"><form id="door-form" aria-label="Drawing choices">
<label class="door-height" for="door-ceiling">Pavement to coffered ceiling <span><input id="door-ceiling" type="number" min="14" max="70" step="any" required> Roman feet</span></label><input id="door-ceiling-range" type="range" aria-label="Ceiling height in Roman feet" min="14" max="70" step="0.1">
<fieldset class="seg"><legend>Doorway kind</legend><div class="seg-row"><label><input type="radio" name="kind" value="doric"><span>Doric</span></label><label><input type="radio" name="kind" value="ionic"><span>Ionic</span></label></div></fieldset>
<fieldset class="seg"><legend>Opening-height reading</legend><div class="seg-row"><label><input type="radio" name="reading" value="supplied"><span>With ⟨semis⟩</span></label><label><input type="radio" name="reading" value="unsupplied"><span>Without it</span></label></div></fieldset>
<p class="door-small" id="door-height-rule"></p>
<label for="door-trial">Move each upper corner inward <output id="door-inset"></output></label><input id="door-trial" type="range" min="0" max="50" step="0.1" aria-describedby="door-trial-help"><p class="door-small" id="door-trial-help">A percentage of the lower jamb’s width, applied to each side. The blue line is your trial.</p>
<div class="door-actions"><button type="button" id="door-parallel">Try parallel sides</button><button type="button" id="door-match">Match this reading</button></div>
</form>
<div class="door-result" aria-live="polite" aria-atomic="true" id="door-result"></div>
<p id="door-jamb-basis" class="door-small"></p>
<p class="door-small">The casing follows the rule. The trial can cross into it. This is a text-based drawing experiment; it makes no claim about optical perception or a particular ancient building.</p></div>
<div class="door-drawings"><div class="door-pair"><figure id="door-chosen"></figure><figure id="door-other"></figure></div><p class="door-legend"><span class="door-blue">Solid blue: your trial.</span> <span class="door-red">Dashed red: computed opening.</span> Both doors share a scale. The ruler divides the ceiling height into seven half-parts. Select a stone or a word below.</p></div>
</section>
<section class="door-words" aria-label="Parts and language"><div><h2>What are you measuring?</h2><div id="door-words" class="door-word-list">${DOOR_TERMS.map((t) => `<button type="button" data-term="${t.id}" aria-pressed="false"><span lang="la">${esc(t.latin)}</span><small>${esc(t.title)}</small></button>`).join("")}</div></div><article class="door-word-note" id="door-word-note"></article><figure id="door-corner"></figure></section>
<section class="door-bands" id="door-bands"><h2>A taller opening narrows less</h2><p>The fraction of a jamb decreases in bands. It changes abruptly at the boundaries: the text gives no smooth interpolation. These buttons set the <em>selected opening height</em>; the ceiling adjusts to your height reading.</p><div class="door-boundaries">${[16, 25, 30].map((h) => `<div><h3>${h} Roman feet</h3>${[h - 0.01, h, h + 0.01].map((v) => `<button type="button" data-height="${v}">${v === h ? `At ${v}` : v < h ? `Just below: ${v}` : `Just above: ${v}`}</button>`).join("")}</div>`).join("")}</div><p id="door-band-result" aria-live="polite"></p><p class="door-small">The desk assigns exactly 16, 25 and 30 feet to the lower band. The Latin ranges overlap there. That assignment is a convention; compare both sides before drawing a conclusion.</p></section>
<section class="door-keep" id="door-keep"><h2>Keep this experiment</h2><div class="door-actions"><button id="door-save-json" type="button">Save editable drawing</button><label class="door-file" for="door-open">Open drawing<input type="file" id="door-open" accept=".json,application/json"></label><button type="button" id="door-save-csv">Save measurements (CSV)</button><button type="button" id="door-save-svg">Save diagram (SVG)</button><button type="button" id="door-save-reading">Save illustrated reading</button><button type="button" id="door-cancel" hidden>Cancel save</button></div><p id="door-save-status" role="status">The illustrated HTML includes both drawings, Latin, English, complete source pages and fonts. It opens offline.</p><label for="door-link">Link to these choices</label><div class="door-share"><input type="text" id="door-link" readonly><button id="door-copy" type="button">Copy drawing link</button></div><p id="door-copy-status" role="status"></p><details><summary>Measurements and their basis</summary><div id="door-measurements" class="door-table-wrap"></div></details><details><summary>Drawing choices and limits</summary><ul>${DOOR_ASSUMPTIONS.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></details></section>
<section class="door-reading" id="door-reading"><h2>Read the instructions</h2><p>F. Krohn’s Teubner edition (1912), IV.6.1–3. New English translations accompany the Latin. Angle brackets mark supplied words; the stars mark the editor’s lacuna. Capitalization and line-break hyphenation are normalized.</p><div class="door-source"><div><label for="door-source-page">Complete printed page</label><select id="door-source-page"><option value="88">88 · height, width and contractions</option><option value="89">89 · Ionic opening and casing</option></select><button id="door-source-zoom" type="button" aria-pressed="false">Enlarge page</button><button id="door-source-retry" type="button">Reload source page</button><p id="door-source-status" role="status"></p><p><a id="door-source-original" href="${DOOR_PLATES[0].url}">Original scan at Internet Archive</a></p><p><a href="./sources/doorways/manifest.json">Source identities and rendering recipe</a></p></div><div id="door-source-frame" tabindex="0" role="region" aria-label="Complete printed source page; use arrow keys to pan the enlarged page"><img id="door-source-image" alt="" hidden></div></div><div id="door-passages">${doorPassages()}</div><p class="door-small">Latin and scans are public domain. The English translations have not had independent philological review. <a href="https://github.com/antonsoo/embater">Source repository</a>.</p></section>`;

  const control = <T extends HTMLInputElement | HTMLSelectElement>(id: string) =>
    root.querySelector<T>(id) as T;
  const ceiling = control<HTMLInputElement>("#door-ceiling"),
    ceilingRange = control<HTMLInputElement>("#door-ceiling-range"),
    trial = control<HTMLInputElement>("#door-trial");
  const status = $("#door-save-status", root);
  const link = control<HTMLInputElement>("#door-link");

  function showTerm(): void {
    const term = DOOR_TERMS.find((t) => t.id === selected) ?? DOOR_TERMS[0];
    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-term]"))
      button.setAttribute("aria-pressed", String(button.dataset.term === selected));
    for (const part of root.querySelectorAll("[data-door-part]"))
      part.classList.toggle("selected", part.getAttribute("data-door-part") === selected);
    $("#door-word-note", root).innerHTML =
      `<h3>${esc(term.title)}</h3><p class="door-word-form">${esc(term.form)}</p><p>${esc(term.text)}</p><p class="door-small">${esc(term.cite)}. <a href="https://logeion.uchicago.edu/${encodeURIComponent(term.dictionary)}">Dictionary entry</a>.</p><button type="button" id="door-word-source">Read the sentence</button>`;
  }

  function render(): void {
    const m = doorway(state),
      alt = doorway(otherReading(state));
    ceiling.value = String(state.ceiling);
    ceilingRange.value = String(state.ceiling);
    for (const input of root.querySelectorAll<HTMLInputElement>('input[name="kind"]'))
      input.checked = input.value === state.kind;
    for (const input of root.querySelectorAll<HTMLInputElement>('input[name="reading"]'))
      input.checked = input.value === state.reading;
    trial.value = String((100 * m.trialInset) / m.jamb);
    $("#door-inset", root).textContent =
      `${doorNumber(m.trialInset)} ft (${doorNumber((100 * m.trialInset) / m.jamb)}% of a jamb)`;
    $("#door-height-rule", root).textContent =
      `${state.reading === "supplied" ? "2½ ÷ 3½ = 5/7" : "2 ÷ 3½ = 4/7"} of ${doorNumber(state.ceiling)} ft = ${doorNumber(m.height)} ft opening.`;
    $("#door-chosen", root).innerHTML =
      doorPlate(state, true, selected) +
      `<figcaption>Your selected reading. Opening ${doorNumber(m.height)} ft high.</figcaption>`;
    $("#door-other", root).innerHTML =
      doorPlate(otherReading(state), false) +
      `<figcaption>The other reading: ${doorNumber(alt.height)} ft high; ${esc(alt.band.toLowerCase())}.</figcaption>`;
    $("#door-corner", root).innerHTML = doorCorner(state);
    $("#door-result", root).innerHTML =
      `<p class="door-band">${esc(m.band)}</p><p>${Math.abs(m.error) < 1e-8 ? "Your upper opening matches this reading’s rule." : `Your upper opening is <b>${doorNumber(Math.abs(m.error))} ft ${m.error > 0 ? "wider" : "narrower"}</b> than the rule. Move each upper corner ${doorNumber(Math.abs(m.error) / 2)} ft ${m.error > 0 ? "inward" : "outward"} to meet it.`}</p><p class="door-small">Opening contraction: ${doorNumber(m.jamb)} ${m.divisor ? `÷ ${m.divisor}` : "× 0"} = ${doorNumber(m.contraction)} ft across both sides. Jamb’s own loss: ${doorNumber(m.jamb / 14)} ft.</p>`;
    $("#door-jamb-basis", root).textContent =
      state.kind === "doric"
        ? "Doric drawing choice: the lower jamb borrows the Ionic H/14 rule. Krohn marks a gap in the Doric instruction on p. 88."
        : "Ionic casing: H/14, the XIIII printed on p. 89. Its upper width is 13/14 of that lower width.";
    $("#door-band-result", root).textContent =
      `Selected opening ${doorNumber(m.height)} ft. ${m.divisor ? `Whole width loses 1/${m.divisor} of a jamb, or ${doorNumber((100 * m.contraction) / m.bottom)}% of its lower opening.` : "No opening contraction; the jamb itself still tapers."}`;
    $("#door-measurements", root).innerHTML = doorTable(state);
    link.value = new URL(`doorways.html${doorHash(state)}`, location.href).href;
    showTerm();
  }
  function change(next: DoorState): void {
    state = next;
    version++;
    $("#door-notice", root).textContent = "";
    render();
    $("#door-copy-status", root).textContent = "";
  }
  render();
  $("#door-form", root).addEventListener("input", (e) => {
    const input = e.target as HTMLInputElement;
    if (input === ceilingRange) change({ ...state, ceiling: Number(input.value) });
    if (input === trial) change({ ...state, trial: Number(input.value) / 100 });
    if (input.name === "kind" && (input.value === "doric" || input.value === "ionic"))
      change({ ...state, kind: input.value });
    if (input.name === "reading" && (input.value === "supplied" || input.value === "unsupplied"))
      change({ ...state, reading: input.value });
  });
  ceiling.addEventListener("change", () => {
    if (!ceiling.reportValidity()) {
      $("#door-notice", root).textContent =
        `Enter a ceiling height between 14 and 70 Roman feet. The drawing still uses ${doorNumber(state.ceiling)} ft.`;
      return;
    }
    change({ ...state, ceiling: Number(ceiling.value) });
  });
  $("#door-form", root).addEventListener("submit", (e) => e.preventDefault());
  $("#door-match", root).addEventListener("click", () => change({ ...state, trial: "rule" }));
  $("#door-parallel", root).addEventListener("click", () => change({ ...state, trial: 0 }));
  root.addEventListener("click", (e) => {
    const el = e.target as Element;
    const term = el.closest<HTMLElement>("[data-term],#door-chosen [data-door-part]");
    if (term) {
      const id = term.dataset.term ?? term.dataset.doorPart;
      if (DOOR_TERMS.some((t) => t.id === id)) {
        selected = id as DoorTerm;
        showTerm();
      }
    }
    const boundary = el.closest<HTMLElement>("[data-height]");
    if (boundary) {
      const h = Number(boundary.dataset.height);
      // The presets intentionally use more precision than the hand-entry tenth-foot grid.
      change({
        ...state,
        ceiling: (h * 7) / (state.reading === "supplied" ? 5 : 4),
        trial: "rule",
      });
      ceiling.step = "any";
    }
    if (el.closest("#door-word-source")) {
      const term = DOOR_TERMS.find((t) => t.id === selected);
      if (term) $(`#door-passage-${term.passage}`, root).scrollIntoView({ block: "start" });
    }
  });
  window.addEventListener("hashchange", () => {
    try {
      change(doorFromHash(location.hash));
      $("#door-notice", root).textContent = "Drawing opened from this link.";
    } catch (e) {
      $("#door-notice", root).textContent =
        e instanceof Error ? e.message : "This drawing link is invalid.";
    }
  });

  $("#door-copy", root).addEventListener("click", () => {
    const value = link.value;
    const copiedVersion = version;
    void navigator.clipboard
      ?.writeText(value)
      .then(() => {
        if (version === copiedVersion)
          $("#door-copy-status", root).textContent = "Drawing link copied.";
      })
      .catch(() => {
        if (version === copiedVersion) {
          link.focus();
          link.select();
          $("#door-copy-status", root).textContent = "Select and copy the drawing link above.";
        }
      });
    if (!navigator.clipboard) {
      link.focus();
      link.select();
      $("#door-copy-status", root).textContent = "Select and copy the drawing link above.";
    }
  });
  $("#door-save-json", root).addEventListener("click", () => {
    saveDoorFile(doorJson(state), "embater-doorway.json", "application/json");
    status.textContent = "Editable drawing saved. Use Open drawing to restore these choices.";
  });
  $("#door-save-csv", root).addEventListener("click", () => {
    saveDoorFile(doorCsv(state), "embater-doorway.csv", "text/csv;charset=utf-8");
    status.textContent = "Measurements saved in Roman feet, with each value’s basis.";
  });
  $("#door-save-svg", root).addEventListener("click", () => {
    saveDoorFile(savedDoorSvg(state), "embater-doorway.svg", "image/svg+xml");
    status.textContent = "Selected diagram saved, including the trial and model assumptions.";
  });
  control<HTMLInputElement>("#door-open").addEventListener("change", (e) => {
    const input = e.target as HTMLInputElement,
      file = input.files?.[0];
    const request = ++importVersion,
      before = version;
    input.value = "";
    if (!file) return;
    if (file.size > 16384) {
      status.textContent = "Choose an Embater doorway JSON under 16 KB.";
      return;
    }
    void file
      .text()
      .then((text) => {
        if (request !== importVersion) return;
        if (before !== version) {
          status.textContent =
            "The drawing changed while the file opened. Choose the file again to replace it.";
          return;
        }
        change(parseDoorJson(text));
        ceiling.step = "any";
        status.textContent = "Drawing opened. Measurements were recalculated from its choices.";
      })
      .catch((e) => {
        if (request === importVersion)
          status.textContent = e instanceof Error ? e.message : "This drawing could not be opened.";
      });
  });
  $("#door-save-reading", root).addEventListener("click", () => {
    if (saving) return;
    const abort = new AbortController(),
      snapshot = { ...state },
      before = version;
    saving = abort;
    const timer = setTimeout(
      () =>
        abort.abort(
          new DOMException("Saving took too long. Reconnect and try again.", "TimeoutError"),
        ),
      25000,
    );
    $("#door-save-reading", root).setAttribute("disabled", "");
    $("#door-cancel", root).hidden = false;
    status.textContent = "Preparing the reading and checking its source pages, fonts and licenses…";
    void doorwayReading(snapshot, location.href, abort.signal)
      .then((html) => {
        abort.signal.throwIfAborted();
        saveDoorFile(html, "embater-doorway-reading.html", "text/html;charset=utf-8");
        status.textContent =
          before === version
            ? "Illustrated reading saved. It opens offline without scripts."
            : "Illustrated reading saved with the choices from when you pressed Save. Save again to keep your newer drawing.";
      })
      .catch((e) => {
        status.textContent = abort.signal.aborted
          ? abort.signal.reason?.name === "TimeoutError"
            ? "Saving took too long. Reconnect and try again."
            : "Save cancelled. Your drawing is still here."
          : e instanceof Error
            ? e.message
            : "The reading could not be saved. Reconnect and try again.";
      })
      .finally(() => {
        clearTimeout(timer);
        saving = null;
        $("#door-save-reading", root).removeAttribute("disabled");
        $("#door-cancel", root).hidden = true;
      });
  });
  $("#door-cancel", root).addEventListener("click", () => saving?.abort());

  const pageSelect = control<HTMLSelectElement>("#door-source-page");
  const image = root.querySelector<HTMLImageElement>("#door-source-image") as HTMLImageElement;
  let pageRequest = 0,
    sourceAbort: AbortController | null = null,
    currentUrl: string | null = null,
    enlarged = false;
  async function source(refresh = false): Promise<void> {
    const plate = DOOR_PLATES.find((p) => p.page === Number(pageSelect.value));
    if (!plate) return;
    sourceAbort?.abort();
    const abort = new AbortController();
    sourceAbort = abort;
    const request = ++pageRequest,
      timer = setTimeout(() => abort.abort(), 12000);
    image.hidden = true;
    image.removeAttribute("src");
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }
    const sourceStatus = $("#door-source-status", root);
    sourceStatus.textContent = `Loading complete printed page ${plate.page}…`;
    $("#door-source-original", root).setAttribute("href", plate.url);
    let url: string | null = null;
    try {
      const bytes = await verified(
        `${import.meta.env.BASE_URL}${plate.path}`,
        plate.sha256,
        abort.signal,
        refresh,
      );
      url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
      const candidate = new Image();
      candidate.src = url;
      await candidate.decode();
      abort.signal.throwIfAborted();
      if (request !== pageRequest) return;
      image.src = url;
      image.alt = `Complete printed page ${plate.page} of Krohn’s 1912 Vitruvius, including the critical apparatus`;
      image.hidden = false;
      currentUrl = url;
      url = null;
      sourceStatus.textContent = `Complete printed page ${plate.page}. Source image checked against the retained edition.`;
    } catch (e) {
      if (request === pageRequest)
        sourceStatus.textContent = abort.signal.aborted
          ? "Source loading did not finish. Reconnect and reload the source page."
          : e instanceof Error
            ? e.message
            : "This source page could not be opened. Reload it to try again.";
    } finally {
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    }
  }
  pageSelect.addEventListener("change", () => void source());
  $("#door-source-retry", root).addEventListener("click", () => void source(true));
  $("#door-source-zoom", root).addEventListener("click", () => {
    enlarged = !enlarged;
    $("#door-source-frame", root).classList.toggle("enlarged", enlarged);
    $("#door-source-zoom", root).setAttribute("aria-pressed", String(enlarged));
    $("#door-source-zoom", root).textContent = enlarged ? "Fit whole page" : "Enlarge page";
    $("#door-source-frame", root).focus({ preventScroll: true });
  });
  void source();
}
