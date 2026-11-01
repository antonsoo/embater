declare const __OFFLINE_EDITION__: string;
interface EditionState {
  edition: string;
  sequence: number;
  instance: string;
  complete: boolean;
  failures: { path: string; reason: "missing" | "damaged" }[];
  repairing: boolean;
}

/** Readiness is a current byte audit by this page's controlling worker. */
export function setupOffline(): void {
  const statusElement = document.querySelector<HTMLElement>("#offline-status");
  const repairElement = document.querySelector<HTMLButtonElement>("#offline-repair");
  if (!statusElement || !repairElement || !import.meta.env.PROD || !("serviceWorker" in navigator))
    return;
  const status: HTMLElement = statusElement;
  const repair: HTMLButtonElement = repairElement;
  let generation = 0,
    lastSequence = -1;
  let lastInstance = "";
  let lastWorker: ServiceWorker | null = null;
  let pendingRegistration: ServiceWorkerRegistration | undefined;
  function show(result: EditionState, worker: ServiceWorker): void {
    if (navigator.serviceWorker.controller !== worker) return;
    if (lastWorker !== worker || lastInstance !== result.instance) {
      lastWorker = worker;
      lastInstance = result.instance;
      lastSequence = -1;
    }
    if (result.sequence < lastSequence) return;
    lastSequence = result.sequence;
    if (result.edition !== __OFFLINE_EDITION__) {
      status.textContent =
        "This page and its saved edition differ. Save editable work or copy its link, then reload online.";
      repair.hidden = true;
      return;
    }
    repair.disabled = result.repairing;
    repair.hidden = result.complete && !result.repairing;
    if (result.repairing)
      status.textContent = "Checking and repairing the offline copy… You can keep working.";
    else if (result.complete)
      status.textContent =
        "Ready offline: pages, diagrams and fonts saved. External source links need a connection.";
    else {
      const damaged = result.failures.filter((f) => f.reason === "damaged").length;
      const missing = result.failures.filter((f) => f.reason === "missing").length;
      status.textContent =
        damaged + missing
          ? `Offline copy needs repair: ${damaged} damaged, ${missing} missing. Reconnect and repair it before relying on offline reading.`
          : "Offline saving could not be checked. Reconnect and repair the offline copy.";
    }
  }
  async function inspect(repairing = false, invalidate = false): Promise<void> {
    const worker = navigator.serviceWorker.controller;
    if (!worker) return;
    clearTimeout(initialDeadline);
    const request = ++generation,
      channel = new MessageChannel();
    if (repairing) {
      repair.disabled = true;
      repair.hidden = false;
      status.textContent = "Checking and repairing the offline copy… You can keep working.";
    }
    const timer = setTimeout(
      () => {
        channel.port1.close();
        if (request === generation) {
          repair.disabled = false;
          repair.hidden = false;
          status.textContent = repairing
            ? "Offline repair did not finish. Reconnect and try again."
            : "Offline saving could not be checked. Reconnect and repair the offline copy.";
        }
      },
      repairing ? 65000 : 12000,
    );
    channel.port1.onmessage = (event: MessageEvent<EditionState>) => {
      clearTimeout(timer);
      channel.port1.close();
      if (request === generation) show(event.data, worker);
    };
    worker.postMessage(
      {
        type: repairing ? "REPAIR_EDITION" : "INSPECT_EDITION",
        edition: __OFFLINE_EDITION__,
        invalidate,
      },
      [channel.port2],
    );
  }
  const initialDeadline = setTimeout(() => {
    if (!navigator.serviceWorker.controller) {
      const installing = pendingRegistration?.installing;
      status.textContent =
        installing && installing.state !== "redundant"
          ? "Offline edition is still saving. Keep this tab online; the workshop remains usable."
          : "Offline saving did not finish. Reload online to try again.";
    }
  }, 12000);
  status.textContent = "Saving these pages for offline reading…";
  repair.addEventListener("click", () => void inspect(true));
  navigator.serviceWorker.addEventListener("controllerchange", () => void inspect());
  navigator.serviceWorker.addEventListener(
    "message",
    (event: MessageEvent<EditionState & { type?: string }>) => {
      if (
        event.data?.type === "EDITION_STATE" &&
        event.source === navigator.serviceWorker.controller
      )
        show(event.data, event.source as ServiceWorker);
    },
  );
  window.addEventListener("embater-asset-check", (event) => {
    const detail = (event as CustomEvent<{ valid?: boolean }>).detail;
    if (detail?.valid === false) {
      ++generation;
      repair.hidden = false;
      status.textContent = "Offline copy needs repair. Checking the saved files…";
      void inspect(false, true);
    } else if (detail?.valid === true) void inspect();
  });
  window.addEventListener("pageshow", () => void inspect());
  window.addEventListener("online", () => void inspect());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void inspect();
  });
  void inspect();
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((registration) => {
      pendingRegistration = registration;
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "redundant" && !navigator.serviceWorker.controller)
            status.textContent = "Offline saving did not finish. Reload online to try again.";
        });
      });
      // A navigation can begin between activation's client snapshot and claim.
      // Ask the ready worker to claim again after this document has registered.
      void navigator.serviceWorker.ready.then((ready) => {
        if (!navigator.serviceWorker.controller)
          ready.active?.postMessage({ type: "CLAIM_EDITION", edition: __OFFLINE_EDITION__ });
      });
      void inspect();
    })
    .catch(() => {
      if (!navigator.serviceWorker.controller)
        status.textContent = "Offline saving is unavailable. Keep this tab open.";
    });
}
