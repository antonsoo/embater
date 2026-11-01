import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4492/embater/";
const output = resolve(process.argv[3] ?? "/tmp/claude-1000/embater-audit/browser");
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile("public/sources/vocabulary/manifest.json", "utf8"));
const sourceHash = (page) => manifest.plates.find((p) => p.page === page).sha256;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const receipts = [],
  failures = [];
const boxes = (page) => page.evaluate(() => localStorage.getItem("embater-drill-v2"));
async function fits(page) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "fits viewport",
  );
}
async function download(page, selector, file) {
  const waiting = page.waitForEvent("download");
  await page.locator(selector).click();
  const item = await waiting;
  console.log(`download started: ${file}`);
  assert.equal(await item.failure(), null);
  await item.saveAs(file);
  return { filename: item.suggestedFilename(), bytes: await readFile(file) };
}
async function openRule(page, id, card = "#card") {
  const button = page.locator(`${card} [data-source-rule="${id}"]`).first();
  const disclosure = button.locator("xpath=ancestor::details");
  if ((await disclosure.count()) && !(await disclosure.evaluate((el) => el.open)))
    await disclosure.locator("summary").click();
  await button.focus();
  await page.keyboard.press("Enter");
}
async function pageIdentity(page, printed) {
  await page
    .locator("#drill-source-status")
    .filter({ hasText: `Complete printed page ${printed}.` })
    .waitFor();
  const digest = await page.locator("#drill-source-image").evaluate(async (img) => {
    const bytes = await (await fetch(img.src)).arrayBuffer();
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  });
  assert.equal(digest, sourceHash(printed));
}
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const width of [1440, 375]) {
      const theme = (engine === "chromium") === (width === 1440) ? "light" : "dark";
      const id = `${engine}-${width}-${theme}`;
      const out = resolve(output, id);
      await mkdir(out, { recursive: true });
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await openRule(page, "doric-module");
      await pageIdentity(page, 83);
      assert.match(
        await page.locator("#card .rule-reading").first().textContent(),
        /28.*32|xxviii/,
      );
      await page.locator("[data-source-close]").click();
      assert.equal(
        await page
          .locator('[data-source-rule="doric-module"]')
          .evaluate((n) => n === document.activeElement),
        true,
      );
      await page.locator('#key button[data-part="triglyph"]').click();
      assert.match(await page.locator(".context-phrase").textContent(), /contra triglyphos/);
      await openRule(page, "doric-triglyph");
      await pageIdentity(page, 83);
      await page.locator('[data-source-step="1"]').click();
      await pageIdentity(page, 84);
      const fitted = await page.locator("#drill-source-image").evaluate((img) => ({
        height: img.clientHeight,
        width: img.clientWidth,
        frameHeight: img.parentElement.clientHeight,
        frameWidth: img.parentElement.clientWidth,
      }));
      assert.ok(
        fitted.height <= fitted.frameHeight && fitted.width <= fitted.frameWidth,
        "whole source page fits the frame",
      );
      await page.locator("#drill-source-zoom").click();
      await page.locator("#drill-source-frame").focus();
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction(() => document.getElementById("drill-source-frame").scrollTop > 0);
      if (width === 375) {
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(
          () => document.getElementById("drill-source-frame").scrollLeft > 0,
        );
      }
      await page.locator("#drill-source-zoom").click();
      await page.screenshot({ path: resolve(out, "printed-page.png"), fullPage: true });
      await page.locator("[data-source-close]").click();
      await page.locator('[name="order"][value="ionic"]').check();
      await page.locator('#key button[data-part="torus"]').click();
      await openRule(page, "attic-base");
      await pageIdentity(page, 69);
      await page.locator('[data-source-step="1"]').click();
      await pageIdentity(page, 70);
      await page.locator("[data-source-close]").click();
      await page.locator('[name="order"][value="tuscan"]').check();
      await page.locator('#key button[data-part="plinth"]').click();
      assert.match(await page.locator("#card .card-note").textContent(), /Tuscan.*round/);
      await openRule(page, "tuscan-column");
      await pageIdentity(page, 90);
      await page.locator('[data-source-step="1"]').click();
      await pageIdentity(page, 91);
      await page.locator("[data-source-close]").click();
      await page.getByRole("link", { name: "Drill", exact: true }).click();
      await page.waitForURL("**/drill.html");
      await page.goto(new URL("drill.html#deck=ionic&lang=la&mode=study&part=oculus", base).href);
      assert.equal(await page.locator(".card-title").textContent(), "eye of the volute");
      assert.match(await page.locator(".context-phrase").textContent(), /centrum oculi/);
      const saved = await boxes(page);
      const plainGeometry = await page
        .locator("#drill-plate .pc")
        .evaluateAll((ns) =>
          ns.map((n) => [
            n.tagName,
            ...["data-part", "points", "x", "y", "width", "height", "cx", "cy", "r"].map((a) =>
              n.getAttribute(a),
            ),
          ]),
        );
      const whole = await page.locator("#drill-plate svg").getAttribute("viewBox");
      await page.locator('[data-view="detail"]').click();
      const initial = await page.locator("#drill-plate svg").getAttribute("viewBox");
      const initialParts = initial.split(" ").map(Number);
      await page.locator('[data-pan="in"]').focus();
      await page.keyboard.press("Enter");
      const twice = await page.locator("#drill-plate svg").getAttribute("viewBox");
      assert.ok(Math.abs(twice.split(" ").map(Number)[2] * 2 - initialParts[2]) < 0.002);
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      assert.equal(await page.locator('[data-pan="in"]').getAttribute("aria-disabled"), "true");
      assert.equal(
        await page.locator('[data-pan="in"]').evaluate((n) => n === document.activeElement),
        true,
        "zoom limit retains keyboard focus",
      );
      await page.locator('[data-pan="left"]').click();
      const panned = await page.locator("#drill-plate svg").getAttribute("viewBox");
      assert.notEqual(panned, twice);
      await page.locator('[data-pan="reset"]').click();
      assert.equal(await page.locator("#drill-plate svg").getAttribute("viewBox"), initial);
      await page.locator('[data-pan="in"]').click();
      assert.deepEqual(await boxes(page), saved, "zoom and pan never grade");
      assert.deepEqual(
        await page
          .locator("#drill-plate .pc")
          .evaluateAll((ns) =>
            ns.map((n) => [
              n.tagName,
              ...["data-part", "points", "x", "y", "width", "height", "cx", "cy", "r"].map((a) =>
                n.getAttribute(a),
              ),
            ]),
          ),
        plainGeometry,
        "crop reuses original coordinates",
      );
      await page.locator("#drill-plate").screenshot({ path: resolve(out, "eye-detail.png") });
      await page.screenshot({ path: resolve(out, "eye-study.png"), fullPage: true });
      const domBeforeExport = await page.locator("#drill-plate svg").getAttribute("viewBox");
      const readingFile = resolve(out, "eye-study.html");
      const reading = await download(page, "#drill-save-reading", readingFile);
      const html = reading.bytes.toString("utf8");
      assert.ok(!/<script\b/i.test(html));
      assert.ok(html.includes("centrum <mark>oculi</mark>"));
      const imageData = [...html.matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g)].map((m) =>
        Buffer.from(m[1], "base64"),
      );
      assert.equal(imageData.length, 1);
      assert.equal(hash(imageData[0]), sourceHash(71));
      const fontData = [...html.matchAll(/url\(data:font\/woff2;base64,([^)]+)\)/g)].map((m) =>
        Buffer.from(m[1], "base64"),
      );
      assert.equal(fontData.length, 9);
      const native = await browser.newContext({
        viewport: { width, height: 1000 },
        javaScriptEnabled: false,
      });
      const file = await native.newPage();
      const requests = [];
      file.on("request", (r) => {
        if (/^https?:/.test(r.url())) requests.push(r.url());
      });
      await native.setOffline(true);
      console.log(`${id}: opening native file`);
      await file.goto(pathToFileURL(readingFile).href);
      console.log(`${id}: native file loaded`);
      // In Firefox with JavaScript disabled, a promise returned from an evaluation
      // may not settle. Poll the native font state from the driver instead.
      for (let attempt = 0; attempt < 200; attempt++) {
        if (await file.evaluate(() => document.fonts.status === "loaded")) break;
        await file.waitForTimeout(100);
      }
      assert.equal(await file.evaluate(() => document.fonts.status), "loaded");
      console.log(`${id}: native fonts loaded`);
      assert.equal(await file.locator("svg").nth(1).getAttribute("viewBox"), domBeforeExport);
      const csv = await download(
        file,
        'a[download$="vocabulary.csv"]',
        resolve(out, "vocabulary.csv"),
      );
      assert.ok(csv.bytes.toString("utf8").includes('"eye of the volute","Latin","oculus"'));
      if (engine === "chromium")
        await file.pdf({
          path: resolve(out, "eye-study.pdf"),
          format: "A4",
          printBackground: true,
          tagged: true,
        });
      assert.deepEqual(requests, []);
      await file.screenshot({ path: resolve(out, "native-reading.png"), fullPage: true });
      await native.close();
      await page.locator('[data-source-rule="ionic-capital"]').first().click();
      await pageIdentity(page, 71);
      const a11y = (await new AxeBuilder({ page }).analyze()).violations.map(
        ({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map((n) => n.target) }),
      );
      assert.deepEqual(a11y, []);
      await page.locator("[data-source-close]").click();
      await page.locator('[data-view="plate"]').click();
      assert.equal(await page.locator("#drill-plate svg").getAttribute("viewBox"), whole);
      await page
        .locator("#offline-status")
        .filter({ hasText: /^Ready offline/ })
        .waitFor({ timeout: 60000 });
      assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller));
      await context.setOffline(true);
      await page.reload();
      assert.equal(await page.locator(".card-title").textContent(), "eye of the volute");
      await page.locator('[data-source-rule="ionic-capital"]').first().click();
      await pageIdentity(page, 71);
      await page.locator("[data-source-close]").click();
      const offlineReading = await download(
        page,
        "#drill-save-reading",
        resolve(out, "offline-eye-study.html"),
      );
      // The online snapshot used 2x detail; after reload the saved default is deliberately 1x.
      assert.equal(
        [...offlineReading.bytes.toString().matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g)]
          .length,
        1,
      );
      await fits(page);
      assert.deepEqual(errors, []);
      receipts.push({
        id,
        sourcePages: [83, 84, 69, 70, 90, 91, 71],
        sourceDigestsMatch: true,
        sourceFitsAndKeyboardPan: true,
        closeRestoresFocus: true,
        zoomLimitRetainsFocus: true,
        sameGeometry: true,
        zoomDoesNotGrade: true,
        selectedStudyReopened: true,
        reading: {
          bytes: reading.bytes.length,
          sha256: hash(reading.bytes),
          sourcePages: 1,
          fontSubsets: 9,
          nativeCsvBytes: csv.bytes.length,
          automaticHttpRequests: requests.length,
        },
        offlineSourceAndStudy: true,
        a11y,
        errors,
      });
      await context.close();
      console.log(`${id}: geometry, printed source, native study/CSV and offline use verified`);
      await writeFile(
        resolve(output, "review.json"),
        `${JSON.stringify({ base, receipts, failures }, null, 2)}\n`,
      );
    }
  } finally {
    await browser.close();
  }
}

// Failure and late-response cases use real browser requests with workers disabled,
// so a verified worker copy cannot accidentally bypass the fault under review.
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    const context = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 375, height: 1000 },
    });
    const page = await context.newPage();
    await page.goto(new URL("drill.html#deck=ionic&lang=la&mode=study&part=oculus", base).href);
    const before = await boxes(page);
    await page.route("**/sources/vocabulary/p71.jpg", (route) =>
      route.fulfill({ status: 200, contentType: "image/jpeg", body: "substituted source" }),
    );
    await page.locator('[data-source-rule="ionic-capital"]').first().click();
    await page
      .locator("#drill-source-status")
      .filter({ hasText: /differs from the reviewed edition/ })
      .waitFor();
    assert.ok(await page.locator("#drill-source-image").isHidden());
    assert.deepEqual(await boxes(page), before);
    await page.locator("[data-source-close]").click();
    let downloads = 0;
    page.on("download", () => downloads++);
    await page.locator("#drill-save-reading").click();
    await page
      .locator("#drill-reading-status")
      .filter({ hasText: /differs from the reviewed edition/ })
      .waitFor();
    assert.equal(downloads, 0);
    assert.equal(await page.locator("#drill-save-reading").isEnabled(), true);
    await page.unroute("**/sources/vocabulary/p71.jpg");
    await page.locator('[data-source-rule="ionic-capital"]').first().click();
    await pageIdentity(page, 71);
    await page.locator("[data-source-close]").click();
    let release;
    const waiting = new Promise((r) => {
      release = r;
    });
    await page.route("**/sources/vocabulary/p71.jpg", async (route) => {
      await waiting;
      await route.continue().catch(() => {});
    });
    await page.locator("#drill-save-reading").click();
    await page.locator("#drill-cancel-reading").waitFor();
    await page.locator("#drill-cancel-reading").click();
    release();
    await page
      .locator("#drill-reading-status")
      .filter({ hasText: /cancelled/ })
      .waitFor();
    await page.waitForTimeout(100);
    assert.equal(downloads, 0);
    await page.unroute("**/sources/vocabulary/p71.jpg");
    let releaseSource;
    const waitingSource = new Promise((r) => {
      releaseSource = r;
    });
    await page.route("**/sources/vocabulary/p71.jpg", async (route) => {
      await waitingSource;
      await route.continue().catch(() => {});
    });
    await page.locator('[data-source-rule="ionic-capital"]').first().click();
    await page
      .locator("#drill-source-status")
      .filter({ hasText: /Loading/ })
      .waitFor();
    await page.locator('[data-term="torus"]').click();
    releaseSource();
    await page.waitForTimeout(100);
    assert.ok(await page.locator("#drill-source").isHidden());
    assert.equal(await page.locator(".card-title").textContent(), "torus");
    await page.unroute("**/sources/vocabulary/p71.jpg");
    await page.locator('[data-term="oculus"]').click();
    for (const operation of ["source", "export"]) {
      let finish;
      const hold = new Promise((resolve) => {
        finish = resolve;
      });
      await page.route("**/sources/vocabulary/p71.jpg", async (route) => {
        await hold;
        await route.continue().catch(() => {});
      });
      if (operation === "source") {
        await page.locator('[data-source-rule="ionic-capital"]').first().click();
        await page
          .locator("#drill-source-status")
          .filter({ hasText: /did not finish loading/ })
          .waitFor({ timeout: 20000 });
        assert.ok(await page.locator("#drill-source-image").isHidden());
        await page.locator("[data-source-close]").click();
      } else {
        await page.locator("#drill-save-reading").click();
        await page
          .locator("#drill-reading-status")
          .filter({ hasText: /did not finish/ })
          .waitFor({ timeout: 25000 });
        assert.equal(await page.locator("#drill-save-reading").isEnabled(), true);
        assert.equal(downloads, 0);
      }
      finish();
      await page.unroute("**/sources/vocabulary/p71.jpg");
    }
    await page.locator('[data-source-rule="ionic-capital"]').first().click();
    await pageIdentity(page, 71);
    await page.locator("[data-source-close]").click();
    const preventedDownloads = downloads;
    const recoveredStudy = await download(
      page,
      "#drill-save-reading",
      resolve(output, `${engine}-deadline-recovered.html`),
    );
    assert.equal(downloads, 1);
    assert.ok(recoveredStudy.bytes.toString().includes("centrum <mark>oculi</mark>"));
    assert.deepEqual(await boxes(page), before);
    await context.close();
    // A malformed local record must survive an answer, not merely a failed import.
    const corrupt = await browser.newContext();
    const p = await corrupt.newPage();
    const raw = '{"schema":"embater-vocabulary","version":1,"boxes":{"doric/la/find/shaft":2.5}}';
    await p.addInitScript((raw) => {
      localStorage.setItem("embater-drill-v2", raw);
      Math.random = () => 0.00001;
    }, raw);
    await p.goto(new URL("drill.html#deck=doric&lang=la&mode=find", base).href);
    assert.ok(await p.locator("#drill-persistence").isVisible());
    await p.locator('[data-term="shaft"]').click();
    assert.equal(await boxes(p), raw);
    assert.ok(await p.locator("#drill-persistence").isVisible());
    await p.locator("#drill-keep-visit").click();
    assert.equal(
      await p.locator("#drill-save").evaluate((n) => n === document.activeElement),
      true,
    );
    const backup = await download(
      p,
      "#drill-save",
      resolve(output, `${engine}-protected-progress.json`),
    );
    assert.equal(JSON.parse(backup.bytes).boxes["doric/la/find/shaft"], 2);
    await p
      .locator("#drill-load")
      .setInputFiles({ name: "valid.json", mimeType: "application/json", buffer: backup.bytes });
    await p
      .locator("#drill-file-status")
      .filter({ hasText: /^Restored/ })
      .waitFor();
    assert.ok(await p.locator("#drill-persistence").isHidden());
    assert.equal(JSON.parse(await boxes(p)).boxes["doric/la/find/shaft"], 2);
    await corrupt.close();
    failures.push({
      engine,
      substitutedPageHidden: true,
      substitutedSourceBlocksExport: true,
      recoveryWorks: true,
      cancelledDownloadCount: preventedDownloads,
      deadlineRetryReadingBytes: recoveredStudy.bytes.length,
      lateSourceCannotReplaceNewStudy: true,
      sourceDeadlineRecovered: true,
      exportDeadlineRecovered: true,
      unreadSavedRecordPreserved: true,
      visibleRecoveryRoute: true,
      explicitValidRestoreWorks: true,
    });
    await writeFile(
      resolve(output, "review.json"),
      `${JSON.stringify({ base, receipts, failures }, null, 2)}\n`,
    );
    console.log(`${engine}: corruption, cancellation, late source and protected progress verified`);
  } finally {
    await browser.close();
  }
}
