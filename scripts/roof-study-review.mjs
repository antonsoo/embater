import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4493/embater/";
const output = resolve(process.argv[3] ?? "/tmp/claude-1000/embater-audit/studies");
await mkdir(output, { recursive: true });
const receipts = [];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function download(page, selector, name) {
  const waiting = page.waitForEvent("download", { timeout: 60000 });
  await page.locator(selector).click();
  const item = await waiting;
  assert.equal(await item.failure(), null);
  const file = resolve(output, name);
  await item.saveAs(file);
  const bytes = await readFile(file);
  return { file, bytes, sha256: sha(bytes) };
}
for (const [engine, driver] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await driver.launch();
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        acceptDownloads: true,
        colorScheme: "light",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${base}#order=ionic&feet=2.6&view=roof`);
      assert.equal(await page.locator('[name="feet"]').inputValue(), "2.5");
      assert.equal(await page.locator("#feet-out").textContent(), "2.5");
      assert.match(
        await page.locator("#order-size-note").textContent(),
        /2.6 ft was rounded to 2.5 ft/,
      );
      await page.locator('[name="order"][value="ionic"]').focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute("value")),
        "corinthian",
      );
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute("value")),
        "tuscan",
      );
      await page.goto(
        `${base}#order=doric&columns=6&spacing=systyle&feet=1.75&view=roof&trial=1.125&target=middle&part=acroterion`,
      );
      await page.locator("#card summary").filter({ hasText: "III.5.12" }).click();
      await page.locator('#card [data-source-rule="sima-acroteria"]').click();
      await page
        .locator("#drill-source-status")
        .filter({ hasText: "Complete printed page 74." })
        .waitFor();
      await page.locator('[name="roof-trial"]').focus();
      await page.keyboard.press("ArrowLeft");
      await page.getByRole("button", { name: "Close printed source" }).click();
      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute("data-source-rule")),
        "sima-acroteria",
      );
      await page.getByRole("button", { name: "Match Vitruvius’s middle height" }).click();
      const native = await download(page, "#roof-study", `${engine}-${width}.html`);
      const doricUrl = page.url();
      await page.goto(
        `${base}#order=ionic&columns=8&spacing=diastyle&base=ionic&feet=4&frieze=carved&view=roof&trial=0.8&target=corner&part=raking-corona`,
      );
      await download(page, "#roof-study", `${engine}-${width}-ionic.html`);
      await page.goto(doricUrl);
      // Firefox suppresses future callbacks in the page when JS is disabled;
      // inspect this context synchronously, then review the same script-free bytes visually.
      const scriptFreeContext = await browser.newContext({ javaScriptEnabled: false });
      const scriptFree = await scriptFreeContext.newPage();
      await scriptFree.goto(pathToFileURL(native.file).href, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      assert.equal(await scriptFree.locator("script").count(), 0);
      assert.equal(await scriptFree.locator("svg").count(), 2);
      assert.equal(await scriptFree.locator("#saved-settings").count(), 1);
      assert.equal(await scriptFree.locator("img[data-source-page]").count(), 3);
      await scriptFreeContext.close();
      const savedContext = await browser.newContext({
        viewport: { width, height: 1000 },
        acceptDownloads: true,
      });
      const saved = await savedContext.newPage();
      const unexpected = [];
      saved.on("request", (r) => {
        if (/^https?:/.test(r.url())) unexpected.push(r.url());
      });
      await saved.goto(pathToFileURL(native.file).href);
      await saved.evaluate(() => document.fonts.ready.then(() => true));
      assert.equal(await saved.locator("script").count(), 0);
      assert.equal(await saved.locator("svg").count(), 2);
      assert.equal(await saved.locator("img[data-source-page]").count(), 3);
      assert.equal(
        await saved
          .locator("img[data-source-page]")
          .evaluateAll((images) => images.every((img) => img.complete && img.naturalWidth > 1000)),
        true,
      );
      const record = JSON.parse(await saved.locator("#saved-settings").textContent());
      assert.equal(record.order, "doric");
      assert.equal(record.spacing, "systyle");
      assert.equal(record.unitFeet, 1.75);
      assert.equal(record.trialRatio, 1.125);
      assert.equal(record.trialTarget, "middle");
      const embeddedSvg = await download(
        saved,
        'a[download$=".svg"]',
        `${engine}-${width}-embedded.svg`,
      );
      const embeddedCsv = await download(
        saved,
        'a[download$=".csv"]',
        `${engine}-${width}-embedded.csv`,
      );
      assert.ok(embeddedSvg.bytes.toString().includes("embater-settings"));
      assert.ok(embeddedCsv.bytes.toString().includes("Reopen experiment"));
      assert.deepEqual(unexpected, []);
      await saved.screenshot({ path: resolve(output, `${engine}-${width}-saved.png`) });
      if (engine === "chromium" && width === 1440)
        await saved.pdf({
          path: resolve(output, "roof-reading.pdf"),
          format: "A4",
          printBackground: true,
        });
      await savedContext.close();
      await page.locator(".theme").click();
      await page.waitForFunction(
        () => getComputedStyle(document.querySelector("#plate .solid")).fill === "rgb(27, 33, 40)",
      );
      await page
        .locator(".plate-wrap")
        .screenshot({ path: resolve(output, `${engine}-${width}-dark.png`) });
      await page.locator(".theme").click();
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector("#plate .solid")).fill === "rgb(248, 249, 245)",
      );
      await page
        .locator("#offline-status")
        .filter({ hasText: "Ready offline:" })
        .waitFor({ timeout: 60000 });
      await context.setOffline(true);
      await page.reload();
      const offline = await download(page, "#roof-study", `${engine}-${width}-offline.html`);
      assert.equal(
        offline.sha256,
        native.sha256,
        "offline reading is the same exact experiment and assets",
      );
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        browser: browser.version(),
        width,
        sliderAndModelAgree: true,
        orderKeyboardFocus: true,
        sourceReturnFocus: true,
        scriptFreeOpening: true,
        noAutomaticRemoteRequests: true,
        sourcePages: [73, 74, 84],
        nativeHtmlBytes: native.bytes.length,
        sha256: native.sha256,
        offlineMatches: true,
        embeddedSvgSha256: embeddedSvg.sha256,
        embeddedCsvSha256: embeddedCsv.sha256,
        errors,
      });
      await context.close();
      console.log(
        `${engine} ${width}: focus, exact settings, complete sources, script-free reading, native embedded files, settled dark theme and identical offline reading`,
      );
    }
    const fractionContext = await browser.newContext({ acceptDownloads: true });
    const fractionPage = await fractionContext.newPage();
    for (const [name, query, fraction] of [
      ["eighths", "order=ionic&columns=4&spacing=pycnostyle&feet=1.5&view=roof", "⅜"],
      ["thirds", "order=corinthian&columns=4&spacing=pycnostyle&feet=2.5&view=roof", "10⅔"],
    ]) {
      await fractionPage.goto(`${base}#${query}`);
      const file = await download(fractionPage, "#roof-study", `${engine}-fraction-${name}.html`);
      assert.ok(file.bytes.toString().includes(fraction));
      const reader = await fractionContext.newPage();
      await reader.goto(pathToFileURL(file.file).href);
      await reader.evaluate(() => document.fonts.ready.then(() => true));
      const label = reader
        .locator("svg")
        .nth(1)
        .locator("text")
        .filter({ hasText: fraction })
        .first();
      assert.match(await label.evaluate((el) => getComputedStyle(el).fontFamily), /Reading/);
      if (engine === "chromium" && name === "thirds")
        await reader.pdf({
          path: resolve(output, "roof-fractions.pdf"),
          format: "A4",
          printBackground: true,
        });
      await reader.close();
    }
    await fractionContext.close();
    receipts.push({ engine, nativeEighthAndThirdReadings: true, fractionLabels: ["⅜", "10⅔"] });

    // Failure/recovery runs with worker interception disabled so the actual fetches are controlled.
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: true });
    const page = await context.newPage();
    await page.goto(`${base}#order=doric&view=roof&trial=0.5`);
    let downloads = 0;
    page.on("download", () => downloads++);
    await page.route("**/sources/vocabulary/p74.jpg", (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/jpeg",
        body: Buffer.from("wrong source bytes"),
      }),
    );
    await page.locator("#roof-study").click();
    await page
      .locator("#roof-file-status")
      .filter({ hasText: "differs from the reviewed edition" })
      .waitFor();
    assert.equal(downloads, 0);
    assert.equal(await page.locator("#roof-study").isEnabled(), true);
    await page.unroute("**/sources/vocabulary/p74.jpg");
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    let reached;
    const arrival = new Promise((resolve) => {
      reached = resolve;
    });
    await page.route("**/sources/vocabulary/p74.jpg", async (route) => {
      reached();
      await held;
      try {
        await route.continue();
      } catch {}
    });
    await page.locator("#roof-study").click();
    await arrival;
    await page.locator("#roof-cancel").click();
    assert.match(await page.locator("#roof-file-status").textContent(), /cancelled/);
    assert.equal(await page.locator("#roof-study").isEnabled(), true);
    release();
    await page.unroute("**/sources/vocabulary/p74.jpg");
    let releaseChanged;
    const heldChanged = new Promise((resolve) => {
      releaseChanged = resolve;
    });
    let arrived;
    const changedArrival = new Promise((resolve) => {
      arrived = resolve;
    });
    await page.route("**/sources/vocabulary/p74.jpg", async (route) => {
      arrived();
      await heldChanged;
      try {
        await route.continue();
      } catch {}
    });
    await page.locator("#roof-study").click();
    await changedArrival;
    await page.locator('[name="roof-trial"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.match(await page.locator("#roof-file-status").textContent(), /Drawing changed/);
    releaseChanged();
    await page.unroute("**/sources/vocabulary/p74.jpg");
    assert.equal(downloads, 0);
    const recovered = await download(page, "#roof-study", `${engine}-recovered.html`);
    assert.equal(downloads, 1);
    receipts.push({
      engine,
      failureReview: true,
      corruptSourceBlocked: true,
      explicitCancellation: true,
      changedDrawingCancels: true,
      recoverySha256: recovered.sha256,
    });
    let releaseTimeout;
    const timeoutHeld = new Promise((resolve) => {
      releaseTimeout = resolve;
    });
    await page.route("**/sources/vocabulary/p74.jpg", async (route) => {
      await timeoutHeld;
      try {
        await route.continue();
      } catch {}
    });
    const started = Date.now();
    await page.locator("#roof-study").click();
    console.log(`${engine}: exercising the actual 45-second reading deadline`);
    await page
      .locator("#roof-file-status")
      .filter({ hasText: "The reading did not finish" })
      .waitFor({ timeout: 60000 });
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 44000 && elapsed < 60000);
    assert.equal(downloads, 1, "the timed out request does not save an incomplete file");
    assert.equal(await page.locator("#roof-study").isEnabled(), true);
    releaseTimeout();
    await page.unroute("**/sources/vocabulary/p74.jpg");
    const timeoutRecovered = await download(page, "#roof-study", `${engine}-after-timeout.html`);
    assert.equal(downloads, 2);
    receipts.push({
      engine,
      deadlineMs: 45000,
      observedMs: elapsed,
      noPartialDownload: true,
      timeoutRecoverySha256: timeoutRecovered.sha256,
    });
    await context.close();
    console.log(
      `${engine}: corrupt-source refusal, cancellation, drawing changes and successful retry`,
    );
  } finally {
    await browser.close();
  }
}
await writeFile(resolve(output, "receipts.json"), `${JSON.stringify(receipts, null, 2)}\n`);
