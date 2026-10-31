import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_DOOR, doorFromHash, doorJson, parseDoorJson } from "../src/core/doorway";
import { measuredDoor } from "../src/core/measured-doorway";

it("compares reported dimensions without forcing the survey into a double square", () => {
  // Expected metre residuals computed independently from integer millimetres.
  for (const [rule, fit, heightError, widthError] of [
    ["ionic", "height", 0, -2371 / 5000],
    ["ionic", "width", 2371 / 2000, 0],
    ["doric", "height", 0, -2273 / 12000],
    ["doric", "width", 2273 / 5500, 0],
    ["square", "height", 0, 14 / 1000],
    ["square", "width", -28 / 1000, 0],
  ] as const) {
    const m = measuredDoor({ rule, fit });
    assert.ok(Math.abs(m.heightError - heightError) < 1e-12);
    assert.ok(Math.abs(m.widthError - widthError) < 1e-12);
    assert.equal(m.upper, 2.339);
    const state = { ...DEFAULT_DOOR, comparison: { rule, fit } };
    assert.deepEqual(parseDoorJson(doorJson(state)), state);
  }
});
it("opens old drawings and links, while rejecting damaged new comparisons", () => {
  const { comparison, ...old } = DEFAULT_DOOR;
  assert.deepEqual(
    parseDoorJson(JSON.stringify({ format: "embater-doorway", version: 1, choices: old })),
    DEFAULT_DOOR,
  );
  assert.deepEqual(doorFromHash("#ceiling=28&kind=ionic&reading=supplied&trial=0"), DEFAULT_DOOR);
  assert.throws(
    () => parseDoorJson(JSON.stringify({ format: "embater-doorway", version: 2, choices: old })),
    /missing/,
  );
  assert.throws(() => doorFromHash("#measureRule=imagined"));
  assert.throws(() => doorFromHash("#measureFit=both"));
});
