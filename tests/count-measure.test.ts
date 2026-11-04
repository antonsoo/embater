import assert from "node:assert/strict";
import test from "node:test";
import {
  countMeasures,
  DEFAULT_COUNT_TRIAL,
  readCountTrial,
  writeCountTrial,
} from "../src/core/count-measure";

test("the doubled-space premise needs a pitch assumption and an endpoint", () => {
  const measures = countMeasures(11, DEFAULT_COUNT_TRIAL);
  assert.deepEqual(
    measures.map(({ width, length, ratio }) => [width, length, ratio]),
    [
      [15, 30, 2],
      [16, 31, 31 / 16],
      [18, 33, 11 / 6],
    ],
  );
  const half = countMeasures(11, { ...DEFAULT_COUNT_TRIAL, equal: false, flankPitch: 1.5 });
  assert.equal(half[0]?.ratio, 1);
  assert.equal(half[2]?.ratio, 1);
  assert.equal(countMeasures(12, DEFAULT_COUNT_TRIAL)[0]?.ratio, 11 / 5);
});

test("every admitted link round trips and equal pitches cannot hide a competing flank pitch", () => {
  for (const edge of ["axes", "faces", "platform"] as const)
    for (const basis of ["rule", "record"] as const)
      for (const equal of [true, false]) {
        const state = {
          edge,
          basis,
          frontPitch: 1.25,
          flankPitch: equal ? 1.25 : 6,
          margin: 0.05,
          equal,
        };
        const params = new URLSearchParams();
        writeCountTrial(params, state);
        assert.deepEqual(readCountTrial(params), state);
      }
  assert.deepEqual(
    readCountTrial(
      new URLSearchParams("front-pitch=NaN&flank-pitch=Infinity&margin=-1&edge=bogus"),
    ),
    DEFAULT_COUNT_TRIAL,
  );
  assert.equal(
    readCountTrial(new URLSearchParams("front-pitch=4&flank-pitch=6&equal=yes")).flankPitch,
    4,
  );
  assert.throws(() => countMeasures(11, { ...DEFAULT_COUNT_TRIAL, frontPitch: 1 }), /pitches/);
  assert.throws(() => countMeasures(11, { ...DEFAULT_COUNT_TRIAL, flankPitch: 2 }), /Equal/);
});
