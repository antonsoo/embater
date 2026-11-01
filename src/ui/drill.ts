import type { Term, Word } from "../content/terms";
import {
  accepts,
  groupsFor,
  languages,
  parseProgress,
  progressJSON,
  progressKey,
  progressKeys,
  readSettings,
  settingsHash,
  type WordGroup,
} from "../core/drill";
import { buildDecks } from "../core/drill-decks";
import { type DetailPose, detailAnchor, detailWindow } from "../core/drill-detail";
import { BOXES, type Boxes, distractors, grade, pickNext, tally } from "../core/leitner";
import { renderElevation } from "../draw/render";
import { type VocabularyStudy, vocabularyStudy } from "../vocabulary-study";
import { LANG_NAMES, termCard } from "./card";
import { $, esc } from "./dom";
import { visiblePartPoint } from "./visible-part";
import { connectSourceCards, VocabularySource } from "./vocabulary-source";

const KEY = "embater-drill-v2";

export function mountDrill(root: HTMLElement): void {
  const decks = buildDecks();
  const known = progressKeys(decks);
  let settings = readSettings(decks, location.hash);
  let boxes: Boxes = {};
  let protectUnreadRecord = false;
  let protectChangedRecord = false;
  let lastSaved: string | null = null;
  let saveGeneration = 0;
  let saveRequest = 0;
  let pendingReplacement: number | undefined;
  let persistenceIssue = false;
  let storageMessage = "Progress stays in this browser. Save a backup to keep it elsewhere.";
  try {
    const saved = localStorage.getItem(KEY);
    lastSaved = saved;
    if (saved) boxes = parseProgress(saved, known);
    else if (localStorage.getItem("embater-drill-v1"))
      storageMessage =
        "Earlier mixed-language progress is preserved separately. These boxes track each language and direction from now on.";
  } catch {
    protectUnreadRecord = true;
    persistenceIssue = true;
    storageMessage =
      "Browser progress could not be read. Its saved record is untouched. New answers last for this visit until you restore a valid progress file.";
  }
  let group: WordGroup | undefined;
  let target: Term | undefined;
  let last: string | null = null;
  let answered = false;
  let studyId: string | null = null;
  let score = { right: 0, asked: 0 };
  let importGeneration = 0;
  let detail = false;
  let detailPart: string | null = null;
  let detailPose: DetailPose = { zoom: 1, x: 0, y: 0 };
  let selectedParts: string[] = [];
  let missedParts: string[] = [];
  let inspectedPart: string | null = null;
  let readingRequest = 0;
  let readingController: AbortController | undefined;

  root.innerHTML = `
<section class="lede">
  <h1>Learn the names</h1>
  <p>Read a building through its parts. Study the names, identify a blue detail, or find the part named in a source language.</p>
</section>
<section class="drill">
  <form class="controls" aria-label="Drill settings">
    <fieldset class="seg"><legend>Deck</legend><div class="seg-row">${decks.map((deck) => `<label><input type="radio" name="deck" value="${deck.id}"><span>${esc(deck.label)}</span></label>`).join("")}</div></fieldset>
    <label class="drill-language">Language <select id="drill-language" name="language"></select></label>
    <fieldset class="seg"><legend>Exercise</legend><div class="seg-row">
      <label><input type="radio" name="mode" value="study"><span>Study plate</span></label>
      <label><input type="radio" name="mode" value="name"><span>Name it</span></label>
      <label><input type="radio" name="mode" value="find"><span>Find it</span></label>
    </div></fieldset>
    <label class="drill-transliteration"><input type="checkbox" id="drill-romanized" name="romanized"> Reading aids in questions</label>
  </form>
  <p id="drill-context" class="muted"></p>
  <p id="drill-write-status" class="muted" role="status">${persistenceIssue ? "Progress: visit only; keep JSON." : "Progress: no new answers this visit."}</p>
  <div id="drill-persistence" class="drill-persistence" role="status"${persistenceIssue ? "" : " hidden"}><p id="drill-persistence-message">${esc(storageMessage)}</p><button type="button" id="drill-keep-visit">Keep this visit’s progress</button></div>
  <div class="drill-grid">
    <div class="drill-q" id="drill-q"></div>
    <div class="drill-visual">
      <div class="drill-view" aria-label="Drawing view">
        <button type="button" data-view="plate" aria-pressed="true">Whole plate</button>
        <button type="button" data-view="detail" aria-pressed="false">Local detail</button>
        <div id="drill-detail-controls" hidden>
          <button type="button" data-pan="out" aria-label="Zoom detail out">−</button>
          <button type="button" data-pan="in" aria-label="Zoom detail in">+</button>
          <button type="button" data-pan="left" aria-label="Pan detail left">Left</button>
          <button type="button" data-pan="up" aria-label="Pan detail up">Up</button>
          <button type="button" data-pan="down" aria-label="Pan detail down">Down</button>
          <button type="button" data-pan="right" aria-label="Pan detail right">Right</button>
          <button type="button" data-pan="reset">Recenter</button>
        </div>
      </div>
      <p id="drill-view-status" class="muted"></p>
      <figure class="plate drill-plate" id="drill-plate"></figure>
      <div id="drill-parts"></div>
      <p id="drill-inspection" class="drill-inspection" role="status"></p>
      <div id="drill-reading-actions"><button type="button" id="drill-save-reading">Save illustrated study</button><button type="button" id="drill-cancel-reading" hidden>Cancel study save</button></div>
      <p id="drill-reading-status" role="status"></p>
    </div>
    <div class="drill-feedback" id="drill-feedback" aria-live="polite"></div>
    <div class="drill-boxes" id="drill-boxes"></div>
    <section id="drill-source" class="drill-source" aria-labelledby="drill-source-title" hidden></section>
  </div>
  <details class="drill-keep"><summary>Keep your progress or share this exercise</summary>
    <p id="drill-storage">${esc(storageMessage)}</p>
    <div class="drill-actions"><button type="button" id="drill-save">Save progress JSON</button>
      <label class="drill-file">Restore progress JSON <input type="file" id="drill-load" accept=".json,application/json"></label>
      <button type="button" id="drill-link">Copy exercise link</button></div>
    <p class="muted">Restoring replaces the saved boxes after the file is checked. A link carries the deck, language and exercise, not answers or progress.</p>
    <p id="drill-file-status" role="status"></p>
  </details>
</section>`;
  const plate = $("#drill-plate", root);
  const question = $("#drill-q", root);
  const feedback = $("#drill-feedback", root);
  const partControls = $("#drill-parts", root);
  const inspection = $("#drill-inspection", root);
  const boxesEl = $("#drill-boxes", root);
  const status = $("#drill-file-status", root);
  const readingButton = $("#drill-save-reading", root) as HTMLButtonElement;
  const cancelReadingButton = $("#drill-cancel-reading", root) as HTMLButtonElement;
  const readingStatus = $("#drill-reading-status", root);
  const source = new VocabularySource($("#drill-source", root));
  connectSourceCards(feedback, source);
  const languageSelect = root.querySelector<HTMLSelectElement>("#drill-language");

  const groups = () => groupsFor(settings.deck, settings.language);
  const terms = () =>
    settings.deck.terms.filter((term) => term.words.some((w) => w.lang === settings.language));
  const key = (id: string) =>
    progressKey(
      settings.deck.id,
      settings.language,
      settings.mode === "find" ? "find" : "name",
      id,
    );

  function wordLabel(word: Word): string {
    return `<span lang="${word.lang}" class="opt-native">${esc(word.word)}</span>${word.romanized && word.romanized !== word.word ? ` <span class="opt-rom"${settings.romanized ? "" : " hidden"}>${esc(word.romanized)}</span>` : ""}`;
  }

  function persistence(
    message: string,
    issue: boolean,
    state: "saving" | "saved" | "visit" = issue ? "visit" : "saved",
  ): void {
    storageMessage = message;
    $("#drill-write-status", root).textContent =
      state === "saving"
        ? "Progress: saving…"
        : state === "saved"
          ? "Progress: saved in this browser."
          : "Progress: visit only; keep JSON.";
    $("#drill-storage", root).textContent = message;
    $("#drill-persistence-message", root).textContent = message;
    $("#drill-persistence", root).hidden = !issue;
  }

  function changedRecord(): void {
    protectChangedRecord = true;
    persistence(
      "Browser progress changed elsewhere. That record is preserved; this visit's answers stay separate. Keep this visit's JSON before reloading browser progress, or restore a valid file to replace it.",
      true,
    );
  }

  async function save(replace = false): Promise<boolean> {
    const request = ++saveRequest;
    const generation = replace ? ++saveGeneration : saveGeneration;
    if (replace) pendingReplacement = generation;
    const replacing = pendingReplacement === generation;
    if (!replace && !replacing && protectUnreadRecord) {
      persistence(
        "Browser progress could not be read. Its saved record is untouched. New answers last for this visit until you restore a valid progress file.",
        true,
      );
      return false;
    }
    if (!replace && !replacing && protectChangedRecord) {
      changedRecord();
      return false;
    }
    const snapshot = progressJSON(boxes);
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        controller.abort(
          new Error(
            "Browser saving did not finish. Your answers last for this visit; save progress JSON before leaving.",
          ),
        ),
      2000,
    );
    try {
      const manager = navigator.locks;
      if (!manager) {
        persistence(
          "Browser saving is unavailable here. Your answers last for this visit; save progress JSON before leaving.",
          true,
        );
        return false;
      }
      persistence("Saving progress in this browser…", false, "saving");
      return await manager.request(KEY, { signal: controller.signal }, () => {
        if (generation !== saveGeneration) return false;
        if (!replace && (protectUnreadRecord || protectChangedRecord)) return false;
        if (!replace && localStorage.getItem(KEY) !== lastSaved) {
          changedRecord();
          return false;
        }
        localStorage.setItem(KEY, snapshot);
        lastSaved = snapshot;
        protectUnreadRecord = false;
        protectChangedRecord = false;
        if (request === saveRequest)
          persistence("Progress stays in this browser. Save a backup to keep it elsewhere.", false);
        return true;
      });
    } catch {
      if (generation !== saveGeneration || request !== saveRequest) return false;
      persistence(
        controller.signal.aborted && controller.signal.reason instanceof Error
          ? controller.signal.reason.message
          : "Browser saving is unavailable. Your answers last for this visit; save progress JSON before leaving.",
        true,
      );
      return false;
    } finally {
      clearTimeout(timer);
      if (replace && pendingReplacement === generation) pendingReplacement = undefined;
    }
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== KEY && event.key !== null) return;
    if (protectUnreadRecord) return;
    try {
      // The event may be delayed until after an explicit restore. Inspect current bytes.
      if (localStorage.getItem(KEY) !== lastSaved) changedRecord();
    } catch {
      persistence(
        "Browser saving is unavailable. Your answers last for this visit; save progress JSON before leaving.",
        true,
      );
    }
  });

  function renderBoxes(): void {
    if (settings.mode === "study") {
      boxesEl.innerHTML = '<p class="muted">Studying does not change your practice boxes.</p>';
      return;
    }
    const local = Object.fromEntries(groups().map((g) => [g.id, boxes[key(g.id)] ?? 1]));
    const counts = tally(
      groups().map((g) => g.id),
      local,
    );
    const max = Math.max(1, ...counts);
    boxesEl.innerHTML = `<h2>${LANG_NAMES[settings.language]} · ${settings.mode === "name" ? "name it" : "find it"}</h2><div class="box-row">${counts.map((count, i) => `<div class="box"><div class="box-bar" style="height:${Math.round((count / max) * 48)}px"></div><span class="box-n">${count}</span><span class="box-label">${i === 0 ? "new or missed" : i === BOXES - 1 ? "box 5" : `box ${i + 1}`}</span></div>`).join("")}</div>
<p class="muted">${score.asked ? `${score.right} of ${score.asked} right in this exercise this visit. ` : ""}A correct answer moves a name up one box; a miss returns it to box 1. Lower boxes appear more often. These are practice counts, not a measure of fluency.</p>`;
  }

  function mark(ids: readonly string[], className: string): void {
    for (const id of ids)
      for (const el of plate.querySelectorAll(`[data-part="${CSS.escape(id)}"]`))
        el.classList.add(className);
  }

  function drawPlate(): void {
    const current = detailPart ?? terms()[0]?.id ?? "";
    const view = detail
      ? detailWindow(settings.deck.elevation, settings.deck.view, current, detailPose)
      : settings.deck.view;
    if (detail) {
      const anchor = detailAnchor(settings.deck.elevation, settings.deck.view, current);
      detailPose.x =
        (view.x0 + view.x1) / 2 - (detailPose.focus?.[0] ?? (anchor.x0 + anchor.x1) / 2);
      detailPose.y =
        (view.y0 + view.y1) / 2 - (detailPose.focus?.[1] ?? (anchor.y0 + anchor.y1) / 2);
    }
    plate.innerHTML = renderElevation(settings.deck.elevation, {
      id: `drill-${settings.deck.id}`,
      title: `${settings.deck.label} architectural ${detail ? "local detail" : "plate"}. Use the part buttons below to inspect details.`,
      dims: false,
      view,
      margin: detail ? 0 : 0.4,
    });
    plate.classList.toggle("is-detail", detail);
    mark(selectedParts, "sel");
    mark(missedParts, "miss");
    if (inspectedPart) mark([inspectedPart], "inspect");
    $("#drill-detail-controls", root).hidden = !detail;
    for (const button of root.querySelectorAll<HTMLButtonElement>("[data-view]"))
      button.setAttribute("aria-pressed", String((button.dataset.view === "detail") === detail));
    const zoomIn = root.querySelector<HTMLButtonElement>('[data-pan="in"]');
    const zoomOut = root.querySelector<HTMLButtonElement>('[data-pan="out"]');
    if (zoomIn) zoomIn.setAttribute("aria-disabled", String(detailPose.zoom >= 8));
    if (zoomOut) zoomOut.setAttribute("aria-disabled", String(detailPose.zoom <= 1));
    $("#drill-view-status", root).textContent = detail
      ? `Local crop, ${detailPose.zoom}× its initial local zoom. The same geometry is enlarged; a long feature may extend beyond the frame.`
      : "Use Local detail to enlarge a small feature. No carving detail is added.";
  }

  function centrePart(id: string): void {
    detailPart = id;
    detailPose = { zoom: detailPose.zoom, x: 0, y: 0 };
    drawPlate();
    if (detail) {
      const svg = plate.querySelector<SVGSVGElement>("svg");
      const anchor = detailAnchor(settings.deck.elevation, settings.deck.view, id);
      const focus = svg
        ? visiblePartPoint(svg, settings.deck.view, id, [
            (anchor.x0 + anchor.x1) / 2,
            (anchor.y0 + anchor.y1) / 2,
          ])
        : undefined;
      if (focus) {
        detailPose = { ...detailPose, focus };
        drawPlate();
      }
    }
  }

  function inspect(id: string): void {
    if (settings.mode !== "find" || answered) return;
    inspectedPart = id;
    centrePart(id);
    const list = terms();
    const index = list.findIndex((term) => term.id === id);
    inspection.textContent = `Inspecting part ${index + 1}. Activate its button to answer.`;
  }

  function renderPartControls(): void {
    const list = terms();
    partControls.hidden = settings.mode === "name";
    partControls.innerHTML = `<p class="muted" id="drill-part-help">${settings.mode === "study" ? "Select a name or a drawn part to read its word notes. Arrow keys move between the buttons." : "Point to a part, or focus a numbered button to inspect it in blue. Arrow keys move between buttons; Enter or Space answers. More than one shape may share a name."}</p><div class="drill-part-buttons" aria-label="Drawing parts" aria-describedby="drill-part-help">${list.map((term, i) => `<button type="button" data-term="${term.id}">${settings.mode === "study" ? esc(term.english) : `Part ${i + 1}`}</button>`).join("")}</div>`;
  }

  function study(id: string): void {
    const term = terms().find((entry) => entry.id === id);
    if (!term) return;
    source.close(false);
    cancelReading();
    settings = { ...settings, part: id };
    studyId = id;
    selectedParts = [id];
    missedParts = [];
    inspectedPart = null;
    centrePart(id);
    for (const button of partControls.querySelectorAll<HTMLButtonElement>("[data-term]"))
      button.setAttribute("aria-pressed", String(button.dataset.term === id));
    inspection.textContent = `Selected: ${term.english}.`;
    feedback.innerHTML = termCard(term, { sourceActions: true, live: false });
  }

  function ask(focus = false): void {
    source.close(false);
    cancelReading();
    $("#drill-reading-actions", root).hidden = settings.mode !== "study";
    answered = false;
    feedback.innerHTML = "";
    inspection.textContent = "";
    group = undefined;
    target = undefined;
    selectedParts = [];
    missedParts = [];
    inspectedPart = null;
    detailPart = null;
    detailPose = { ...detailPose, x: 0, y: 0 };
    renderPartControls();
    const available = groups();
    $("#drill-context", root).textContent =
      `${settings.deck.label}: ${terms().length} parts with ${available.length} distinct ${LANG_NAMES[settings.language]} names in this deck. ${settings.mode === "study" ? "Study plate supplies English names and the existing source notes." : "Name it and Find it keep separate boxes for each language."}`;
    if (settings.mode === "study") {
      question.innerHTML = `<h2>Read the plate</h2><p>Select an English part name to connect its shape, source-language words and evidence. The drawings are schematic; their source notes distinguish rules from illustrative choices.</p>`;
      study(studyId ?? terms()[0]?.id ?? "");
      if (!feedback.textContent) study(terms()[0]?.id ?? "");
    } else if (settings.mode === "name" && available.length < 2) {
      question.innerHTML =
        "<h2>One name in this language</h2><p>There is no distinct name to offer as a comparison. Choose Study plate or Find it to explore this entry.</p>";
    } else {
      const local = Object.fromEntries(available.map((g) => [g.id, boxes[key(g.id)] ?? 1]));
      const next = pickNext(
        available.map((g) => g.id),
        local,
        last,
        Math.random,
      );
      last = next;
      group = available.find((g) => g.id === next);
      if (!group) return;
      target = group.terms[Math.floor(Math.random() * group.terms.length)];
      if (!target) return;
      if (settings.mode === "name") {
        selectedParts = [target.id];
        detailPart = target.id;
        const ids = [
          group.id,
          ...distractors(
            available.map((g) => g.id),
            group.id,
            3,
            Math.random,
          ),
        ];
        // Fisher-Yates also shuffles the answer; a random sort is biased and engine-dependent.
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j] as string, ids[i] as string];
        }
        question.innerHTML = `<h2>What is the blue part called in ${LANG_NAMES[settings.language]}?</h2><div class="options">${ids
          .map((id) => {
            const option = available.find((g) => g.id === id);
            return option
              ? `<button type="button" class="opt" data-id="${id}">${wordLabel(option.word)}</button>`
              : "";
          })
          .join("")}</div>`;
      } else {
        question.innerHTML = `<h2>Find a part named</h2><p class="find-word">${wordLabel(group.word)}</p><p class="muted">Choose in the drawing or with the part buttons. Any part carrying this same ${LANG_NAMES[settings.language]} name counts.</p>`;
      }
    }
    drawPlate();
    if (group && settings.mode !== "study")
      question.insertAdjacentHTML(
        "beforeend",
        '<button type="button" class="drill-reveal">Reveal without grading</button>',
      );
    renderBoxes();
    if (focus)
      (
        question.querySelector<HTMLElement>(".opt") ??
        partControls.querySelector<HTMLElement>("button")
      )?.focus({ preventScroll: true });
  }

  function answer(id: string | null): void {
    if (!group || !target || answered || settings.mode === "study") return;
    const eligible =
      id === null ||
      (settings.mode === "name"
        ? groups().some((g) => g.id === id)
        : terms().some((term) => term.id === id));
    if (!eligible) {
      inspection.textContent = `That detail has no ${LANG_NAMES[settings.language]} entry in this exercise. Use one of the part buttons.`;
      return;
    }
    answered = true;
    const ungraded = id === null;
    const ok = id !== null && (settings.mode === "name" ? id === group.id : accepts(group, id));
    if (!ungraded) {
      score.asked++;
      if (ok) score.right++;
      boxes = grade(boxes, key(group.id), ok);
      void save();
    }
    question.querySelector(".drill-reveal")?.remove();
    inspectedPart = null;
    selectedParts = settings.mode === "find" ? group.terms.map((term) => term.id) : [target.id];
    missedParts = !ok && id !== null && settings.mode === "find" ? [id] : [];
    centrePart(target.id);
    for (const button of question.querySelectorAll<HTMLButtonElement>(".opt")) {
      button.disabled = true;
      if (button.dataset.id === group.id) button.classList.add("is-right");
      else if (button.dataset.id === id) button.classList.add("is-wrong");
    }
    for (const button of partControls.querySelectorAll<HTMLButtonElement>("[data-term]")) {
      button.disabled = true;
      const term = terms().find((entry) => entry.id === button.dataset.term);
      if (term) button.textContent = `${button.textContent}: ${term.english}`;
    }
    inspection.textContent = "Answer revealed. Blue marks the matching part or parts.";
    const cards = settings.mode === "find" ? group.terms : [target];
    feedback.innerHTML = `<p class="verdict ${ungraded ? "" : ok ? "ok" : "no"}">${ungraded ? "Revealed. Your boxes are unchanged." : ok ? "Right." : "Not quite."}</p>${group.terms.length > 1 ? `<p>This deck uses the same name for ${group.terms.map((term) => esc(term.english)).join(" and ")}. The name alone does not distinguish them; either form counts in Find it.</p>` : ""}${cards.map((term) => termCard(term, { sourceActions: true, live: false })).join("")}<button type="button" class="next">Next word</button>`;
    renderBoxes();
    feedback.querySelector<HTMLButtonElement>(".next")?.focus({ preventScroll: true });
  }

  function syncSettings(): void {
    for (const input of root.querySelectorAll<HTMLInputElement>('input[name="deck"]'))
      input.checked = input.value === settings.deck.id;
    for (const input of root.querySelectorAll<HTMLInputElement>('input[name="mode"]'))
      input.checked = input.value === settings.mode;
    if (languageSelect) {
      languageSelect.innerHTML = languages(settings.deck)
        .map((lang) => `<option value="${lang}">${LANG_NAMES[lang]}</option>`)
        .join("");
      languageSelect.value = settings.language;
    }
    const romanized = root.querySelector<HTMLInputElement>("#drill-romanized");
    if (romanized) romanized.checked = settings.romanized;
    last = null;
    studyId = settings.part ?? null;
    score = { right: 0, asked: 0 };
    ask();
  }

  root.querySelector("form")?.addEventListener("submit", (event) => event.preventDefault());
  root.querySelector("form")?.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    const query = new URLSearchParams(settingsHash(settings).slice(1));
    if (input.name === "deck") {
      query.set("deck", input.value);
    } else if (input.name === "language") {
      query.set("lang", input.value);
    } else if (input.name === "mode") {
      query.set("mode", input.value);
    } else if (input instanceof HTMLInputElement && input.name === "romanized") {
      settings.romanized = input.checked;
      // Do not silently replace the current question when hiding a reading aid.
      for (const el of question.querySelectorAll<HTMLElement>(".opt-rom"))
        el.hidden = !input.checked;
      return;
    }
    settings = readSettings(decks, query.toString());
    syncSettings();
  });
  question.addEventListener("click", (event) => {
    const id = (event.target as Element).closest<HTMLButtonElement>(".opt")?.dataset.id;
    if (id) answer(id);
    else if ((event.target as Element).closest(".drill-reveal")) answer(null);
  });
  const choosePart = (id: string) =>
    settings.mode === "study" ? study(id) : settings.mode === "find" ? answer(id) : undefined;
  plate.addEventListener("click", (event) => {
    const id = (event.target as Element).closest("[data-part]")?.getAttribute("data-part");
    if (id) choosePart(id);
  });
  partControls.addEventListener("click", (event) => {
    const id = (event.target as Element).closest<HTMLButtonElement>("[data-term]")?.dataset.term;
    if (id) choosePart(id);
  });
  for (const type of ["focusin", "pointerover"])
    partControls.addEventListener(type, (event) => {
      const id = (event.target as Element).closest<HTMLButtonElement>("[data-term]")?.dataset.term;
      if (id) inspect(id);
    });
  partControls.addEventListener("keydown", (event) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const buttons = [
      ...partControls.querySelectorAll<HTMLButtonElement>("[data-term]:not(:disabled)"),
    ];
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index +
              (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) +
              buttons.length) %
            buttons.length;
    buttons[next]?.focus({ preventScroll: true });
  });
  root.querySelector(".drill-view")?.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button");
    if (!button || button.getAttribute("aria-disabled") === "true") return;
    if (button.dataset.view) {
      detail = button.dataset.view === "detail";
      if (detail && !detailPart && settings.mode === "find") {
        const first = terms()[0]?.id;
        if (first) {
          inspect(first);
          return;
        }
      }
      if (detail && detailPart && !detailPose.focus) centrePart(detailPart);
      else drawPlate();
      return;
    }
    const action = button.dataset.pan;
    if (!action) return;
    const window = detailWindow(
      settings.deck.elevation,
      settings.deck.view,
      detailPart ?? terms()[0]?.id ?? "",
      detailPose,
    );
    const step = (window.x1 - window.x0) / 4;
    if (action === "in") detailPose.zoom = Math.min(8, detailPose.zoom * 2);
    if (action === "out") detailPose.zoom = Math.max(1, detailPose.zoom / 2);
    if (action === "left") detailPose.x -= step;
    if (action === "right") detailPose.x += step;
    if (action === "up") detailPose.y += step;
    if (action === "down") detailPose.y -= step;
    if (action === "reset") {
      detailPose = { zoom: 1, x: 0, y: 0 };
      if (detailPart) {
        centrePart(detailPart);
        return;
      }
    }
    drawPlate();
  });
  feedback.addEventListener("click", (event) => {
    if ((event.target as Element).closest(".next")) ask(true);
  });
  function cancelReading(): void {
    if (!readingController) return;
    ++readingRequest;
    readingController.abort();
    readingController = undefined;
    readingButton.disabled = false;
    cancelReadingButton.hidden = true;
    readingStatus.textContent = "Study save cancelled. No file was downloaded.";
  }
  cancelReadingButton.addEventListener("click", cancelReading);
  readingButton.addEventListener("click", async () => {
    const term = terms().find((entry) => entry.id === studyId);
    if (!term || settings.mode !== "study") return;
    cancelReading();
    const request = ++readingRequest;
    const controller = new AbortController();
    readingController = controller;
    const snapshot: VocabularyStudy = {
      deck: settings.deck,
      language: settings.language,
      term,
      pose: { ...detailPose },
    };
    readingButton.disabled = true;
    cancelReadingButton.hidden = false;
    readingStatus.textContent = `Preparing the illustrated ${term.english} study…`;
    const timer = setTimeout(
      () =>
        controller.abort(
          new Error("The illustrated study did not finish loading. Reconnect and try again."),
        ),
      20000,
    );
    try {
      const content = await vocabularyStudy(snapshot, controller.signal);
      if (request !== readingRequest) return;
      const url = URL.createObjectURL(new Blob([content], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `embater-${snapshot.deck.id}-${term.id}-study.html`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      readingStatus.textContent = `Saved the illustrated ${term.english} study and native vocabulary CSV.`;
    } catch (error) {
      if (request !== readingRequest) return;
      readingStatus.textContent =
        controller.signal.aborted && controller.signal.reason instanceof Error
          ? controller.signal.reason.message
          : error instanceof Error
            ? error.message
            : "The illustrated study could not be saved. Try again.";
    } finally {
      clearTimeout(timer);
      if (request === readingRequest) {
        readingController = undefined;
        readingButton.disabled = false;
        cancelReadingButton.hidden = true;
      }
    }
  });
  $("#drill-keep-visit", root).addEventListener("click", () => {
    const panel = root.querySelector<HTMLDetailsElement>(".drill-keep");
    if (panel) panel.open = true;
    $("#drill-save", root).focus();
  });
  $("#drill-save", root).addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([progressJSON(boxes)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "embater-vocabulary-progress.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "Saved boxes for all languages and both exercise directions.";
  });
  root.querySelector<HTMLInputElement>("#drill-load")?.addEventListener("change", async (event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const generation = ++importGeneration;
    if (!file) return;
    try {
      if (file.size > 65536) throw new Error("The progress file exceeds 64 KiB.");
      const next = parseProgress(await file.text(), known);
      if (generation !== importGeneration) return;
      boxes = next;
      score = { right: 0, asked: 0 };
      last = null;
      ask();
      status.textContent = "Restoring browser progress…";
      const persisted = await save(true);
      if (generation !== importGeneration) return;
      status.textContent = persisted
        ? "Restored the saved boxes. A new ungraded question is ready."
        : "Restored the boxes for this visit. Browser saving is unavailable; keep your JSON backup.";
    } catch (error) {
      if (generation === importGeneration)
        status.textContent = `${error instanceof Error ? error.message : "The progress file could not be read."} Current progress was kept.`;
    } finally {
      if (generation === importGeneration) input.value = "";
    }
  });
  $("#drill-link", root).addEventListener("click", async () => {
    const url = new URL(location.href);
    url.hash = settingsHash(settings);
    try {
      await navigator.clipboard.writeText(url.href);
      status.textContent = "Copied the exercise link. It carries settings, not your progress.";
    } catch {
      status.innerHTML = `Copy this exercise link: <a href="${esc(url.href)}">${esc(url.href)}</a>`;
    }
  });
  window.addEventListener("hashchange", () => {
    settings = readSettings(decks, location.hash);
    syncSettings();
  });
  syncSettings();
}
