import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accepts,
  groupsFor,
  languages,
  parseProgress,
  progressJSON,
  progressKey,
  progressKeys,
  readSettings,
  settingsHash,
} from "../src/core/drill";
import { buildDecks } from "../src/core/drill-decks";
import { boxOf, grade } from "../src/core/leitner";

const decks = buildDecks();
const known = progressKeys(decks);
const deck = (id: string) => {
  const found = decks.find((d) => d.id === id);
  assert.ok(found);
  return found;
};

describe("architecture vocabulary questions", () => {
  it("accepts either Egyptian papyrus form when the displayed word cannot distinguish them", () => {
    const egyptian = groupsFor(deck("egypt"), "egy");
    const papyrus = egyptian.find((group) => group.word.word === "wꜣḏ");
    assert.ok(papyrus);
    assert.equal(accepts(papyrus, "papyriform-closed"), true);
    assert.equal(accepts(papyrus, "papyriform-open"), true);
    assert.equal(accepts(papyrus, "lotiform"), false);
    assert.equal(egyptian.filter((g) => g.word.word === "wꜣḏ").length, 1);
    assert.equal(egyptian.length, 4);
  });

  it("asks actual Latin entries instead of always taking a term's first word", () => {
    const shaft = groupsFor(deck("doric"), "la").find((g) => g.id === "shaft");
    assert.equal(shaft?.word.word, "scapus");
    assert.equal(shaft?.word.lang, "la");
    assert.equal(
      groupsFor(deck("doric"), "grc").some((g) => g.id === "annuli"),
      false,
    );
    assert.equal(
      groupsFor(deck("doric"), "la").some((g) => g.id === "annuli"),
      true,
    );
  });

  it("never loses a visible word or includes a missing-language or undrawn entry", () => {
    for (const d of decks) {
      assert.equal(new Set(d.terms.map((t) => t.id)).size, d.terms.length);
      const drawn = new Set(d.elevation.pieces.map((p) => p.part));
      for (const lang of languages(d)) {
        const groups = groupsFor(d, lang);
        assert.ok(groups.length > 0);
        assert.equal(new Set(groups.map((g) => g.word.word)).size, groups.length);
        assert.deepEqual(
          new Set(groups.flatMap((g) => g.terms)),
          new Set(d.terms.filter((t) => t.words.some((w) => w.lang === lang))),
        );
        for (const group of groups)
          for (const term of group.terms) {
            assert.ok(drawn.has(term.id), `${d.id}/${term.id}`);
            assert.equal(term.words.find((w) => w.lang === lang)?.word, group.word.word);
          }
      }
    }
  });

  it("keeps language and direction progress independent", () => {
    const latin = progressKey("doric", "la", "name", "shaft");
    const greek = progressKey("doric", "grc", "name", "shaft");
    const reverse = progressKey("doric", "la", "find", "shaft");
    const boxes = grade({}, latin, true);
    assert.equal(boxOf(boxes, latin), 2);
    assert.equal(boxOf(boxes, greek), 1);
    assert.equal(boxOf(boxes, reverse), 1);
  });

  it("round trips every supported deck, language and exercise without inventing a translation", () => {
    for (const d of decks)
      for (const language of languages(d))
        for (const mode of ["study", "name", "find"] as const) {
          const settings = { deck: d, language, mode, romanized: false };
          assert.deepEqual(readSettings(decks, settingsHash(settings)), settings);
        }
    assert.equal(readSettings(decks, "#deck=egypt&lang=la&mode=bad").language, "egy");
    assert.equal(readSettings(decks, "#deck=bad").deck.id, "doric");
    assert.equal(readSettings(decks, "#deck=rome&lang=grc&mode=name").mode, "name");
    assert.equal(groupsFor(deck("rome"), "grc").length, 1);
  });
});

describe("portable vocabulary progress", () => {
  it("round trips all known entries in one strictly validated backup", () => {
    const boxes = Object.fromEntries([...known].map((key, i) => [key, (i % 5) + 1]));
    assert.deepEqual(parseProgress(progressJSON(boxes), known), boxes);
  });

  it("rejects damaged or unrelated files before they can replace current progress", () => {
    const key = [...known][0] as string;
    for (const value of [
      null,
      [],
      {},
      { schema: "other", version: 1, boxes: {} },
      { schema: "embater-vocabulary", version: 2, boxes: {} },
      { schema: "embater-vocabulary", version: 1, boxes: [] },
      { schema: "embater-vocabulary", version: 1, boxes: { [key]: 1 }, extra: true },
      ...[0, 6, 1.5, "2", null, {}, []].map((box) => ({
        schema: "embater-vocabulary",
        version: 1,
        boxes: { [key]: box },
      })),
      { schema: "embater-vocabulary", version: 1, boxes: { "unknown/la/find/word": 3 } },
    ])
      assert.throws(() => parseProgress(JSON.stringify(value), known));
    assert.throws(() => parseProgress("broken", known));
    assert.throws(() => parseProgress(" ".repeat(65537), known));
    assert.deepEqual(parseProgress(progressJSON({}), known), {});
  });

  it("never treats fractional or nonnumeric box values as learned words", () => {
    for (const bad of [1.5, NaN, Infinity, "3", {}, null, [], 0, 6])
      assert.equal(boxOf({ x: bad as number }, "x"), 1);
  });
});
