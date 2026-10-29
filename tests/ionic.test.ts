import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spiral } from "../src/core/geometry";
import {
  CLEAR,
  columnHeight,
  epistyleHeight,
  ionicCapitalUnits,
  ionicElevation,
  ionicFront,
} from "../src/core/ionic";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

describe("Ionic fronts (III.3)", () => {
  it("gives the corrected eustyle totals 11½, 18 and 24½, not the manuscripts' 19 and 25", () => {
    assert.equal(ionicFront(4, "eustyle").width, 11.5);
    assert.equal(ionicFront(6, "eustyle").width, 18);
    assert.equal(ionicFront(8, "eustyle").width, 24.5);
    assert.notEqual(ionicFront(6, "eustyle").width, 19);
    assert.notEqual(ionicFront(8, "eustyle").width, 25);
  });

  it("agrees with the systyle check of III.3.2: the gap between plinths equals a plinth", () => {
    const plinth = 1.5; // Attic base, III.5.1
    const gap = CLEAR.systyle - (plinth - 1);
    close(gap, plinth);
  });

  it("makes closer-spaced columns taller, and the Corinthian two thirds taller still", () => {
    assert.ok(columnHeight("ionic", "pycnostyle") > columnHeight("ionic", "eustyle"));
    assert.ok(columnHeight("ionic", "eustyle") > columnHeight("ionic", "diastyle"));
    close(columnHeight("corinthian", "eustyle") - columnHeight("ionic", "eustyle"), 2 / 3);
  });
});

describe("Ionic entablature (III.5.8)", () => {
  it("uses half a diameter up to fifteen feet, then a fraction of the column", () => {
    assert.equal(epistyleHeight(9.5, 14).height, 0.5);
    close(epistyleHeight(9.5, 18).height, 9.5 / 13);
    close(epistyleHeight(9.5, 22).height, 9.5 / 12.5);
    close(epistyleHeight(9.5, 28).height, 9.5 / 12);
    assert.equal(epistyleHeight(9.5, 34).extrapolated, true);
  });

  it("jumps by about half when a eustyle column passes fifteen feet", () => {
    const below = epistyleHeight(9.5, 15).height;
    const above = epistyleHeight(9.5, 15.01).height;
    assert.ok(above / below > 1.4 && above / below < 1.5);
  });
});

describe("Ionic capital and volute (III.5.5–7)", () => {
  it("divides half the abacus into 9½ parts of one eighteenth of a diameter", () => {
    const u = ionicCapitalUnits(20);
    close(u.abacus, 1 + 1 / 18);
    close(u.part, 1 / 18);
    close(ionicCapitalUnits(30).abacus, 1 + 1 / 9);
  });

  it("brings the spiral from 4½ parts to the eye in two turns", () => {
    const p = 1 / 18;
    const pts = spiral(0, 0, 4.5 * p, 0.5 * p, 8, Math.PI / 2, 1, 800);
    const end = pts.at(-1) ?? [0, 0];
    close(Math.hypot(end[0], end[1]), 0.5 * p, 1e-12);
    // Half a turn in (two quarters), straight below the eye: 4½ − 2 × ½ = 3½ parts.
    const bottom = pts[200] ?? [0, 0];
    close(bottom[0], 0, 1e-12);
    close(bottom[1], -3.5 * p, 1e-12);
  });
});

describe("bases (III.5.2–3)", () => {
  it("makes both bases half a diameter high, the Ionic one 1⅜ wide", () => {
    for (const base of ["attic", "ionic"] as const) {
      const e = ionicElevation({
        order: "ionic",
        columns: 4,
        spacing: "eustyle",
        base,
        moduleFeet: 2,
        sculptedFrieze: false,
      });
      const ys = (p: (typeof e.pieces)[number]) =>
        p.shape.kind === "rect"
          ? [p.shape.y, p.shape.y + p.shape.h]
          : p.shape.kind === "poly"
            ? p.shape.pts.map((q) => q[1])
            : [p.shape.cy];
      const baseParts = e.pieces.filter(
        (p) => ["plinth", "torus", "scotia", "astragal"].includes(p.part) && Math.min(...ys(p)) < 1,
      );
      close(Math.min(...baseParts.flatMap(ys)), 0, 1e-9);
      close(Math.max(...baseParts.flatMap(ys)), 0.5, 1e-9);
    }
    const io = ionicElevation({
      order: "ionic",
      columns: 4,
      spacing: "eustyle",
      base: "ionic",
      moduleFeet: 2,
      sculptedFrieze: false,
    });
    const plinth = io.pieces.find((p) => p.part === "plinth");
    assert.ok(plinth?.shape.kind === "rect");
    if (plinth?.shape.kind === "rect") close(plinth.shape.w, 1 + 1 / 4 + 1 / 8);
  });
});

describe("Corinthian capital (IV.1.11)", () => {
  it("is one diameter high with an abacus whose diagonal is twice that", () => {
    const e = ionicElevation({
      order: "corinthian",
      columns: 4,
      spacing: "eustyle",
      base: "attic",
      moduleFeet: 2,
      sculptedFrieze: false,
    });
    const abaci = e.pieces.filter(
      (p) => p.part === "abacus" && p.given === "text" && p.shape.kind === "rect",
    );
    const a = abaci[0];
    assert.ok(a?.shape.kind === "rect");
    if (a?.shape.kind === "rect") {
      close(a.shape.y + a.shape.h - e.shaftTop, 1);
      close(Math.hypot(a.shape.w, a.shape.w), 2);
      close(a.shape.h, 1 / 7);
    }
  });
});
