import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { chromium, firefox } from "playwright";
import { TRANSFER_POLICY } from "../src/transfer.ts";

const build = resolve(process.argv[2] ?? "dist");
const output = resolve(process.argv[3] ?? "/tmp/embater-transfers");
const long = process.argv.includes("--long");
await mkdir(output, { recursive: true });
const sourcePath = "sources/vocabulary/p71.jpg";
const source = await readFile(resolve(build, sourcePath));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".txt": "text/plain",
  ".json": "application/json",
};
let mode = "fast";
const requests = [];
const server = createServer(async (req, res) => {
  const path =
    new URL(req.url, "http://local").pathname.replace(/^\/embater\//, "") || "index.html";
  if (path.includes("..")) {
    res.writeHead(400).end();
    return;
  }
  try {
    const bytes = await readFile(resolve(build, path));
    const fault = path === sourcePath ? mode : "fast";
    const trace = { path, mode: fault, started: Date.now(), sent: 0, chunks: 0, lastData: null };
    requests.push(trace);
    let interval;
    res.on("close", () => {
      clearInterval(interval);
      trace.closed = Date.now();
      trace.complete = res.writableFinished;
    });
    if (fault === "no-headers") return;
    const headers = {
      "Content-Type": types[extname(path)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    };
    if ((mode === "gzip" && fault === "gzip") || (mode === "gzip" && fault === "fast")) {
      const compressed = gzipSync(bytes);
      res.writeHead(200, {
        ...headers,
        "Content-Encoding": "gzip",
        "Content-Length": compressed.length,
      });
      trace.sent = compressed.length;
      res.end(compressed);
      return;
    }
    res.writeHead(200, { ...headers, "Content-Length": bytes.length });
    res.flushHeaders();
    if (fault === "stall" || fault === "disconnect") {
      res.write(bytes.subarray(0, 4096));
      trace.sent = 4096;
      trace.chunks = 1;
      trace.lastData = Date.now();
      if (fault === "disconnect") interval = setTimeout(() => res.destroy(), 500);
      return;
    }
    if (fault === "slow" || fault === "active-total") {
      const size = fault === "slow" ? 4096 : 256;
      const period = fault === "slow" ? 150 : 1000;
      let offset = 0;
      const send = () => {
        const end = Math.min(offset + size, bytes.length);
        res.write(bytes.subarray(offset, end));
        trace.sent += end - offset;
        trace.chunks++;
        trace.lastData = Date.now();
        offset = end;
        if (end === bytes.length) {
          clearInterval(interval);
          res.end();
        }
      };
      interval = setInterval(send, period);
      send();
      return;
    }
    trace.sent = bytes.length;
    res.end(bytes);
  } catch {
    res.writeHead(404).end("Missing");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/embater/`;
const rows = [];
const record = async (row) => {
  rows.push(row);
  await writeFile(
    `${output}/transfers.json`,
    `${JSON.stringify({ policy: TRANSFER_POLICY, long, sourceSha256: sha(source), sourceBytes: source.length, rows }, null, 2)}\n`,
  );
  console.log(JSON.stringify(row));
};
async function imageHash(page) {
  return page
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
async function sourceRead(page, pattern, timeout = 40_000) {
  await page.locator('[data-source-rule="ionic-capital"]').first().click();
  await page.locator("#drill-source-status").filter({ hasText: pattern }).waitFor({ timeout });
}
try {
  for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
    const browser = await launcher.launch();
    try {
      mode = "fast";
      const context = await browser.newContext({ serviceWorkers: "block" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${base}drill.html#deck=ionic&lang=la&mode=study&part=oculus`);
      await page.evaluate(() => document.fonts.ready);
      const cases = [
        "slow",
        "stall",
        "disconnect",
        ...(long ? ["no-headers", "active-total"] : []),
      ];
      for (const fault of cases) {
        mode = fault;
        const start = Date.now();
        console.log(`${engine}: begin ${fault}`);
        const pattern =
          fault === "slow"
            ? /^Complete/
            : fault === "stall"
              ? /stopped receiving/
              : fault === "no-headers"
                ? /did not begin/
                : fault === "active-total"
                  ? /three-minute/
                  : /could not be loaded/;
        await sourceRead(
          page,
          pattern,
          fault === "active-total" ? 200_000 : fault === "no-headers" ? 75_000 : 40_000,
        );
        const elapsedMs = Date.now() - start;
        const trace = [...requests]
          .reverse()
          .find((r) => r.path === sourcePath && r.mode === fault);
        assert(trace, "A real source HTTP request must have occurred");
        if (fault === "slow") {
          assert(elapsedMs > 15_000);
          assert.equal(await imageHash(page), sha(source));
        } else {
          assert.equal(await page.locator("#drill-source-image").isHidden(), true);
          assert(trace.sent < source.length);
          if (fault === "stall") assert(elapsedMs >= 14_000 && elapsedMs < 25_000);
          if (fault === "no-headers") assert(elapsedMs >= 59_000 && elapsedMs < 70_000);
          if (fault === "active-total") {
            assert(elapsedMs >= 179_000 && elapsedMs < 195_000);
            assert(
              Date.now() - trace.lastData < 4000,
              "The transfer must still be active at its total deadline",
            );
          }
        }
        const status = await page.locator("#drill-source-status").textContent();
        await page.locator("[data-source-close]").click();
        mode = "fast";
        await sourceRead(page, /^Complete/);
        assert.equal(await imageHash(page), sha(source));
        await page.locator("[data-source-close]").click();
        await record({
          engine,
          case: fault,
          elapsedMs,
          status,
          sent: trace.sent,
          chunks: trace.chunks,
          retrySourceMatches: true,
        });
      }
      assert.deepEqual(errors, []);
      await context.close();

      // This stage uses the generated worker and a genuinely gzip-encoded origin.
      mode = "gzip";
      const saved = await browser.newContext({ viewport: { width: 375, height: 1000 } });
      const first = await saved.newPage();
      const second = await saved.newPage();
      await first.goto(`${base}drill.html#deck=ionic&lang=la&mode=study&part=oculus`);
      await first
        .locator("#offline-status")
        .filter({ hasText: /^Ready offline/ })
        .waitFor({ timeout: 90_000 });
      await second.goto(`${base}compare.html`);
      await second
        .locator("#offline-status")
        .filter({ hasText: /^Ready offline/ })
        .waitFor();
      const damage = async () => {
        await first.evaluate(async (path) => {
          const cacheName = (await caches.keys()).find((x) => x.startsWith("embater-"));
          await (await caches.open(cacheName)).put(
            `/embater/${path}`,
            new Response("damaged source", { headers: { "Content-Type": "image/jpeg" } }),
          );
          const channel = new MessageChannel();
          navigator.serviceWorker.controller.postMessage(
            { type: "INSPECT_EDITION", invalidate: true },
            [channel.port2],
          );
        }, sourcePath);
        await first
          .locator("#offline-status")
          .filter({ hasText: /needs repair/ })
          .waitFor();
        await second
          .locator("#offline-status")
          .filter({ hasText: /needs repair/ })
          .waitFor();
      };
      for (const fault of ["stall", "slow"]) {
        await damage();
        mode = fault;
        const start = Date.now();
        await first.locator("#offline-repair").click();
        await first
          .locator("#offline-status")
          .filter({ hasText: /Checking and repairing/ })
          .waitFor();
        await first
          .locator("#offline-status")
          .filter({ hasText: fault === "slow" ? /^Ready offline/ : /needs repair/ })
          .waitFor({ timeout: 50_000 });
        const elapsedMs = Date.now() - start;
        const bytes = await first.evaluate(async (path) => {
          const name = (await caches.keys()).find((x) => x.startsWith("embater-"));
          const r = await (await caches.open(name)).match(`/embater/${path}`);
          return Array.from(new Uint8Array(await r.arrayBuffer()));
        }, sourcePath);
        if (fault === "slow") {
          assert(elapsedMs > 15_000);
          assert.equal(sha(Buffer.from(bytes)), sha(source));
        } else assert.equal(Buffer.from(bytes).toString(), "damaged source");
        await record({
          engine,
          case: `worker-repair-${fault}`,
          elapsedMs,
          gzipInstalledEdition: true,
          twoTabInvalidation: true,
          incompleteBytesNeverReplaceCache: true,
        });
      }
      await second
        .locator("#offline-status")
        .filter({ hasText: /^Ready offline/ })
        .waitFor();
      await saved.setOffline(true);
      await first.reload();
      await sourceRead(first, /^Complete/);
      assert.equal(await imageHash(first), sha(source));
      await record({ engine, case: "gzip-edition-offline", sourceMatches: true });
      await saved.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
