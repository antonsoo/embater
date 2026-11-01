/** New reading notes on short phrases actually printed in Krohn's 1912 witness.
 * These explain a word form, not an extra dimensional prescription for every order.
 */
export const VOCABULARY_CONTEXTS: Readonly<
  Record<
    string,
    {
      lemma: string;
      before: string;
      form: string;
      after: string;
      translation: string;
      explanation: string;
      rule: string;
    }
  >
> = {
  oculus: {
    lemma: "oculus",
    before: "centrum ",
    form: "oculi",
    after: "",
    translation: "the centre of the eye",
    explanation:
      "Oculus names the eye. Here oculi is genitive singular: ‘of the eye’. The ending tells you whose centre is being placed in the Ionic-capital description.",
    rule: "ionic-capital",
  },
  shaft: {
    lemma: "scapus",
    before: "addita octava decuma parte ",
    form: "scapi",
    after: "",
    translation: "with an eighteenth part of the shaft added",
    explanation:
      "Scapi is genitive singular of scapus: ‘of the shaft’. The phrase belongs to the Ionic-capital passage; it is a reading of the noun, not a taper rule for every column drawn here.",
    rule: "ionic-capital",
  },
  triglyph: {
    lemma: "triglyphus",
    before: "contra ",
    form: "triglyphos",
    after: "",
    translation: "opposite the triglyphs",
    explanation:
      "Contra takes an accusative here. Triglyphos is accusative plural, referring to the triglyphs opposite the hanging drops. The stored name triglyphus is singular.",
    rule: "doric-epistyle",
  },
  torus: {
    lemma: "torus",
    before: "superior ",
    form: "torus",
    after: "",
    translation: "the upper torus",
    explanation:
      "The Attic-base passage pairs superior torus with inferior torus, the lower torus. Torus is nominative singular in these phrases; the adjectives distinguish the positions of the two mouldings.",
    rule: "attic-base",
  },
};
