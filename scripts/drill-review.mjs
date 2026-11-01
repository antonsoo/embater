import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";
import { buildDecks } from "../src/core/drill-decks.ts";

// The source entries supply expected words. Do not use question grouping or grading
// to decide which browser answers should be correct. This is UI review, not a
// separate philological oracle for the existing vocabulary.
const decks = buildDecks();
const base = process.argv[2] ?? "http://127.0.0.1:4492/embater/";
const output = resolve(process.argv[3] ?? "/tmp/claude-1000/embater-drill/browser");
await mkdir(output, { recursive: true });
const receipts = [];
const currentBoxes = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("embater-drill-v2") ?? '{"boxes":{}}').boxes);
const firstWord = (term, lang) => term.words.find((w) => w.lang === lang);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const mode = (page, value) => page.locator(`input[name="mode"][value="${value}"]`).check();
async function fits(page) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "page fits width",
  );
}
async function correctName(page, deck, lang) {
  const selected = await page.locator("#drill-plate .sel").first().getAttribute("data-part");
  const term = deck.terms.find((t) => t.id === selected);
  assert.ok(term);
  const word = firstWord(term, lang);
  assert.ok(word);
  const labels = await page.locator(".opt .opt-native").allTextContents();
  assert.equal(new Set(labels).size, labels.length, "no indistinguishable answers");
  assert.ok(labels.includes(word.word));
  assert.deepEqual(
    new Set(
      await page.locator(".opt .opt-native").evaluateAll((nodes) => nodes.map((n) => n.lang)),
    ),
    new Set([lang]),
  );
  const answer = page
    .locator(".opt")
    .filter({ has: page.locator(".opt-native", { hasText: word.word }) });
  // Use exact text matching when a shorter Latin headword is part of another.
  const buttons = await page.locator(".opt").all();
  const index = labels.indexOf(word.word);
  await buttons[index].focus();
  await page.keyboard.press("Enter");
  assert.match(await page.locator(".verdict").textContent(), /^Right\./);
  assert.equal((await answer.count()) >= 1, true);
  return word.word;
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
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript(() => {
          Math.random = () => 0.00001;
          const clipboard = navigator.clipboard;
          if (clipboard) {
            const original = clipboard.writeText.bind(clipboard);
            clipboard.writeText = async (text) => {
              window.__copiedExercise = text;
              return original(text);
            };
          }
        });
        await page.goto(base);
        await page.getByRole("link", { name: "Drill", exact: true }).focus();
        await page.keyboard.press("Enter");
        await page.waitForURL("**/drill.html");
        await page.locator("#drill-language").waitFor();
        const entry = page.url();
        let studyParts = 0;
        let languageExercises = 0;
        let singleNameCases = 0;
        for (const deck of decks) {
          await page.locator(`input[name="deck"][value="${deck.id}"]`).check();
          const expectedLanguages = [
            ...new Set(deck.terms.flatMap((t) => t.words.map((w) => w.lang))),
          ];
          assert.deepEqual(
            await page
              .locator("#drill-language option")
              .evaluateAll((nodes) => nodes.map((n) => n.value)),
            expectedLanguages,
          );
          for (const lang of expectedLanguages) {
            await page.locator("#drill-language").selectOption(lang);
            await mode(page, "study");
            const before = await currentBoxes(page);
            const terms = deck.terms.filter((t) => firstWord(t, lang));
            for (const term of terms) {
              await page.locator(`[data-term="${term.id}"]`).focus();
              await page.keyboard.press("Enter");
              assert.equal(await page.locator(".card-title").textContent(), term.english);
              assert.ok(
                (await page.locator("#drill-feedback").textContent()).includes(
                  firstWord(term, lang).word,
                ),
              );
              assert.ok(
                (await page.locator(`#drill-plate [data-part="${term.id}"].sel`).count()) > 0,
                `${id}/${deck.id}/${lang}/${term.id}: study selection stays with its word card`,
              );
              studyParts++;
            }
            assert.deepEqual(await currentBoxes(page), before, "study never changes boxes");
            await mode(page, "name");
            const distinct = new Set(terms.map((t) => firstWord(t, lang).word));
            if (distinct.size === 1) {
              assert.match(await page.locator("#drill-q").textContent(), /One name/);
              singleNameCases++;
            } else {
              await correctName(page, deck, lang);
              assert.equal(
                await page.locator(".next").evaluate((node) => node === document.activeElement),
                true,
              );
              await page.keyboard.press("Enter");
              assert.equal(
                await page
                  .locator(".opt")
                  .first()
                  .evaluate((node) => node === document.activeElement),
                true,
              );
              const beforeReveal = await currentBoxes(page);
              await page.locator(".drill-reveal").click();
              assert.deepEqual(
                await currentBoxes(page),
                beforeReveal,
                "reveal never changes boxes",
              );
            }
            await mode(page, "find");
            const expectedWord = await page.locator(".find-word .opt-native").textContent();
            assert.equal(await page.locator(".find-word .opt-native").getAttribute("lang"), lang);
            assert.equal(await page.locator("[data-term]").count(), terms.length);
            const beforeFocus = await currentBoxes(page);
            await page.locator("[data-term]").first().focus();
            await page.keyboard.press("End");
            assert.equal(
              await page
                .locator("[data-term]")
                .last()
                .evaluate((node) => node === document.activeElement),
              true,
            );
            await page.keyboard.press("Home");
            await page.keyboard.press("ArrowRight");
            assert.deepEqual(await currentBoxes(page), beforeFocus, "inspection does not grade");
            assert.equal(await page.locator(".verdict").count(), 0);
            assert.ok((await page.locator("#drill-plate .inspect").count()) > 0);
            const matches = terms.filter((t) => firstWord(t, lang).word === expectedWord);
            assert.ok(matches.length > 0);
            const chosen = matches.at(-1);
            await page.locator(`[data-term="${chosen.id}"]`).focus();
            await page.keyboard.press("Space");
            assert.match(await page.locator(".verdict").textContent(), /^Right\./);
            for (const term of matches)
              assert.ok(
                (await page.locator(`#drill-plate [data-part="${term.id}"].sel`).count()) > 0,
                `${id}/${deck.id}/${lang}/${term.id}: study selection stays with its word card`,
              );
            await fits(page);
            languageExercises++;
          }
        }
        assert.equal(page.url(), entry, "exercise controls leave the URL alone until sharing");

        // A literal regression fixture for the reported ambiguity, in both directions.
        await page.goto(new URL("drill.html#deck=egypt&lang=egy&mode=find", base).href);
        assert.equal(await page.locator(".find-word .opt-native").textContent(), "wꜣḏ");
        await page.locator('[data-term="papyriform-open"]').focus();
        await page.keyboard.press("Enter");
        assert.match(await page.locator(".verdict").textContent(), /^Right\./);
        assert.match(await page.locator("#drill-feedback").textContent(), /either form counts/);
        await page.screenshot({ path: `${output}/${id}-papyrus.png`, fullPage: true });
        await mode(page, "name");
        assert.deepEqual(
          (await new AxeBuilder({ page }).analyze()).violations,
          [],
          "name exercise accessibility",
        );
        const papyrusLabels = await page.locator(".opt .opt-native").allTextContents();
        assert.equal(papyrusLabels.filter((text) => text === "wꜣḏ").length, 1);
        await correctName(
          page,
          decks.find((d) => d.id === "egypt"),
          "egy",
        );

        // Explicitly inspect an actual Latin source passage, not just a correct label.
        await page.goto(new URL("drill.html#deck=doric&lang=la&mode=study", base).href);
        await page.locator('[data-term="flute"]').focus();
        await page.keyboard.press("Enter");
        await page.locator(".rule summary").first().click();
        assert.match(
          await page.locator("#drill-feedback .rule-la").first().textContent(),
          /striis/,
        );
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${output}/${id}-study.png`, fullPage: true });
        const a11y = (await new AxeBuilder({ page }).analyze()).violations.map(
          ({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map((n) => n.target) }),
        );
        assert.deepEqual(a11y, []);

        await mode(page, "find");
        assert.deepEqual(
          (await new AxeBuilder({ page }).analyze()).violations,
          [],
          "find exercise accessibility",
        );
        const unchangedWord = await page.locator(".find-word").textContent();
        await page.locator("#drill-romanized").uncheck();
        await page.locator("#drill-romanized").check();
        assert.equal(await page.locator(".find-word").textContent(), unchangedWord);
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${output}/${id}-find.png`, fullPage: true });
        await page.locator(".drill-keep summary").click();
        const saved = await currentBoxes(page);
        const downloading = page.waitForEvent("download");
        await page.locator("#drill-save").click();
        const download = await downloading;
        assert.equal(await download.failure(), null);
        assert.equal(download.suggestedFilename(), "embater-vocabulary-progress.json");
        const progressFile = `${output}/${id}-progress.json`;
        await download.saveAs(progressFile);
        const bytes = await readFile(progressFile);
        assert.deepEqual(JSON.parse(bytes).boxes, saved);
        await page.locator("#drill-load").setInputFiles({
          name: "fraction.json",
          mimeType: "application/json",
          buffer: Buffer.from(
            JSON.stringify({
              schema: "embater-vocabulary",
              version: 1,
              boxes: { "doric/la/find/shaft": 1.5 },
            }),
          ),
        });
        await page
          .locator("#drill-file-status")
          .filter({ hasText: /whole number/ })
          .waitFor();
        assert.deepEqual(await currentBoxes(page), saved, "failed import preserves all answers");
        await page.locator("#drill-load").setInputFiles({
          name: "empty.json",
          mimeType: "application/json",
          buffer: Buffer.from('{"schema":"embater-vocabulary","version":1,"boxes":{}}'),
        });
        await page
          .locator("#drill-file-status")
          .filter({ hasText: /^Restored/ })
          .waitFor();
        assert.deepEqual(await currentBoxes(page), {});
        await page.locator("#drill-load").setInputFiles(progressFile);
        await page
          .locator("#drill-file-status")
          .filter({ hasText: /^Restored/ })
          .waitFor();
        assert.deepEqual(await currentBoxes(page), saved);
        await page.locator("#drill-link").click();
        await page
          .locator("#drill-file-status")
          .filter({ hasText: /Copied|Copy this/ })
          .waitFor();
        const shared = (await page.locator("#drill-file-status a").count())
          ? await page.locator("#drill-file-status a").getAttribute("href")
          : await page.evaluate(() => window.__copiedExercise);
        const reopen = await context.newPage();
        await reopen.goto(shared);
        assert.equal(await reopen.locator("#drill-language").inputValue(), "la");
        assert.equal(await reopen.locator('input[name="mode"]:checked').inputValue(), "find");
        assert.deepEqual(await currentBoxes(reopen), saved);
        await reopen.close();

        await page
          .locator("#offline-status")
          .filter({ hasText: /^Ready offline/ })
          .waitFor({ timeout: 30000 });
        assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), true);
        const inventory = await page.evaluate(async () => {
          const names = (await caches.keys()).filter((n) => n.startsWith("embater-"));
          return Promise.all(
            names.map(async (name) => ({
              name,
              files: (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname),
            })),
          );
        });
        assert.equal(inventory.length, 1);
        assert.ok(inventory[0].files.some((p) => /drill-.+\.js$/.test(p)));
        await context.setOffline(true);
        await page.reload();
        await page.locator("#drill-q").waitFor();
        await page.locator("#drill-language").selectOption("la");
        await mode(page, "study");
        await page.locator('[data-term="flute"]').click();
        assert.match(await page.locator("#drill-feedback").textContent(), /stria/);
        await mode(page, "find");
        await page.locator("[data-term]").first().focus();
        await page.keyboard.press("Enter");
        assert.ok((await page.locator(".verdict").count()) === 1);
        await page.locator(".drill-keep summary").click();
        const offlineDownload = page.waitForEvent("download");
        await page.locator("#drill-save").click();
        assert.equal(await (await offlineDownload).failure(), null);
        await fits(page);
        assert.deepEqual(errors, []);
        receipts.push({
          id,
          studyParts,
          languageExercises,
          singleNameCases,
          papyrusEitherFormAccepted: true,
          uniqueNameOptions: true,
          focusDoesNotGrade: true,
          realProgressDownload: { bytes: bytes.length, sha256: hash(bytes) },
          invalidRestorePreservesProgress: true,
          validRestoreAndReload: true,
          explicitShareReopened: true,
          offlineController: true,
          offlineFiles: inventory[0].files.length,
          offlineStudyAnswerAndDownload: true,
          a11y,
          errors,
        });
        await writeFile(
          `${output}/review.json`,
          `${JSON.stringify({ base, receipts }, null, 2)}\n`,
        );
        console.log(
          `${id}: ${studyParts} study parts, ${languageExercises} language exercises, downloads and offline operation verified`,
        );
        await context.close();
      }
  } finally {
    await browser.close();
  }
}

// Storage can be denied or old data can be damaged. Learning must still operate.
const storageReceipts = [];
const browser = await chromium.launch();
try {
  for (const fixture of ["blocked", "corrupt", "legacy"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript((fixture) => {
      if (fixture === "blocked") {
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("Unavailable", "SecurityError");
          },
        });
      } else if (fixture === "corrupt")
        localStorage.setItem(
          "embater-drill-v2",
          '{"schema":"embater-vocabulary","version":1,"boxes":{"doric/grc/name/shaft":2.5}}',
        );
      else localStorage.setItem("embater-drill-v1", '{"doric/shaft":5}');
      Math.random = () => 0.00001;
    }, fixture);
    await page.goto(new URL("drill.html#deck=doric&lang=la&mode=find", base).href);
    await page.locator("[data-term]").first().focus();
    await page.keyboard.press("Enter");
    assert.match(await page.locator(".verdict").textContent(), /^Right\./);
    if (fixture === "blocked")
      assert.match(await page.locator("#drill-storage").textContent(), /unavailable/);
    if (fixture === "legacy")
      assert.equal(
        await page.evaluate(() => localStorage.getItem("embater-drill-v1")),
        '{"doric/shaft":5}',
      );
    storageReceipts.push({
      fixture,
      answeredCorrectly: true,
      legacyRecordPreserved: fixture === "legacy",
    });
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    Math.random = () => 0.00001;
  });
  await page.goto(new URL("drill.html#deck=egypt&lang=egy&mode=find", base).href);
  await page.locator('[data-term="lotiform"]').click();
  assert.match(await page.locator(".verdict").textContent(), /Not quite/);
  assert.ok((await page.locator('#drill-plate [data-part="lotiform"].miss').count()) > 0);
  assert.ok((await page.locator('#drill-plate [data-part="papyriform-open"].sel').count()) > 0);
  assert.ok((await page.locator('#drill-plate [data-part="papyriform-closed"].sel').count()) > 0);
  assert.equal((await currentBoxes(page))["egypt/egy/find/papyriform-closed"], 1);
  assert.equal(await page.locator("[data-term]:not(:disabled)").count(), 0);
  await context.close();
  await writeFile(
    `${output}/review.json`,
    `${JSON.stringify({ base, receipts, storageReceipts, wrongAnswerAndBothCorrectShapesVerified: true }, null, 2)}\n`,
  );
} finally {
  await browser.close();
}
console.log("Blocked storage, damaged progress and preserved legacy boxes verified.");
