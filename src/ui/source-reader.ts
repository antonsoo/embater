import { verified } from "../assets";
import { $ } from "./dom";

interface SourcePlate {
  page: number;
  path: string;
  sha256: string;
  url: string;
}
/** Each reader owns its request, abort controller and blob URL. */
export function mountSourceReader(
  root: HTMLElement,
  prefix: string,
  plates: readonly SourcePlate[],
  book: string,
): void {
  const pageSelect = root.querySelector<HTMLSelectElement>(
    `#${prefix}-source-page`,
  ) as HTMLSelectElement;
  const image = root.querySelector<HTMLImageElement>(`#${prefix}-source-image`) as HTMLImageElement;
  let pageRequest = 0,
    sourceAbort: AbortController | null = null,
    currentUrl: string | null = null,
    enlarged = false;
  async function source(refresh = false): Promise<void> {
    const plate = plates.find((p) => p.page === Number(pageSelect.value));
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
    const sourceStatus = $(`#${prefix}-source-status`, root);
    sourceStatus.textContent = `Loading complete printed page ${plate.page}…`;
    $(`#${prefix}-source-original`, root).setAttribute("href", plate.url);
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
      image.alt = `Complete printed page ${plate.page} of ${book}`;
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
  $(`#${prefix}-source-retry`, root).addEventListener("click", () => void source(true));
  $(`#${prefix}-source-zoom`, root).addEventListener("click", () => {
    enlarged = !enlarged;
    $(`#${prefix}-source-frame`, root).classList.toggle("enlarged", enlarged);
    $(`#${prefix}-source-zoom`, root).setAttribute("aria-pressed", String(enlarged));
    $(`#${prefix}-source-zoom`, root).textContent = enlarged ? "Fit whole page" : "Enlarge page";
    $(`#${prefix}-source-frame`, root).focus({ preventScroll: true });
  });
  void source();
}
