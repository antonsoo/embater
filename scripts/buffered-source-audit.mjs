import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium, firefox } from "playwright";

const build = resolve(process.argv[2] ?? "dist");
const output = resolve(process.argv[3] ?? "/tmp/embater-buffered-source");
await mkdir(output, { recursive: true });
const target = "sources/vocabulary/p71.jpg";
const expected = createHash("sha256")
  .update(await readFile(resolve(build, target)))
  .digest("hex");
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
let slow = false;
let lastData = 0;
let sent = 0;
const rows = [];
const server = createServer(async (req, res) => {
  const name =
    new URL(req.url, "http://local").pathname.replace(/^\/embater\//, "") || "index.html";
  if (name.includes("..")) {
    res.writeHead(400).end();
    return;
  }
  try {
    const bytes = await readFile(resolve(build, name));
    res.writeHead(200, {
      "Content-Type": types[extname(name)] ?? "text/plain",
      "Content-Length": bytes.length,
      "Cache-Control": "no-store",
    });
    res.flushHeaders();
    if (name === target && slow) {
      let offset = 0;
      const send = () => {
        const end = Math.min(offset + 4096, bytes.length);
        res.write(bytes.subarray(offset, end));
        sent += end - offset;
        offset = end;
        lastData = Date.now();
        if (end === bytes.length) {
          clearInterval(timer);
          res.end();
        }
      };
      const timer = setInterval(send, 500);
      res.on("close", () => clearInterval(timer));
      send();
    } else res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
try {
  for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
    if (process.env.EMBATER_ENGINE && engine !== process.env.EMBATER_ENGINE) continue;
    slow = false;
    sent = 0;
    const browser = await launcher.launch();
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.addInitScript(() => {
        const original = window.fetch.bind(window);
        window.bufferedFetches = [];
        window.fetch = (url, options) => {
          if (String(url).includes("/p71.jpg")) {
            const entry = {
              url: String(url),
              cache: options?.cache,
              controller: !!navigator.serviceWorker.controller,
              started: Date.now(),
            };
            window.bufferedFetches.push(entry);
            options?.signal?.addEventListener("abort", () => {
              entry.aborted = Date.now();
              entry.reason = String(options.signal.reason);
            });
          }
          return original(url, options);
        };
      });
      await page.goto(
        `http://127.0.0.1:${server.address().port}/embater/drill.html#deck=ionic&lang=la&mode=study&part=oculus`,
      );
      await page
        .locator("#offline-status")
        .filter({ hasText: /^Ready offline/ })
        .waitFor({ timeout: 60_000 });
      await page.locator('[data-source-rule="ionic-capital"]').first().click();
      await page
        .locator("#drill-source-status")
        .filter({ hasText: /^Complete/ })
        .waitFor();
      await page.evaluate(async (path) => {
        const name = (await caches.keys()).find((x) => x.startsWith("embater-"));
        await (await caches.open(name)).put(`/embater/${path}`, new Response("damaged source"));
        const channel = new MessageChannel();
        navigator.serviceWorker.controller.postMessage(
          { type: "INSPECT_EDITION", invalidate: true },
          [channel.port2],
        );
      }, target);
      await page
        .locator("#offline-status")
        .filter({ hasText: /needs repair/ })
        .waitFor();
      slow = true;
      const start = Date.now();
      console.log(`${engine}: begin 8 KiB/s verified worker replacement`);
      await page.locator("#drill-source-retry").click();
      await page
        .locator("#drill-source-status")
        .filter({ hasText: /^(Complete|The file|A source|The source|Source loading)/ })
        .waitFor({ timeout: 100_000 });
      const status = await page.locator("#drill-source-status").textContent();
      const diagnostics = {
        engine,
        status,
        elapsedMs: Date.now() - start,
        sent,
        lastDataAgoMs: Date.now() - lastData,
        state: await page.evaluate(() => ({
          requests: window.bufferedFetches,
          offline: document.querySelector("#offline-status").textContent,
          controller: navigator.serviceWorker.controller?.scriptURL,
        })),
      };
      await writeFile(
        `${output}/${engine}-diagnostics.json`,
        `${JSON.stringify(diagnostics, null, 2)}\n`,
      );
      assert.match(status, /^Complete/, JSON.stringify(diagnostics));
      const elapsedMs = Date.now() - start;
      assert(elapsedMs > 60_000 && elapsedMs < 95_000);
      assert(Date.now() - lastData < 3000);
      const hash = await page
        .locator("#drill-source-image")
        .evaluate(async (i) =>
          Array.from(
            new Uint8Array(
              await crypto.subtle.digest("SHA-256", await (await fetch(i.src)).arrayBuffer()),
            ),
            (b) => b.toString(16).padStart(2, "0"),
          ).join(""),
        );
      assert.equal(hash, expected);
      await page
        .locator("#offline-status")
        .filter({ hasText: /^Ready offline/ })
        .waitFor();
      await context.setOffline(true);
      await page.reload();
      await page.locator('[data-source-rule="ionic-capital"]').first().click();
      await page
        .locator("#drill-source-status")
        .filter({ hasText: /^Complete/ })
        .waitFor();
      rows.push({
        engine,
        elapsedMs,
        sent,
        network:
          "actual JPEG, one 4096-byte chunk every 500 ms; designated verifying client takes the network stream, then the worker independently hashes the offered cache replacement",
        correctedSourceSha256: hash,
        repairedEditionReady: true,
        sourceAvailableAfterOfflineReload: true,
      });
      await writeFile(`${output}/buffered.json`, `${JSON.stringify(rows, null, 2)}\n`);
      console.log(`${engine}: repaired source read in ${elapsedMs} ms and reopened offline`);
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
