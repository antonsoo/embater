import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4492/embater/";
const output = resolve(process.argv[3] ?? "docs/doorway-review/local");
const temp = "/tmp/claude-1000/embater-doors/browser";
await mkdir(output, { recursive: true });
await mkdir(temp, { recursive: true });
const hash = (b) => createHash("sha256").update(b).digest("hex");
const source = JSON.parse(await readFile("public/sources/doorways/manifest.json", "utf8"));
const fonts = await Promise.all(
  ["latin", "latin-ext", "greek", "greek-ext"].map(async (p) =>
    hash(await readFile(`src/fonts/eb-garamond-${p}.woff2`)),
  ),
);
const receipts = [];
async function download(page, id, name) {
  const pending = page.waitForEvent("download");
  await page.locator(id).click();
  const d = await pending;
  assert.equal(await d.failure(), null);
  const file = resolve(temp, name);
  await d.saveAs(file);
  return { file, bytes: await readFile(file), suggested: d.suggestedFilename() };
}
async function text(page, id) {
  return page.locator(id).textContent();
}
async function ready(page) {
  await page
    .locator("#door-source-status")
    .filter({ hasText: "Complete printed page 88." })
    .waitFor();
}
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const width of [1440, 375])
      for (const colorScheme of ["light", "dark"]) {
        const id = `${engine}-${width}-${colorScheme}`;
        const context = await browser.newContext({
          viewport: { width, height: 1050 },
          colorScheme,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(base);
        await page.getByRole("link", { name: "Doorways", exact: true }).focus();
        await page.keyboard.press("Enter");
        await ready(page);
        assert.match(await text(page, "#door-result"), /Over 16 through 25/);
        assert.match(await text(page, "#door-other"), /16 ft high; up to 16/);
        const entry = page.url();
        await page.locator('input[value="unsupplied"]').focus();
        await page.keyboard.press("Space");
        assert.match(await text(page, "#door-height-rule"), /= 16 ft opening/);
        await page.locator('input[value="doric"]').check();
        assert.match(await text(page, "#door-jamb-basis"), /drawing choice.*gap/);
        await page.locator("#door-trial").focus();
        await page.keyboard.press("ArrowRight");
        assert.match(await text(page, "#door-inset"), /0.1% of a jamb/);
        await page.locator("#door-match").click();
        assert.match(await text(page, "#door-result"), /matches this reading/);
        let boundaries = 0;
        for (const [h, pattern] of [
          [15.99, /one third/],
          [16, /one third/],
          [16.01, /one quarter/],
          [24.99, /one quarter/],
          [25, /one quarter/],
          [25.01, /one eighth/],
          [29.99, /one eighth/],
          [30, /one eighth/],
          [30.01, /parallel sides/],
        ]) {
          await page.locator(`[data-height="${h}"]`).click();
          assert.match(await text(page, "#door-result"), pattern);
          assert.match(await text(page, "#door-band-result"), new RegExp(`opening ${h} ft`));
          boundaries++;
        }
        assert.equal(page.url(), entry, "working the model does not silently rewrite its URL");
        for (const term of ["opening", "jamb", "lintel", "ceiling", "taper", "doors", "greek"]) {
          await page.locator(`[data-term="${term}"]`).focus();
          await page.keyboard.press("Enter");
          assert.equal(
            await page.locator(`[data-term="${term}"]`).getAttribute("aria-pressed"),
            "true",
          );
          await page.locator("#door-word-source").click();
        }
        await page.locator('input[value="ionic"]').check();
        await page.locator('input[value="supplied"]').check();
        await page.locator("#door-ceiling").fill("28");
        await page.locator("#door-ceiling").press("Tab");
        await page.locator("#door-parallel").click();
        await page.locator('[data-term="opening"]').click();
        const shared = await page.locator("#door-link").inputValue();
        await page.locator("#door-copy").click();
        await page
          .locator("#door-copy-status")
          .filter({ hasText: /copied|copy/ })
          .waitFor();
        const reopened = await context.newPage();
        await reopened.goto(shared);
        await reopened.locator("#door-result").filter({ hasText: "0.3571 ft wider" }).waitFor();
        assert.equal(await reopened.locator("#door-ceiling").inputValue(), "28");
        await reopened.evaluate(() => {
          location.hash = "ceiling=35&kind=doric&reading=unsupplied&trial=rule";
        });
        await reopened
          .locator("#door-height-rule")
          .filter({ hasText: "= 20 ft opening" })
          .waitFor();
        assert.equal(await reopened.locator('input[value="doric"]').isChecked(), true);
        await reopened.goBack();
        await reopened.locator("#door-result").filter({ hasText: "0.3571 ft wider" }).waitFor();
        await reopened.close();
        const json = await download(page, "#door-save-json", `${id}.json`);
        const csv = await download(page, "#door-save-csv", `${id}.csv`);
        const svg = await download(page, "#door-save-svg", `${id}.svg`);
        const html = await download(page, "#door-save-reading", `${id}.html`);
        await page
          .locator("#door-save-status")
          .filter({ hasText: "Illustrated reading saved." })
          .waitFor();
        assert.equal(JSON.parse(json.bytes).choices.ceiling, 28);
        assert.match(svg.bytes.toString(), /shared endpoints assigned to lower band/);
        assert.match(csv.bytes.toString(), /"Opening height","20"/);
        await page.locator('input[value="doric"]').check();
        await page.locator("#door-open").setInputFiles(json.file);
        await page.locator("#door-save-status").filter({ hasText: "Drawing opened." }).waitFor();
        assert.equal(await page.locator('input[value="ionic"]').isChecked(), true);
        await page.locator("#door-open").setInputFiles({
          name: "bad.json",
          mimeType: "application/json",
          buffer: Buffer.from('{"format":"embater-doorway","version":2}'),
        });
        await page.locator("#door-save-status").filter({ hasText: "version 1" }).waitFor();
        assert.equal(await page.locator("#door-ceiling").inputValue(), "28");
        const htmlText = html.bytes.toString();
        assert.ok(!/<script\b/i.test(htmlText));
        const images = [...htmlText.matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g)].map((m) =>
          Buffer.from(m[1], "base64"),
        );
        assert.deepEqual(
          images.map(hash),
          source.plates.map((p) => p.sha256),
        );
        const fontData = [...htmlText.matchAll(/url\(data:font\/woff2;base64,([^)]+)\)/g)].map(
          (m) => Buffer.from(m[1], "base64"),
        );
        assert.deepEqual(fontData.map(hash), fonts);
        for (const license of ["LICENSE.txt", "FONT-LICENSE.txt"]) {
          const expected = (await readFile(`public/${license}`, "utf8"))
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
          assert.ok(htmlText.includes(expected));
        }
        const portableContext = await browser.newContext({
          viewport: { width, height: 1050 },
          javaScriptEnabled: false,
          offline: true,
        });
        const portable = await portableContext.newPage();
        const requests = [];
        portable.on("request", (r) => {
          if (/^https?:/.test(r.url())) requests.push(r.url());
        });
        await portable.goto(pathToFileURL(html.file).href);
        await portable.locator("img").last().waitFor();
        assert.equal(
          await portable
            .locator("img")
            .evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0)),
          true,
        );
        assert.equal(
          await portable.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        const native = await download(portable, 'a[download="doorway.json"]', `${id}-native.json`);
        assert.deepEqual(native.bytes, json.bytes);
        const nativeCsv = await download(portable, 'a[download="doorway.csv"]', `${id}-native.csv`);
        assert.deepEqual(nativeCsv.bytes, csv.bytes);
        const nativeSvg = await download(portable, 'a[download="doorway.svg"]', `${id}-native.svg`);
        assert.deepEqual(nativeSvg.bytes, svg.bytes);
        assert.deepEqual(requests, []);
        if (engine === "chromium" && width === 1440 && colorScheme === "light") {
          await writeFile("examples/doorways/drawing.json", json.bytes);
          await writeFile("examples/doorways/measurements.csv", csv.bytes);
          await writeFile("examples/doorways/drawing.svg", svg.bytes);
          await writeFile("examples/doorways/reading.html.gz", gzipSync(html.bytes));
          await portable.pdf({
            path: "examples/doorways/reading.pdf",
            format: "A4",
            printBackground: true,
          });
        }
        if (width === 375)
          await portable.screenshot({ path: resolve(output, `${id}-portable.png`) });
        await portableContext.close();
        await page.locator("#door-source-page").selectOption("89");
        await page
          .locator("#door-source-status")
          .filter({ hasText: "Complete printed page 89." })
          .waitFor();
        assert.equal(
          await page.locator("#door-source-image").evaluate(async (img) => {
            const bytes = await (await fetch(img.src)).arrayBuffer();
            return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
              b.toString(16).padStart(2, "0"),
            ).join("");
          }),
          source.plates[1].sha256,
        );
        await page.locator("#door-source-zoom").click();
        await page.locator("#door-source-frame").press("ArrowRight");
        assert.ok(
          await page.locator("#door-source-frame").evaluate((e) => e.scrollWidth > e.clientWidth),
        );
        await page
          .locator("#door-source-frame")
          .screenshot({ path: resolve(output, `${id}-source.png`) });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        const axe = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(
          axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
        );
        await page.locator("#door-desk").scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(output, `${id}-desk.png`) });
        assert.deepEqual(errors, []);
        receipts.push({
          engine,
          width,
          colorScheme,
          discovery: "Orders -> Doorways via keyboard",
          boundaries,
          languageNotes: 7,
          editableRoundTrip: true,
          explicitLink: true,
          sourceImageHashes: images.map(hash),
          fontHashes: fontData.map(hash),
          portable: { scripts: 0, networkRequests: requests.length, nativeDownloads: 3 },
          axeViolations: 0,
          pageErrors: errors,
        });
        await context.close();
      }
    // A fresh learner saves the complete edition from Orders; Doorways is opened cold, offline.
    const offline = await browser.newContext();
    const op = await offline.newPage();
    await op.goto(base);
    await op
      .locator("#offline-status")
      .filter({ hasText: "Ready offline" })
      .waitFor({ timeout: 30000 });
    assert.equal(await op.evaluate(() => !!navigator.serviceWorker.controller), true);
    await offline.setOffline(true);
    await op.getByRole("link", { name: "Doorways", exact: true }).click();
    await ready(op);
    await op.locator("#door-source-page").selectOption("89");
    await op
      .locator("#door-source-status")
      .filter({ hasText: "Complete printed page 89." })
      .waitFor();
    await op.locator("#door-match").click();
    assert.match(await text(op, "#door-result"), /matches/);
    const saved = await download(op, "#door-save-reading", `${engine}-offline.html`);
    assert.ok(saved.bytes.length > 1600000);
    for (const room of [
      "index.html",
      "plans.html",
      "compare.html",
      "doorways.html",
      "world.html",
      "drill.html",
    ]) {
      await op.goto(new URL(room, base).href);
      await op.locator("main h1").waitFor();
    }
    receipts.push({
      engine,
      offline: {
        coldDoorway: true,
        sourcePages: 2,
        htmlDownloadBytes: saved.bytes.length,
        rooms: 6,
      },
    });
    await offline.close();
  } finally {
    await browser.close();
  }
}
await writeFile(
  resolve(output, "receipt.json"),
  `${JSON.stringify({ base, receipts }, null, 2)}\n`,
);
console.log(JSON.stringify({ journeys: receipts.length, output }));
