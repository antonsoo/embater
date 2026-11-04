import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_COUNT_TRIAL } from "../src/core/count-measure";
import { countChoice, countSnapshot, countWork, parseCountWork } from "../src/core/count-state";

const current = countChoice("selinus-temple-c", "gaps", true, {
  ...DEFAULT_COUNT_TRIAL,
  frontPitch: 2.55,
  flankPitch: 1.275,
  equal: false,
});
const held = countChoice("samos-temple-c", "columns", false, {
  ...DEFAULT_COUNT_TRIAL,
  basis: "record",
});
test("a paired work file keeps count premises, uncertainty inclusion and exact half pitches", () => {
  const file = countWork(current, held);
  assert.deepEqual(parseCountWork(JSON.stringify(file)), file);
  assert.equal(countSnapshot(file.current).flank, 11);
  assert.match(countSnapshot(file.reference ?? current).premise, /uncertain restoration/);
  assert.match(countSnapshot(file.reference ?? current).evidence.license, /by-sa/);
});
test("a new version, unknown measurements, and a changed source count are refused", () => {
  const file = countWork(current, held);
  assert.throws(() => parseCountWork(JSON.stringify({ ...file, version: 2 })), /unsupported/);
  assert.throws(
    () => parseCountWork(JSON.stringify({ ...file, current: { ...current, flank: 12 } })),
    /saved count differs/,
  );
  assert.throws(
    () =>
      parseCountWork(
        JSON.stringify({
          ...file,
          current: { ...current, trial: { ...current.trial, flankPitch: 1.2625 } },
        }),
      ),
    /Nothing was rounded/,
  );
  assert.throws(
    () => parseCountWork(JSON.stringify({ ...file, extra: "newer field" })),
    /unsupported fields/,
  );
  assert.throws(() => parseCountWork(" ".repeat(65537)), /too large/);
  assert.equal(current.trial.flankPitch, 1.275);
  assert.equal(held.temple, "samos-temple-c");
});
