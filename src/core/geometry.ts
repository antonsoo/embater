import type { Given, Ink, Piece, Pt } from "./types";

export function rect(
  part: string,
  x: number,
  y: number,
  w: number,
  h: number,
  given: Given = "text",
  ink: Ink = "solid",
): Piece {
  return { part, shape: { kind: "rect", x, y, w, h }, given, ink };
}

export function poly(
  part: string,
  pts: readonly Pt[],
  closed: boolean,
  given: Given = "text",
  ink: Ink = "solid",
): Piece {
  return { part, shape: { kind: "poly", pts, closed }, given, ink };
}

/** A rectangle centred on x, spanning y0..y1. */
export function band(
  part: string,
  cx: number,
  halfWidth: number,
  y0: number,
  y1: number,
  given: Given = "text",
  ink: Ink = "solid",
): Piece {
  return rect(part, cx - halfWidth, y0, 2 * halfWidth, y1 - y0, given, ink);
}

/** Reflect a half-profile drawn right of the axis to make a closed outline. */
export function mirrored(axis: number, half: readonly Pt[]): Pt[] {
  const right = half.map(([x, y]) => [axis + x, y] as const);
  const left = [...half].reverse().map(([x, y]) => [axis - x, y] as const);
  return [...right, ...left];
}

/** Quadratic Bézier sampled to a polyline, for profiles the text leaves to the draughtsman. */
export function quad(a: Pt, control: Pt, b: Pt, steps = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([
      u * u * a[0] + 2 * u * t * control[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * control[1] + t * t * b[1],
    ]);
  }
  return out;
}

/**
 * Ratio of the top diameter to the bottom diameter (III.3.12). Vitruvius states five
 * bands up to fifty feet and tells us to continue "pro rata" beyond; we continue the
 * same half-part step, and say so where the value is shown.
 */
export function taperRatio(heightFeet: number): { ratio: number; parts: [number, number] } {
  const bands: [number, number, number][] = [
    [15, 5, 6],
    [20, 5.5, 6.5],
    [30, 6, 7],
    [40, 6.5, 7.5],
    [50, 7, 8],
  ];
  for (const [limit, top, bottom] of bands) {
    if (heightFeet <= limit) return { ratio: top / bottom, parts: [top, bottom] };
  }
  const extra = Math.ceil((heightFeet - 50) / 10);
  const top = 7 + extra / 2;
  const bottom = 8 + extra / 2;
  return { ratio: top / bottom, parts: [top, bottom] };
}

/**
 * Elevation lines of flute edges on a tapered shaft. A flute edge at angle θ on a
 * circle of radius r appears at x = r·sin θ; only the front half is visible.
 */
export function fluteLines(
  part: string,
  axis: number,
  rBottom: number,
  rTop: number,
  y0: number,
  y1: number,
  count: number,
  offset: number,
): Piece[] {
  const out: Piece[] = [];
  for (let k = 0; k < count; k++) {
    const theta = ((k + offset) / count) * 2 * Math.PI - Math.PI;
    if (Math.cos(theta) <= 0.02) continue;
    const s = Math.sin(theta);
    out.push(
      poly(
        part,
        [
          [axis + rBottom * s, y0],
          [axis + rTop * s, y1],
        ],
        false,
        "text",
        "line",
      ),
    );
  }
  return out;
}

/** Modern linear-radius spiral. Its station schedule and interpolation need separate justification; this is not a compass construction. */
export function spiral(
  cx: number,
  cy: number,
  r0: number,
  shrinkPerQuarter: number,
  quarters: number,
  startAngle: number,
  direction: 1 | -1,
  steps = 160,
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const q = (i / steps) * quarters;
    const r = r0 - shrinkPerQuarter * q;
    const a = startAngle - direction * q * (Math.PI / 2);
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

export function circlePiece(
  part: string,
  cx: number,
  cy: number,
  r: number,
  given: Given = "text",
  ink: Ink = "solid",
): Piece {
  return { part, shape: { kind: "circle", cx, cy, r }, given, ink };
}

/** A band of constant width along a polyline, as a closed outline (for scrolls and stalks). */
export function strip(path: readonly Pt[], width: number, taper = 0): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)] as Pt;
    const b = path[Math.min(path.length - 1, i + 1)] as Pt;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const w = (width / 2) * (1 - (taper * i) / Math.max(1, path.length - 1));
    const [x, y] = path[i] as Pt;
    left.push([x - (dy / len) * w, y + (dx / len) * w]);
    right.push([x + (dy / len) * w, y - (dx / len) * w]);
  }
  return [...left, ...right.reverse()];
}

/** Axis-aligned bounding box of a piece. */
export function pieceBounds(piece: Piece): { x0: number; x1: number; y0: number; y1: number } {
  const s = piece.shape;
  if (s.kind === "rect") return { x0: s.x, x1: s.x + s.w, y0: s.y, y1: s.y + s.h };
  if (s.kind === "circle")
    return { x0: s.cx - s.r, x1: s.cx + s.r, y0: s.cy - s.r, y1: s.cy + s.r };
  const xs = s.pts.map((p) => p[0]);
  const ys = s.pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** Parts with at least one piece lying wholly inside the view, in drawing order. */
export function partsInView(
  pieces: readonly Piece[],
  view: { x0: number; x1: number; y0: number; y1: number },
): string[] {
  const seen = new Set<string>();
  for (const p of pieces) {
    const b = pieceBounds(p);
    if (b.x0 >= view.x0 && b.x1 <= view.x1 && b.y0 >= view.y0 && b.y1 <= view.y1) seen.add(p.part);
  }
  return [...seen];
}

/** Scale a local column member around its own axis and seating level. */
export function scaleMember(
  pieces: readonly Piece[],
  axis: number,
  level: number,
  factor: number,
): Piece[] {
  const point = ([x, y]: Pt): Pt => [axis + (x - axis) * factor, level + (y - level) * factor];
  return pieces.map((piece) => {
    const shape = piece.shape;
    if (shape.kind === "poly") return { ...piece, shape: { ...shape, pts: shape.pts.map(point) } };
    if (shape.kind === "rect") {
      const [x, y] = point([shape.x, shape.y]);
      return { ...piece, shape: { ...shape, x, y, w: shape.w * factor, h: shape.h * factor } };
    }
    const [cx, cy] = point([shape.cx, shape.cy]);
    return { ...piece, shape: { ...shape, cx, cy, r: shape.r * factor } };
  });
}

/** Visible shaft span includes the separate corner thickening; nominal rhythms do not. */
export function shaftSpan(pieces: readonly Piece[]): { x0: number; x1: number; width: number } {
  const shafts = pieces
    .filter((piece) => piece.part === "shaft" && piece.ink === "solid")
    .map(pieceBounds);
  if (!shafts.length) throw new Error("This drawing has no measurable shaft outlines.");
  const x0 = Math.min(...shafts.map((shape) => shape.x0));
  const x1 = Math.max(...shafts.map((shape) => shape.x1));
  return { x0, x1, width: x1 - x0 };
}
