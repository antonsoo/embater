/** Modern measuring experiment. D is a uniform shaft diameter, not an ancient unit. */
export type MeasureEdge = "axes" | "faces" | "platform";
export interface CountTrial {
  basis: "rule" | "record";
  edge: MeasureEdge;
  frontPitch: number;
  flankPitch: number;
  margin: number;
  equal: boolean;
}
export const DEFAULT_COUNT_TRIAL: CountTrial = {
  basis: "rule",
  edge: "axes",
  frontPitch: 3,
  flankPitch: 3,
  margin: 1,
  equal: true,
};
export interface CountMeasure {
  edge: MeasureEdge;
  label: string;
  width: number;
  length: number;
  ratio: number;
}
export const EDGE_LABELS: Record<MeasureEdge, string> = {
  axes: "Corner-column centres",
  faces: "Outside shaft faces",
  platform: "Trial platform edges",
};

function bounded(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
  steps = 20,
): number {
  if (value === null || value.trim() === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? Math.round(number * steps) / steps
    : fallback;
}
export function readCountTrial(params: URLSearchParams): CountTrial {
  const frontPitch = bounded(params.get("front-pitch"), 3, 1.25, 6);
  const equal = params.get("equal") !== "no";
  return {
    basis: params.get("measure") === "record" ? "record" : "rule",
    edge:
      params.get("edge") === "faces"
        ? "faces"
        : params.get("edge") === "platform"
          ? "platform"
          : "axes",
    frontPitch,
    flankPitch: equal ? frontPitch : bounded(params.get("flank-pitch"), 3, 1.25, 6, 40),
    margin: bounded(params.get("margin"), 1, 0, 2),
    equal,
  };
}
export function writeCountTrial(params: URLSearchParams, trial: CountTrial): void {
  params.set("measure", trial.basis);
  params.set("edge", trial.edge);
  params.set("front-pitch", String(trial.frontPitch));
  params.set("flank-pitch", String(trial.flankPitch));
  params.set("margin", String(trial.margin));
  params.set("equal", trial.equal ? "yes" : "no");
}

export function countMeasures(flank: number, trial: CountTrial): CountMeasure[] {
  if (!Number.isInteger(flank) || flank < 2 || flank > 30)
    throw new RangeError("A trial needs 2–30 flank columns.");
  for (const pitch of [trial.frontPitch, trial.flankPitch])
    if (!Number.isFinite(pitch) || pitch < 1.25 || pitch > 6)
      throw new RangeError("Trial axial pitches must be 1.25–6 D.");
  if (!Number.isFinite(trial.margin) || trial.margin < 0 || trial.margin > 2)
    throw new RangeError("Trial platform margins must be 0–2 D.");
  if (trial.equal && trial.frontPitch !== trial.flankPitch)
    throw new RangeError("Equal spacing requires equal pitches.");
  const width = 5 * trial.frontPitch;
  const length = (flank - 1) * trial.flankPitch;
  return (["axes", "faces", "platform"] as const).map((edge) => {
    const addition = edge === "axes" ? 0 : edge === "faces" ? 1 : 1 + 2 * trial.margin;
    const w = width + addition;
    const l = length + addition;
    return { edge, label: EDGE_LABELS[edge], width: w, length: l, ratio: l / w };
  });
}
export function countMeasureCsv(
  flank: number,
  trial: CountTrial,
  evidence?: {
    label: string;
    url: string;
    quote: string;
    status: string;
    credit: string;
    license: string;
  },
  series = "current",
): string {
  const rows = [
    [
      "trial",
      "endpoints",
      "front_columns",
      "flank_columns",
      "front_axial_pitch_D",
      "flank_axial_pitch_D",
      "margin_beyond_shaft_D",
      "width_D",
      "length_D",
      "length_over_width",
      "model",
      "count_premise",
      "source_url",
      "source_quote",
      "source_status",
      "source_credit",
      "source_license",
    ],
    ...countMeasures(flank, trial).map((m) => [
      series,
      m.edge,
      6,
      flank,
      trial.frontPitch,
      trial.flankPitch,
      trial.margin,
      m.width,
      m.length,
      m.ratio,
      "modern uniform-diameter trial; no building dimensions inferred",
      evidence?.label ?? "Count supplied by caller",
      evidence?.url ?? "",
      evidence?.quote ?? "",
      evidence?.status ?? "modern trial",
      evidence?.credit ?? "Anthony Mercer",
      evidence?.license ?? "PolyForm Noncommercial 1.0.0",
    ]),
  ];
  return `${rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n")}\r\n`;
}
