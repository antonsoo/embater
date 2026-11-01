import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4492/embater/";
const output = resolve(process.argv[3] ?? "/tmp/embater-progress-tabs");
await mkdir(output, { recursive: true });
const KEY = "embater-drill-v2";
const rows = [];
const record = (boxes) => JSON.stringify({ schema: "embater-vocabulary", version: 1, boxes });
const read = (p) => p.evaluate((key) => localStorage.getItem(key), KEY);
const verdict = async (p) => {
  await p
    .locator(".verdict")
    .filter({ hasText: /^Right/ })
    .waitFor();
};
async function open(c, deck = "doric") {
  const p = await c.newPage();
  await p.goto(new URL(`drill.html#deck=${deck}&lang=la&mode=find`, base).href);
  await p.locator("[data-term]").first().waitFor();
  await p.evaluate(() => document.fonts.ready);
  return p;
}
async function backup(p, name) {
  const panel = p.locator(".drill-keep");
  if (!(await panel.evaluate((n) => n.open))) await panel.locator("summary").click();
  const pending = p.waitForEvent("download");
  await p.locator("#drill-save").click();
  const f = await pending;
  assert.equal(await f.failure(), null);
  const path = resolve(output, `${name}.json`);
  await f.saveAs(path);
  return JSON.parse(await readFile(path, "utf8")).boxes;
}
async function restore(p, boxes) {
  const panel = p.locator(".drill-keep");
  if (!(await panel.evaluate((n) => n.open))) await panel.locator("summary").click();
  await p.locator("#drill-load").setInputFiles({
    name: "progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(record(boxes)),
  });
}
async function durable(p, expected) {
  await p.waitForFunction(
    ({ key, expected }) => {
      const r = JSON.parse(localStorage.getItem(key) ?? '{"boxes":{}}').boxes;
      return Object.keys(expected).every((k) => r[k] === expected[k]);
    },
    { key: KEY, expected },
  );
}
async function hold(c) {
  const p = await open(c);
  await p.evaluate((key) => {
    void navigator.locks.request(key, async () => {
      window.__held = true;
      await new Promise((resolve) => (window.__release = resolve));
    });
  }, KEY);
  await p.waitForFunction(() => window.__held);
  return p;
}
async function pending(p, count) {
  await p.waitForFunction(
    async ({ key, count }) =>
      (await navigator.locks.query()).pending.filter((l) => l.name === key).length === count,
    { key: KEY, count },
  );
}
async function release(p) {
  await p.evaluate(() => window.__release());
}
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const suppress of [false, true]) {
      const c = await browser.newContext({
        viewport: { width: 375, height: 1000 },
        colorScheme: engine === "chromium" ? "dark" : "light",
      });
      await c.addInitScript((suppress) => {
        Math.random = () => 0.00001;
        if (suppress) {
          const add = window.addEventListener;
          window.addEventListener = function (type, ...args) {
            if (type !== "storage") return add.call(this, type, ...args);
          };
        }
      }, suppress);
      const a = await open(c),
        b = await open(c, "ionic");
      await a.locator('[data-term="shaft"]').click();
      await verdict(a);
      await durable(a, { "doric/la/find/shaft": 2 });
      const raw = await read(a);
      if (!suppress)
        await b
          .locator("#drill-persistence")
          .filter({ hasText: /changed elsewhere/ })
          .waitFor();
      else assert(await b.locator("#drill-persistence").isHidden());
      await b.locator('[data-term="plinth"]').click();
      await verdict(b);
      await b
        .locator("#drill-persistence")
        .filter({ hasText: /changed elsewhere/ })
        .waitFor();
      assert.equal(await read(a), raw);
      assert.equal((await backup(b, `${engine}-stale-${suppress}`))["ionic/la/find/plinth"], 2);
      await b
        .locator("#drill-persistence")
        .screenshot({ path: resolve(output, `${engine}-stale-${suppress}.png`) });
      if (!suppress) {
        const violations = (await new AxeBuilder({ page: b }).analyze()).violations;
        assert.deepEqual(violations, []);
        await b.screenshot({ path: resolve(output, `${engine}-stale-visit.png`), fullPage: true });
      }
      rows.push({
        engine,
        case: suppress ? "missed-event" : "stale-tab",
        browserRecordPreserved: true,
        visitAnswerInNativeBackup: true,
        warningVisible: true,
      });
      await c.close();
    }
    {
      const c = await browser.newContext();
      await c.addInitScript(() => (Math.random = () => 0.00001));
      const a = await open(c),
        b = await open(c, "ionic"),
        gate = await hold(c);
      await Promise.all([
        a.locator('[data-term="shaft"]').click(),
        b.locator('[data-term="plinth"]').click(),
      ]);
      await Promise.all([verdict(a), verdict(b)]);
      await pending(gate, 2);
      assert.equal(await read(a), null);
      await release(gate);
      await a.waitForFunction((key) => localStorage.getItem(key) !== null, KEY);
      await a.waitForFunction(
        () =>
          document.getElementById("drill-storage").textContent !==
          "Saving progress in this browser…",
      );
      await b.waitForFunction(
        () =>
          document.getElementById("drill-storage").textContent !==
          "Saving progress in this browser…",
      );
      const saved = JSON.parse(await read(a)).boxes;
      assert.equal(Object.keys(saved).length, 1);
      assert.equal(
        Number(await a.locator("#drill-persistence").isVisible()) +
          Number(await b.locator("#drill-persistence").isVisible()),
        1,
      );
      assert.equal((await backup(a, `${engine}-concurrent-doric`))["doric/la/find/shaft"], 2);
      assert.equal((await backup(b, `${engine}-concurrent-ionic`))["ionic/la/find/plinth"], 2);
      rows.push({
        engine,
        case: "simultaneous-answers",
        twoRequestsQueued: true,
        firstRecordPreserved: true,
        staleVisitWarned: true,
        bothNativeBackupsRetainAnswers: true,
        saved,
      });
      await c.close();
    }
    {
      const c = await browser.newContext();
      await c.addInitScript(() => (Math.random = () => 0.00001));
      const a = await open(c),
        gate = await hold(c);
      for (const part of ["shaft", "flute", "shaft"]) {
        await a.locator(`[data-term="${part}"]`).click();
        await verdict(a);
        if (part !== "shaft" || (await a.locator(".next").count()))
          await a.locator(".next").click();
      }
      await pending(gate, 3);
      assert.equal(await a.locator("#drill-write-status").textContent(), "Progress: saving…");
      await release(gate);
      await durable(a, { "doric/la/find/shaft": 3, "doric/la/find/flute": 2 });
      assert(await a.locator("#drill-persistence").isHidden());
      assert.equal(
        await a.locator("#drill-write-status").textContent(),
        "Progress: saved in this browser.",
      );
      rows.push({
        engine,
        case: "queued-visit-answers",
        threeSnapshotsSerialized: true,
        allAnswersRetained: true,
      });
      await c.close();
    }
    {
      const c = await browser.newContext();
      await c.addInitScript(() => (Math.random = () => 0.00001));
      const a = await open(c),
        gate = await hold(c);
      await a.locator('[data-term="shaft"]').click();
      await verdict(a);
      await restore(a, { "doric/la/find/shaft": 2, "ionic/la/find/plinth": 4 });
      await a
        .locator("#drill-file-status")
        .filter({ hasText: /^Restoring/ })
        .waitFor();
      await a.locator('[data-term="shaft"]').click();
      await verdict(a);
      await pending(gate, 3);
      assert.equal(await a.locator("#drill-write-status").textContent(), "Progress: saving…");
      await release(gate);
      await durable(a, { "doric/la/find/shaft": 3, "ionic/la/find/plinth": 4 });
      assert(await a.locator("#drill-persistence").isHidden());
      assert.equal(
        await a.locator("#drill-write-status").textContent(),
        "Progress: saved in this browser.",
      );
      rows.push({
        engine,
        case: "restore-supersedes-queued-answer",
        olderSnapshotDiscarded: true,
        answerDuringRestoreRetained: true,
      });
      await c.close();
    }
    {
      const c = await browser.newContext();
      await c.addInitScript(() => (Math.random = () => 0.00001));
      const a = await open(c),
        gate = await hold(c);
      await a.locator('[data-term="shaft"]').click();
      await verdict(a);
      await a
        .locator("#drill-persistence")
        .filter({ hasText: /saving did not finish/ })
        .waitFor({ timeout: 5000 });
      assert.equal(await read(a), null);
      assert.equal((await backup(a, `${engine}-wait-expired`))["doric/la/find/shaft"], 2);
      await release(gate);
      await a.locator(".next").click();
      await a.locator('[data-term="flute"]').click();
      await verdict(a);
      await durable(a, { "doric/la/find/shaft": 2, "doric/la/find/flute": 2 });
      assert(await a.locator("#drill-persistence").isHidden());
      assert.equal(
        await a.locator("#drill-write-status").textContent(),
        "Progress: saved in this browser.",
      );
      rows.push({
        engine,
        case: "acquisition-deadline",
        noPrematureWrite: true,
        nativeBackupWorks: true,
        laterAnswerSavesAllVisitAnswers: true,
      });
      await c.close();
    }
    {
      const c = await browser.newContext();
      await c.addInitScript(
        (raw) => {
          Math.random = () => 0.00001;
          Object.defineProperty(navigator, "locks", { value: undefined });
          localStorage.setItem("embater-drill-v2", raw);
        },
        record({ "doric/la/find/shaft": 4 }),
      );
      const a = await open(c);
      const raw = await read(a);
      await a.locator('[data-term="shaft"]').click();
      await verdict(a);
      await a
        .locator("#drill-persistence")
        .filter({ hasText: /Browser saving is unavailable here/ })
        .waitFor();
      assert.equal(await read(a), raw);
      assert.equal((await backup(a, `${engine}-no-locks`))["doric/la/find/shaft"], 5);
      await restore(a, { "doric/la/find/shaft": 1 });
      await a
        .locator("#drill-file-status")
        .filter({ hasText: /^Restored the boxes for this visit/ })
        .waitFor();
      assert.equal(await read(a), raw);
      rows.push({
        engine,
        case: "coordination-unavailable",
        existingRecordUntouched: true,
        answersAndRestoreWorkForVisit: true,
        nativeBackupWorks: true,
      });
      await c.close();
    }
    {
      const c = await browser.newContext();
      await c.addInitScript(() => {
        Math.random = () => 0.00001;
        const add = window.addEventListener;
        window.addEventListener = function (type, fn, options) {
          if (type === "storage")
            return add.call(
              this,
              type,
              (event) => {
                window.__storageEvents ??= [];
                window.__storageEvents.push(() => fn.call(this, event));
              },
              options,
            );
          return add.call(this, type, fn, options);
        };
      });
      const a = await open(c),
        b = await open(c, "ionic");
      await restore(b, { "ionic/la/find/plinth": 4 });
      await b
        .locator("#drill-file-status")
        .filter({ hasText: /^Restored the saved/ })
        .waitFor();
      await a.waitForFunction(() => window.__storageEvents?.length > 0);
      await restore(a, { "doric/la/find/shaft": 3 });
      await a
        .locator("#drill-file-status")
        .filter({ hasText: /^Restored the saved/ })
        .waitFor();
      await a.evaluate(() => {
        for (const deliver of window.__storageEvents) deliver();
      });
      assert(await a.locator("#drill-persistence").isHidden());
      assert.equal(
        await a.locator("#drill-write-status").textContent(),
        "Progress: saved in this browser.",
      );
      await a.locator('[data-term="shaft"]').click();
      await verdict(a);
      await durable(a, { "doric/la/find/shaft": 4 });
      rows.push({
        engine,
        case: "late-native-event",
        explicitRestorePreserved: true,
        oldEventDoesNotInvalidateCurrentRecord: true,
        laterAnswerPersists: true,
      });
      await c.close();
    }
    {
      const c = await browser.newContext();
      await c.addInitScript(() => {
        Math.random = () => 0.00001;
      });
      const a = await open(c),
        b = await open(c, "ionic");
      await a.locator('[data-term="shaft"]').click();
      await durable(a, { "doric/la/find/shaft": 2 });
      await b
        .locator("#drill-persistence")
        .filter({ hasText: /changed elsewhere/ })
        .waitFor();
      const gate = await hold(c);
      await restore(b, { "doric/la/find/shaft": 4, "ionic/la/find/plinth": 2 });
      await b
        .locator("#drill-file-status")
        .filter({ hasText: /^Restoring/ })
        .waitFor();
      await b.locator('[data-term="plinth"]').click();
      await verdict(b);
      await pending(gate, 2);
      assert.equal(await b.locator("#drill-write-status").textContent(), "Progress: saving…");
      await release(gate);
      await durable(b, { "doric/la/find/shaft": 4, "ionic/la/find/plinth": 3 });
      assert(await b.locator("#drill-persistence").isHidden());
      assert.equal(
        await b.locator("#drill-write-status").textContent(),
        "Progress: saved in this browser.",
      );
      rows.push({
        engine,
        case: "answer-during-stale-restore",
        explicitReplacementWorks: true,
        answerWhileReplacementWaitsRetained: true,
      });
      await c.close();
    }
    {
      const c = await browser.newContext();
      await c.addInitScript(
        (raw) => {
          Math.random = () => 0.00001;
          localStorage.setItem("embater-drill-v2", raw);
          const set = Storage.prototype.setItem;
          window.__quotaFail = true;
          Storage.prototype.setItem = function (key, value) {
            if (key === "embater-drill-v2" && window.__quotaFail)
              throw new DOMException("Injected quota failure", "QuotaExceededError");
            return set.call(this, key, value);
          };
        },
        record({ "doric/la/find/shaft": 4 }),
      );
      const a = await open(c),
        raw = await read(a);
      await a.locator('[data-term="shaft"]').click();
      await verdict(a);
      await a
        .locator("#drill-persistence")
        .filter({ hasText: /saving is unavailable/ })
        .waitFor();
      assert.equal(await read(a), raw);
      assert.equal((await backup(a, `${engine}-failed-write`))["doric/la/find/shaft"], 5);
      await a.evaluate(() => {
        window.__quotaFail = false;
      });
      await a.locator(".next").click();
      await a.locator('[data-term="flute"]').click();
      await verdict(a);
      await durable(a, { "doric/la/find/shaft": 5, "doric/la/find/flute": 2 });
      assert(await a.locator("#drill-persistence").isHidden());
      rows.push({
        engine,
        case: "write-failure-after-read",
        previousRecordPreserved: true,
        nativeBackupRetainsAnswer: true,
        laterWriteIncludesAllVisitAnswers: true,
      });
      await c.close();
    }
    await writeFile(resolve(output, "review.json"), `${JSON.stringify({ base, rows }, null, 2)}\n`);
    console.log(
      `${engine}: stale, missed event, simultaneous writes, queued answers, restore, deadline, no locks, delayed native event, stale restore and failed writes verified`,
    );
  } finally {
    await browser.close();
  }
}
