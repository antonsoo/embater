/* Build constants are prepended by offline-build.ts. */
const instance = crypto.randomUUID();
let revision = 0;
let sequence = 0;
let inspection;
let repairing;
let previousStatus = "";

async function pool(items, action, concurrency = 3) {
  let cursor = 0;
  const results = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await action(items[index]);
      }
    }),
  );
  return results;
}

async function reviewedResponse(path, response) {
  if (!response?.ok) return false;
  try {
    const bytes = await response.clone().arrayBuffer();
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return `sha256-${btoa(String.fromCharCode(...digest))}` === INTEGRITY[path];
  } catch {
    return false;
  }
}

async function installEdition() {
  const target = await caches.open(CACHE);
  const names = (await caches.keys()).filter((name) => name.startsWith(PREFIX) && name !== CACHE);
  const sources = [target, ...(await Promise.all(names.map((name) => caches.open(name))))];
  await pool(
    FILES,
    async (path) => {
      const request = new Request(path, { cache: "reload", integrity: INTEGRITY[path] });
      // Interrupted installs and preceding editions can supply identical retained
      // pages. A matching URL is not proof: check the new build's byte identity.
      for (const source of sources) {
        const saved = await source.match(path);
        if (await reviewedResponse(path, saved)) {
          if (source !== target) await target.put(request, saved);
          return;
        }
      }
      await fetchAndSave(path);
    },
    1,
  );
}

async function state() {
  if (inspection?.revision === revision) return inspection.promise;
  const snapshot = revision;
  const job = { revision: snapshot };
  job.promise = (async () => {
    const cache = await caches.open(CACHE);
    const failures = await pool(FILES, async (path) => {
      const response = await cache.match(path);
      if (!response?.ok) return { path, reason: "missing" };
      try {
        const bytes = await response.arrayBuffer();
        const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
        const actual = `sha256-${btoa(String.fromCharCode(...digest))}`;
        return actual === INTEGRITY[path] ? null : { path, reason: "damaged" };
      } catch {
        return { path, reason: "damaged" };
      }
    });
    if (snapshot !== revision) return state();
    return {
      edition: EDITION,
      instance,
      sequence: ++sequence,
      complete: failures.every((failure) => failure === null),
      failures: failures.filter(Boolean),
      checked: FILES.length,
      repairing: !!repairing,
    };
  })().finally(() => {
    if (inspection === job) inspection = null;
  });
  inspection = job;
  return job.promise;
}

async function publish(result) {
  // Clients render this result; they do not respond with another inspection.
  const signature = JSON.stringify([result.complete, result.failures, result.repairing]);
  if (signature === previousStatus) return;
  previousStatus = signature;
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    if (new URL(client.url).pathname.startsWith(BASE))
      client.postMessage({ type: "EDITION_STATE", ...result });
  }
}

async function inspect() {
  const result = await state();
  await publish(result);
  return result;
}

function bufferedResponse(bytes, original) {
  // Fetch exposes decoded bytes; the buffered response must describe that body,
  // including when the origin used gzip or chunked transfer encoding.
  const headers = new Headers(original.headers);
  headers.delete("Content-Encoding");
  headers.delete("Transfer-Encoding");
  headers.set("Content-Length", String(bytes.byteLength));
  return new Response(bytes, { status: original.status, statusText: original.statusText, headers });
}

async function fetchAndSave(path, parentSignal) {
  const { bytes, response } = await transferBytes(path, parentSignal, true);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  if (`sha256-${btoa(String.fromCharCode(...digest))}` !== INTEGRITY[path])
    throw new Error("The file differs from the retained edition.");
  parentSignal?.throwIfAborted();
  const reviewed = bufferedResponse(bytes, response);
  // Only complete, independently verified bytes may replace a saved file.
  await (await caches.open(CACHE)).put(path, reviewed.clone());
  ++revision;
  return reviewed;
}

function repair() {
  if (repairing) return repairing;
  ++revision;
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), TRANSFER_POLICY.totalMs);
  const job = (async () => {
    const before = await inspect();
    await pool(before.failures, async ({ path }) => {
      if (controller.signal.aborted) return;
      try {
        await fetchAndSave(path, controller.signal);
      } catch {
        // A failed replacement leaves existing bytes unchanged; the final audit decides readiness.
      }
    });
  })().finally(async () => {
    clearTimeout(deadline);
    repairing = null;
    ++revision;
    await inspect();
  });
  repairing = job;
  return job;
}

self.addEventListener("install", (event) => {
  // One background transfer leaves foreground source reading usable on a
  // shared narrow link. Activation still requires the complete edition.
  event.waitUntil(installEdition().then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "VERIFIED_ASSET" && event.ports[0]) {
    const port = event.ports[0];
    event.waitUntil(
      (async () => {
        const url = new URL(event.data.url);
        const client = event.source?.url ? new URL(event.source.url) : null;
        const bytes = event.data.bytes;
        if (
          event.data.edition !== EDITION ||
          !client ||
          client.origin !== self.location.origin ||
          !client.pathname.startsWith(BASE) ||
          url.origin !== self.location.origin ||
          !FILES.includes(url.pathname) ||
          !/\.(jpg|woff2|txt)$/.test(url.pathname) ||
          !(bytes instanceof ArrayBuffer) ||
          bytes.byteLength > TRANSFER_POLICY.maxBytes
        )
          throw new Error("Unrecognized source replacement");
        const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
        if (`sha256-${btoa(String.fromCharCode(...hash))}` !== INTEGRITY[url.pathname])
          throw new Error("Replacement bytes differ");
        const type = url.pathname.endsWith(".jpg")
          ? "image/jpeg"
          : url.pathname.endsWith(".woff2")
            ? "font/woff2"
            : "text/plain;charset=utf-8";
        await (await caches.open(CACHE)).put(
          url.pathname,
          new Response(bytes, {
            headers: { "Content-Type": type, "Content-Length": String(bytes.byteLength) },
          }),
        );
        ++revision;
        await inspect();
        port.postMessage({ stored: true, edition: EDITION });
      })().catch(() => port.postMessage({ stored: false, edition: EDITION })),
    );
    return;
  }
  if (event.data?.type === "CLAIM_EDITION" && event.data.edition === EDITION) {
    // A page opened during activation can miss the first claim snapshot.
    // Repeating the claim is safe; the page's controllerchange runs its byte audit.
    event.waitUntil(self.clients.claim());
    return;
  }
  if (!["INSPECT_EDITION", "REPAIR_EDITION"].includes(event.data?.type) || !event.ports[0]) return;
  event.waitUntil(
    (async () => {
      if (event.data.invalidate) ++revision;
      if (event.data.type === "REPAIR_EDITION" && event.data.edition === EDITION) await repair();
      const result = await inspect();
      event.ports[0].postMessage(result);
    })().catch(() =>
      event.ports[0].postMessage({
        edition: EDITION,
        instance,
        sequence: ++sequence,
        complete: false,
        failures: [],
        repairing: false,
      }),
    ),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  const page = url.pathname === BASE ? `${BASE}index.html` : url.pathname;
  if (!FILES.includes(page)) return;
  if (event.request.mode !== "navigate") {
    if (event.request.cache === "reload") {
      const claimedHash = event.request.headers.get("X-Embater-Asset-Sha256");
      const verifiedClient =
        event.request.destination === "" &&
        /\.(jpg|woff2|txt)$/.test(page) &&
        /^[a-f0-9]{64}$/.test(claimedHash ?? "") &&
        `sha256-${btoa(String.fromCharCode(...claimedHash.match(/../g).map((part) => Number.parseInt(part, 16))))}` ===
          INTEGRITY[page];
      // Designated readers hash the complete bytes before using them. Let their
      // explicit reload go to the network without a worker-owned response stream;
      // they can offer the verified bytes back through VERIFIED_ASSET afterward.
      if (verifiedClient) return;
      event.respondWith(
        (async () => {
          try {
            return await fetchAndSave(page);
          } catch {
            return (await (await caches.open(CACHE)).match(page)) || Response.error();
          } finally {
            ++revision;
            await inspect();
          }
        })(),
      );
      return;
    }
    event.respondWith(
      caches
        .open(CACHE)
        .then((cache) => cache.match(page))
        .then((saved) => saved || fetch(event.request)),
    );
    return;
  }
  event.respondWith(
    (async () => {
      let timer;
      // Buffer the complete HTML: headers can arrive before a stalled body.
      const network = fetch(event.request).then(async (response) => {
        const body = await response.arrayBuffer();
        return bufferedResponse(body, response);
      });
      const outcome = await Promise.race([
        network.then(
          (response) => ({ response }),
          () => ({}),
        ),
        new Promise((resolve) => {
          timer = setTimeout(() => resolve({}), 2000);
        }),
      ]);
      clearTimeout(timer);
      if (outcome.response && outcome.response.status < 500) return outcome.response;
      const saved = await (await caches.open(CACHE)).match(page);
      if (saved) return saved;
      if (outcome.response) return outcome.response;
      return network.catch(() => Response.error());
    })(),
  );
});
