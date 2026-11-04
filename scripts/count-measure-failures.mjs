import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4426/embater/";
const output = resolve(process.argv[3] ?? "/tmp/embater-count-failures");
await mkdir(output, { recursive: true });
const results = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    // Deliberately exclude the worker: these faults target the save's network read.
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: true });
    await context.addInitScript(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Clipboard unavailable in review");
          },
        },
      }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let mode = "held";
    let release;
    let arrived;
    let entered = new Promise((r) => {
      arrived = r;
    });
    let gate = new Promise((r) => {
      release = r;
    });
    await page.route("**/sources/krohn-1912/p69.jpg", async (route) => {
      arrived();
      if (mode === "held") await gate;
      if (mode === "corrupt")
        await route.fulfill({
          status: 200,
          contentType: "image/jpeg",
          body: "damaged source page",
        });
      else await route.continue().catch(() => {});
    });
    await page.goto(new URL("compare.html", base).href);
    await page.locator("#save-count").click();
    await entered;
    assert.equal(await page.locator("#save-count").isDisabled(), true);
    await page.locator("#measure-halved").click();
    await page.locator("#temple").selectOption("aegina-temple-of-aphaia");
    assert.match(
      await page.locator("#count-save-status").textContent(),
      /Saving the opened settings/,
    );
    const pending = page.waitForEvent("download");
    release();
    const download = await pending;
    const snapshotPath = `${output}/${engine}-snapshot.html`;
    await download.saveAs(snapshotPath);
    const html = await readFile(snapshotPath, "utf8");
    const state = JSON.parse(
      html.match(/<pre id="count-trial-settings">([^<]+)<\/pre>/)[1].replaceAll("&quot;", '"'),
    );
    assert.equal(state.temple, "selinus-temple-c");
    assert.equal(state.trial.flankPitch, 3);
    assert.equal(state.trial.equal, true);
    assert.equal(await page.locator("#temple").inputValue(), "aegina-temple-of-aphaia");
    assert.equal(await page.locator("#flank-pitch").inputValue(), "1.5");

    // Cancellation must return the controls while the source route is still held.
    entered = new Promise((r) => {
      arrived = r;
    });
    gate = new Promise((r) => {
      release = r;
    });
    let count = 0;
    page.on("download", () => count++);
    await page.locator("#save-count").click();
    await entered;
    await page.locator("#cancel-count-save").click();
    await page
      .locator("#count-save-status")
      .filter({ hasText: /cancelled/ })
      .waitFor();
    assert.equal(await page.locator("#save-count").isEnabled(), true);
    release();
    assert.equal(count, 0);

    mode = "corrupt";
    await page.locator("#save-count").click();
    await page
      .locator("#count-save-status")
      .filter({ hasText: /differs from the reviewed edition/ })
      .waitFor();
    assert.equal(await page.locator("#save-count").isEnabled(), true);
    assert.equal(count, 0);
    mode = "pass";
    const retry = page.waitForEvent("download");
    await page.locator("#save-count").click();
    await (await retry).saveAs(`${output}/${engine}-retry.html`);
    assert.equal(count, 1);

    await page.locator("#share-measure").click();
    const fallback = page.getByLabel("Complete comparison link", { exact: true });
    assert.equal(await fallback.inputValue(), page.url());
    assert.equal(
      await fallback.evaluate(
        (e) => e === document.activeElement && e.selectionEnd === e.value.length,
      ),
      true,
    );
    await page.goto(
      new URL(
        "compare.html?front-pitch=Infinity&flank-pitch=-2&margin=NaN&measure=nope&edge=bad&temple=absent",
        base,
      ).href,
    );
    assert.equal(await page.locator("#front-pitch").inputValue(), "3");
    assert.equal(await page.locator("#flank-pitch").inputValue(), "3");
    assert.equal(await page.locator("#measure-margin").inputValue(), "1");
    assert.equal(await page.locator("#temple").inputValue(), "selinus-temple-c");
    assert.deepEqual(errors, []);
    results.push({
      engine,
      snapshot: "original settings saved while current experiment changed",
      cancellation: "no partial download",
      corruptSource: "refused",
      retry: "saved",
      clipboard: "selectable exact link",
      malformedLink: "safe defaults",
      errors,
    });
    await context.close();
    console.log(
      `${engine}: snapshot race, cancellation, corrupt source, retry, clipboard and malformed link passed`,
    );
  } finally {
    await browser.close();
  }
}
await writeFile(`${output}/failures.json`, `${JSON.stringify(results, null, 2)}\n`);
