import type { Lang, Term, Word } from "../content/terms";
import type { Deck } from "./drill-decks";
import { BOXES, type Boxes } from "./leitner";

export type PracticeMode = "name" | "find";
export type DrillMode = PracticeMode | "study";

export interface WordGroup {
  /** Stable within a deck and language; variants stay in the study card. */
  id: string;
  word: Word;
  terms: Term[];
}

export function languages(deck: Deck): Lang[] {
  return [...new Set(deck.terms.flatMap((term) => term.words.map((word) => word.lang)))];
}

/** Only an actually displayed name can identify an answer. Never consult global ids. */
export function groupsFor(deck: Deck, language: Lang): WordGroup[] {
  const groups = new Map<string, WordGroup>();
  for (const term of deck.terms) {
    const word = term.words.find((entry) => entry.lang === language);
    if (!word) continue;
    const label = word.word.normalize("NFC").trim().replace(/\s+/g, " ");
    const group = groups.get(label);
    if (group) group.terms.push(term);
    else groups.set(label, { id: term.id, word, terms: [term] });
  }
  return [...groups.values()];
}

export function accepts(group: WordGroup, termId: string): boolean {
  return group.terms.some((term) => term.id === termId);
}

export function progressKey(
  deck: string,
  language: Lang,
  mode: PracticeMode,
  group: string,
): string {
  return `${deck}/${language}/${mode}/${group}`;
}

export function progressKeys(decks: readonly Deck[]): Set<string> {
  return new Set(
    decks.flatMap((deck) =>
      languages(deck).flatMap((language) =>
        groupsFor(deck, language).flatMap((group) =>
          (["name", "find"] as const).map((mode) => progressKey(deck.id, language, mode, group.id)),
        ),
      ),
    ),
  );
}

export function progressJSON(boxes: Boxes): string {
  return `${JSON.stringify({ schema: "embater-vocabulary", version: 1, boxes }, null, 2)}\n`;
}

/** Reject a damaged backup before replacing any current answers. */
export function parseProgress(text: string, known: ReadonlySet<string>): Boxes {
  if (text.length > 65536) throw new Error("The progress file exceeds 64 KiB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The progress file is not valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Choose an Embater vocabulary progress file.");
  const record = value as Record<string, unknown>;
  if (
    record.schema !== "embater-vocabulary" ||
    record.version !== 1 ||
    Object.keys(record).some((key) => !["schema", "version", "boxes"].includes(key))
  )
    throw new Error("Choose an Embater vocabulary version 1 progress file.");
  if (!record.boxes || typeof record.boxes !== "object" || Array.isArray(record.boxes))
    throw new Error("The progress file needs a boxes object.");
  const entries = Object.entries(record.boxes);
  for (const [key, box] of entries) {
    if (!known.has(key)) throw new Error(`Unknown practice entry: ${key}.`);
    if (typeof box !== "number" || !Number.isInteger(box) || box < 1 || box > BOXES)
      throw new Error("Each progress box must be a whole number from 1 to 5.");
  }
  return Object.fromEntries(entries);
}

export interface DrillSettings {
  deck: Deck;
  language: Lang;
  mode: DrillMode;
  romanized: boolean;
}

export function readSettings(decks: readonly Deck[], hash: string): DrillSettings {
  const query = new URLSearchParams(hash.replace(/^#/, ""));
  const deck = decks.find((entry) => entry.id === query.get("deck")) ?? decks[0];
  if (!deck) throw new Error("No vocabulary decks are available.");
  const available = languages(deck);
  const language = available.find((entry) => entry === query.get("lang")) ?? available[0];
  if (!language) throw new Error("This deck has no source-language entries.");
  const requested = query.get("mode");
  return {
    deck,
    language,
    mode: requested === "find" || requested === "study" ? requested : "name",
    romanized: query.get("roman") !== "0",
  };
}

export function settingsHash(settings: DrillSettings): string {
  return `#${new URLSearchParams({
    deck: settings.deck.id,
    lang: settings.language,
    mode: settings.mode,
    roman: settings.romanized ? "1" : "0",
  })}`;
}
