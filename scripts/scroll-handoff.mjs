import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4493/embater/";
const output = resolve(process.argv[3] ?? "/tmp/claude-1000/embater-audit/scroll-handoff");
await mkdir(output, { recursive: true });
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const source = JSON.parse(
  await readFile("public/sources/vocabulary/manifest.json", "utf8"),
).plates.find((p) => p.page === 72);
const later = JSON.parse(await readFile("../gonia/public/sources/volute/manifest.json", "utf8"))
  .pages[2];
const rows = [];
for (const [engine, driver] of Object.entries({ chromium, firefox })) {
  const browser = await driver.launch();
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        acceptDownloads: true,
        reducedMotion: "reduce",
        colorScheme: "light",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${base}#order=ionic&view=detail&part=volute`);
      const note = await page.locator("#card .card-note").textContent();
      assert.match(note, /does not state eight quarter turns/);
      assert.match(note, /modern two-turn schematic/);
      assert.match(await page.locator("#derivation").textContent(), /does not state that total/);
      await page.locator("#card summary").filter({ hasText: "III.5.8" }).click();
      await page.locator('#card [data-source-rule="volute-figure"]').click();
      await page
        .locator("#drill-source-status")
        .filter({ hasText: "Complete printed page 72." })
        .waitFor();
      const sourceHash = await page
        .locator("#drill-source-image")
        .evaluate(async (image) =>
          Array.from(
            new Uint8Array(
              await crypto.subtle.digest("SHA-256", await (await fetch(image.src)).arrayBuffer()),
            ),
            (b) => b.toString(16).padStart(2, "0"),
          ).join(""),
        );
      assert.equal(sourceHash, source.sha256);
      await page.getByRole("button", { name: "Close printed source" }).click();
      const link = page.locator("#card .deeper a");
      assert.equal(await link.getAttribute("href"), "https://antonsoo.github.io/gonia/volute.html");
      await page
        .locator("#card")
        .screenshot({ path: resolve(output, `${engine}-${width}-source-boundary.png`) });
      await link.focus();
      await page.keyboard.press("Enter");
      await page.waitForURL("https://antonsoo.github.io/gonia/volute.html");
      assert.match(await page.locator(".vo-intro").textContent(), /1889 English Vignola/);
      await page.getByText("Other starting sheets", { exact: true }).click();
      await page.locator("#vo-complete").click();
      assert.match(
        await page.locator("#vo-result").textContent(),
        /endpoint is exactly on the eye/,
      );
      await page.locator("#vo-join").selectOption("12");
      const finalJoin = await page.locator("#vo-join-note").textContent();
      assert.match(finalJoin, /8\.13/);
      await page.locator("#vo-join").selectOption("4");
      await page.locator("#vo-repair").click();
      assert.match(await page.locator("#vo-repair-note").textContent(), /difference becomes 0°/);
      const sourceResponse = page.waitForResponse((response) =>
        response.url().endsWith("/sources/volute/vignola-xv.jpg"),
      );
      await page.locator("#vo-page").selectOption("2");
      const laterBytes = await (await sourceResponse).body();
      await page.locator("#vo-source-caption").filter({ hasText: "plate XV. Whole" }).waitFor();
      assert.match(
        await page.locator("#vo-source-frame img").getAttribute("alt"),
        /1889.*plate XV/,
      );
      // Inspect the response used by the reader: its CSP permits displaying blob
      // images but intentionally does not permit fetch(blob:) from page script.
      const laterHash = sha(laterBytes);
      assert.equal(laterHash, later.sha256);
      const waiting = page.waitForEvent("download");
      await page.locator("#vo-save-csv").click();
      const download = await waiting;
      assert.equal(await download.failure(), null);
      const name = `${engine}-${width}-compass.csv`;
      await download.saveAs(resolve(output, name));
      const bytes = await readFile(resolve(output, name));
      assert.match(bytes.toString(), /no ancient measurement/);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      rows.push({
        engine,
        browser: browser.version(),
        width,
        ancientSourceSha256: sourceHash,
        boundary: note,
        handoff: "https://antonsoo.github.io/gonia/volute.html",
        laterPlateSha256: laterHash,
        finalJoin,
        localAlignmentShown: true,
        measurements: name,
        measurementsSha256: sha(bytes),
        errors,
      });
      await writeFile(
        resolve(output, "review.json"),
        `${JSON.stringify({ base, rows }, null, 2)}\n`,
      );
      await context.close();
      console.log(
        `${engine} ${width}: source/model boundary, promised figure, later compass construction, exact contact and non-tangent join, native measurements`,
      );
    }
  } finally {
    await browser.close();
  }
}
