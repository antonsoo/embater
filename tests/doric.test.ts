import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { doricElevation, doricFront, TRIGLYPH_PITCH } from "../src/core/doric";
import { taperRatio } from "../src/core/geometry";
import { RULES } from "../src/core/rules";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

/** Front width for any whole number of triglyphs between ordinary columns (one more in the middle). */
function frontFor(columns: number, between: number): number {
  const ordinary = (columns - 2) * (between + 1) * TRIGLYPH_PITCH;
  const middle = (between + 2) * TRIGLYPH_PITCH;
  return ordinary + middle + 2;
}

describe("Doric front from the triglyph rhythm (IV.3.3–7)", () => {
  it("gives Vitruvius's printed totals: 27 and 42 diastyle, 19½ and 29½ systyle", () => {
    assert.equal(doricFront(4, "diastyle").width, 27);
    assert.equal(doricFront(6, "diastyle").width, 42);
    assert.equal(doricFront(4, "systyle").width, 19.5);
    assert.equal(doricFront(6, "systyle").width, 29.5);
  });

  it("cannot produce the manuscripts' 28 or 32 with any whole number of triglyphs", () => {
    const tetra = [1, 2, 3, 4, 5].map((k) => frontFor(4, k));
    const hexa = [1, 2, 3, 4, 5].map((k) => frontFor(6, k));
    assert.ok(!tetra.includes(28), `tetrastyle totals ${tetra}`);
    assert.ok(!hexa.includes(32), `hexastyle totals ${hexa}`);
    assert.ok(tetra.includes(27) && hexa.includes(42));
    assert.match(RULES.get("doric-module")?.reading?.manuscripts ?? "", /28 … 32/);
  });

  it("puts a triglyph over every column axis and spaces them 2½ modules apart", () => {
    for (const columns of [4, 6, 8] as const) {
      for (const spacing of ["diastyle", "systyle"] as const) {
        const f = doricFront(columns, spacing);
        for (const axis of f.axes)
          assert.ok(
            f.triglyphs.some((t) => Math.abs(t - axis) < 1e-9),
            `no triglyph at ${axis}`,
          );
        for (let i = 1; i < f.triglyphs.length; i++)
          close((f.triglyphs[i] ?? 0) - (f.triglyphs[i - 1] ?? 0), TRIGLYPH_PITCH);
      }
    }
  });

  it("draws square metopes and half-module half-metopes that end at the front's edges", () => {
    const e = doricElevation({ columns: 6, spacing: "diastyle", moduleFeet: 1.5 });
    const metopes = e.pieces.filter((p) => p.part === "metope");
    assert.ok(metopes.length > 0);
    for (const m of metopes) {
      assert.equal(m.shape.kind, "rect");
      if (m.shape.kind === "rect") {
        close(m.shape.w, 1.5);
        close(m.shape.h, 1.5);
      }
    }
    const halves = e.pieces
      .filter((p) => p.part === "hemimetope")
      .map((p) => (p.shape.kind === "rect" ? p.shape : null));
    assert.deepEqual(
      halves.map((h) => h?.w),
      [0.5, 0.5],
    );
    close(halves[0]?.x ?? -1, 0);
    close((halves[1]?.x ?? 0) + (halves[1]?.w ?? 0), 42);
  });

  it("makes the column seven lower diameters tall and the pediment a ninth of the corona", () => {
    const e = doricElevation({ columns: 6, spacing: "diastyle", moduleFeet: 1.5 });
    const abacus = e.pieces.find((p) => p.part === "abacus");
    assert.ok(abacus?.shape.kind === "rect");
    if (abacus?.shape.kind === "rect") close(abacus.shape.y + abacus.shape.h, 14);
    close(e.tympanum, (42 + 2 * (2 / 3)) / 9);
  });
});

describe("taper (III.3.12)", () => {
  it("follows the five stated bands", () => {
    assert.deepEqual(taperRatio(10).parts, [5, 6]);
    assert.deepEqual(taperRatio(15).parts, [5, 6]);
    assert.deepEqual(taperRatio(18).parts, [5.5, 6.5]);
    assert.deepEqual(taperRatio(25).parts, [6, 7]);
    assert.deepEqual(taperRatio(35).parts, [6.5, 7.5]);
    assert.deepEqual(taperRatio(50).parts, [7, 8]);
  });

  it("continues 'pro rata' by half a part per ten feet, and taller columns taper less", () => {
    assert.deepEqual(taperRatio(55).parts, [7.5, 8.5]);
    const ratios = [10, 18, 25, 35, 45, 55].map((h) => taperRatio(h).ratio);
    for (let i = 1; i < ratios.length; i++) assert.ok((ratios[i] ?? 0) > (ratios[i - 1] ?? 0));
  });
});
