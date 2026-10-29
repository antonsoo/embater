import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flankPeriods, median, slenderSummary, vitruvianFlank } from "../src/core/evidence";
import { FLANKS, SLENDER } from "../src/data/temples";

describe("Vitruvius against the Perseus temples", () => {
  it("finds the flank count falling from 15 to 13 to Vitruvius's 11", () => {
    const [early, classical, late] = flankPeriods(FLANKS);
    assert.deepEqual([early?.median, classical?.median, late?.median], [15, 13, 11]);
    assert.deepEqual([early?.n, classical?.n, late?.n], [10, 14, 5]);
    assert.equal(vitruvianFlank(6), 11);
  });

  it("dates every unflagged 6 × 12 temple, the 'doubled' plan, to before 475 BCE", () => {
    const doubled = FLANKS.filter((r) => r.flank === 12 && r.status === "ok");
    assert.equal(doubled.length, 4);
    for (const r of doubled) assert.ok(r.end <= -480, r.name);
  });

  it("finds every Doric column stouter than even Vitruvius's 'first' Doric of 6 diameters", () => {
    const doric = slenderSummary(SLENDER, "Doric");
    assert.equal(doric.n, 9);
    assert.ok(doric.max < 6);
    const ionic = slenderSummary(SLENDER, "Ionic");
    assert.ok(ionic.min >= 8.5 && ionic.max <= 11.5);
  });

  it("keeps a Perseus link and a quoted sentence on every row", () => {
    for (const r of [...FLANKS, ...SLENDER]) {
      assert.match(r.url, /^https:\/\/www\.perseus\.tufts\.edu\/hopper\/artifact\?/);
      assert.ok(r.quote.length > 4);
      assert.ok(r.start <= r.end);
    }
  });

  it("takes the median of an even list as the mean of the middle pair", () => {
    assert.equal(median([11, 13, 15, 17]), 14);
    assert.equal(median([3, 1, 2]), 2);
  });
});
