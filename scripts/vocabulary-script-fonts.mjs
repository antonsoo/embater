import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4492/embater/";
const output = resolve(process.argv[3] ?? "/tmp/embater-script-fonts");
await mkdir(output, { recursive: true });
const b = await chromium.launch();
const rows = [];
try {
  const p = await b.newPage({ viewport: { width: 375, height: 1000 } });
  for (const [deck, language, part] of [
    ["egypt", "egy", "papyriform-open"],
    ["persia", "peo", "stuna"],
    ["india", "sa", "pradakshina"],
    ["china", "zh", "dougong"],
  ]) {
    await p.goto(
      new URL(`drill.html#deck=${deck}&lang=${language}&mode=study&part=${part}`, base).href,
    );
    const node = p.locator(`#drill-feedback .word-head [lang="${language}"]`).first();
    await node.waitFor();
    await p.evaluate(() => document.fonts.ready);
    const cdp = await p.context().newCDPSession(p);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument");
    const { nodeId } = await cdp.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: `#drill-feedback .word-head [lang="${language}"]`,
    });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    assert(
      fonts.some((f) => f.isCustomFont && f.familyName.startsWith("Embater")),
      "selected script uses its retained font",
    );
    await cdp.detach();
    await p.locator('[data-view="detail"]').click();
    const waiting = p.waitForEvent("download");
    await p.locator("#drill-save-reading").click();
    const file = await waiting;
    assert.equal(await file.failure(), null);
    const path = resolve(output, `${deck}.html`);
    await file.saveAs(path);
    const html = await readFile(path, "utf8");
    assert(!/<script\b/i.test(html));
    const context = await b.newContext({
      javaScriptEnabled: false,
      viewport: { width: 375, height: 1000 },
    });
    await context.setOffline(true);
    const native = await context.newPage();
    const requests = [];
    native.on("request", (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await native.goto(pathToFileURL(path).href);
    await native.screenshot({ path: resolve(output, `${deck}.png`), fullPage: true });
    assert.deepEqual(requests, []);
    await context.close();
    rows.push({
      deck,
      language,
      part,
      fonts,
      htmlBytes: Buffer.byteLength(html),
      automaticHttpRequests: requests,
    });
  }
} finally {
  await b.close();
}
await writeFile(resolve(output, "review.json"), `${JSON.stringify(rows, null, 2)}\n`);
console.log("Four script families used retained fonts and opened offline without scripts");
