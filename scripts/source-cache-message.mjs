import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4426/embater/";
const build = resolve(process.argv[3] ?? "dist");
const output = resolve(process.argv[4] ?? "/tmp/embater-cache-message");
await mkdir(output, { recursive: true });
const sourcePath = "sources/vocabulary/p71.jpg";
const sourceBytes = await readFile(resolve(build, sourcePath));
const fontPath = "FONT-LICENSE.txt";
const fontBytes = await readFile(resolve(build, fontPath));
const jsPath = `assets/${(await readdir(resolve(build, "assets"))).find((f) => f.endsWith(".js"))}`;
const jsBytes = await readFile(resolve(build, jsPath));
const sha = (b) => createHash("sha256").update(b).digest("hex");
async function offer(page, url, bytes, edition, scope) {
  return page.evaluate(
    async ({ url, text, edition, scope }) => {
      const worker = (await navigator.serviceWorker.getRegistration(scope))?.active;
      if (!worker) throw new Error("Missing reviewed worker");
      const buffer = Uint8Array.from(atob(text), (c) => c.charCodeAt(0)).buffer;
      const channel = new MessageChannel();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          channel.port1.close();
          reject(new Error("No source-cache acknowledgement"));
        }, 15000);
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          channel.port1.close();
          resolve(event.data);
        };
        worker.postMessage({ type: "VERIFIED_ASSET", edition, url, bytes: buffer }, [
          channel.port2,
          buffer,
        ]);
      });
    },
    { url, text: bytes.toString("base64"), edition, scope },
  );
}
async function cacheBytes(page, name, path) {
  return Buffer.from(
    await page.evaluate(
      async ({ name, path }) =>
        Array.from(
          new Uint8Array(await (await (await caches.open(name)).match(path)).arrayBuffer()),
        ),
      { name, path },
    ),
  );
}
async function invalidate(page) {
  await page.evaluate(() => {
    const channel = new MessageChannel();
    navigator.serviceWorker.controller.postMessage({ type: "INSPECT_EDITION", invalidate: true }, [
      channel.port2,
    ]);
  });
}
const rows = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(new URL("compare.html", base).href);
    await page
      .locator("#offline-status")
      .filter({ hasText: /^Ready offline/ })
      .waitFor({ timeout: 60000 });
    const cache = await page.evaluate(async () =>
      (await caches.keys()).find((n) => n.startsWith("embater-")),
    );
    const edition = cache.slice("embater-".length);
    const url = new URL(sourcePath, base).href;
    const refusals = [
      { name: "changed bytes", url, bytes: Buffer.from("not the retained source"), edition },
      { name: "wrong edition", url, bytes: sourceBytes, edition: "0".repeat(64) },
      {
        name: "foreign origin",
        url: `https://example.invalid/embater/${sourcePath}`,
        bytes: sourceBytes,
        edition,
      },
      {
        name: "unknown path",
        url: new URL("sources/unknown.jpg", base).href,
        bytes: sourceBytes,
        edition,
      },
      { name: "executable asset", url: new URL(jsPath, base).href, bytes: jsBytes, edition },
    ];
    for (const item of refusals) {
      const answer = await offer(page, item.url, item.bytes, item.edition, base);
      assert.equal(answer.stored, false, item.name);
      assert.equal(
        sha(await cacheBytes(page, cache, new URL(sourcePath, base).pathname)),
        sha(sourceBytes),
      );
    }
    const outside = await context.newPage();
    await outside.goto(new URL("../outside-scope.html", base).href);
    assert.equal((await offer(outside, url, sourceBytes, edition, base)).stored, false);
    await outside.close();
    await page.evaluate(
      async ({ cache, source, font }) => {
        const target = await caches.open(cache);
        for (const path of [source, font])
          await target.put(path, new Response("damaged saved file"));
      },
      { cache, source: new URL(sourcePath, base).pathname, font: new URL(fontPath, base).pathname },
    );
    await invalidate(page);
    await page
      .locator("#offline-status")
      .filter({ hasText: /2 damaged/ })
      .waitFor();
    assert.equal((await offer(page, url, sourceBytes, edition, base)).stored, true);
    await page
      .locator("#offline-status")
      .filter({ hasText: /1 damaged/ })
      .waitFor();
    assert.equal(
      sha(await cacheBytes(page, cache, new URL(sourcePath, base).pathname)),
      sha(sourceBytes),
    );
    assert.equal(
      (
        await offer(
          page,
          new URL(fontPath, base).href,
          Buffer.from("wrong font notice"),
          edition,
          base,
        )
      ).stored,
      false,
    );
    assert.equal(
      (await cacheBytes(page, cache, new URL(fontPath, base).pathname)).toString(),
      "damaged saved file",
    );
    assert.equal(
      (await offer(page, new URL(fontPath, base).href, fontBytes, edition, base)).stored,
      true,
    );
    await page
      .locator("#offline-status")
      .filter({ hasText: /^Ready offline/ })
      .waitFor();
    rows.push({
      engine,
      refused: [
        ...refusals.map((r) => r.name),
        "client outside workshop scope",
        "wrong font notice",
      ],
      sourceReplacementVerified: true,
      remainingDamageWithheldReadiness: true,
      completeEditionReadyAfterBothReplacements: true,
      sourceSha256: sha(sourceBytes),
      fontNoticeSha256: sha(fontBytes),
    });
    await writeFile(`${output}/cache-message.json`, `${JSON.stringify(rows, null, 2)}\n`);
    await context.close();
    console.log(
      `${engine}: invalid offers refused, each replacement hashed, readiness withheld until all files match`,
    );
  } finally {
    await browser.close();
  }
}
