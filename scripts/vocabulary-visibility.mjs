import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { buildDecks } from "../src/core/drill-decks.ts";

// Selected/plain image pairs retain evidence about painted pixels, not just nodes.
// Compare the PNG pairs independently; a DOM class alone does not establish visibility.
const base = process.argv[2] ?? "http://127.0.0.1:4492/embater/";
const output = resolve(process.argv[3] ?? "/tmp/embater-vocabulary-visibility");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const rows = [];
try {
  const page = await browser.newPage({
    viewport: { width: 375, height: 1000 },
    reducedMotion: "reduce",
  });
  for (const deck of buildDecks()) {
    for (const term of deck.terms) {
      const language = term.words[0].lang;
      const name = `${deck.id}-${term.id}`;
      await page.goto(
        new URL(`drill.html#deck=${deck.id}&lang=${language}&mode=study&part=${term.id}`, base)
          .href,
      );
      await page.locator('[data-view="detail"]').click();
      await page.locator('[data-pan="reset"]').click();
      await page.locator('[data-pan="in"]').click();
      const viewBox = await page.locator("#drill-plate svg").getAttribute("viewBox");
      await page
        .locator("#drill-plate")
        .screenshot({ path: resolve(output, `${name}-selected.png`) });
      await page.locator("#drill-plate .sel").evaluateAll((nodes) =>
        nodes.forEach((node) => {
          node.classList.remove("sel");
        }),
      );
      await page.locator("#drill-plate").screenshot({ path: resolve(output, `${name}-plain.png`) });
      rows.push({ deck: deck.id, part: term.id, language, viewBox, name });
    }
  }
} finally {
  await browser.close();
}
await writeFile(resolve(output, "cases.json"), `${JSON.stringify(rows, null, 2)}\n`);
console.log(`${rows.length} selected/plain detail image pairs saved`);
