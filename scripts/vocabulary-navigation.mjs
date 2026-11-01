import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4492/embater/";
const output = resolve(process.argv[3] ?? "/tmp/embater-navigation");
await mkdir(output, { recursive: true });
const rows = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const b = await launcher.launch();
  try {
    for (let trial = 0; trial < 3; trial++) {
      const c = await b.newContext();
      const p = await c.newPage();
      await p.goto(base);
      await p.getByRole("link", { name: "Drill", exact: true }).focus();
      await p.keyboard.press("Enter");
      await p.waitForURL("**/drill.html");
      try {
        await p
          .locator("#offline-status")
          .filter({ hasText: /^Ready offline/ })
          .waitFor({ timeout: 15000 });
      } catch {}
      const state = await p.evaluate(async () => ({
        status: document.getElementById("offline-status").textContent,
        controller: navigator.serviceWorker.controller?.scriptURL ?? null,
        registrations: (await navigator.serviceWorker.getRegistrations()).map((r) => ({
          active: r.active?.state,
        })),
        caches: await caches.keys(),
      }));
      rows.push({ engine, trial, ...state });
      await writeFile(resolve(output, "review.json"), `${JSON.stringify(rows, null, 2)}\n`);
      await c.close();
    }
  } finally {
    await b.close();
  }
}
console.log(JSON.stringify(rows, null, 2));
assert(
  rows.every((r) => r.controller && r.status.startsWith("Ready offline")),
  "rapid navigation must receive a controlling complete edition",
);
