import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium, firefox } from "playwright";

const build = resolve(process.argv[2] ?? "dist");
const output = resolve(process.argv[3] ?? "/tmp/embater-source-priority");
const requireReady = process.env.REQUIRE_SOURCE_READY === "1";
await mkdir(output, { recursive: true });
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
};
const source = await readFile(resolve(build, "sources/vocabulary/p71.jpg"));
const sourceHash = createHash("sha256").update(source).digest("hex");
const rows = [];
async function site(failInstall = false) {
  let fast = failInstall,
    fail = failInstall,
    cursor = 0,
    peak = 0,
    sent = 0;
  const queue = [];
  const timer = setInterval(() => {
    for (let n = 0; n < queue.length; n++) {
      cursor %= queue.length;
      const job = queue[cursor];
      if (job.response.destroyed) {
        queue.splice(cursor, 1);
        continue;
      }
      const end = Math.min(job.offset + 4096, job.bytes.length);
      job.response.write(job.bytes.subarray(job.offset, end));
      sent += end - job.offset;
      job.offset = end;
      if (end === job.bytes.length) {
        job.response.end();
        queue.splice(cursor, 1);
      } else cursor++;
      break;
    }
  }, 8);
  const server = createServer(async (req, res) => {
    try {
      const path =
        new URL(req.url, "http://local").pathname.replace(/^\/embater\//, "") || "index.html";
      if (path.includes("..")) {
        res.writeHead(400).end();
        return;
      }
      if (fail && path === "sources/vocabulary/p62.jpg") {
        res.writeHead(503, { "Cache-Control": "no-store" }).end("Injected installation failure");
        return;
      }
      const bytes = await readFile(resolve(build, path));
      res.writeHead(200, {
        "Content-Type": types[extname(path)] ?? "application/octet-stream",
        "Content-Length": bytes.length,
        "Cache-Control": "no-store",
      });
      if (extname(path) === ".jpg" && !fast) {
        queue.push({ response: res, bytes, offset: 0 });
        peak = Math.max(peak, queue.length);
      } else res.end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    base: `http://127.0.0.1:${server.address().port}/embater/`,
    stats: () => ({ peakImageStreams: peak, throttledBytesSent: sent, queuedImages: queue.length }),
    accelerate() {
      fast = true;
      fail = false;
      for (const j of queue) {
        if (!j.response.destroyed) j.response.end(j.bytes.subarray(j.offset));
      }
      queue.length = 0;
    },
    async close() {
      clearInterval(timer);
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    },
  };
}
async function imageHash(p) {
  return p
    .locator("#drill-source-image")
    .evaluate(async (i) =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", await (await fetch(i.src)).arrayBuffer()),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join(""),
    );
}
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const fault of requireReady ? [false, true] : [false]) {
      const server = await site(fault);
      const c = await browser.newContext({ viewport: { width: 375, height: 1000 } });
      const p = await c.newPage();
      try {
        // Gate registration only to isolate foreground reading from background installation.
        await p.addInitScript(() => {
          const register = navigator.serviceWorker.register.bind(navigator.serviceWorker);
          navigator.serviceWorker.register = (...args) =>
            new Promise((resolve, reject) => {
              window.__beginOffline = () => register(...args).then(resolve, reject);
            });
        });
        await p.goto(`${server.base}drill.html#deck=ionic&lang=la&mode=study&part=oculus`);
        await p.evaluate(() => document.fonts.ready);
        await p.evaluate(() => window.__beginOffline());
        await p.waitForTimeout(250);
        const started = Date.now();
        await p.locator('[data-source-rule="ionic-capital"]').first().click();
        await p
          .locator("#drill-source-status")
          .filter({ hasText: /^(Complete|The source|A source)/ })
          .waitFor({ timeout: 22000 });
        const firstStatus = await p.locator("#drill-source-status").textContent();
        const elapsed = Date.now() - started;
        if (!fault && elapsed < 13000) await p.waitForTimeout(13000 - elapsed);
        const during = await p.locator("#offline-status").textContent();
        const stats = server.stats();
        assert(!during.startsWith("Ready offline"), "a partial edition cannot claim ready");
        if (firstStatus.startsWith("Complete")) assert.equal(await imageHash(p), sourceHash);
        if (fault)
          await p
            .locator("#offline-status")
            .filter({ hasText: /did not finish|unavailable/ })
            .waitFor({ timeout: 15000 });
        await p.screenshot({
          path: resolve(output, `${engine}-${fault ? "failed-install" : "partial-install"}.png`),
          fullPage: true,
        });
        server.accelerate();
        if (fault) {
          await p.reload();
          await p.evaluate(() => window.__beginOffline());
        }
        await p
          .locator("#offline-status")
          .filter({ hasText: /^Ready offline/ })
          .waitFor({ timeout: 60000 });
        assert(await p.evaluate(() => !!navigator.serviceWorker.controller));
        if (!fault) {
          await p.locator("#drill-source-retry").click();
          await p
            .locator("#drill-source-status")
            .filter({ hasText: /^Complete printed page 71/ })
            .waitFor();
          assert.equal(await imageHash(p), sourceHash);
        }
        await c.setOffline(true);
        await p.reload();
        await p.locator('[data-source-rule="ionic-capital"]').first().click();
        await p
          .locator("#drill-source-status")
          .filter({ hasText: /^Complete printed page 71/ })
          .waitFor();
        assert.equal(await imageHash(p), sourceHash);
        rows.push({
          engine,
          case: fault ? "failed-install-retry" : "foreground-during-install",
          firstStatus,
          foregroundElapsedMs: elapsed,
          offlineDuringPartial: during,
          ...stats,
          sourceSha256: sourceHash,
          fullEditionReadyAfterRecovery: true,
          controlledOfflineSource: true,
        });
        await writeFile(
          resolve(output, "review.json"),
          `${JSON.stringify({ build, networkModel: "JPEG bodies share one 4 KiB chunk every 8 ms, about 512 KiB/s; headers and other resources unthrottled. Registration is gated until the initial plate is ready.", rows }, null, 2)}\n`,
        );
        console.log(
          engine,
          fault ? "failed-install-retry" : "foreground-during-install",
          elapsed,
          firstStatus,
          stats,
        );
        if (requireReady && !fault) {
          assert(
            firstStatus.startsWith("Complete"),
            "foreground source must finish within its application deadline",
          );
          assert.match(
            during,
            /still saving/,
            "healthy partial installation must not be reported failed",
          );
        }
      } finally {
        await c.close();
        await server.close();
      }
    }
  } finally {
    await browser.close();
  }
}
