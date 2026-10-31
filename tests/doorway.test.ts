import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contractionDivisor,
  DEFAULT_DOOR,
  doorCsv,
  doorFromHash,
  doorHash,
  doorJson,
  doorway,
  otherReading,
  parseDoorJson,
  validateDoor,
} from "../src/core/doorway";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} differs from ${expected}`);
describe("a doorway read with and without the supplied half", () => {
  it("changes contraction bands under the same 28-foot ceiling", () => {
    const supplied = doorway({ ...DEFAULT_DOOR, trial: "rule" });
    const without = doorway(otherReading(DEFAULT_DOOR));
    assert.equal(supplied.height, 20);
    assert.equal(without.height, 16);
    assert.equal(supplied.divisor, 4);
    assert.equal(without.divisor, 3);
    close(supplied.bottom, 8);
    close(supplied.top, 107 / 14);
    close(without.bottom, 32 / 5);
    close(without.top, 632 / 105);
    close(supplied.jamb, 10 / 7);
    close(supplied.jambTop, 65 / 49);
    assert.equal(supplied.trialTop, supplied.top);
  });
  it("distinguishes the aperture, casing and an intentionally parallel trial", () => {
    const ionic = doorway({ ...DEFAULT_DOOR, ceiling: 35 });
    const doric = doorway({ ...DEFAULT_DOOR, ceiling: 35, kind: "doric" });
    close(ionic.bottom, 10);
    close(doric.bottom, 275 / 24);
    close(ionic.jamb, 25 / 14);
    close(ionic.jambTop, 325 / 196);
    close(ionic.contraction, 25 / 56);
    close(ionic.error, 25 / 56);
    close(ionic.trialTop, ionic.bottom);
    assert.ok(ionic.bottom + 2 * ionic.jamb > ionic.bottom);
  });
  it("keeps exact boundaries on the lower band and switches just above", () => {
    for (const [h, at, above] of [
      [16, 3, 4],
      [25, 4, 8],
      [30, 8, null],
    ] as const) {
      assert.equal(contractionDivisor(h - 0.001), at);
      assert.equal(contractionDivisor(h), at);
      assert.equal(contractionDivisor(h + 0.001), above);
    }
    const tall = doorway({ ...DEFAULT_DOOR, ceiling: 49, trial: "rule" });
    assert.equal(tall.contraction, 0);
    assert.ok(tall.jambTop < tall.jamb, "parallel opening does not mean parallel casing");
  });
  it("preserves every choice in both editable files and explicit links", () => {
    for (const kind of ["doric", "ionic"] as const)
      for (const reading of ["supplied", "unsupplied"] as const)
        for (const trial of [0, 0.271, "rule"] as const) {
          const state = { ceiling: 43.7675, kind, reading, trial };
          assert.deepEqual(parseDoorJson(doorJson(state)), state);
          assert.deepEqual(doorFromHash(doorHash(state)), state);
        }
    assert.match(
      doorCsv({ ...DEFAULT_DOOR, kind: "doric" }),
      /Ionic rule extended to Doric by choice/,
    );
    assert.match(doorCsv(DEFAULT_DOOR), /"Trial upper width minus rule"/);
  });
  it("rejects damaged drawings and nonfinite choices instead of inventing geometry", () => {
    for (const bad of [NaN, Infinity, -Infinity, 0, 71])
      assert.throws(() => validateDoor({ ...DEFAULT_DOOR, ceiling: bad }));
    for (const trial of [-1, 0.51, NaN, "half", null])
      assert.throws(() => validateDoor({ ...DEFAULT_DOOR, trial }));
    for (const bad of [
      "{",
      "[]",
      '{"format":"embater-doorway","version":2,"choices":{}}',
      " ".repeat(16385),
    ])
      assert.throws(() => parseDoorJson(bad));
    for (const hash of ["#ceiling=Infinity", "#kind=__proto__", "#reading=imagined", "#trial=NaN"])
      assert.throws(() => doorFromHash(hash));
  });
});
