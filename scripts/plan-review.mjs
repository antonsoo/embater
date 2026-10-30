import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4486/embater/";
const output = resolve(process.argv[3] ?? "docs/review/plan-audit/local");
const temp = "/tmp/claude-1000/embater-plan-review";
await mkdir(output, { recursive: true });
await mkdir(temp, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const plates = JSON.parse(await readFile("public/sources/krohn-1912/manifest.json", "utf8"));
const fontHashes = await Promise.all(
  ["latin", "latin-ext", "greek", "greek-ext"].map(async (part) =>
    hash(await readFile(`src/fonts/eb-garamond-${part}.woff2`)),
  ),
);
const defaults = {
  "in-antis": 2,
  prostyle: 4,
  amphiprostyle: 8,
  peripteral: 30,
  pseudodipteral: 42,
  dipteral: 76,
  hypaethral: 100,
};
const receipts = [],
  faults = [];
async function download(page, selector, name) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const d = await pending;
  assert.equal(await d.failure(), null);
  const file = `${temp}/${name}`;
  await d.saveAs(file);
  return { file, bytes: await readFile(file), name: d.suggestedFilename() };
}
async function imageHash(page) {
  return page.locator("#plan-source-image").evaluate(async (img) => {
    const b = new Uint8Array(await (await fetch(img.src)).arrayBuffer());
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", b)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
  });
}
async function dimensions(page) {
  return page
    .locator('#plan [data-part="naos"]')
    .evaluateAll((nodes) =>
      nodes.map((n) =>
        Object.fromEntries(["x", "y", "width", "height"].map((a) => [a, n.getAttribute(a)])),
      ),
    );
}
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const width of [1440, 375])
      for (const colorScheme of ["light", "dark"]) {
        const id = `${engine}-${width}-${colorScheme}`;
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          colorScheme,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(new URL("plans.html", base).href);
        await page.locator("#plan-source-status").filter({ hasText: "Printed page 63." }).waitFor();
        const initialUrl = page.url();
        let models = 0;
        for (const [type, count] of Object.entries(defaults)) {
          await page.locator(`input[value="${type}"]`).check();
          for (const clear of ["1.5", "2", "3"]) {
            await page.locator("#plan-spacing").selectOption(clear);
            assert.equal(
              await page.locator('#plan circle.text[data-part="column"]').count(),
              count,
            );
            assert.match(
              await page.locator("#plan-ledger").textContent(),
              new RegExp(`Clear gap ${clear.replace(".", "\\.")} D`),
            );
            models++;
            assert.equal(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              true,
            );
          }
        }
        await page.locator("#plan-spacing").selectOption("2");
        await page.locator('input[value="prostyle"]').check();
        const front = await dimensions(page);
        await page.locator('input[value="amphiprostyle"]').focus();
        await page.keyboard.press("Space");
        assert.deepEqual(await dimensions(page), front);
        assert.match(await page.locator("#plan-measure").textContent(), /8 × 10\.5/);
        await page.locator('#plan-key button[data-part="naos"]').focus();
        await page.keyboard.press("Enter");
        assert.equal(
          await page.locator('#plan-key button[data-part="naos"]').getAttribute("aria-pressed"),
          "true",
        );
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${output}/${id}-body.png` });
        await page.locator('input[value="dipteral"]').check();
        for (const [flank, outer, inner] of [
          [13, 38, 30],
          [15, 42, 34],
          [17, 46, 38],
        ]) {
          await page.locator("#plan-flank").selectOption(String(flank));
          assert.equal(
            await page.locator('#plan circle.text[data-part="column"]').count(),
            outer + inner,
          );
          assert.match(
            await page.locator("#plan-measure").textContent(),
            new RegExp(`${inner} on the inner ring`),
          );
          models++;
        }
        await page.locator('input[value="hypaethral"]').check();
        for (const [flank, count] of [
          [17, 92],
          [19, 100],
          [21, 108],
        ]) {
          await page.locator("#plan-flank").selectOption(String(flank));
          assert.equal(await page.locator('#plan circle.text[data-part="column"]').count(), count);
          models++;
        }
        assert.equal(await page.locator('#plan .groove[data-part="naos"]').count(), 4);
        await page.locator('input[value="dipteral"]').check();
        await page.locator("#plan-flank").selectOption("17");
        assert.equal(page.url(), initialUrl, "controls do not silently rewrite the URL");
        const shared = await page.locator("#plan-link").inputValue();
        await page.locator("#copy-plan").click();
        await page
          .locator("#plan-copy-status")
          .filter({ hasText: /copied|copy/ })
          .waitFor();
        assert.match(await page.locator("#plan-copy-status").textContent(), /copied|copy/);
        const reopen = await context.newPage();
        await reopen.goto(shared);
        await reopen.waitForLoadState("load");
        assert.equal(await reopen.locator("#plan-flank").inputValue(), "17");
        assert.match(await reopen.locator("#plan-measure").textContent(), /38 on the inner ring/);
        await reopen.evaluate(() => {
          location.hash = "type=prostyle&clear=3";
        });
        await reopen.locator("#plan-measure").filter({ hasText: "Body 13 × 26 D" }).waitFor();
        await reopen.goBack();
        await reopen.locator("#plan-measure").filter({ hasText: "38 on the inner ring" }).waitFor();
        await reopen.close();
        for (const source of plates) {
          await page.locator("#plan-source-page").selectOption(String(source.page));
          await page
            .locator("#plan-source-status")
            .filter({ hasText: `Printed page ${source.page}.` })
            .waitFor();
          assert.equal(await imageHash(page), source.sha256);
        }
        await page.locator("#plan-source-page").selectOption("66");
        await page.locator("#plan-source-status").filter({ hasText: "Printed page 66." }).waitFor();
        assert.equal(
          await page
            .locator("#plan-source-frame")
            .evaluate((e) => e.scrollWidth <= e.clientWidth && e.scrollHeight <= e.clientHeight),
          true,
          "fit means full page fits",
        );
        await page.locator("#plan-source-zoom").click();
        await page.locator("#plan-source-frame").focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(
          () => document.querySelector("#plan-source-frame").scrollLeft > 0,
        );
        await page.screenshot({ path: `${output}/${id}-source.png` });
        await page.locator("#plan-source-zoom").click();
        await page.locator("#reading").evaluate((e) => e.scrollIntoView({ block: "start" }));
        await page.screenshot({ path: `${output}/${id}-ledger.png` });
        const a11y = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
        );
        const html = await download(page, "#save-plan", `${id}.html`);
        const svg = await download(page, "#save-plan-svg", `${id}.svg`);
        const content = html.bytes.toString();
        assert.match(content, /8 × 17/);
        assert.match(content, /38 on the inner ring/);
        assert.match(content, /Geometry alone cannot decide/);
        assert.doesNotMatch(content, /<script/);
        const embeddedImages = [...content.matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g)].map(
          (m) => hash(Buffer.from(m[1], "base64")),
        );
        assert.deepEqual(
          embeddedImages,
          plates.filter((p) => [63, 64, 66, 69].includes(p.page)).map((p) => p.sha256),
        );
        const embeddedFonts = [...content.matchAll(/url\(data:font\/woff2;base64,([^)]*)\)/g)].map(
          (m) => hash(Buffer.from(m[1], "base64")),
        );
        assert.deepEqual(embeddedFonts, fontHashes);
        for (const file of ["LICENSE.txt", "FONT-LICENSE.txt"]) {
          const license = await readFile(`public/${file}`, "utf8");
          assert.ok(
            content.includes(
              license
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;"),
            ),
          );
        }
        assert.match(svg.bytes.toString(), /<style>/);
        assert.match(svg.bytes.toString(), /38 inner-ring columns/);
        if (id === "chromium-1440-light") {
          await writeFile(`${output}/dipteral-17-reading.html.gz`, gzipSync(html.bytes));
          await writeFile(`${output}/dipteral-17.svg`, svg.bytes);
        }
        await page.waitForFunction(
          () => document.querySelector("#offline-status")?.textContent.startsWith("Ready offline"),
          null,
          { timeout: 45000 },
        );
        assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), true);
        await context.setOffline(true);
        await page.goto(shared);
        await page.reload();
        await page.locator("#plan-source-status").filter({ hasText: "Printed page 63." }).waitFor();
        assert.match(await page.locator("#plan-measure").textContent(), /38 on the inner ring/);
        const offline = await download(page, "#save-plan", `${id}-offline.html`);
        assert.equal(hash(offline.bytes), hash(html.bytes));
        const portableContext = await browser.newContext({
          viewport: { width, height: 1000 },
          javaScriptEnabled: false,
        });
        await portableContext.setOffline(true);
        const portable = await portableContext.newPage();
        const requests = [];
        portable.on("request", (r) => {
          if (/^https?:/.test(r.url())) requests.push(r.url());
        });
        await portable.goto(pathToFileURL(html.file).href);
        assert.equal(await portable.locator("img").count(), 4);
        assert.equal(
          await portable.evaluate(() =>
            [...document.images].every((i) => i.complete && i.naturalWidth > 0),
          ),
          true,
        );
        assert.equal(
          await portable.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await portable.screenshot({ path: `${output}/${id}-portable.png` });
        if (id === "chromium-1440-light")
          await portable.pdf({
            path: `${output}/dipteral-17-reading.pdf`,
            format: "A4",
            printBackground: true,
            tagged: true,
          });
        await portable.goto(pathToFileURL(svg.file).href);
        assert.equal(await portable.locator("circle.text").count(), 84);
        assert.deepEqual(requests, []);
        await portableContext.close();
        assert.deepEqual(errors, []);
        receipts.push({
          engine,
          width,
          colorScheme,
          models,
          prostyleCellaPreserved: true,
          hypaethralTwoDoors: true,
          sourceHashes: plates.map((p) => ({ page: p.page, sha256: p.sha256 })),
          sourceFitAndKeyboardPan: true,
          explicitShareReopened: true,
          html: {
            bytes: html.bytes.length,
            sha256: hash(html.bytes),
            images: embeddedImages,
            fonts: embeddedFonts,
          },
          svg: { bytes: svg.bytes.length, sha256: hash(svg.bytes) },
          offlineExportIdentical: true,
          portableNetworkRequests: requests.length,
          a11y: [],
          errors,
        });
        await context.close();
        console.log(
          id,
          "27 model operations, source pages, actual downloads and offline reading passed",
        );
        await writeFile(
          `${output}/review.json`,
          `${JSON.stringify({ base, receipts, faults }, null, 2)}\n`,
        );
      }
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    const downloads = [];
    page.on("download", (d) => downloads.push(d));
    let release;
    const gate = new Promise((r) => {
      release = r;
    });
    let reached;
    const pending = new Promise((r) => {
      reached = r;
    });
    await page.route("**/sources/krohn-1912/p63.jpg", async (route) => {
      reached();
      await gate;
      await route.continue();
    });
    await page.goto(new URL("plans.html", base).href, { waitUntil: "domcontentloaded" });
    await pending;
    await page.locator("#plan-source-page").selectOption("66");
    await page.locator("#plan-source-status").filter({ hasText: "Printed page 66." }).waitFor();
    release();
    await page.waitForLoadState("networkidle");
    assert.match(await page.locator("#plan-source-image").getAttribute("alt"), /66/);
    assert.equal(await imageHash(page), plates.find((p) => p.page === 66).sha256);
    await page.unroute("**/sources/krohn-1912/p63.jpg");
    await page.route("**/sources/krohn-1912/p69.jpg", (route) =>
      route.fulfill({ body: "corrupt source", contentType: "image/jpeg" }),
    );
    await page.locator("#plan-source-page").selectOption("69");
    await page
      .locator("#plan-source-status")
      .filter({ hasText: "differs from the reviewed edition" })
      .waitFor();
    assert.equal(await page.locator("#plan-source-image").isHidden(), true);
    await page.locator('input[value="dipteral"]').check();
    await page.locator("#save-plan").click();
    await page
      .locator("#plan-save-status")
      .filter({ hasText: "differs from the reviewed edition" })
      .waitFor();
    assert.equal(downloads.length, 0);
    await page.unroute("**/sources/krohn-1912/p69.jpg");
    let free;
    let entered;
    let wait;
    let seen;
    const reset = () => {
      wait = new Promise((r) => {
        free = r;
      });
      seen = new Promise((r) => {
        entered = r;
      });
    };
    reset();
    await page.route("**/sources/krohn-1912/p69.jpg", async (route) => {
      entered();
      await wait;
      await route.continue();
    });
    await page.locator("#plan-flank").selectOption("17");
    const frozen = page.waitForEvent("download");
    await page.locator("#save-plan").click();
    await seen;
    await page.locator('input[value="prostyle"]').check();
    free();
    const d = await frozen;
    await d.saveAs(`${temp}/${engine}-frozen.html`);
    assert.match(await readFile(`${temp}/${engine}-frozen.html`, "utf8"), /38 on the inner ring/);
    assert.match(d.suggestedFilename(), /dipteral/);
    reset();
    await page.locator('input[value="dipteral"]').check();
    await page.locator("#save-plan").click();
    await seen;
    await page.locator("#cancel-plan").click();
    free();
    await page.waitForLoadState("networkidle");
    assert.equal(downloads.length, 1);
    assert.match(await page.locator("#plan-save-status").textContent(), /cancelled/);
    faults.push({
      engine,
      lateSourceCannotReplaceNewer: true,
      corruptSourceHidden: true,
      corruptExportRefused: true,
      exportSelectionFrozen: true,
      cancellationNoDownload: true,
    });
    await context.close();
    await writeFile(
      `${output}/review.json`,
      `${JSON.stringify({ base, receipts, faults }, null, 2)}\n`,
    );
    console.log(engine, "source races, corrupt bytes, frozen selection and cancellation passed");
  } finally {
    await browser.close();
  }
}
