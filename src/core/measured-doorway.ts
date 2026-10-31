export type MeasureRule = "ionic" | "doric" | "square";
export type MeasureFit = "height" | "width";
export interface MeasureChoice {
  rule: MeasureRule;
  fit: MeasureFit;
}
export const DEFAULT_MEASURE: MeasureChoice = { rule: "ionic", fit: "height" };

/** Printed p. 99, Stevens survey in Paton ed., The Erechtheum (1927).
 * Dimensions are reported in metres; the late inner lining is omitted (p. 98).
 * Integer millimetres retain the precision of these particular printed values.
 */
export const NORTH_DOOR = { height: 4882, bottom: 2427, inset: 44 } as const;
export const MEASURE_RULES = {
  ionic: { label: "Vitruvius’s Ionic", numerator: 2, denominator: 5, cite: "IV.6.3" },
  doric: { label: "Vitruvius’s Doric", numerator: 11, denominator: 24, cite: "IV.6.1" },
  square: {
    label: "Exact double square",
    numerator: 1,
    denominator: 2,
    cite: "Compare the survey’s ‘essentially’ on p. 99",
  },
} as const;

export function validateMeasure(value: unknown): MeasureChoice {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Choose a comparison rule and an alignment.");
  const v = value as Record<string, unknown>;
  if (v.rule !== "ionic" && v.rule !== "doric" && v.rule !== "square")
    throw new Error("Choose Ionic, Doric or the exact double square.");
  if (v.fit !== "height" && v.fit !== "width")
    throw new Error("Match either the reported height or the lower width.");
  return { rule: v.rule, fit: v.fit };
}

export function measuredDoor(input: MeasureChoice) {
  const choice = validateMeasure(input),
    rule = MEASURE_RULES[choice.rule];
  const height = NORTH_DOOR.height / 1000,
    bottom = NORTH_DOOR.bottom / 1000;
  const upper = (NORTH_DOOR.bottom - 2 * NORTH_DOOR.inset) / 1000;
  // No ancient foot is converted: the source's width relation is scale independent.
  const predictedHeight =
    choice.fit === "height"
      ? height
      : (NORTH_DOOR.bottom * rule.denominator) / rule.numerator / 1000;
  const predictedWidth =
    choice.fit === "width"
      ? bottom
      : (NORTH_DOOR.height * rule.numerator) / rule.denominator / 1000;
  return {
    choice,
    rule,
    height,
    bottom,
    upper,
    predictedHeight,
    predictedWidth,
    heightError: predictedHeight - height,
    widthError: predictedWidth - bottom,
    ratio: NORTH_DOOR.bottom / NORTH_DOOR.height,
    predictedRatio: rule.numerator / rule.denominator,
  };
}

export function measureRows(choice: MeasureChoice): [string, number, string][] {
  const m = measuredDoor(choice);
  return [
    ["Reported opening height", m.height, "Metres; 1927 survey p. 99; later lining omitted"],
    ["Reported lower opening width", m.bottom, "Metres; 1927 survey p. 99"],
    [
      "Reported inward movement of each jamb",
      NORTH_DOOR.inset / 1000,
      "Metres; rounded value on p. 99",
    ],
    [
      "Derived upper opening width",
      m.upper,
      "Reported lower width minus twice the reported jamb movement",
    ],
    [
      "Rule height under this alignment",
      m.predictedHeight,
      `${m.rule.label}; ${choice.fit} matched`,
    ],
    [
      "Rule lower width under this alignment",
      m.predictedWidth,
      `${m.rule.numerator}/${m.rule.denominator} of height`,
    ],
    ["Rule height minus reported height", m.heightError, "Metres; positive means taller"],
    ["Rule lower width minus reported lower width", m.widthError, "Metres; positive means wider"],
  ];
}

export function measureCsv(choice: MeasureChoice): string {
  const quote = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  return `${[["Measure", "Metres", "Basis"], ...measureRows(choice)].map((r) => r.map(quote).join(",")).join("\r\n")}\r\n`;
}
