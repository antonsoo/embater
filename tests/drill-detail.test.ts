import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { VOCABULARY_PLATES } from "../src/content/vocabulary-plates";
import { readSettings, settingsHash } from "../src/core/drill";
import { buildDecks } from "../src/core/drill-decks";
import { detailAnchor, detailWindow } from "../src/core/drill-detail";
import { RULES } from "../src/core/rules";
import type { Elevation } from "../src/core/types";

const decks = buildDecks();
const e: Elevation = {
  axes: [],
  dims: [],
  unitsPerDiameter: 1,
  bounds: { x0: -5, x1: 105, y0: -5, y1: 5 },
  pieces: [
    { part: "eye", given: "text", ink: "solid", shape: { kind: "circle", cx: 0, cy: 0, r: 0.05 } },
    {
      part: "eye",
      given: "text",
      ink: "solid",
      shape: { kind: "circle", cx: 100, cy: 0, r: 0.05 },
    },
  ],
};

describe("a detail of the actual architectural geometry", () => {
  it("selects one repeated eye rather than centering the empty space between them", () => {
    const view = detailWindow(e, e.bounds, "eye", { zoom: 1, x: 0, y: 0 });
    assert.equal((view.x0 + view.x1) / 2, 0);
    assert.equal((view.y0 + view.y1) / 2, 0);
    assert.equal(view.x1 - view.x0, 1.5);
    assert.equal(view.y1 - view.y0, 1.125);
    assert.deepEqual(detailAnchor(e, e.bounds, "eye"), {
      x0: -0.05,
      x1: 0.05,
      y0: -0.05,
      y1: 0.05,
    });
  });
  it("halves the crop width and height at each zoom while bounding the pan", () => {
    let previous = detailWindow(e, e.bounds, "eye", { zoom: 1, x: 0, y: 0 });
    for (const zoom of [2, 4, 8]) {
      const next = detailWindow(e, e.bounds, "eye", { zoom, x: 0, y: 0 });
      assert.equal(previous.x1 - previous.x0, 2 * (next.x1 - next.x0));
      assert.equal(previous.y1 - previous.y0, 2 * (next.y1 - next.y0));
      previous = next;
    }
    const far = detailWindow(e, e.bounds, "eye", { zoom: 1, x: 1e9, y: -1e9 });
    assert.equal((far.x0 + far.x1) / 2, 105);
    assert.equal((far.y0 + far.y1) / 2, -5);
  });
  it("retains equal axes and never changes the source coordinates for any existing part", () => {
    for (const deck of decks) {
      const before = JSON.stringify(deck.elevation);
      for (const term of deck.terms)
        for (const zoom of [1, 2, 4, 8]) {
          const box = detailWindow(deck.elevation, deck.view, term.id, { zoom, x: 0, y: 0 });
          assert.ok(Object.values(box).every(Number.isFinite));
          assert.ok(box.x1 > box.x0 && box.y1 > box.y0);
          assert.ok(Math.abs((box.x1 - box.x0) / (box.y1 - box.y0) - 4 / 3) < 1e-9);
        }
      assert.equal(JSON.stringify(deck.elevation), before);
    }
  });
  it("reopens the selected study term without sharing a quiz target", () => {
    const selected = readSettings(decks, "#deck=ionic&lang=la&mode=study&part=oculus");
    assert.equal(selected.part, "oculus");
    assert.deepEqual(readSettings(decks, settingsHash(selected)), selected);
    assert.equal(readSettings(decks, "#deck=ionic&lang=la&mode=find&part=oculus").part, undefined);
    assert.equal(
      readSettings(decks, "#deck=ionic&lang=la&mode=study&part=unknown").part,
      undefined,
    );
    assert.equal(
      readSettings(decks, "#deck=doric&lang=grc&mode=study&part=annuli").part,
      undefined,
    );
  });
});

describe("complete printed source coverage", () => {
  it("keeps both pages of the five audited spanning excerpts", () => {
    for (const [id, start, end] of [
      ["doric-triglyph", 83, 84],
      ["doric-history", 77, 78],
      ["attic-base", 69, 70],
      ["ionic-corona", 73, 74],
      ["tuscan-column", 90, 91],
    ] as const) {
      assert.equal(RULES.get(id)?.page, start);
      assert.equal(RULES.get(id)?.pageEnd, end);
    }
  });
  it("has a retained image for every cited page, including every excerpt's continuation", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../public/sources/vocabulary/manifest.json", import.meta.url), "utf8"),
    );
    assert.deepEqual(VOCABULARY_PLATES, manifest.plates);
    for (const rule of RULES.values())
      for (let page = rule.page; page <= (rule.pageEnd ?? rule.page); page++)
        assert.ok(
          VOCABULARY_PLATES.some((p) => p.page === page),
          `${rule.id} p.${page}`,
        );
  });
});
