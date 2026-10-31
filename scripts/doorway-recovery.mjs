import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4492/embater/";
const output = resolve(process.argv[3] ?? "docs/doorway-review/recovery.json");
const source = JSON.parse(await readFile("public/sources/doorways/manifest.json", "utf8"));
const hash = (b) => createHash("sha256").update(b).digest("hex");
let networkMode = "normal";
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};
const server = createServer(async (req, res) => {
  const path =
    new URL(req.url, "http://localhost").pathname.replace(/^\/embater\//, "") || "index.html";
  if (path.includes("..")) {
    res.writeHead(400).end();
    return;
  }
  if (path === "sources/doorways/krohn-88.jpg" && networkMode !== "normal") {
    if (networkMode === "wrong")
      res
        .writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "no-store" })
        .end("wrong network bytes");
    else res.writeHead(503, { "Cache-Control": "no-store" }).end("Unavailable");
    return;
  }
  try {
    const bytes = await readFile(resolve("dist", path));
    res
      .writeHead(200, {
        "Content-Type": types[extname(path)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      })
      .end(bytes);
  } catch {
    res.writeHead(404).end("Missing");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const cacheBase = `http://127.0.0.1:${server.address().port}/embater/`;
const results = [];
async function wait(page, id, pattern) {
  try {
    await page.locator(id).filter({ hasText: pattern }).waitFor({ timeout: 18000 });
  } catch (e) {
    console.error(
      JSON.stringify(
        await page.evaluate(() => ({
          source: document.querySelector("#door-source-status")?.textContent,
          offline: document.querySelector("#offline-status")?.textContent,
          controller: navigator.serviceWorker.controller?.scriptURL,
        })),
      ),
    );
    throw e;
  }
}
async function cacheBytes(page, path) {
  return page.evaluate(async (path) => {
    const key = (await caches.keys()).find((k) => k.startsWith("embater-"));
    const r = await (await caches.open(key)).match(path);
    if (!r) return null;
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", await r.arrayBuffer())),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
  }, path);
}
try {
  for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
    const browser = await launcher.launch();
    try {
      console.log(engine, "cache recovery");
      const c = await browser.newContext();
      const a = await c.newPage();
      const b = await c.newPage();
      await a.goto(`${cacheBase}doorways.html`);
      await wait(a, "#offline-status", "Ready offline");
      await wait(a, "#door-source-status", "Complete printed page 88.");
      await b.goto(`${cacheBase}plans.html`);
      await wait(b, "#offline-status", "Ready offline");
      const path = new URL(source.plates[0].path, cacheBase).pathname;
      await a.evaluate(async (path) => {
        const key = (await caches.keys()).find((k) => k.startsWith("embater-"));
        await (await caches.open(key)).put(
          path,
          new Response("corrupted source", { headers: { "Content-Type": "image/jpeg" } }),
        );
      }, path);
      await a.locator("#door-save-reading").click();
      await wait(a, "#door-save-status", "differs from the reviewed edition");
      await wait(a, "#offline-status", "Offline copy needs repair");
      await wait(b, "#offline-status", "Offline copy needs repair");
      await a.locator("#door-source-page").selectOption("89");
      await wait(a, "#door-source-status", "Complete printed page 89.");
      await a.locator("#door-source-page").selectOption("88");
      await wait(a, "#door-source-status", "differs from the reviewed edition");
      assert.equal(await a.locator("#door-source-image").isHidden(), true);
      // A false network replacement must fail SRI and leave the existing cache untouched.
      const before = await cacheBytes(a, path);
      networkMode = "wrong";
      await a.locator("#door-source-retry").click();
      await wait(a, "#door-source-status", "differs from the reviewed edition");
      assert.equal(await cacheBytes(a, path), before);
      networkMode = "normal";
      await a.locator("#door-source-retry").click();
      await wait(a, "#door-source-status", "Complete printed page 88.");
      await wait(a, "#offline-status", "Ready offline");
      await wait(b, "#offline-status", "Ready offline");
      assert.equal(await cacheBytes(a, path), source.plates[0].sha256);
      // Missing entries become a failed source check offline and can be repaired online.
      await a.evaluate(async (path) => {
        const key = (await caches.keys()).find((k) => k.startsWith("embater-"));
        await (await caches.open(key)).delete(path);
      }, path);
      networkMode = "unavailable";
      await c.setOffline(true);
      await a.locator("#door-source-page").selectOption("89");
      await wait(a, "#door-source-status", "Complete printed page 89.");
      await a.locator("#door-source-page").selectOption("88");
      await wait(a, "#door-source-status", /could not be loaded|Failed|NetworkError|fetch/);
      await wait(b, "#offline-status", "Offline copy needs repair");
      await c.setOffline(false);
      networkMode = "normal";
      await a.locator("#door-source-retry").click();
      await wait(a, "#door-source-status", "Complete printed page 88.");
      await wait(b, "#offline-status", "Ready offline");
      assert.equal(await cacheBytes(a, path), source.plates[0].sha256);
      // A new tab must audit actual cached bytes, even if it missed every earlier status event.
      const damagedPaths = await a.evaluate(async () => {
        const key = (await caches.keys()).find((k) => k.startsWith("embater-")),
          cache = await caches.open(key);
        const keys = await cache.keys();
        const font = keys.find((r) => r.url.endsWith(".woff2")).url;
        const license = keys.find((r) => r.url.endsWith("/FONT-LICENSE.txt")).url;
        for (const path of [font, license]) await cache.put(path, new Response("corrupted bytes"));
        const source = new URL("sources/doorways/krohn-88.jpg", location.href).href;
        await cache.delete(source);
        return { font, license, source };
      });
      const later = await c.newPage();
      await later.addInitScript(() => {
        window.BroadcastChannel = undefined;
      });
      await later.goto(cacheBase);
      await wait(later, "#offline-status", "2 damaged, 1 missing");
      await wait(b, "#offline-status", "2 damaged, 1 missing");
      networkMode = "wrong";
      await later.locator("#offline-repair").click();
      await wait(later, "#offline-status", "0 damaged, 1 missing");
      assert.equal(await later.locator("#offline-repair").isEnabled(), true);
      assert.equal(
        await cacheBytes(a, damagedPaths.source),
        null,
        "wrong network bytes were not saved",
      );
      networkMode = "normal";
      await later.locator("#offline-repair").click();
      await wait(later, "#offline-status", "Ready offline");
      await wait(a, "#offline-status", "Ready offline");
      await wait(b, "#offline-status", "Ready offline");
      assert.equal(await cacheBytes(a, damagedPaths.source), source.plates[0].sha256);
      const workerState = () =>
        a.evaluate(async () => {
          const channel = new MessageChannel();
          const result = new Promise(
            (r) =>
              (channel.port1.onmessage = (e) => {
                channel.port1.close();
                r(e.data);
              }),
          );
          navigator.serviceWorker.controller.postMessage({ type: "INSPECT_EDITION" }, [
            channel.port2,
          ]);
          return result;
        });
      const initialWorker = await workerState();
      let workerRestart = "not exercised in this browser";
      if (engine === "chromium") {
        for (let i = 0; i < 6; i++) await workerState();
        const devtools = await c.newCDPSession(a);
        await devtools.send("ServiceWorker.enable");
        await devtools.send("ServiceWorker.stopAllWorkers");
        const restarted = await workerState();
        assert.notEqual(restarted.instance, initialWorker.instance);
        await a.evaluate(async (path) => {
          const key = (await caches.keys()).find((k) => k.startsWith("embater-"));
          await (await caches.open(key)).put(path, new Response("bad font after worker restart"));
          window.dispatchEvent(new Event("online"));
        }, damagedPaths.font);
        await wait(a, "#offline-status", "1 damaged, 0 missing");
        await a.locator("#offline-repair").click();
        await wait(a, "#offline-status", "Ready offline");
        workerRestart = true;
        await devtools.detach();
      }
      await c.setOffline(true);
      await later.reload();
      await wait(later, "#offline-status", "Ready offline");
      await c.setOffline(false);
      await c.close();

      // Requests without a worker let us hold and corrupt responses deterministically.
      console.log(engine, "request races");
      const f = await browser.newContext({ serviceWorkers: "block" });
      const p = await f.newPage();
      await p.goto(`${base}doorways.html`);
      await wait(p, "#door-source-status", "Complete printed page 88.");
      let release;
      const gate = new Promise((r) => {
        release = r;
      });
      let held = 0;
      await f.route("**/sources/doorways/krohn-88.jpg", async (route) => {
        held++;
        await gate;
        try {
          await route.continue();
        } catch {}
      });
      await p.locator("#door-source-retry").click();
      await p.waitForFunction(() =>
        document.querySelector("#door-source-status").textContent.startsWith("Loading"),
      );
      await p.locator("#door-source-page").selectOption("89");
      await wait(p, "#door-source-status", "Complete printed page 89.");
      release();
      await p.locator("#door-match").click();
      assert.equal(
        await p.locator("#door-source-image").getAttribute("alt"),
        "Complete printed page 89 of Krohn’s 1912 Vitruvius, including the critical apparatus",
      );
      await f.unroute("**/sources/doorways/krohn-88.jpg");
      // A pending save is cancellable; cancelling does not rewrite model choices.
      let releaseSave;
      const saveGate = new Promise((r) => {
        releaseSave = r;
      });
      await f.route("**/sources/doorways/krohn-88.jpg", async (route) => {
        await saveGate;
        try {
          await route.continue();
        } catch {}
      });
      await p.locator("#door-save-reading").click();
      await wait(p, "#door-save-status", "Preparing");
      await p.locator("#door-cancel").click();
      await wait(p, "#door-save-status", "Save cancelled");
      releaseSave();
      assert.equal(await p.locator("#door-save-reading").isEnabled(), true);
      await f.unroute("**/sources/doorways/krohn-88.jpg");
      // A captured drawing remains stable while newer choices are made.
      let releaseSnapshot;
      const snapshotGate = new Promise((r) => {
        releaseSnapshot = r;
      });
      await f.route("**/sources/doorways/krohn-88.jpg", async (route) => {
        await snapshotGate;
        await route.continue();
      });
      await p.locator('input[name="kind"][value="ionic"]').check();
      const pending = p.waitForEvent("download");
      await p.locator("#door-save-reading").click();
      await wait(p, "#door-save-status", "Preparing");
      await p.locator('input[name="kind"][value="doric"]').check();
      await p.locator('input[name="measure-rule"][value="square"]').check();
      releaseSnapshot();
      const d = await pending;
      const file = `/tmp/claude-1000/embater-doors/${engine}-snapshot.html`;
      await d.saveAs(file);
      await wait(p, "#door-save-status", "newer drawing");
      const html = await readFile(file, "utf8");
      const native = html.match(
        /download="doorway.json" href="data:application\/json;base64,([^"]+)"/,
      );
      assert.ok(native);
      assert.equal(JSON.parse(Buffer.from(native[1], "base64")).choices.kind, "ionic");
      assert.equal(JSON.parse(Buffer.from(native[1], "base64")).choices.comparison.rule, "ionic");
      assert.equal(await p.locator('input[name="kind"][value="doric"]').isChecked(), true);
      await f.unroute("**/sources/doorways/krohn-88.jpg");
      await f.route("**/sources/doorways/krohn-89.jpg", (route) =>
        route.fulfill({ status: 200, contentType: "image/jpeg", body: "not the source" }),
      );
      await p.locator("#door-save-reading").click();
      await wait(p, "#door-save-status", "differs from the reviewed edition");
      assert.equal(await p.locator("#door-save-reading").isEnabled(), true);
      await f.unroute("**/sources/doorways/krohn-89.jpg");
      await p.locator("#door-save-reading").click();
      await wait(p, "#door-save-status", "Illustrated reading saved.");
      // A slow file read must not overwrite a choice made after Open drawing.
      await p.locator('input[name="kind"][value="ionic"]').check();
      await p.evaluate(() => {
        const original = File.prototype.text;
        File.prototype.text = function () {
          return new Promise((resolve) => {
            window.releaseDoorFile = () => resolve(original.call(this));
          });
        };
      });
      await p.locator("#door-open").setInputFiles({
        name: "slow.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            format: "embater-doorway",
            version: 1,
            choices: { ceiling: 28, kind: "ionic", reading: "supplied", trial: 0 },
          }),
        ),
      });
      await p.locator('input[name="kind"][value="doric"]').check();
      await p.evaluate(() => window.releaseDoorFile());
      await wait(p, "#door-save-status", "drawing changed while the file opened");
      assert.equal(await p.locator('input[name="kind"][value="doric"]').isChecked(), true);
      // Advance only the page clock to exercise the real save deadline without waiting.
      await p.clock.install();
      let releaseTimeout;
      const deadlineGate = new Promise((r) => {
        releaseTimeout = r;
      });
      await f.route("**/sources/doorways/krohn-88.jpg", async (route) => {
        await deadlineGate;
        try {
          await route.continue();
        } catch {}
      });
      await p.locator("#door-save-reading").click();
      await wait(p, "#door-save-status", "Preparing");
      await p.clock.fastForward(25001);
      await wait(p, "#door-save-status", "Saving took too long");
      releaseTimeout();
      assert.equal(await p.locator("#door-save-reading").isEnabled(), true);
      await f.close();
      results.push({
        engine,
        tabs: 3,
        newTabByteAudit: true,
        broadcastChannelUnavailable: true,
        genericFontAndLicenseRepair: true,
        falseRepairRejected: true,
        repairedOfflineReload: true,
        workerRestart,
        corruptionDetected: true,
        statusPropagated: true,
        unverifiedNetworkRejected: true,
        cacheRepaired: true,
        evictionRecovered: true,
        staleSourceRejected: held > 0,
        cancelledSave: true,
        snapshotPreserved: true,
        failedSaveRetried: true,
        lateFilePreserved: true,
        deadlineRecovered: true,
        sourceHash: source.plates[0].sha256,
        snapshotHash: hash(Buffer.from(html)),
      });
    } finally {
      await browser.close();
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, `${JSON.stringify({ base, results }, null, 2)}\n`);
console.log(JSON.stringify(results));
