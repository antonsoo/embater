import type { FlankRow, SlenderRow } from "../data/temples";

export interface Band {
  label: string;
  from: number;
  to: number;
}

/** Periods by the middle of each temple's date range. */
export const PERIODS: Band[] = [
  { label: "before 500 BCE", from: -Infinity, to: -500 },
  { label: "500–401 BCE", from: -500, to: -400 },
  { label: "400 BCE and later", from: -400, to: Infinity },
];

export function midYear(row: { start: number; end: number }): number {
  return (row.start + row.end) / 2;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  const mid = Math.floor(n / 2);
  return n % 2
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

export interface FlankPeriod extends Band {
  n: number;
  median: number;
  min: number;
  max: number;
  counts: number[];
}

/** Flank counts by period, using only rows Perseus does not flag as uncertain. */
export function flankPeriods(rows: FlankRow[]): FlankPeriod[] {
  return PERIODS.map((band) => {
    const counts = rows
      .filter((r) => r.status === "ok")
      .filter((r) => midYear(r) >= band.from && midYear(r) < band.to)
      .map((r) => r.flank)
      .sort((a, b) => a - b);
    return {
      ...band,
      n: counts.length,
      median: median(counts),
      min: Math.min(...counts),
      max: Math.max(...counts),
      counts,
    };
  });
}

/** Vitruvius's rule: twice as many intercolumniations on the flank as on the front (III.4.3). */
export function vitruvianFlank(front: number): number {
  return 2 * (front - 1) + 1;
}

export interface SlenderSummary {
  order: "Doric" | "Ionic";
  n: number;
  min: number;
  max: number;
  /** Vitruvius's prescription, for comparison. */
  vitruvius: string;
}

export function slenderSummary(rows: SlenderRow[], order: "Doric" | "Ionic"): SlenderSummary {
  const ratios = rows.filter((r) => r.order === order && !r.estimated).map((r) => r.ratio);
  return {
    order,
    n: ratios.length,
    min: Math.min(...ratios),
    max: Math.max(...ratios),
    vitruvius:
      order === "Doric"
        ? "7 (IV.3.4); 6 for the first Doric (IV.1.6)"
        : "8½ to 10 by spacing (III.3.10); 9 in IV.1.8",
  };
}
