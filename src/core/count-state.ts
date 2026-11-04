import { FLANKS, type FlankRow, PERSEUS_FETCHED } from "../data/temples";
import { type CountTrial, countMeasureCsv, readCountTrial, writeCountTrial } from "./count-measure";
import { RULES } from "./rules";

export type CountReading = "gaps" | "columns";
export interface CountChoice {
  temple: string;
  count: CountReading;
  includeUncertain: boolean;
  trial: CountTrial;
  flank: number;
}
export interface CountEvidence {
  label: string;
  url: string;
  quote: string;
  status: string;
  credit: string;
  license: string;
}
export interface CountSnapshot {
  trial: CountTrial;
  flank: number;
  premise: string;
  evidence: CountEvidence;
  uncertainCount: boolean;
}
export interface CountWork {
  format: "embater-count-comparison";
  version: 1;
  current: CountChoice;
  reference: CountChoice | null;
}
export const templeKey = (row: FlankRow): string =>
  row.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
export function countChoice(
  temple: string,
  count: CountReading,
  uncertain: boolean,
  trial: CountTrial,
): CountChoice {
  const row = FLANKS.find((r) => templeKey(r) === temple);
  if (!row) throw new Error("The comparison names a building outside this retained catalogue.");
  return {
    temple,
    count,
    includeUncertain: uncertain,
    trial: { ...trial },
    flank: trial.basis === "record" ? row.flank : count === "gaps" ? 11 : 12,
  };
}
export function countSnapshot(choice: CountChoice): CountSnapshot {
  const row = FLANKS.find((r) => templeKey(r) === choice.temple);
  const rule = RULES.get("flanks");
  if (!row || !rule) throw new Error("The count source is unavailable in this edition.");
  const record = choice.trial.basis === "record";
  const label = record
    ? row.name
    : choice.count === "gaps"
      ? "Vitruvius’s doubled-space reading"
      : "Modern rival reading: double the columns";
  return {
    trial: { ...choice.trial },
    flank: choice.flank,
    premise: record
      ? `Count only from ${row.name}${row.status === "uncertain" ? " (uncertain restoration)" : ""}: 6 × ${row.flank}. No dimensions are taken from this building.`
      : `${label}: 6 × ${choice.flank}.`,
    uncertainCount: record && row.status === "uncertain",
    evidence: {
      label,
      url: record
        ? row.url
        : "https://archive.org/details/vitruviidearchit00vitr_1/page/69/mode/1up",
      quote: record ? row.quote : rule.latin,
      credit: record
        ? `Perseus Digital Library, Tufts University; retained ${PERSEUS_FETCHED}`
        : "F. Krohn (editor), Vitruvii De architectura libri decem, Leipzig 1912",
      license: record
        ? "https://creativecommons.org/licenses/by-sa/3.0/us/"
        : "Public domain Latin edition; modern diagram and English: PolyForm Noncommercial 1.0.0",
      status: record
        ? row.status === "uncertain"
          ? "Catalogue restoration uncertain"
          : "Catalogue count not flagged as uncertain"
        : choice.count === "gaps"
          ? "ancient prescription; geometry is modern"
          : "modern rival reading criticized in the ancient passage",
    },
  };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("The work file contains an invalid comparison.");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, expected: string[]): void {
  if (
    Object.keys(value).some((key) => !expected.includes(key)) ||
    expected.some((key) => !(key in value))
  )
    throw new Error(
      "The work file has missing or unsupported fields. Keep the original file; the current comparison was not changed.",
    );
}
export function parseCountChoice(value: unknown): CountChoice {
  const record = object(value);
  keys(record, ["temple", "count", "includeUncertain", "trial", "flank"]);
  const trial = object(record.trial);
  keys(trial, ["basis", "edge", "frontPitch", "flankPitch", "margin", "equal"]);
  if (
    typeof record.temple !== "string" ||
    !["gaps", "columns"].includes(String(record.count)) ||
    typeof record.includeUncertain !== "boolean"
  )
    throw new Error("The work file has an invalid building or count reading.");
  if (
    !["rule", "record"].includes(String(trial.basis)) ||
    !["axes", "faces", "platform"].includes(String(trial.edge)) ||
    typeof trial.equal !== "boolean"
  )
    throw new Error("The work file has an unsupported measuring choice.");
  for (const key of ["frontPitch", "flankPitch", "margin"])
    if (typeof trial[key] !== "number" || !Number.isFinite(trial[key]))
      throw new Error("The work file needs finite numerical pitches and margin.");
  const params = new URLSearchParams();
  writeCountTrial(params, trial as unknown as CountTrial);
  const parsed = readCountTrial(params);
  if (Object.entries(parsed).some(([key, value]) => trial[key] !== value))
    throw new Error(
      "The work file contains measurements outside the admitted choices. Nothing was rounded or changed.",
    );
  const result = countChoice(
    record.temple,
    record.count as CountReading,
    record.includeUncertain,
    parsed,
  );
  if (record.flank !== result.flank)
    throw new Error(
      "The saved count differs from this edition’s source. Keep the original reading; the current comparison was not changed.",
    );
  return result;
}
export function parseCountWork(text: string): CountWork {
  if (new TextEncoder().encode(text).byteLength > 65536)
    throw new Error(
      "This comparison file is too large. Choose an Embater comparison JSON file under 64 KiB.",
    );
  let value: Record<string, unknown>;
  try {
    value = object(JSON.parse(text));
  } catch {
    throw new Error(
      "This is not a readable comparison JSON file. The current comparison was not changed.",
    );
  }
  if (value.format !== "embater-count-comparison" || value.version !== 1)
    throw new Error(
      "This comparison format or version is unsupported. Keep the original file; the current comparison was not changed.",
    );
  keys(value, ["format", "version", "current", "reference"]);
  return {
    format: "embater-count-comparison",
    version: 1,
    current: parseCountChoice(value.current),
    reference: value.reference === null ? null : parseCountChoice(value.reference),
  };
}
export function countWork(current: CountChoice, reference: CountChoice | null): CountWork {
  return parseCountWork(
    JSON.stringify({ format: "embater-count-comparison", version: 1, current, reference }),
  );
}
export function comparisonCsv(current: CountSnapshot, reference?: CountSnapshot): string {
  const csv = countMeasureCsv(current.flank, current.trial, current.evidence, "current");
  if (!reference) return csv;
  const held = countMeasureCsv(reference.flank, reference.trial, reference.evidence, "reference");
  return csv + held.slice(held.indexOf("\r\n") + 2);
}
