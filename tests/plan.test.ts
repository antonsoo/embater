import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLAN_SPACING, plan } from "../src/core/plan";

const centres = (type: Parameters<typeof plan>[0], given?: "text" | "chosen") =>
  plan(type)
    .pieces.filter(
      (p) => p.part === "column" && p.shape.kind === "circle" && (!given || p.given === given),
    )
    .map((p) => (p.shape.kind === "circle" ? [p.shape.cx, p.shape.cy] : [0, 0]));

describe("Vitruvius's plans (III.2, III.4.3, IV.4.1)", () => {
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
