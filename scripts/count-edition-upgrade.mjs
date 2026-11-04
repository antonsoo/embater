import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium, firefox } from "playwright";

const previous = resolve(process.argv[2]);
const current = resolve(process.argv[3] ?? "dist");
const output = resolve(process.argv[4] ?? "/tmp/embater-edition-upgrade");
await mkdir(output, { recursive: true });
const edition = (await readFile(resolve(current, "sw.js"), "utf8")).match(
  /const EDITION = "([a-f0-9]+)"/,
)[1];
let root = previous;
const types = {
  ".js": "application/javascript",
  ".html": "text/html",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  const path =
    new URL(req.url, "http://local").pathname.replace(/^\/embater\//, "") || "index.html";
  if (path.includes("..")) return res.writeHead(400).end();
  try {
    const body = await readFile(resolve(root, path));
    res
      .writeHead(200, {
        "Content-Type": types[extname(path)] ?? "text/plain",
        "Cache-Control": "no-store",
      })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const rows = [];
try {
  for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
    root = previous;
    const browser = await launcher.launch();
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      const url = `http://127.0.0.1:${server.address().port}/embater/compare.html`;
      await page.goto(url);
      await page
        .locator("#offline-status")
        .filter({ hasText: /^Ready offline/ })
        .waitFor({ timeout: 60000 });
      const old = await page.evaluate(async () =>
        (await caches.keys()).filter((k) => k.startsWith("embater-")),
      );
      assert.equal(old.length, 1);
      assert(!old[0].endsWith(edition));
      const second = await context.newPage();
      await second.goto(url);
      await second
        .locator("#offline-status")
        .filter({ hasText: /^Ready offline/ })
        .waitFor();
      root = current;
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
      const deadline = Date.now() + 60000;
      for (;;) {
        const ready = await page.evaluate(async (edition) => {
          const keys = (await caches.keys()).filter((k) => k.startsWith("embater-"));
          return (
            keys.length === 1 &&
            keys[0] === `embater-${edition}` &&
            !!navigator.serviceWorker.controller
          );
        }, edition);
        if (ready) break;
        assert(Date.now() < deadline, "The new edition did not take control");
        await page.waitForTimeout(100);
      }
      // Both old documents must stop claiming that their retired edition is ready.
      for (const p of [page, second]) {
        await p
          .locator("#offline-status")
          .filter({ hasText: /reload|updated|different|newer/i })
          .waitFor({ timeout: 30000 });
        assert(!(await p.locator("#offline-status").textContent()).startsWith("Ready offline"));
      }
      await page.reload();
      await page
        .locator("#offline-status")
        .filter({ hasText: /^Ready offline/ })
        .waitFor({ timeout: 60000 });
      await page.locator("#measure-hold").click();
      await page.locator("#measure-halved").click();
      assert.match(
        await page.locator("#measure-reference-result").textContent(),
        /Column count unchanged/,
      );
      await context.setOffline(true);
      await page.reload();
      await page
        .locator("#offline-status")
        .filter({ hasText: /^Ready offline/ })
        .waitFor();
      assert.match(
        await page.locator("#measure-reference-result").textContent(),
        /Column count unchanged/,
      );
      rows.push({
        engine,
        previous: old[0],
        current: edition,
        retiredTabsWithheldReadiness: true,
        newEditionControlledOffline: true,
      });
    } finally {
      await browser.close();
    }
  }
  await writeFile(resolve(output, "upgrade.json"), `${JSON.stringify(rows, null, 2)}\n`);
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
