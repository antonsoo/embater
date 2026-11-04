import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4426/embater/";
const output = resolve(process.argv[3] ?? "/tmp/embater-count-reference");
await mkdir(output, { recursive: true });
const rows = [];
async function download(page, selector, path) {
  const event = page.waitForEvent("download");
  await page.locator(selector).click();
  const file = await event;
  await file.saveAs(path);
  return readFile(path);
}
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const width of [1440, 375])
      for (const colorScheme of ["light", "dark"]) {
        const id = `${engine}-${width}-${colorScheme}`;
        const context = await browser.newContext({
          viewport: { width, height: 1100 },
          colorScheme,
          acceptDownloads: true,
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.addInitScript(() => {
          const original = File.prototype.text;
          File.prototype.text = async function () {
            const text = await original.call(this);
            return this.name === "late-count.json"
              ? new Promise((r) => {
                  window.releaseCountFile = () => r(text);
                })
              : text;
          };
        });
        await page.goto(
          new URL(
            "compare.html?temple=priene-temple-of-athena&measure=record&front-pitch=2.55&flank-pitch=2.55",
            base,
          ).href,
        );
        await page.locator("#measure-hold").click();
        const scale = await page.locator("#measure-plate svg").evaluate((e) => e.getScreenCTM().a);
        await page.locator("#measure-halved").click();
        assert.equal(await page.locator("#front-pitch").inputValue(), "2.55");
        assert.equal(await page.locator("#flank-pitch").inputValue(), "1.275");
        assert.equal(await page.locator("[data-trial-column]").count(), 30);
        assert.equal(await page.locator("[data-held-column]").count(), 30);
        assert.match(
          await page.locator("#measure-reference-result").textContent(),
          /Column count unchanged/,
        );
        assert(
          Math.abs(
            (await page.locator("#measure-plate svg").evaluate((e) => e.getScreenCTM().a)) - scale,
          ) < 0.00002,
        );
        await page.reload();
        assert.equal(await page.locator("#flank-pitch").inputValue(), "1.275");
        assert.equal(await page.locator("[data-held-column]").count(), 30);
        await page.getByLabel("Outside shaft faces", { exact: true }).check();
        assert.equal(
          await page
            .locator(".measure-tables .measure-selected")
            .nth(0)
            .locator("th")
            .textContent(),
          "Outside shaft faces",
        );
        assert.equal(
          await page
            .locator(".measure-tables .measure-selected")
            .nth(1)
            .locator("th")
            .textContent(),
          "Corner-column centres",
        );
        await page.locator("#temple").selectOption("aegina-temple-of-aphaia");
        assert.match(
          await page.locator("#measure-reference-result").textContent(),
          /Column count changed: held 6 × 11, current 6 × 12/,
        );
        assert.equal(await page.locator("[data-held-column]").count(), 30);
        await page.locator("#temple").selectOption("priene-temple-of-athena");
        await page.getByLabel("Corner-column centres", { exact: true }).check();
        await page.locator("#measure-equal-example").click();
        await page.locator("#measure-hold").click();
        await page.locator("#measure-halved").click();
        const capturedLink = page.url();
        const work = await download(page, "#save-measure-work", `${output}/${id}.json`);
        const parsed = JSON.parse(work);
        assert.equal(parsed.current.trial.flankPitch, 1.5);
        assert.equal(parsed.reference.trial.flankPitch, 3);
        assert.equal(parsed.reference.trial.equal, true);
        await page.locator("#measure-drop").click();
        await page.locator("#front-pitch").focus();
        await page.keyboard.press("End");
        await page.locator("#temple").selectOption("selinus-temple-c");
        await page.locator("#include-uncertain").check();
        await page.getByLabel("The columns · a trial reading", { exact: true }).check();
        await page.locator("#load-measure-work").setInputFiles(`${output}/${id}.json`);
        await page
          .locator("#measure-save-status")
          .filter({ hasText: /Reopened the comparison/ })
          .waitFor();
        assert.equal(page.url(), capturedLink);
        assert.equal(await page.locator("#include-uncertain").isChecked(), false);
        assert.equal(await page.locator("[data-held-column]").count(), 30);
        for (const invalid of [
          { ...parsed, version: 2 },
          { ...parsed, current: { ...parsed.current, flank: 17 } },
          {
            ...parsed,
            current: { ...parsed.current, trial: { ...parsed.current.trial, frontPitch: 3.025 } },
          },
        ]) {
          await page.locator("#load-measure-work").setInputFiles({
            name: "invalid.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(invalid)),
          });
          await page
            .locator("#measure-save-status")
            .filter({ hasText: /unsupported|differs|Nothing was rounded/ })
            .waitFor();
          assert.equal(page.url(), capturedLink);
          assert.equal(await page.locator("[data-held-column]").count(), 30);
        }
        await page
          .locator("#load-measure-work")
          .setInputFiles({ name: "late-count.json", mimeType: "application/json", buffer: work });
        await page.waitForFunction(() => typeof window.releaseCountFile === "function");
        await page.evaluate(() => {
          location.hash = "latin";
          window.releaseCountFile();
        });
        await page
          .locator("#measure-save-status")
          .filter({ hasText: /Reopened the comparison/ })
          .waitFor();
        await page.evaluate(() => {
          history.replaceState(null, "", location.pathname + location.search);
          window.releaseCountFile = undefined;
        });
        await page
          .locator("#load-measure-work")
          .setInputFiles({ name: "late-count.json", mimeType: "application/json", buffer: work });
        await page.waitForFunction(() => typeof window.releaseCountFile === "function");
        await page.locator("#front-pitch").focus();
        await page.keyboard.press("End");
        await page.evaluate(() => window.releaseCountFile());
        await page
          .locator("#measure-save-status")
          .filter({ hasText: /changed while the file opened/ })
          .waitFor();
        assert.equal(await page.locator("#front-pitch").inputValue(), "6");
        await page.locator("#load-measure-work").setInputFiles(`${output}/${id}.json`);
        await page
          .locator("#measure-save-status")
          .filter({ hasText: /Reopened the comparison/ })
          .waitFor();
        assert.equal(page.url(), capturedLink);
        for (const [selector, ext] of [
          ["#save-measure-svg", "svg"],
          ["#save-measure-csv", "csv"],
          ["#save-count", "html"],
        ])
          await download(page, selector, `${output}/${id}.${ext}`);
        await page
          .locator("#count-measuring")
          .evaluate((e) => e.scrollIntoView({ block: "start" }));
        await page.screenshot({ path: `${output}/${id}.png` });
        await page.locator("#measure-table").screenshot({ path: `${output}/${id}-table.png` });
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
        await page
          .locator("#offline-status")
          .filter({ hasText: /^Ready offline/ })
          .waitFor({ timeout: 195000 });
        await context.setOffline(true);
        await page.reload();
        assert.equal(await page.locator("[data-held-column]").count(), 30);
        assert.equal(await page.locator("#flank-pitch").inputValue(), "1.5");
        const offline = await download(page, "#save-measure-work", `${output}/${id}-offline.json`);
        assert.equal(offline.toString(), work.toString());
        const saved = await context.newPage();
        const remote = [];
        saved.on("request", (r) => {
          if (/^https?:/.test(r.url())) remote.push(r.url());
        });
        await saved.goto(pathToFileURL(`${output}/${id}.html`).href);
        await saved.evaluate(() => document.fonts.ready);
        assert.equal(await saved.locator("[data-held-column]").count(), 30);
        assert.equal(await saved.locator("[data-trial-column]").count(), 30);
        assert.equal(
          await saved
            .locator("[data-source-page]")
            .evaluate((e) => e.complete && e.naturalWidth > 1000),
          true,
        );
        assert.equal(await saved.locator("script").count(), 0);
        assert.equal(
          await saved.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        const embeddedWork = await download(
          saved,
          'a[download="embater-count-comparison.json"]',
          `${output}/${id}-embedded.json`,
        );
        const embeddedCsv = await download(
          saved,
          'a[download="embater-count-trial.csv"]',
          `${output}/${id}-embedded.csv`,
        );
        assert.equal(embeddedWork.toString(), work.toString());
        assert.equal(embeddedCsv.toString(), await readFile(`${output}/${id}.csv`, "utf8"));
        assert.deepEqual(remote, []);
        if (engine === "chromium" && width === 1440 && colorScheme === "light")
          await saved.pdf({
            path: `${output}/reference-reading.pdf`,
            format: "A4",
            printBackground: true,
          });
        assert.deepEqual(errors, []);
        rows.push({
          id,
          link: capturedLink,
          pairedGeometry: true,
          countChangedSeparately: true,
          exactHalfGrid: true,
          referenceRulerFrozen: true,
          nativeImport: true,
          invalidAndLateImportsPreservedCurrent: true,
          offlineReopen: true,
          nativeEmbeddedWorkMatches: true,
          noPageOverflow: true,
          noAxeViolations: true,
          remoteRequestsFromSavedFile: remote,
          errors,
        });
        await context.close();
        console.log(
          `${id}: held geometry, exact links, native files, refused imports, source and offline passed`,
        );
        await writeFile(`${output}/reference.json`, `${JSON.stringify(rows, null, 2)}\n`);
      }
  } finally {
    await browser.close();
  }
}
