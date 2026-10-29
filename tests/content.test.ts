import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLAN_CARDS, TERMS } from "../src/content/terms";
import { PLATES } from "../src/content/world";
import { doricElevation } from "../src/core/doric";
import { ionicElevation } from "../src/core/ionic";
import { PLAN_TYPES, plan } from "../src/core/plan";
import { RULES } from "../src/core/rules";
import { tuscanElevation } from "../src/core/tuscan";
import { WORLD_DRAWINGS } from "../src/draw/world";

const drawings = [
  doricElevation({ columns: 6, spacing: "diastyle", moduleFeet: 1.5 }),
  doricElevation({ columns: 4, spacing: "systyle", moduleFeet: 3 }),
  ionicElevation({
    order: "ionic",
    columns: 6,
    spacing: "eustyle",
    base: "attic",
    moduleFeet: 2.5,
    sculptedFrieze: true,
  }),
  ionicElevation({
    order: "ionic",
    columns: 8,
    spacing: "pycnostyle",
    base: "ionic",
    moduleFeet: 4,
    sculptedFrieze: false,
  }),
  ionicElevation({
    order: "corinthian",
    columns: 6,
    spacing: "diastyle",
    base: "attic",
    moduleFeet: 2,
    sculptedFrieze: false,
  }),
  tuscanElevation({ widthFeet: 60 }),
  ...PLAN_TYPES.map((t) => plan(t)),
];

describe("vocabulary", () => {
  it("names every part drawn in the orders and plans", () => {
    const missing = new Set<string>();
    for (const d of drawings) for (const p of d.pieces) if (!TERMS.has(p.part)) missing.add(p.part);
    assert.deepEqual([...missing], []);
  });

  it("names every part drawn on the world plates", () => {
    for (const plate of PLATES) {
      const make = WORLD_DRAWINGS[plate.id];
      assert.ok(make, plate.id);
      const ids = new Set(plate.terms.map((t) => t.id));
      const missing = [...new Set(make().pieces.map((p) => p.part))].filter((id) => !ids.has(id));
      assert.deepEqual(missing, [], plate.id);
    }
  });

  it("cites only rules that exist, with Krohn pages from Books III–IV", () => {
    const cited = [...TERMS.values()].flatMap((t) => t.rules ?? []);
    for (const card of Object.values(PLAN_CARDS)) cited.push(...card.rules);
    for (const id of cited) assert.ok(RULES.has(id), id);
    for (const r of RULES.values()) {
      assert.ok(r.page >= 60 && r.page <= 95, `${r.id} p. ${r.page}`);
      assert.ok(r.latin.length > 20 && r.english.length > 20, r.id);
    }
  });

  it("writes Greek words in Greek script, with a romanization", () => {
    const greek = /[Ͱ-Ͽἀ-῿]/;
    for (const t of TERMS.values()) {
      for (const w of t.words) {
        if (w.lang !== "grc") continue;
        assert.match(w.word, greek, `${t.id}: ${w.word}`);
        assert.ok(w.romanized, `${t.id}: ${w.word} lacks a romanization`);
      }
    }
  });

  it("gives every word a literal meaning and a source", () => {
    const all = [...TERMS.values(), ...PLATES.flatMap((p) => p.terms)];
    for (const t of all)
      for (const w of t.words) assert.ok(w.literal && w.source, `${t.id}: ${w.word}`);
  });
});
