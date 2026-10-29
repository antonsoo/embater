import { esc } from "../ui/dom";

export interface DotPoint {
  id: string;
  /** Date range in years (negative = BCE). */
  x0: number;
  x1: number;
  y: number;
  series: "doric" | "ionic" | "single";
  shape: "circle" | "diamond";
  hollow: boolean;
  /** Short direct label, drawn beside the dot when present. */
  label?: string;
  labelSide?: "left" | "right" | "above" | "below";
  /** Accessible description and tooltip text. */
  tip: string;
}

export interface Reference {
  y0: number;
  /** When set, a band from y0 to y1 rather than a line. */
  y1?: number;
  label: string;
  strong: boolean;
}

export interface DotChart {
  id: string;
  title: string;
  points: DotPoint[];
  references: Reference[];
  x: [number, number];
  y: [number, number];
  xTicks: number[];
  yTicks: number[];
  yTitle: string;
}

const W = 760;
const H = 360;
const M = { left: 56, right: 176, top: 18, bottom: 44 };

export function year(v: number): string {
  if (v === 0) return "1 BCE | 1 CE";
  return v < 0 ? `${-v} BCE` : `${v} CE`;
}

/**
 * Keep dots on the same row at least `gap` pixels apart by nudging later ones right.
 * Returns the horizontal offset for each point; the date bars stay where they are.
 */
export function spread(points: { px: number; py: number }[], gap = 12): number[] {
  const offsets = points.map(() => 0);
  const rows = new Map<number, number[]>();
  points.forEach((p, i) => {
    const key = Math.round(p.py);
    rows.set(key, [...(rows.get(key) ?? []), i]);
  });
  for (const members of rows.values()) {
    members.sort((i, j) => (points[i]?.px ?? 0) - (points[j]?.px ?? 0));
    let last = Number.NEGATIVE_INFINITY;
    for (const i of members) {
      const x = Math.max(points[i]?.px ?? 0, last + gap);
      offsets[i] = x - (points[i]?.px ?? 0);
      last = x;
    }
  }
  return offsets;
}

export function renderDotChart(chart: DotChart): string {
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const sx = (v: number) => M.left + ((v - chart.x[0]) / (chart.x[1] - chart.x[0])) * iw;
  const sy = (v: number) => M.top + ih - ((v - chart.y[0]) / (chart.y[1] - chart.y[0])) * ih;
  const grid = chart.yTicks
    .map(
      (t) =>
        `<line class="ch-grid" x1="${M.left}" x2="${M.left + iw}" y1="${sy(t)}" y2="${sy(t)}"/><text class="ch-tick" x="${M.left - 10}" y="${sy(t) + 4}" text-anchor="end">${t}</text>`,
    )
    .join("");
  const xt = chart.xTicks
    .map(
      (t) =>
        `<line class="ch-axis" x1="${sx(t)}" x2="${sx(t)}" y1="${M.top + ih}" y2="${M.top + ih + 5}"/><text class="ch-tick" x="${sx(t)}" y="${M.top + ih + 22}" text-anchor="middle">${year(t)}</text>`,
    )
    .join("");
  const refs = chart.references
    .map((r) => {
      const cls = r.strong ? "ch-ref strong" : "ch-ref";
      if (r.y1 !== undefined) {
        const top = sy(r.y1);
        const bottom = sy(r.y0);
        return `<rect class="ch-band" x="${M.left}" y="${top}" width="${iw}" height="${bottom - top}"/><text class="${cls}-label" x="${M.left + iw + 10}" y="${(top + bottom) / 2 + 4}">${esc(r.label)}</text>`;
      }
      return `<line class="${cls}" x1="${M.left}" x2="${M.left + iw}" y1="${sy(r.y0)}" y2="${sy(r.y0)}"/><text class="${cls}-label" x="${M.left + iw + 10}" y="${sy(r.y0) + 4}">${esc(r.label)}</text>`;
    })
    .join("");
  const placed = chart.points.map((p) => ({ px: sx((p.x0 + p.x1) / 2), py: sy(p.y) }));
  const offsets = spread(placed);
  const marks = chart.points
    .map((p, i) => {
      const cx = (placed[i]?.px ?? 0) + (offsets[i] ?? 0);
      const cy = placed[i]?.py ?? 0;
      const range =
        p.x1 - p.x0 > 1
          ? `<line class="ch-range" x1="${sx(p.x0)}" x2="${sx(p.x1)}" y1="${cy}" y2="${cy}"/>`
          : "";
      const cls = `ch-dot ${p.series}${p.hollow ? " hollow" : ""}`;
      const mark =
        p.shape === "diamond"
          ? `<path class="${cls}" d="M${cx} ${cy - 7}L${cx + 7} ${cy}L${cx} ${cy + 7}L${cx - 7} ${cy}Z"/>`
          : `<circle class="${cls}" cx="${cx}" cy="${cy}" r="5.5"/>`;
      let label = "";
      if (p.label) {
        const side = p.labelSide ?? "right";
        const lx = side === "left" ? cx - 10 : side === "right" ? cx + 10 : cx;
        const ly = side === "above" ? cy - 12 : side === "below" ? cy + 20 : cy + 4;
        const anchor = side === "left" ? "end" : side === "right" ? "start" : "middle";
        label = `<text class="ch-label" x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(p.label)}</text>`;
      }
      return `<g class="ch-point" tabindex="0" role="img" aria-label="${esc(p.tip)}" data-tip="${esc(p.tip)}">${range}${mark}<circle class="ch-hit" cx="${cx}" cy="${cy}" r="12"/>${label}</g>`;
    })
    .join("");
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(chart.title)}">
<g>${grid}</g>${refs}<line class="ch-axis" x1="${M.left}" x2="${M.left + iw}" y1="${M.top + ih}" y2="${M.top + ih}"/><g>${xt}</g>
<text class="ch-title" x="${M.left - 44}" y="${M.top + ih / 2}" transform="rotate(-90 ${M.left - 44} ${M.top + ih / 2})" text-anchor="middle">${esc(chart.yTitle)}</text>
<g>${marks}</g></svg>`;
}

/** One tooltip per chart container, following pointer or keyboard focus. */
export function attachTooltips(container: HTMLElement): void {
  const tip = document.createElement("div");
  tip.className = "ch-tooltip";
  tip.hidden = true;
  container.append(tip);
  const show = (target: Element) => {
    const g = target.closest(".ch-point");
    if (!g) return;
    tip.textContent = g.getAttribute("data-tip");
    tip.hidden = false;
    const box = container.getBoundingClientRect();
    const mark = g.getBoundingClientRect();
    const left = Math.min(
      box.width - 260,
      Math.max(0, mark.left - box.left + mark.width / 2 - 130),
    );
    tip.style.left = `${left}px`;
    tip.style.top = `${mark.top - box.top - tip.offsetHeight - 8}px`;
  };
  container.addEventListener("pointerover", (e) => show(e.target as Element));
  container.addEventListener("focusin", (e) => show(e.target as Element));
  container.addEventListener("pointerleave", () => {
    tip.hidden = true;
  });
  container.addEventListener("focusout", () => {
    tip.hidden = true;
  });
}
