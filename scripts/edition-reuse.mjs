import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium, firefox } from "playwright";

const previous = resolve(process.argv[2]);
const current = resolve(process.argv[3] ?? "dist");
const output = resolve(process.argv[4] ?? "/tmp/claude-1000/embater-audit/reuse");
await mkdir(output, { recursive: true });
async function inventory(root, dir = "") {
  const result = {};
  for (const file of await readdir(resolve(root, dir), { withFileTypes: true })) {
    const name = dir ? `${dir}/${file.name}` : file.name;
    if (file.isDirectory()) Object.assign(result, await inventory(root, name));
    else {
      const bytes = await readFile(resolve(root, name));
      result[name] = {
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }
  }
  return result;
}
const oldFiles = await inventory(previous),
  newFiles = await inventory(current);
const changedScript = Object.keys(newFiles).find(
  (name) => name.startsWith("assets/index-") && name.endsWith(".js") && !oldFiles[name],
);
assert(changedScript, "Supply a distinct previous build");
const edition = (await readFile(resolve(current, "sw.js"), "utf8")).match(
  /const EDITION = "([a-f0-9]+)"/,
)[1];
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".txt": "text/plain",
};
const rows = [];
for (const [engine, driver] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  let phase = "old";
  const requests = [];
  const server = createServer(async (req, res) => {
    const path =
      new URL(req.url, "http://local").pathname.replace(/^\/embater\//, "") || "index.html";
    if (path.includes("..")) {
      res.writeHead(400).end();
      return;
    }
    if (phase !== "old" && path.includes("/sources/")) throw new Error("Unexpected absolute path");
    if (
      phase !== "old" &&
      path.startsWith("sources/") &&
      path.endsWith(".jpg") &&
      !["sources/vocabulary/p71.jpg", "sources/vocabulary/p74.jpg"].includes(path)
    ) {
      requests.push({ phase, path, status: 503, bytes: 0 });
      res.writeHead(503).end("Unchanged source should be verified and reused");
      return;
    }
    if (phase === "fail" && path === changedScript) {
      requests.push({ phase, path, status: 503, bytes: 0 });
      res.writeHead(503).end("Injected new-script failure");
      return;
    }
    try {
      const bytes = await readFile(resolve(phase === "old" ? previous : current, path));
      requests.push({ phase, path, status: 200, bytes: bytes.length });
      res.writeHead(200, {
        "Content-Type": mime[extname(path)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "Content-Length": bytes.length,
      });
      res.end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${server.address().port}/embater/`;
  const browser = await driver.launch();
  try {
    const context = await browser.newContext();
    const first = await context.newPage();
    const second = await context.newPage();
    await first.goto(`${base}#order=ionic&part=oculus`);
    await first
      .locator("#offline-status")
      .filter({ hasText: "Ready offline:" })
      .waitFor({ timeout: 60000 });
    await second.goto(`${base}#order=doric&part=triglyph`);
    await second.locator("#offline-status").filter({ hasText: "Ready offline:" }).waitFor();
    const priorCache = await first.evaluate(async () =>
      (await caches.keys()).find((name) => name.startsWith("embater-")),
    );
    await first.evaluate(async (name) => {
      const cache = await caches.open(name);
      await cache.delete("/embater/sources/vocabulary/p71.jpg");
      await cache.put(
        "/embater/sources/vocabulary/p74.jpg",
        new Response("damaged prior scan", { headers: { "Content-Type": "image/jpeg" } }),
      );
    }, priorCache);
    phase = "fail";
    const failure = await first.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const found = new Promise((resolve) =>
        registration.addEventListener("updatefound", () => resolve(registration.installing), {
          once: true,
        }),
      );
      await registration.update();
      const candidate = registration.installing ?? (await found);
      if (candidate.state !== "redundant")
        await new Promise((resolve) =>
          candidate.addEventListener("statechange", () => {
            if (candidate.state === "redundant") resolve();
          }),
        );
      return candidate.state;
    });
    assert.equal(failure, "redundant");
    assert((await first.evaluate(() => navigator.serviceWorker.controller.state)) === "activated");
    const keysDuring = await first.evaluate(() => caches.keys());
    assert(keysDuring.includes(priorCache));
    const firstUrl = first.url(),
      secondUrl = second.url();
    phase = "new";
    await first.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
    });
    await first
      .locator("#offline-status")
      .filter({ hasText: "page and its saved edition differ" })
      .waitFor({ timeout: 60000 });
    await second
      .locator("#offline-status")
      .filter({ hasText: "page and its saved edition differ" })
      .waitFor();
    assert.equal(first.url(), firstUrl);
    assert.equal(second.url(), secondUrl);
    const installed = await context.newPage();
    await installed.goto(`${base}#order=ionic&view=roof`);
    await installed.locator("#offline-status").filter({ hasText: "Ready offline:" }).waitFor();
    const cacheKey = `embater-${edition}`;
    const cached = await installed.evaluate(async (key) => {
      const cache = await caches.open(key);
      const entries = await cache.keys();
      const files = {};
      for (const request of entries) {
        const response = await cache.match(request);
        const bytes = await response.arrayBuffer();
        const sha256 = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join("");
        files[new URL(request.url).pathname.replace(/^\/embater\//, "")] = {
          bytes: bytes.byteLength,
          sha256,
        };
      }
      return { keys: await caches.keys(), files };
    }, cacheKey);
    assert.deepEqual(cached.keys, [cacheKey]);
    const expected = { ...newFiles };
    delete expected["sw.js"];
    assert.deepEqual(cached.files, expected);
    assert.equal(
      requests.filter(
        (r) =>
          r.phase !== "old" &&
          r.path.startsWith("sources/") &&
          r.path.endsWith(".jpg") &&
          r.status !== 200,
      ).length,
      0,
    );
    for (const path of ["sources/vocabulary/p71.jpg", "sources/vocabulary/p74.jpg"])
      assert(requests.some((r) => r.phase === "new" && r.path === path && r.status === 200));
    // A complete current cache can later be damaged or partially evicted.
    phase = "repair";
    await installed.evaluate(async (key) => {
      const cache = await caches.open(key);
      await cache.delete("/embater/sources/vocabulary/p74.jpg");
      await cache.put(
        "/embater/sources/vocabulary/p71.jpg",
        new Response("damaged current scan", { headers: { "Content-Type": "image/jpeg" } }),
      );
    }, cacheKey);
    await installed.goto(`${base}#order=ionic&view=detail&part=oculus`);
    await installed.locator('#card [data-source-rule="ionic-capital"]').first().click();
    await installed
      .locator("#drill-source-status")
      .filter({ hasText: "differs from the reviewed edition" })
      .waitFor();
    await installed
      .locator("#offline-status")
      .filter({ hasText: "1 damaged, 1 missing" })
      .waitFor();
    assert.equal(await installed.locator("#drill-source-image").isVisible(), false);
    await installed.locator("#offline-repair").click();
    await installed
      .locator("#offline-status")
      .filter({ hasText: "Ready offline:" })
      .waitFor({ timeout: 60000 });
    await installed.locator("#drill-source-retry").click();
    await installed
      .locator("#drill-source-status")
      .filter({ hasText: "Complete printed page 71." })
      .waitFor();
    await installed.goto(`${base}#order=ionic&view=roof`);
    await context.setOffline(true);
    await installed.reload();
    await installed.locator("#roof-reading [data-source-rule]").click();
    await installed
      .locator("#drill-source-status")
      .filter({ hasText: "Complete printed page 74." })
      .waitFor();
    const count = Object.keys(expected).filter(
      (path) => path.startsWith("sources/") && path.endsWith(".jpg"),
    ).length;
    const fetched = new Set(
      requests
        .filter(
          (r) => r.phase !== "old" && r.path.startsWith("sources/") && r.path.endsWith(".jpg"),
        )
        .map((r) => r.path),
    );
    const networkBytes = requests
      .filter((r) => ["new", "fail"].includes(r.phase) && r.status === 200 && r.path !== "sw.js")
      .reduce((sum, r) => sum + r.bytes, 0);
    const totalBytes = Object.values(expected).reduce((sum, f) => sum + f.bytes, 0);
    rows.push({
      engine,
      browser: browser.version(),
      previousFailureKeptActiveWorker: true,
      oldTabsKeepStateAndReportMismatch: true,
      missingAndDamagedPagesRefetched: true,
      sourceImages: count,
      sourceImagesFetched: fetched.size,
      verifiedImagesReused: count - fetched.size,
      networkBytes,
      newEditionBytes: totalBytes,
      fullCacheHashesMatch: true,
      currentCacheEvictionAndCorruptionDetected: true,
      explicitRepairRestoresReadiness: true,
      offlineSourceRecovered: true,
      requests,
    });
    await context.close();
    console.log(
      `${engine}: failed update preserves the old edition; ${count - fetched.size}/${count} source images reused by hash, two missing/damaged scans refetched, old tabs kept, complete new cache verified offline`,
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
}
await writeFile(resolve(output, "review.json"), `${JSON.stringify({ edition, rows }, null, 2)}\n`);
