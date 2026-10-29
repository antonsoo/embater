import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4422/embater/";
const output = resolve(process.argv[3] ?? "docs/review/count");
await mkdir(output, { recursive: true });
const receipts = [];
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
          acceptDownloads: true,
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(new URL("compare.html", base).href);
        await page
          .locator("#count-result")
          .filter({ hasText: "17 recorded, 11 predicted: 6 more" })
          .waitFor();
        assert.equal(await page.locator('[data-diagram="11"] circle').count(), 30);
        assert.equal(await page.locator('[data-diagram="17"] circle').count(), 42);
        const gapTally = await page.locator("#count-tally").innerText();
        await page.getByLabel("The columns · a trial reading", { exact: true }).check();
        assert.match(await page.locator("#count-equation").innerText(), /12 columns → 11 spaces/);
        assert.equal(await page.locator('[data-diagram="12"] circle').count(), 32);
        await page.locator("#temple").selectOption("aegina-temple-of-aphaia");
        assert.match(await page.locator("#count-result").innerText(), /counts agree: 12/);
        const doubledTally = await page.locator("#count-tally").innerText();
        await page.getByLabel("The spaces · Vitruvius", { exact: true }).check();
        assert.match(
          await page.locator("#count-result").innerText(),
          /12 recorded, 11 predicted: 1 more/,
        );
        await page.locator("#temple").selectOption("priene-temple-of-athena");
        assert.match(await page.locator("#count-result").innerText(), /counts agree: 11/);
        const defaults = await page.locator("[data-temple]").count();
        assert.equal(defaults, 29);
        await page.locator("#include-uncertain").check();
        assert.equal(await page.locator("[data-temple]").count(), 31);
        const uncertain = page.locator("[data-temple]").filter({ hasText: "(?)" }).first();
        await uncertain.focus();
        await page.keyboard.press("Enter");
        assert.match(await page.locator("#count-result").innerText(), /uncertain/);
        assert.equal(
          await page.locator("#temple").evaluate((e) => e === document.activeElement),
          true,
        );
        await page.locator("#temple").selectOption("selinus-temple-c");
        await page.locator("#count-plate").scrollIntoViewIfNeeded();
        const a11y = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${output}/${id}.png`, fullPage: false });
        const downloads = [];
        for (const [button, suffix] of [
          ["#save-count", "html"],
          ["#save-count-svg", "svg"],
          ["#save-count-csv", "csv"],
        ]) {
          const event = page.waitForEvent("download");
          await page.locator(button).click();
          const download = await event;
          const file = `${output}/${id}.${suffix}`;
          await download.saveAs(file);
          downloads.push(file);
        }
        const html = await readFile(downloads[0], "utf8");
        assert.match(html, /Selinus, Temple C/);
        assert.match(html, /totidem bis/);
        assert.match(html, /CC BY-SA 3.0 US/);
        await page.waitForFunction(
          () => document.querySelector("#offline-status")?.textContent.startsWith("Ready offline"),
          null,
          { timeout: 25000 },
        );
        assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller));
        await context.setOffline(true);
        for (const file of [
          "index.html",
          "world.html",
          "plans.html",
          "drill.html",
          "compare.html?temple=priene-temple-of-athena&count=gaps",
        ]) {
          await page.goto(new URL(file, base).href);
          await page.locator("main h1").waitFor();
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            true,
            `overflow: ${file}`,
          );
        }
        assert.match(await page.locator("#count-result").innerText(), /counts agree: 11/);
        const portable = await context.newPage();
        const requests = [];
        portable.on("request", (request) => {
          if (/^https?:/.test(request.url())) requests.push(request.url());
        });
        await portable.goto(pathToFileURL(downloads[0]).href);
        assert.match(await portable.locator("body").innerText(), /17/);
        assert.deepEqual(requests, []);
        assert.equal(
          await portable.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await portable.close();
        assert.deepEqual(errors, []);
        receipts.push({
          engine,
          width,
          colorScheme,
          gapTally,
          doubledTally,
          records: 31,
          downloads: downloads.map((f) => f.split("/").pop()),
          offlinePages: 5,
          portableNetworkRequests: 0,
          errors,
        });
        await context.close();
        console.log(
          id,
          "count comparison, downloads, offline navigation and accessibility verified",
        );
        await writeFile(
          `${output}/browser.json`,
          JSON.stringify({ base, receipts }, null, 2) + "\n",
        );
      }
  } finally {
    await browser.close();
  }
}
