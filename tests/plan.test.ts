import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLAN_PLATES } from "../src/content/plan-plates";
import { planClaims, planPages } from "../src/content/plan-reading";
import { CLEAR_SPACINGS, flankChoices, PLAN_SPACING, PLAN_TYPES, plan } from "../src/core/plan";

const centres = (type: Parameters<typeof plan>[0], given?: "text" | "chosen") =>
  plan(type)
    .pieces.filter(
      (p) => p.part === "column" && p.shape.kind === "circle" && (!given || p.given === given),
    )
    .map((p) => (p.shape.kind === "circle" ? [p.shape.cx, p.shape.cy] : [0, 0]));

describe("Vitruvius's plans (III.2, III.4.3, IV.4.1)", () => {
  it("adds rear columns without stealing the cella allocation from IV.4.1", () => {
    for (const clear of CLEAR_SPACINGS) {
      const front = plan("prostyle", { clear });
      const both = plan("amphiprostyle", { clear });
      assert.deepEqual(both.body, front.body);
      assert.deepEqual(
        both.pieces.filter((p) => p.part === "naos"),
        front.pieces.filter((p) => p.part === "naos"),
      );
      assert.equal(both.columns - front.columns, 4);
      assert.equal(
        both.pieces.some((p) => p.part === "opisthodomos"),
        false,
      );
      assert.ok(both.body);
      assert.equal(both.body.cella / both.body.width, 1.25);
      assert.equal(both.body.porch / both.body.width, 0.75);
    }
  });

  it("makes 34 and 38 conditional on different inner rectangles, without rewriting the source claim", () => {
    const a = plan("dipteral", { flank: 15 });
    const b = plan("dipteral", { flank: 17 });
    assert.equal(a.innerColumns, 34);
    assert.equal(b.innerColumns, 38);
    for (const p of [a, b]) {
      assert.equal(planClaims(p).find((c) => c.feature === "Long sides")?.basis, "Drawing choice");
      assert.match(
        planClaims(p).find((c) => c.feature === "The 34-column reading")?.reading ?? "",
        /Geometry alone cannot decide/,
      );
    }
    assert.throws(() => plan("peripteral", { flank: 13 }), RangeError);
    assert.throws(() => plan("hypaethral", { flank: 0 }), RangeError);
  });

  it("keeps a central doorway open in the hypaethral rear wall", () => {
    for (const clear of CLEAR_SPACINGS) {
      const p = plan("hypaethral", { clear });
      const walls = p.pieces.filter((x) => x.part === "naos" && x.ink === "groove");
      assert.equal(walls.length, 4);
      for (const w of walls) {
        assert.ok(w.shape.kind === "rect");
        assert.ok(w.shape.x + w.shape.w < 0 || w.shape.x > 0);
      }
    }
  });

  it("keeps every offered drawing within its platform and retains all cited pages", () => {
    for (const type of PLAN_TYPES)
      for (const clear of CLEAR_SPACINGS)
        for (const flank of flankChoices(type).length ? flankChoices(type) : [undefined]) {
          const p = plan(type, { clear, flank });
          for (const piece of p.pieces) {
            const s = piece.shape;
            if (s.kind === "rect") {
              assert.ok(s.w > 0 && s.h > 0, `${type}: positive room size`);
              assert.ok(s.x >= p.bounds.x0 - 1e-9 && s.x + s.w <= p.bounds.x1 + 1e-9);
              assert.ok(s.y >= p.bounds.y0 - 1e-9 && s.y + s.h <= p.bounds.y1 + 1e-9);
            } else if (s.kind === "circle") {
              assert.ok(s.cx - s.r >= p.bounds.x0 && s.cx + s.r <= p.bounds.x1);
              assert.ok(s.cy - s.r >= p.bounds.y0 && s.cy + s.r <= p.bounds.y1);
            }
          }
          for (const page of planPages(p))
            assert.ok(
              PLAN_PLATES.some((s) => s.page === page),
              `missing cited p.${page}`,
            );
        }
  });
  it("rings a peripteral temple with 6 × 11 columns: twice the intercolumniations on the flanks", () => {
    const p = plan("peripteral");
    assert.equal(p.columns, 30);
    const cs = centres("peripteral", "text");
    const xs = [...new Set(cs.map((c) => Math.round((c[0] ?? 0) * 1000)))];
    const ys = [...new Set(cs.map((c) => Math.round((c[1] ?? 0) * 1000)))];
    assert.equal(xs.length, 6);
    assert.equal(ys.length, 11);
    assert.equal(ys.length - 1, 2 * (xs.length - 1));
  });

  it("leaves 34 columns on a dipteral temple's inner ring: the number Krohn prints for Hermogenes", () => {
    assert.equal(plan("dipteral").innerColumns, 34);
    assert.equal(plan("dipteral").columns, 42);
  });

  it("puts the pseudodipteral cella walls on the lines of the four middle columns", () => {
    const p = plan("pseudodipteral");
    const naos = p.pieces.find((x) => x.part === "naos" && x.shape.kind === "rect");
    assert.ok(naos?.shape.kind === "rect");
    if (naos?.shape.kind === "rect") {
      const wallAxisLeft = naos.shape.x + 0.5;
      const firstColumn = -((8 - 1) * PLAN_SPACING) / 2;
      assert.ok(Math.abs(wallAxisLeft - (firstColumn + 2 * PLAN_SPACING)) < 1e-9);
    }
  });

  it("makes the temple in antis twice as long as it is wide", () => {
    const p = plan("in-antis");
    const walls = p.pieces.filter((x) => x.part === "anta" && x.shape.kind === "rect");
    const left = walls[0];
    const right = walls[1];
    assert.ok(left?.shape.kind === "rect" && right?.shape.kind === "rect");
    if (left?.shape.kind === "rect" && right?.shape.kind === "rect") {
      const width = right.shape.x + right.shape.w - left.shape.x;
      assert.ok(Math.abs(left.shape.h - 2 * width) < 1e-9);
    }
  });
});
