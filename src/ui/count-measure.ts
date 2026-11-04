import { type CountTrial, countMeasures, EDGE_LABELS } from "../core/count-measure";
import {
  type CountChoice,
  type CountSnapshot,
  type CountWork,
  comparisonCsv,
  countSnapshot,
  countWork,
  parseCountWork,
} from "../core/count-state";
import { countMeasureSvg, measureNumber as num } from "../draw/count-measure";
import { $, esc } from "./dom";

export type MeasureSnapshot = CountSnapshot;
export function measurementTable(
  snapshot: MeasureSnapshot,
  caption = "Three ways to measure the same trial. D is one shaft diameter.",
): string {
  return `<table class="measure-table"><caption>${esc(caption)}</caption><thead><tr><th scope="col">Endpoints</th><th scope="col">Width / D</th><th scope="col">Length / D</th><th scope="col">L / W</th></tr></thead><tbody>${countMeasures(
    snapshot.flank,
    snapshot.trial,
  )
    .map(
      (m) =>
        `<tr${m.edge === snapshot.trial.edge ? ' class="measure-selected"' : ""}><th scope="row">${m.label}</th><td>${num(m.width)}</td><td>${num(m.length)}</td><td>${num(m.ratio)}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}
export function measurementNotes(snapshot: MeasureSnapshot): string {
  const { trial, flank } = snapshot;
  const axes = countMeasures(flank, trial)[0];
  if (!axes) throw new Error("Missing axes.");
  return `<p>${esc(snapshot.premise)} The trial has 5 front spaces and ${flank - 1} flank spaces. ${flank === 11 ? "The space count is doubled." : "The space count is not doubled."}</p>
    <p>Centre width = 5 × ${num(trial.frontPitch)} = ${num(axes.width)} D. Centre length = ${flank - 1} × ${num(trial.flankPitch)} = ${num(axes.length)} D. Outside shaft faces add 1 D to each dimension; the trial platform adds another 2 × ${num(trial.margin)} D.</p>
    <p>Count source: ${esc(snapshot.evidence.label)}. <a href="${esc(snapshot.evidence.url)}">Read the source record</a>. ${esc(snapshot.evidence.status)}. ${esc(snapshot.evidence.credit)}; ${esc(snapshot.evidence.license)}.</p>${snapshot.trial.basis === "record" ? `<blockquote>${esc(snapshot.evidence.quote)}</blockquote>` : ""}
    <p>Modern experiment: uniform circular shafts, uniform pitch within each direction and the same margin on all four sides. Width runs across the front; length runs along the flank, even when it is shorter. No bases, walls, steps, corner contraction or surveyed dimensions. The grey platform is a chosen boundary. A count alone determines none of these distances. These endpoints are comparisons, not a claim to settle what Vitruvius meant by <i lang="la">longitudo operis</i>.</p>`;
}

export class CountMeasuringBench {
  private initial: CountTrial;
  private importGeneration = 0;
  constructor(
    private readonly root: HTMLElement,
    private trial: CountTrial,
    private readonly change: () => void,
    private readonly capture: () => CountChoice,
    private readonly apply: (work: CountWork) => void,
    private reference: CountChoice | null = null,
  ) {
    this.initial = { ...trial };
    root.innerHTML = `<div class="measure-intro"><p class="count-kicker">Keep the count. Change the ruler.</p><h2 id="measure-heading">Twice as long, measured where?</h2><p>With equal spacing, 6 × 11 columns enclose a 2:1 rectangle <em>between their corner centres</em>. Measure outside the shafts instead. Then change the spacing while keeping every column. What additional assumptions did the count need?</p><p class="count-limit"><a href="#latin" lang="la">duplex longitudo operis ad latitudinem</a> — “the length of the work double its width”. The trial compares possible measuring endpoints; it does not establish which endpoints Vitruvius intended.</p></div>
      <div class="measure-reference-actions"><button type="button" id="measure-hold">Hold this trial</button><button type="button" id="measure-drop" hidden>Remove reference</button><p id="measure-reference-result" role="status"></p></div>
      <div class="measure-bench">
      <div><div class="measure-frame" tabindex="0" role="region" aria-label="Trial plan; enlarge to inspect and pan"><figure id="measure-plate"></figure></div><button type="button" id="measure-zoom" aria-pressed="false">Enlarge trial plan</button><p class="count-limit">Blue: current measuring endpoints. Red crosses and dashes: held reference, when present. Grey: chosen platform and centre rectangle. The drawing keeps one scale as the spacing changes.</p></div>
      <div class="measure-controls">
      <label for="measure-basis">Use this column count</label><select id="measure-basis"><option value="rule">The reading above</option><option value="record">The selected building record</option></select>
      <p id="measure-premise" class="muted"></p>
      <fieldset class="measure-edges"><legend>Place the ruler at</legend>${Object.entries(
        EDGE_LABELS,
      )
        .map(
          ([key, label]) =>
            `<label><input type="radio" name="measure-edge" value="${key}"> ${label}</label>`,
        )
        .join("")}</fieldset>
      <label class="measure-range" for="front-pitch">Front axial pitch <output id="front-pitch-value" for="front-pitch"></output></label><input id="front-pitch" type="range" min="1.25" max="6" step="0.05" aria-describedby="measure-pitch-note">
      <p id="measure-pitch-note" class="count-limit">Axial pitch is centre to centre. Subtract 1 D for the clear gap between these trial shafts.</p>
      <label class="measure-lock"><input id="measure-equal" type="checkbox"> Keep front and flank pitches equal</label>
      <label class="measure-range" for="flank-pitch">Flank axial pitch <output id="flank-pitch-value" for="flank-pitch"></output></label><input id="flank-pitch" type="range" min="1.25" max="6" step="0.025" aria-describedby="measure-pitch-note">
      <label class="measure-range" for="measure-margin">Platform beyond shaft faces <output id="measure-margin-value" for="measure-margin"></output></label><input id="measure-margin" type="range" min="0" max="2" step="0.05">
      <div class="measure-presets"><button type="button" id="measure-equal-example">Try equal spacing</button><button type="button" id="measure-halved">Use half the front pitch</button><button type="button" id="measure-reset">Restore opened trial</button></div>
      <p id="measure-half-hint" class="count-limit" hidden>Half this front pitch is below the trial’s 1.25 D minimum. Increase the front pitch to at least 2.5 D to try this comparison.</p><p id="measure-result" role="status" class="measure-result"></p>
      </div></div>
      <div id="measure-table"></div><details class="measure-derivation"><summary>Follow the calculation and its limits</summary><div id="measure-notes"></div></details>
      <div class="count-downloads"><button type="button" id="save-measure-svg">Save trial plan (SVG)</button><button type="button" id="save-measure-csv">Save measurements (CSV)</button><button type="button" id="share-measure">Copy complete comparison link</button><button type="button" id="save-measure-work">Save comparison (JSON)</button></div><label class="measure-file" for="load-measure-work">Reopen a comparison JSON file<input type="file" id="load-measure-work" accept=".json,application/json"></label><p id="measure-save-status" role="status" class="muted"></p>
      <p class="count-limit">“Save illustrated reading” above retains this trial alongside the count comparison and complete printed source page.</p>`;
    $("#measure-hold", root).addEventListener("click", () => {
      this.reference = this.capture();
      this.refresh();
      this.change();
    });
    $("#measure-drop", root).addEventListener("click", () => {
      this.reference = null;
      this.refresh();
      this.change();
    });
    root.addEventListener("input", (event) => {
      const input = event.target as HTMLInputElement;
      if (input.id === "front-pitch") {
        this.trial.frontPitch = Number(input.value);
        if (this.trial.equal) this.trial.flankPitch = this.trial.frontPitch;
      } else if (input.id === "flank-pitch") this.trial.flankPitch = Number(input.value);
      else if (input.id === "measure-margin") this.trial.margin = Number(input.value);
      else if (input.id === "measure-equal") {
        this.trial.equal = input.checked;
        if (this.trial.equal) this.trial.flankPitch = this.trial.frontPitch;
      } else if (input.name === "measure-edge") {
        const edge = input.value;
        if (edge === "axes" || edge === "faces" || edge === "platform") this.trial.edge = edge;
      } else if (input.id === "measure-basis") {
        this.trial.basis = input.value === "record" ? "record" : "rule";
      } else return;
      this.refresh();
      this.change();
    });
    $("#measure-equal-example", root).addEventListener("click", () => {
      this.trial = { ...this.trial, frontPitch: 3, flankPitch: 3, margin: 1, equal: true };
      this.refresh();
      this.change();
    });
    $("#measure-halved", root).addEventListener("click", () => {
      if (this.trial.frontPitch < 2.5) return;
      this.trial = { ...this.trial, flankPitch: this.trial.frontPitch / 2, equal: false };
      this.refresh();
      this.change();
    });
    $("#measure-reset", root).addEventListener("click", () => {
      this.trial = { ...this.initial };
      this.refresh();
      this.change();
    });
    $("#measure-zoom", root).addEventListener("click", () => {
      const button = $("#measure-zoom", root);
      const enlarged = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(enlarged));
      button.textContent = enlarged ? "Fit trial plan" : "Enlarge trial plan";
      root.querySelector(".measure-frame")?.classList.toggle("is-enlarged", enlarged);
    });
    const download = (content: string, name: string, type: string) => {
      const link = document.createElement("a");
      const url = URL.createObjectURL(new Blob([content], { type }));
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      $("#measure-save-status", root).textContent =
        `Saved ${name}. All distances are modern trial choices in D.`;
    };
    $("#save-measure-svg", root).addEventListener("click", () => {
      const snapshot = this.snapshot();
      download(
        countMeasureSvg(snapshot.flank, snapshot.trial, {
          evidence: snapshot.evidence,
          ...this.referenceOptions(),
        }),
        "embater-count-trial.svg",
        "image/svg+xml;charset=utf-8",
      );
    });
    $("#save-measure-csv", root).addEventListener("click", () => {
      const snapshot = this.snapshot();
      download(
        comparisonCsv(snapshot, this.heldSnapshot()),
        "embater-count-trial.csv",
        "text/csv;charset=utf-8",
      );
    });
    $("#save-measure-work", root).addEventListener("click", () => {
      const work = countWork(this.capture(), this.referenceChoice());
      download(
        `${JSON.stringify(work, null, 2)}\n`,
        "embater-count-comparison.json",
        "application/json",
      );
      $("#measure-save-status", root).textContent =
        "Saved the current comparison and held reference as an editable work file. The illustrated reading also retains the actual source page.";
    });
    $("#load-measure-work", root).addEventListener("change", async (event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      const generation = ++this.importGeneration;
      input.value = "";
      if (!file) return;
      const before = JSON.stringify(countWork(this.capture(), this.referenceChoice()));
      try {
        if (file.size > 65536)
          throw new Error(
            "Choose an Embater comparison JSON file under 64 KiB. The current comparison was not changed.",
          );
        const text = await file.text();
        if (generation !== this.importGeneration) return;
        const work = parseCountWork(text);
        if (JSON.stringify(countWork(this.capture(), this.referenceChoice())) !== before)
          throw new Error(
            "The comparison changed while the file opened. Choose the file again to replace these newer choices.",
          );
        this.apply(work);
        $("#measure-save-status", root).textContent =
          "Reopened the comparison and its held reference. No source measurements were inferred from the building count.";
      } catch (error) {
        if (generation === this.importGeneration)
          $("#measure-save-status", root).textContent =
            error instanceof Error
              ? error.message
              : "The comparison file could not be opened. Nothing was changed.";
      }
    });
    $("#share-measure", root).addEventListener("click", async () => {
      this.change();
      const url = location.href;
      try {
        await navigator.clipboard.writeText(url);
        $("#measure-save-status", root).textContent =
          "Copied the count reading, building record, inclusion choice and measuring trial.";
      } catch {
        const status = $("#measure-save-status", root);
        status.textContent = "Copy this complete comparison link: ";
        const input = document.createElement("input");
        input.type = "text";
        input.readOnly = true;
        input.value = url;
        input.setAttribute("aria-label", "Complete comparison link");
        status.append(input);
        input.focus();
        input.select();
      }
    });
  }
  trialState(): CountTrial {
    return { ...this.trial };
  }
  referenceChoice(): CountChoice | null {
    return this.reference ? structuredClone(this.reference) : null;
  }
  heldSnapshot(): CountSnapshot | undefined {
    return this.reference ? countSnapshot(this.reference) : undefined;
  }
  private referenceOptions(): { reference?: CountSnapshot } {
    const reference = this.heldSnapshot();
    return reference ? { reference } : {};
  }
  snapshot(): MeasureSnapshot {
    return countSnapshot(this.capture());
  }
  replace(work: CountWork): void {
    this.trial = { ...work.current.trial };
    this.initial = { ...work.current.trial };
    this.reference = work.reference;
  }
  update(): void {
    this.refresh();
  }
  private refresh(): void {
    const snapshot = this.snapshot();
    const { trial, flank } = snapshot;
    ($("#measure-basis", this.root) as HTMLSelectElement).value = trial.basis;
    $("#measure-premise", this.root).textContent = snapshot.premise;
    for (const input of this.root.querySelectorAll<HTMLInputElement>('[name="measure-edge"]'))
      input.checked = input.value === trial.edge;
    for (const [id, value] of [
      ["front-pitch", trial.frontPitch],
      ["flank-pitch", trial.flankPitch],
      ["measure-margin", trial.margin],
    ] as const) {
      const input = $(`#${id}`, this.root) as HTMLInputElement;
      input.value = String(value);
      input.setAttribute("aria-valuetext", `${num(value)} shaft diameters`);
      $(`#${id}-value`, this.root).textContent = `${num(value)} D`;
    }
    ($("#measure-equal", this.root) as HTMLInputElement).checked = trial.equal;
    ($("#flank-pitch", this.root) as HTMLInputElement).disabled = trial.equal;
    const half = $("#measure-halved", this.root) as HTMLButtonElement;
    half.disabled = trial.frontPitch < 2.5;
    if (half.disabled) half.setAttribute("aria-describedby", "measure-half-hint");
    else half.removeAttribute("aria-describedby");
    $("#measure-half-hint", this.root).hidden = !half.disabled;
    const reference = this.heldSnapshot();
    $("#measure-drop", this.root).hidden = !reference;
    const refStatus = $("#measure-reference-result", this.root);
    refStatus.textContent = reference
      ? `${reference.flank === flank ? "Column count unchanged" : "Column count changed"}: held 6 × ${reference.flank}, current 6 × ${flank}. Held count source: ${reference.evidence.label}${reference.uncertainCount ? " (uncertain restoration)" : ""}. Red retains the held trial; blue is current.`
      : "Keep one trial, then change the ruler or spacing. Both will stay on the same plate and scale.";
    $("#measure-plate", this.root).innerHTML = countMeasureSvg(flank, trial, {
      evidence: snapshot.evidence,
      ...this.referenceOptions(),
    });
    $("#measure-table", this.root).innerHTML = reference
      ? `<div class="measure-tables">${measurementTable(snapshot, "Current trial · D is one shaft diameter")}${measurementTable(reference, "Held reference · same D and drawing scale")}</div>`
      : measurementTable(snapshot);
    $("#measure-notes", this.root).innerHTML =
      `${reference ? "<h3>Current trial</h3>" : ""}${measurementNotes(snapshot)}${reference ? `<h3>Held reference</h3>${measurementNotes(reference)}` : ""}`;
    const selected = countMeasures(flank, trial).find((m) => m.edge === trial.edge);
    if (!selected) throw new Error("Missing selected measure.");
    $("#measure-result", this.root).textContent =
      `${flank - 1} flank spaces / 5 front spaces. ${selected.label}: L / W = ${num(selected.ratio)}.${flank === 11 && trial.frontPitch !== trial.flankPitch ? " The space count still doubles; the pitches differ." : ""}`;
    $("#measure-save-status", this.root).textContent = "";
  }
}
