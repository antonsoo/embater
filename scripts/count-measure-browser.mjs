import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4426/embater/";
const output = resolve(process.argv[3] ?? "docs/count-measure-review");
await mkdir(output, { recursive: true });
const results = [];
async function download(page, selector, file) {
  const event = page.waitForEvent("download");
  await page.locator(selector).click();
  const result = await event;
  await result.saveAs(file);
  return file;
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
          acceptDownloads: true,
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(new URL("compare.html", base).href);
        await page.locator("#measure-result").filter({ hasText: "L / W = 2." }).waitFor();
        assert.equal(await page.locator("[data-trial-column]").count(), 30);
        assert.match(await page.locator("#measure-table").textContent(), /1.9375/);
        const scaleBefore = await page.locator("[data-trial-column]").first().getAttribute("r");
        await page.getByLabel("Outside shaft faces", { exact: true }).check();
        assert.match(await page.locator("#measure-result").textContent(), /L \/ W = 1.9375/);
        await page.getByLabel("Trial platform edges", { exact: true }).check();
        assert.match(await page.locator("#measure-result").textContent(), /L \/ W = 1.8333/);
        await page.locator("#measure-margin").focus();
        await page.keyboard.press("End");
        assert.equal(await page.locator("#measure-margin").inputValue(), "2");
        assert.match(await page.locator("#measure-result").textContent(), /L \/ W = 1.75/);
        assert.equal(
          await page.locator("#measure-margin").evaluate((e) => e === document.activeElement),
          true,
        );
        await page.locator("#measure-halved").click();
        assert.match(await page.locator("#measure-result").textContent(), /L \/ W = 1\./);
        assert.equal(await page.locator("[data-trial-column]").count(), 30);
        assert.equal(
          await page.locator("[data-trial-column]").first().getAttribute("r"),
          scaleBefore,
        );
        await page.locator("#measure-equal-example").click();
        await page.getByLabel("Corner-column centres", { exact: true }).check();
        await page.getByLabel("The columns · a trial reading", { exact: true }).check();
        assert.match(await page.locator("#measure-result").textContent(), /L \/ W = 2.2/);
        await page.getByLabel("The spaces · Vitruvius", { exact: true }).check();
        assert.match(await page.locator("#measure-result").textContent(), /L \/ W = 2\./);
        await page.locator("#front-pitch").focus();
        await page.keyboard.press("ArrowRight");
        assert.equal(await page.locator("#front-pitch").inputValue(), "3.05");
        assert.equal(await page.locator("#flank-pitch").inputValue(), "3.05");
        assert.equal(
          await page.locator("#front-pitch").evaluate((e) => e === document.activeElement),
          true,
        );
        await page.locator("#measure-equal").uncheck();
        assert.doesNotMatch(await page.locator("#measure-result").textContent(), /pitches differ/);
        await page.locator("#front-pitch").focus();
        await page.keyboard.press("End");
        await page.locator("#measure-halved").click();
        assert.equal(await page.locator("#front-pitch").inputValue(), "6");
        assert.equal(await page.locator("#flank-pitch").inputValue(), "3");
        await page.locator("#front-pitch").focus();
        await page.keyboard.press("Home");
        assert.equal(await page.locator("#measure-halved").isDisabled(), true);
        assert.equal(await page.locator("#measure-half-hint").isVisible(), true);
        await page.locator("#measure-equal-example").click();
        await page.locator("#measure-equal").uncheck();
        await page.locator("#flank-pitch").focus();
        await page.keyboard.press("Home");
        assert.equal(await page.locator("#flank-pitch").inputValue(), "1.25");
        await page.locator("#measure-basis").selectOption("record");
        assert.equal(await page.locator("[data-trial-column]").count(), 42);
        await page.locator("#temple").selectOption("aegina-temple-of-aphaia");
        assert.equal(await page.locator("[data-trial-column]").count(), 32);
        assert.match(await page.locator("#measure-premise").textContent(), /Aphaia.*6 × 12/);
        await page.locator("#include-uncertain").check();
        await page.locator("#temple").selectOption("samos-temple-c");
        assert.match(await page.locator("#measure-premise").textContent(), /uncertain restoration/);
        await page.locator("#temple").selectOption("selinus-temple-c");
        await page.locator("#measure-equal-example").click();
        await page.getByLabel("Outside shaft faces", { exact: true }).check();
        const link = page.url();
        await page.reload();
        assert.equal(await page.locator("#measure-basis").inputValue(), "record");
        assert.equal(await page.locator("#include-uncertain").isChecked(), true);
        assert.equal(await page.locator("#temple").inputValue(), "selinus-temple-c");
        assert.equal(
          await page.getByLabel("Outside shaft faces", { exact: true }).isChecked(),
          true,
        );
        await page.locator("#measure-zoom").click();
        const frame = page.locator(".measure-frame");
        assert.equal(await frame.evaluate((e) => e.scrollWidth > e.clientWidth), true);
        await frame.focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(() => document.querySelector(".measure-frame").scrollLeft > 0);
        await page.locator("#measure-zoom").click();
        await page
          .locator("#count-measuring")
          .evaluate((e) => e.scrollIntoView({ block: "start" }));
        await page.screenshot({ path: `${output}/${id}.png` });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        const a11y = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          a11y.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
          [],
        );
        await page.locator("#count-open-source").click();
        await page.locator("#drill-source-image").filter({ visible: true }).waitFor();
        assert.equal(
          await page.locator("#drill-source-image").evaluate((e) => e.naturalWidth > 1000),
          true,
        );
        await page.locator("[data-source-close]").click();
        assert.equal(
          await page.locator("#count-open-source").evaluate((e) => e === document.activeElement),
          true,
        );
        const files = {};
        for (const [selector, suffix] of [
          ["#save-measure-svg", "svg"],
          ["#save-measure-csv", "csv"],
          ["#save-count", "html"],
        ])
          files[suffix] = await download(page, selector, `${output}/${id}.${suffix}`);
        const html = await readFile(files.html, "utf8");
        assert.match(html, /data-source-page="69"/);
        assert.match(html, /font-src data:/);
        assert.match(html, /PolyForm Noncommercial License 1.0.0/);
        const saved = await context.newPage();
        const remote = [];
        saved.on("request", (r) => {
          if (/^https?:/.test(r.url())) remote.push(r.url());
        });
        saved.on("pageerror", (e) => errors.push(e.message));
        await context.setOffline(true);
        await saved.goto(pathToFileURL(files.html).href);
        await saved.evaluate(() => document.fonts.ready);
        assert.equal(
          await saved
            .locator("[data-source-page]")
            .evaluate((e) => e.complete && e.naturalWidth > 1000),
          true,
        );
        assert.equal(await saved.evaluate(() => document.fonts.check("19px CountReading")), true);
        assert.equal(await saved.locator("script").count(), 0);
        assert.equal(
          await saved.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        const embedded = await download(
          saved,
          'a[download="embater-count-trial.csv"]',
          `${output}/${id}-embedded.csv`,
        );
        assert.equal(await readFile(embedded, "utf8"), await readFile(files.csv, "utf8"));
        await saved.locator(".trial-figure").screenshot({ path: `${output}/${id}-saved.png` });
        if (engine === "chromium" && width === 1440 && colorScheme === "light")
          await saved.pdf({ path: `${output}/reading.pdf`, format: "A4", printBackground: true });
        assert.deepEqual(remote, []);
        await saved.close();
        await context.setOffline(false);
        await page.waitForFunction(async () => {
          const reg = await navigator.serviceWorker.ready;
          return !!navigator.serviceWorker.controller && reg.active?.state === "activated";
        });
        await page
          .locator("#offline-status")
          .filter({ hasText: /available offline|saved for offline|ready offline/i })
          .waitFor({ timeout: 180000 });
        await context.setOffline(true);
        await page.reload();
        await page
          .locator("#measure-result")
          .filter({ hasText: /Outside shaft faces/ })
          .waitFor();
        assert.equal(await page.locator("#measure-basis").inputValue(), "record");
        await page.locator("#count-open-source").click();
        await page.locator("#drill-source-image").filter({ visible: true }).waitFor();
        await download(page, "#save-count", `${output}/${id}-offline.html`);
        assert.deepEqual(errors, []);
        results.push({
          id,
          link,
          files,
          remoteRequestsFromSavedReading: remote,
          errors,
          offline: true,
          axe: "no violations",
        });
        await context.close();
        console.log(`${id}: controls, exact reopen, source, downloads, saved file, offline passed`);
      }
  } finally {
    await browser.close();
  }
}
await writeFile(`${output}/browser.json`, `${JSON.stringify(results, null, 2)}\n`);
