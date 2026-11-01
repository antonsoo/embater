import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acroterion, pediment } from "../src/core/common";
import { doricElevation } from "../src/core/doric";
import { pieceBounds } from "../src/core/geometry";
import { ionicElevation } from "../src/core/ionic";
import { roofCsv, roofSvg } from "../src/draw/roof";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
describe("the drawn roof, not just its requested dimensions", () => {
  it("makes the whole ornament exactly the requested height, including its plinth", () => {
    for (const h of [0.2, 1, 4.814814814814815, 8]) {
      const bounds = acroterion(3, 17, h).map(pieceBounds);
      close(Math.min(...bounds.map((b) => b.y0)), 17);
      close(Math.max(...bounds.map((b) => b.y1)), 17 + h);
    }
  });
  it("mounts plinths above the sloping sima and reports the actual highest tip", () => {
    for (const w of [11.5, 18, 27, 42, 57]) {
      const p = pediment(w, 17, 2 / 3, 0.5);
      close(p.tympanum, (w + 4 / 3) / 9);
      close(p.top, Math.max(...p.pieces.map(pieceBounds).map((b) => b.y1)));
      const slope = Math.tan((p.pitchDegrees * Math.PI) / 180);
      const middle = p.ornaments[1];
      assert.ok(middle);
      for (const ornament of p.ornaments) {
        for (const x of [
          ornament.x - ornament.height * 0.22,
          ornament.x,
          ornament.x + ornament.height * 0.22,
        ]) {
          assert.ok(ornament.y >= middle.y - Math.abs(x - w / 2) * slope - 1e-9);
        }
      }
      close(p.ornaments[0]?.height ?? 0, p.tympanum);
      close(middle.height / p.tympanum, 9 / 8);
    }
  });
  it("uses corrected geometry in every existing Greek order and in saved drawings", () => {
    for (const columns of [4, 6, 8] as const) {
      const roofs = [
        doricElevation({ columns, spacing: "diastyle", moduleFeet: 1.5 }).roof,
        ...(["ionic", "corinthian"] as const).map(
          (order) =>
            ionicElevation({
              order,
              columns,
              spacing: "eustyle",
              base: "attic",
              moduleFeet: 2.5,
              sculptedFrieze: false,
            }).roof,
        ),
      ];
      for (const roof of roofs) {
        close(roof.top, Math.max(...roof.pieces.map(pieceBounds).map((b) => b.y1)));
        const csv = roofCsv(roof, 2.5, 0.5);
        assert.ok(csv.includes(String(roof.tympanum * 2.5)));
        const svg = roofSvg(roof, 0.5, true);
        assert.match(svg, /9h\/8/);
        assert.match(svg, /drawing choices/);
        assert.ok(!svg.includes("<script"));
      }
    }
  });
  it("measures h from the actual horizontal corona extremities, including its cymatium", () => {
    const elevations = [
      doricElevation({ columns: 6, spacing: "diastyle", moduleFeet: 1.5 }),
      ionicElevation({
        order: "ionic",
        columns: 4,
        spacing: "eustyle",
        base: "attic",
        moduleFeet: 2.5,
        sculptedFrieze: false,
      }),
    ];
    for (const elevation of elevations) {
      const roof = elevation.roof;
      const cornice = elevation.pieces
        .filter((p) => ["corona", "cymatium"].includes(p.part))
        .map(pieceBounds)
        .filter((b) => b.y1 <= roof.base + 1e-9 && b.y1 > roof.base - roof.coronaHeight * 1.01);
      assert.ok(cornice.length > 0);
      close(
        (Math.max(...cornice.map((b) => b.x1)) - Math.min(...cornice.map((b) => b.x0))) / 9,
        roof.tympanum,
      );
    }
  });
});
