import { verified } from "../assets";
import { VOCABULARY_PLATES } from "../content/vocabulary-plates";
import { RULES, type Rule } from "../core/rules";
import { $ } from "./dom";

export type VocabularyPlate = (typeof VOCABULARY_PLATES)[number];

export function platesForRule(rule: Rule): VocabularyPlate[] {
  return VOCABULARY_PLATES.filter(
    (plate) => plate.page >= rule.page && plate.page <= (rule.pageEnd ?? rule.page),
  );
}

/** A source stays paired with its citation through aborts, retries and late replies. */
export class VocabularySource {
  private generation = 0;
  private controller: AbortController | undefined;
  private objectUrl: string | undefined;
  private pages: VocabularyPlate[] = [];
  private index = 0;
  private enlarged = false;
  private trigger: HTMLElement | undefined;
  private readonly image: HTMLImageElement;
  private readonly frame: HTMLElement;
  private readonly status: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    root.hidden = true;
    root.innerHTML = `<div class="drill-source-heading"><h2 id="drill-source-title" tabindex="-1"></h2><button type="button" data-source-close>Close printed source</button></div>
      <p id="drill-source-citation"></p>
      <div class="drill-source-actions">
        <label>Printed page <select id="drill-source-page"></select></label>
        <button type="button" data-source-step="-1">Previous page</button><button type="button" data-source-step="1">Next page</button>
        <button type="button" id="drill-source-zoom" aria-pressed="false">Enlarge page</button>
        <button type="button" id="drill-source-retry">Reload source page</button>
      </div>
      <p id="drill-source-status" role="status"></p>
      <p class="muted">Complete print, including the critical apparatus. When enlarged, scroll or use the arrow keys in the page frame. This scan preserves Krohn’s edition; English explanations are modern.</p>
      <div id="drill-source-frame" tabindex="0" role="region" aria-label="Complete printed source page"><img id="drill-source-image" alt="" hidden></div>
      <p><a id="drill-source-original" href="https://archive.org/details/vitruviidearchit00vitr_1">Original Internet Archive scan</a> · Public-domain edition, F. Krohn, Leipzig, 1912.</p>`;
    this.image = $("#drill-source-image", root) as HTMLImageElement;
    this.frame = $("#drill-source-frame", root);
    this.status = $("#drill-source-status", root);
    root.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>("button");
      if (!button) return;
      if (button.hasAttribute("data-source-close")) this.close();
      else if (button.dataset.sourceStep) {
        this.index = Math.max(
          0,
          Math.min(this.pages.length - 1, this.index + Number(button.dataset.sourceStep)),
        );
        void this.load();
      } else if (button.id === "drill-source-zoom") {
        this.enlarged = !this.enlarged;
        this.frame.classList.toggle("is-enlarged", this.enlarged);
        button.setAttribute("aria-pressed", String(this.enlarged));
        button.textContent = this.enlarged ? "Fit whole page" : "Enlarge page";
      } else if (button.id === "drill-source-retry") void this.load(true);
    });
    $("#drill-source-page", root).addEventListener("change", (event) => {
      const page = Number((event.target as HTMLSelectElement).value);
      this.index = Math.max(
        0,
        this.pages.findIndex((entry) => entry.page === page),
      );
      void this.load();
    });
  }

  open(rule: Rule, trigger: HTMLElement): void {
    this.pages = platesForRule(rule);
    this.index = 0;
    this.trigger = trigger;
    this.root.hidden = false;
    $("#drill-source-title", this.root).textContent = `Vitruvius ${rule.cite}`;
    $("#drill-source-citation", this.root).textContent =
      `Selected excerpt on ${rule.pageEnd ? `printed pages ${rule.page}–${rule.pageEnd}` : `printed page ${rule.page}`}. The full page can include other sections.`;
    $("#drill-source-page", this.root).innerHTML = this.pages
      .map((page) => `<option value="${page.page}">${page.page}</option>`)
      .join("");
    this.frame.scrollTo(0, 0);
    $("#drill-source-title", this.root).focus({ preventScroll: true });
    this.root.scrollIntoView({ block: "start" });
    void this.load();
  }

  close(restoreFocus = true): void {
    ++this.generation;
    this.controller?.abort();
    this.root.hidden = true;
    this.image.hidden = true;
    this.image.removeAttribute("src");
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
    if (restoreFocus && this.trigger?.isConnected) {
      const disclosure = this.trigger.closest("details");
      if (disclosure) disclosure.open = true;
      this.trigger.focus();
    }
  }

  private async load(refresh = false): Promise<void> {
    const plate = this.pages[this.index];
    if (!plate) {
      this.status.textContent = "No complete source page is available for this excerpt.";
      return;
    }
    const request = ++this.generation;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(
      () =>
        controller.abort(
          new Error("The source page did not finish loading. Reconnect and reload it."),
        ),
      15000,
    );
    this.image.hidden = true;
    this.image.removeAttribute("src");
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
    this.status.textContent = `Loading complete printed page ${plate.page}…`;
    const select = $("#drill-source-page", this.root) as HTMLSelectElement;
    select.value = String(plate.page);
    for (const button of this.root.querySelectorAll<HTMLButtonElement>("[data-source-step]"))
      button.disabled =
        Number(button.dataset.sourceStep) < 0
          ? this.index === 0
          : this.index === this.pages.length - 1;
    $("#drill-source-original", this.root).setAttribute("href", plate.url);
    this.frame.scrollTo(0, 0);
    try {
      const bytes = await verified(
        `${import.meta.env.BASE_URL}${plate.path}`,
        plate.sha256,
        controller.signal,
        refresh,
      );
      if (request !== this.generation) return;
      this.objectUrl = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
      this.image.src = this.objectUrl;
      this.image.alt = `Complete Krohn 1912 printed page ${plate.page}, including Latin and critical apparatus.`;
      await this.image.decode();
      controller.signal.throwIfAborted();
      if (request !== this.generation) return;
      this.image.hidden = false;
      this.status.textContent = `Complete printed page ${plate.page}. The image matches the retained edition.`;
    } catch (error) {
      if (request !== this.generation) return;
      this.image.hidden = true;
      this.status.textContent =
        controller.signal.aborted && controller.signal.reason instanceof Error
          ? controller.signal.reason.message
          : error instanceof Error
            ? error.message
            : "The source page could not be verified. Reconnect and reload it.";
    } finally {
      clearTimeout(timer);
    }
  }
}

export function connectSourceCards(card: HTMLElement, source: VocabularySource): void {
  card.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-source-rule]");
    const rule = button?.dataset.sourceRule ? RULES.get(button.dataset.sourceRule) : undefined;
    if (button && rule) source.open(rule, button);
  });
}
