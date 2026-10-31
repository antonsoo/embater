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
await writeFile(output, JSON.stringify({ newEdition, rows }, null, 2) + "\n");
console.log(rows);
