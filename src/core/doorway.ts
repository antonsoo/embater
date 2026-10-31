import { DEFAULT_MEASURE, type MeasureChoice, validateMeasure } from "./measured-doorway";

/** A reading of Vitruvius IV.6.1-3, not a reconstruction of a particular building. */
export type DoorKind = "doric" | "ionic";
export type HeightReading = "supplied" | "unsupplied";
export interface DoorState {
  ceiling: number;
  kind: DoorKind;
  reading: HeightReading;
  /** Each upper corner's inward movement as a fraction of the lower jamb width. */
  trial: number | "rule";
  comparison: MeasureChoice;
}
export const DEFAULT_DOOR: DoorState = {
  ceiling: 28,
  kind: "ionic",
  reading: "supplied",
  trial: 0,
  comparison: { ...DEFAULT_MEASURE },
};

export interface DoorModel {
  state: DoorState;
  height: number;
  bottom: number;
  top: number;
  jamb: number;
  jambTop: number;
  contraction: number;
  divisor: 3 | 4 | 8 | null;
  inset: number;
  trialInset: number;
  trialTop: number;
  error: number;
  band: string;
}

/** Overlapping endpoints are assigned to the lower band, a stated desk convention. */
export function contractionDivisor(height: number): 3 | 4 | 8 | null {
  if (!Number.isFinite(height) || height <= 0) throw new Error("Opening height must be positive.");
  if (height <= 16) return 3;
  if (height <= 25) return 4;
  if (height <= 30) return 8;
  return null;
}

export function validateDoor(value: unknown): DoorState {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Choose a doorway drawing saved by Embater.");
  const s = value as Record<string, unknown>;
  if (
    typeof s.ceiling !== "number" ||
    !Number.isFinite(s.ceiling) ||
    s.ceiling < 14 ||
    s.ceiling > 70
  )
    throw new Error("Ceiling height must be between 14 and 70 Roman feet.");
  if (s.kind !== "doric" && s.kind !== "ionic") throw new Error("Choose Doric or Ionic.");
  if (s.reading !== "supplied" && s.reading !== "unsupplied")
    throw new Error("Choose a reading with or without the supplied half.");
  if (
    s.trial !== "rule" &&
    (typeof s.trial !== "number" || !Number.isFinite(s.trial) || s.trial < 0 || s.trial > 0.5)
  )
    throw new Error("Move each upper corner between zero and half a jamb width inward.");
  return {
    ceiling: s.ceiling,
    kind: s.kind,
    reading: s.reading,
    trial: s.trial,
    comparison: s.comparison === undefined ? { ...DEFAULT_MEASURE } : validateMeasure(s.comparison),
  };
}

export function doorway(input: DoorState): DoorModel {
  const state = validateDoor(input);
  // Half-parts avoid a decimal approximation to the seven-part ceiling division.
  const height = (state.ceiling * (state.reading === "supplied" ? 5 : 4)) / 7;
  const bottom = height * (state.kind === "doric" ? 11 / 24 : 2 / 5);
  // XIV is the printed Ionic casing rule. Extending it to Doric is a drawing choice.
  const jamb = height / 14;
  const jambTop = (jamb * 13) / 14;
  const divisor = contractionDivisor(height);
  // The stated contraction is taken from the whole width and split symmetrically.
  const contraction = divisor === null ? 0 : jamb / divisor;
  const inset = contraction / 2;
  const trialInset = state.trial === "rule" ? inset : state.trial * jamb;
  const top = bottom - contraction;
  const trialTop = bottom - 2 * trialInset;
  return {
    state,
    height,
    bottom,
    top,
    jamb,
    jambTop,
    contraction,
    divisor,
    inset,
    trialInset,
    trialTop,
    error: trialTop - top,
    band:
      divisor === 3
        ? "Up to 16 ft: one third of a jamb"
        : divisor === 4
          ? "Over 16 through 25 ft: one quarter of a jamb"
          : divisor === 8
            ? "Over 25 through 30 ft: one eighth of a jamb"
            : "Over 30 ft: parallel sides",
  };
}

export function otherReading(s: DoorState): DoorState {
  return { ...s, reading: s.reading === "supplied" ? "unsupplied" : "supplied", trial: "rule" };
}

export function doorHash(s: DoorState): string {
  return `#${new URLSearchParams({ ceiling: String(s.ceiling), kind: s.kind, reading: s.reading, trial: String(s.trial), measureRule: s.comparison.rule, measureFit: s.comparison.fit })}`;
}

export function doorFromHash(hash: string): DoorState {
  const q = new URLSearchParams(hash.replace(/^#/, ""));
  if (
    !["ceiling", "kind", "reading", "trial", "measureRule", "measureFit"].some((key) => q.has(key))
  )
    return { ...DEFAULT_DOOR };
  const ceiling = q.get("ceiling");
  const trial = q.get("trial");
  return validateDoor({
    ceiling: ceiling === null ? DEFAULT_DOOR.ceiling : Number(ceiling),
    kind: q.get("kind") ?? DEFAULT_DOOR.kind,
    reading: q.get("reading") ?? DEFAULT_DOOR.reading,
    trial: trial === null ? DEFAULT_DOOR.trial : trial === "rule" ? "rule" : Number(trial),
    comparison: {
      rule: q.get("measureRule") ?? DEFAULT_MEASURE.rule,
      fit: q.get("measureFit") ?? DEFAULT_MEASURE.fit,
    },
  });
}

export function doorJson(s: DoorState): string {
  return `${JSON.stringify({ format: "embater-doorway", version: 2, choices: validateDoor(s) }, null, 2)}\n`;
}

export function parseDoorJson(text: string): DoorState {
  if (text.length > 16384)
    throw new Error("This drawing file is too large; choose an Embater doorway JSON under 16 KB.");
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error("This file is not readable JSON. Choose a saved doorway drawing.");
  }
  if (
    !file ||
    typeof file !== "object" ||
    Array.isArray(file) ||
    !("format" in file) ||
    file.format !== "embater-doorway" ||
    !("version" in file) ||
    (file.version !== 1 && file.version !== 2) ||
    !("choices" in file)
  )
    throw new Error("Choose an Embater doorway drawing, version 1 or 2.");
  if (
    file.version === 2 &&
    (!file.choices || typeof file.choices !== "object" || !("comparison" in file.choices))
  )
    throw new Error("This version 2 drawing is missing its survey comparison choices.");
  return validateDoor(file.choices);
}

export function doorMeasurements(s: DoorState): [string, number, string][] {
  const m = doorway(s);
  return [
    ["Ceiling height", s.ceiling, "chosen"],
    [
      "Opening height",
      m.height,
      s.reading === "supplied"
        ? "5/7 of ceiling; supplied semis"
        : "4/7 of ceiling; supplied semis omitted",
    ],
    [
      "Opening width at foot",
      m.bottom,
      s.kind === "doric" ? "11/24 of opening height" : "2/5 of opening height",
    ],
    [
      "Jamb width at foot",
      m.jamb,
      s.kind === "ionic"
        ? "opening height / 14; IV.6.3"
        : "opening height / 14; Ionic rule extended to Doric by choice",
    ],
    ["Jamb width at head", m.jambTop, "13/14 of lower jamb width; IV.6.2"],
    [
      "Whole opening contraction",
      m.contraction,
      m.divisor ? `lower jamb width / ${m.divisor}; applied to total width` : "parallel sides",
    ],
    ["Opening width at head", m.top, "lower width minus whole contraction"],
    ["Each upper corner inset", m.inset, "half the whole contraction"],
    ["Lintel height", m.jambTop, "upper jamb width; IV.6.2"],
    ["Trial upper width", m.trialTop, "learner trial; not an ancient prescription"],
    ["Trial upper width minus rule", m.error, "positive means too wide"],
  ];
}

export function doorCsv(s: DoorState): string {
  const quote = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  return `${[["Measure", "Roman feet", "Basis"], ...doorMeasurements(s)].map((row) => row.map(quote).join(",")).join("\r\n")}\r\n`;
}
