import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4493/embater/";
const output = resolve(process.argv[3] ?? "/tmp/claude-1000/embater-roof/browser");
await mkdir(output, { recursive: true });
const receipts = [];
for (const [engine, launch] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await launch.launch();
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
      await page.goto(`${base}#order=doric&columns=6&view=roof`);
      await page.locator("#roof-heading").waitFor();
      const trial = page.getByRole("slider", { name: "Blue trial height" });
      await trial.focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await trial.inputValue(), "0.525");
      await page.getByRole("button", { name: "Match Vitruvius’s corner height" }).click();
      assert.equal(await trial.inputValue(), "1");
      assert.match(await page.locator("#roof-result").textContent(), /now matches/);
      assert.equal(
        await page
          .locator('#plate [data-part="roof-trial"]')
          .evaluate((el) => getComputedStyle(el).stroke),
        "rgb(31, 78, 156)",
      );
      await page.getByRole("button", { name: "Try a middle ornament only h/8 tall" }).click();
      assert.equal(await trial.inputValue(), "0.125");
      assert.match(await page.locator("#roof-result").textContent(), /88.89% shorter/);
      await page.getByRole("button", { name: "Match Vitruvius’s middle height" }).click();
      assert.equal(await trial.inputValue(), "1.125");
      await page.locator('[name="roof-target"][value="corner"]').check();
      await page.getByRole("button", { name: "Match Vitruvius’s corner height" }).click();
      const firstTable = await page.locator("#roof-measures").textContent();
      await page.locator('input[name="columns"][value="8"]').check();
      assert.notEqual(await page.locator("#roof-measures").textContent(), firstTable);
      assert.equal(await trial.inputValue(), "1");
      await page
        .getByRole("button", { name: "Read complete printed page 74", exact: true })
        .click();
      await page
        .locator("#drill-source-status")
        .filter({ hasText: "Complete printed page 74." })
        .waitFor();
      const source = await page.locator("#drill-source-image").evaluate(async (el) => {
        const bytes = await (await fetch(el.src)).arrayBuffer();
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
        return { hash, width: el.naturalWidth, height: el.naturalHeight };
      });
      assert.equal(source.hash, "e0d002b98c95e98774b8e4051e47b0de235a161aced5928c55e839cba6ca13bd");
      await trial.focus();
      await page.keyboard.press("Home");
      assert.equal(await trial.inputValue(), "0.125");
      assert.equal(
        await page.locator("#drill-source").isVisible(),
        true,
        "source stays open while measuring",
      );
      await page.getByRole("button", { name: "Close printed source" }).click();
      // All three orders use their own current roof; Tuscan keeps its distinct IV.7 model.
      for (const order of ["ionic", "corinthian", "doric"]) {
        await page.locator(`input[name="order"][value="${order}"]`).check();
        assert.equal(await page.locator('input[name="view"][value="roof"]').isChecked(), true);
        assert.ok((await page.locator("#roof-measures").textContent()).includes("9h/8"));
      }
      await page.locator('input[name="order"][value="tuscan"]').check();
      assert.equal(await page.locator("#roof-reading").isVisible(), false);
      assert.equal(await page.locator('input[name="view"][value="roof"]').count(), 0);
      await page.goto(
        `${base}#order=ionic&columns=4&spacing=eustyle&feet=2.5&view=roof&trial=0.65`,
      );
      assert.equal(await trial.inputValue(), "0.65");
      assert.equal(
        await page.locator('#key [data-part="shaft"]').count(),
        0,
        "roof key contains visible parts only",
      );
      const before = await page.locator('#plate [data-part="roof-trial"]').getAttribute("height");
      const downloads = {};
      for (const [id, ext] of [
        ["roof-svg", "svg"],
        ["roof-csv", "csv"],
      ]) {
        const waiting = page.waitForEvent("download");
        await page.locator(`#${id}`).click();
        const download = await waiting;
        assert.equal(await download.failure(), null);
        const filename = resolve(output, `${engine}-${width}.${ext}`);
        await download.saveAs(filename);
        const bytes = await readFile(filename);
        downloads[ext] = {
          filename,
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        };
      }
      const linked = await context.newPage();
      await linked.goto(page.url());
      assert.equal(await linked.locator('[name="roof-trial"]').inputValue(), "0.65");
      assert.equal(
        await linked.locator('#plate [data-part="roof-trial"]').getAttribute("height"),
        before,
      );
      await linked.close();
      await page.locator("#roof-link").click();
      await page
        .locator("#roof-file-status")
        .filter({ hasText: /copied|Copy the current address/ })
        .waitFor();
      const clipboardStatus = await page.locator("#roof-file-status").textContent();
      assert.ok(
        clipboardStatus.includes("copied") || clipboardStatus.includes("Copy the current address"),
      );
      await page.goto(`${base}#order=ionic&columns=4&view=roof&trial=1.125&target=middle`);
      assert.equal(await page.locator('[name="roof-target"][value="middle"]').isChecked(), true);
      assert.equal(await trial.inputValue(), "1.125");
      assert.equal(
        await page.locator('#plate [data-part="roof-trial"]').getAttribute("x"),
        await page.locator('#plate rect[data-part="acroterion"]').nth(1).getAttribute("x"),
      );
      for (const [id, ext] of [
        ["roof-svg", "svg"],
        ["roof-csv", "csv"],
      ]) {
        const waiting = page.waitForEvent("download");
        await page.locator(`#${id}`).click();
        const item = await waiting;
        assert.equal(await item.failure(), null);
        await item.saveAs(resolve(output, `${engine}-${width}-middle.${ext}`));
      }
      await page.goto(
        `${base}#order=ionic&columns=4&spacing=eustyle&feet=2.5&view=roof&trial=0.65`,
      );
      await page.getByRole("button", { name: "Enlarge roof", exact: true }).click();
      assert.equal(await page.evaluate(() => document.activeElement?.id), "plate");
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(300);
      assert.ok((await page.locator("#plate").evaluate((el) => el.scrollLeft)) > 0);
      await page
        .locator("#plate")
        .screenshot({ path: resolve(output, `${engine}-${width}-enlarged.png`) });
      await page.getByRole("button", { name: "Fit roof", exact: true }).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const axe = await new AxeBuilder({ page }).analyze();
      const serious = axe.violations.filter((v) => ["serious", "critical"].includes(v.impact));
      assert.deepEqual(
        serious.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        [],
      );
      await page
        .locator(".plate-wrap")
        .screenshot({ path: resolve(output, `${engine}-${width}-desk.png`) });
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
      await page.locator("#roof-heading").waitFor();
      assert.equal(await trial.inputValue(), "0.65");
      await page.getByRole("button", { name: "Match Vitruvius’s corner height" }).click();
      await page
        .getByRole("button", { name: "Read complete printed page 74", exact: true })
        .click();
      await page
        .locator("#drill-source-status")
        .filter({ hasText: "Complete printed page 74." })
        .waitFor();
      const downloadWaiting = page.waitForEvent("download");
      await page.locator("#roof-svg").click();
      const offlineDownload = await downloadWaiting;
      assert.equal(await offlineDownload.failure(), null);
      await offlineDownload.saveAs(resolve(output, `${engine}-${width}-offline.svg`));
      await context.setOffline(false);
      const saved = await context.newPage();
      await saved.goto(pathToFileURL(downloads.svg.filename).href);
      assert.equal(await saved.locator("svg").count(), 1);
      assert.equal(
        await saved
          .locator(".dim line")
          .first()
          .evaluate((el) => getComputedStyle(el).vectorEffect),
        "non-scaling-stroke",
      );
      await saved.screenshot({ path: resolve(output, `${engine}-${width}-saved.png`) });
      await saved.close();
      assert.deepEqual(errors, []);
      receipts.push({
        engine,
        width,
        source,
        downloads,
        keyboard: true,
        sharedLink: true,
        clipboardStatus,
        middleTargetLinkAndDownloads: true,
        offlineSourceAndDownload: true,
        seriousAccessibilityViolations: serious.length,
        pageErrors: errors,
      });
      await context.close();
      console.log(
        `${engine} ${width}: source, controls, native downloads, link, keyboard, dark, offline, saved SVG passed`,
      );
    }
  } finally {
    await browser.close();
  }
}
await writeFile(resolve(output, "receipts.json"), `${JSON.stringify(receipts, null, 2)}\n`);
