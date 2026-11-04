import { READING_DEADLINE_MS } from "./transfer";

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
  let registering = false;
  let resumePending = false;
  let resumeAttempts = 0;
  let savedCount = 0;
  const watched = new WeakSet<ServiceWorker>();
  async function resumeInstallation(): Promise<void> {
    if (navigator.serviceWorker.controller || resumePending) return;
    resumePending = true;
    let count = 0;
    try {
      const name = `embater-${__OFFLINE_EDITION__}`;
      if (await caches.has(name)) count = (await (await caches.open(name)).keys()).length;
    } catch {
      // Unavailable storage cannot provide evidence of installation progress.
    }
    if (navigator.serviceWorker.controller) {
      resumePending = false;
      return;
    }
    if (navigator.onLine && count > savedCount && resumeAttempts < 8) {
      savedCount = count;
      ++resumeAttempts;
      repair.hidden = true;
      status.textContent =
        "Offline saving paused. Resuming complete saved files; keep this tab online.";
      setTimeout(() => {
        resumePending = false;
        void registerOffline();
      }, 1000);
    } else {
      resumePending = false;
      status.textContent =
        "Offline saving did not finish. Reconnect and retry; complete saved files will be checked and reused.";
      repair.textContent = "Retry offline saving";
      repair.hidden = false;
      repair.disabled = false;
    }
  }
  function watch(worker: ServiceWorker | null): void {
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    worker.addEventListener("statechange", () => {
      if (worker.state === "redundant") void resumeInstallation();
    });
    if (worker.state === "redundant") void resumeInstallation();
  }
  async function registerOffline(): Promise<void> {
    if (registering) return;
    registering = true;
    try {
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw.js`,
      );
      pendingRegistration = registration;
      registration.addEventListener("updatefound", () => watch(registration.installing));
      watch(registration.installing);
      void inspect();
    } catch {
      await resumeInstallation();
    } finally {
      registering = false;
    }
  }
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
    repair.textContent = "Repair offline copy";
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
      repairing ? READING_DEADLINE_MS : 12000,
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
      if (installing && installing.state !== "redundant")
        status.textContent =
          "Offline edition is still saving. Keep this tab online; the workshop remains usable.";
      else if (!resumePending) void resumeInstallation();
    }
  }, 12000);
  status.textContent = "Saving these pages for offline reading…";
  repair.addEventListener("click", () => {
    if (navigator.serviceWorker.controller) void inspect(true);
    else {
      resumeAttempts = 0;
      savedCount = 0;
      repair.hidden = true;
      status.textContent = "Saving these pages for offline reading…";
      void registerOffline();
    }
  });
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
  // A navigation can begin between activation's client snapshot and claim.
  void navigator.serviceWorker.ready.then((ready) => {
    if (!navigator.serviceWorker.controller)
      ready.active?.postMessage({ type: "CLAIM_EDITION", edition: __OFFLINE_EDITION__ });
  });
  void registerOffline();
}
