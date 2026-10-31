import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve } from "node:path";
import { chromium, firefox } from "playwright";

const [oldDirectory, newDirectory, output] = process.argv.slice(2);
assert(oldDirectory && newDirectory && output, "Supply old build, new build and receipt path");
let directory = resolve(oldDirectory);
const newEdition = /const EDITION = "([a-f0-9]+)"/.exec(
  await readFile(resolve(newDirectory, "sw.js"), "utf8"),
)[1];
// This installed Playwright treats an async waitForFunction predicate as a
// truthy Promise, even when it resolves false. Await page.evaluate in the host.
async function poll(page, predicate, argument) {
  const deadline = Date.now() + 15000;
  while (!(await page.evaluate(predicate, argument))) {
    assert(Date.now() < deadline, "The edition handover did not settle in 15 seconds");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
const types = {
  ".js": "application/javascript",
  ".html": "text/html",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
const server = createServer(async (req, res) => {
  const path =
    new URL(req.url, "http://localhost").pathname.replace(/^\/embater\//, "") || "index.html";
  try {
    const bytes = await readFile(resolve(directory, path));
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
const base = `http://127.0.0.1:${server.address().port}/embater/`,
  rows = [];
try {
  for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
    directory = resolve(oldDirectory);
    const browser = await launcher.launch();
    try {
      const context = await browser.newContext(),
        page = await context.newPage();
      await page.goto(`${base}plans.html#type=dipteral&clear=2&flank=15`);
      await page.locator("#offline-status").filter({ hasText: "Ready offline" }).waitFor();
      assert.match(await page.locator("#plan-measure").textContent(), /34 on the inner ring/);
      const oldKeys = await page.evaluate(() => caches.keys());
      assert.equal(oldKeys.length, 1);
      directory = resolve(newDirectory);
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg.update();
      });
      await page.locator("#offline-status").filter({ hasText: "not fully saved" }).waitFor();
      // A worker update does not erase the learner's current drawing.
      assert.match(await page.locator("#plan-measure").textContent(), /34 on the inner ring/);
      await poll(
        page,
        async (expected) => {
          const worker = navigator.serviceWorker.controller;
          const reg = await navigator.serviceWorker.getRegistration();
          if (!worker || reg?.active?.state !== "activated") return false;
          const channel = new MessageChannel();
          const data = await new Promise((resolve) => {
            const timer = setTimeout(() => {
              channel.port1.close();
              resolve(null);
            }, 1000);
            channel.port1.onmessage = (event) => {
              clearTimeout(timer);
              channel.port1.close();
              resolve(event.data);
            };
            worker.postMessage({ type: "INSPECT_EDITION" }, [channel.port2]);
          });
          return (
            data?.edition === expected &&
            data.complete &&
            navigator.serviceWorker.controller === worker
          );
        },
        newEdition,
      );
      const retirementStarted = Date.now();
      await poll(
        page,
        async (expected) => {
          const keys = await caches.keys();
          const current = keys.length === 1 && keys[0] === `embater-${expected}`;
          window.upgradeCacheMatches = current ? (window.upgradeCacheMatches ?? 0) + 1 : 0;
          return window.upgradeCacheMatches >= 3;
        },
        newEdition,
      );
      const retirementMs = Date.now() - retirementStarted;
      const newKeys = await page.evaluate(() => caches.keys());
      assert.deepEqual(newKeys, [`embater-${newEdition}`]);
      await page.reload();
      await page.locator("#offline-status").filter({ hasText: "Ready offline" }).waitFor();
      assert.match(await page.locator("#plan-measure").textContent(), /34 on the inner ring/);
      await context.setOffline(true);
      await page.getByRole("link", { name: "Doorways", exact: true }).click();
      await page.locator("#measure-source-page").selectOption("99");
      await page
        .locator("#measure-source-status")
        .filter({ hasText: "Complete printed page 99." })
        .waitFor();
      await page.locator('input[name="measure-rule"][value="square"]').check();
      assert.match(await page.locator("#measure-result").textContent(), /14 mm wider/);
      rows.push({
        engine,
        oldCaches: oldKeys,
        newCaches: newKeys,
        retirementMs,
        oldPageInvalidated: true,
        drawingPreserved: true,
        reloadedEdition: newEdition,
        coldOfflineSurvey: true,
      });
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
await mkdir(dirname(resolve(output)), { recursive: true });
await writeFile(output, `${JSON.stringify({ newEdition, rows }, null, 2)}\n`);
console.log(rows);
