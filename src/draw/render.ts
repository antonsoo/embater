import type { Bounds, Dim, Elevation, Piece, Pt } from "../core/types";

const n = (v: number) => (Math.round(v * 1000) / 1000).toString();
const pt = ([x, y]: Pt) => `${n(x)},${n(-y)}`;

function pieceSvg(piece: Piece): string {
  const cls = `pc ${piece.given} ${piece.ink}`;
  const attrs = `class="${cls}" data-part="${piece.part}"`;
  const s = piece.shape;
  switch (s.kind) {
    case "rect":
      return `<rect ${attrs} x="${n(s.x)}" y="${n(-(s.y + s.h))}" width="${n(s.w)}" height="${n(s.h)}"/>`;
    case "circle":
      return `<circle ${attrs} cx="${n(s.cx)}" cy="${n(-s.cy)}" r="${n(s.r)}"/>`;
    case "poly": {
      const d = s.pts.map(pt).join(" ");
      return s.closed ? `<polygon ${attrs} points="${d}"/>` : `<polyline ${attrs} points="${d}"/>`;
    }
  }
}

function dimSvg(dim: Dim, size: number): string {
  const [x0, y0] = dim.from;
  const [x1, y1] = dim.to;
  const horizontal = Math.abs(y1 - y0) < 1e-9;
  const tick = size * 0.45;
  if (horizontal) {
    const y = y0 + dim.offset;
    return `<g class="dim" data-rule="${dim.rule}">
<line x1="${n(x0)}" y1="${n(-y)}" x2="${n(x1)}" y2="${n(-y)}"/>
<line x1="${n(x0)}" y1="${n(-y - tick)}" x2="${n(x0)}" y2="${n(-y + tick)}"/>
<line x1="${n(x1)}" y1="${n(-y - tick)}" x2="${n(x1)}" y2="${n(-y + tick)}"/>
<text x="${n((x0 + x1) / 2)}" y="${n(-y + size * 1.25)}" font-size="${n(size)}" text-anchor="middle">${dim.label}</text></g>`;
  }
  const x = x0 + dim.offset;
  return `<g class="dim" data-rule="${dim.rule}">
<line x1="${n(x)}" y1="${n(-y0)}" x2="${n(x)}" y2="${n(-y1)}"/>
<line x1="${n(x - tick)}" y1="${n(-y0)}" x2="${n(x + tick)}" y2="${n(-y0)}"/>
<line x1="${n(x - tick)}" y1="${n(-y1)}" x2="${n(x + tick)}" y2="${n(-y1)}"/>
<text x="${n(x + size * 0.45)}" y="${n(-(y0 + y1) / 2 + size * 0.35)}" font-size="${n(size)}" text-anchor="start">${dim.label}</text></g>`;
}

export interface RenderOptions {
  /** Restrict the view, e.g. to one bay for the detail plate. */
  view?: Bounds;
  dims?: boolean;
  /** Extra margin around the drawing, in drawing units. */
  margin?: number;
  /** Size of dimension text, in drawing units. */
  labelSize?: number;
  title: string;
  /** Unique per plate on a page, so each drawing keeps its own hatch pattern. */
  id: string;
}

export function renderElevation(elevation: Elevation, options: RenderOptions): string {
  const b = options.view ?? elevation.bounds;
  const m = options.margin ?? 1;
  const size = options.labelSize ?? (b.x1 - b.x0) / 75;
  const dimRoom = options.dims === false ? 0 : size * 4.4;
  const x = b.x0 - m;
  const y = -(b.y1 + m);
  const w = b.x1 - b.x0 + 2 * m + (options.dims === false ? 0 : size * 3);
  const h = b.y1 - b.y0 + 2 * m + dimRoom;
  // Pieces are emitted back to front by the order builders; painting keeps that order.
  const body = elevation.pieces.map(pieceSvg).join("");
  const dims = options.dims === false ? "" : elevation.dims.map((d) => dimSvg(d, size)).join("");
  // Hatching is spaced relative to the visible width, so a zoomed detail keeps fine lines.
  const hatch = w / 380;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="plate-svg" viewBox="${n(x)} ${n(y - 0)} ${n(w)} ${n(h)}" role="img" aria-label="${options.title}">
<defs><pattern id="hatch-${options.id}" patternUnits="userSpaceOnUse" width="${n(hatch)}" height="${n(hatch)}" patternTransform="rotate(62)"><line x1="0" y1="0" x2="0" y2="${n(hatch)}" class="hatch-line" stroke-width="${n(hatch * 0.32)}"/></pattern></defs>
<g class="pieces" style="--hatch: url(#hatch-${options.id})">${body}</g><g class="dims">${dims}</g></svg>`;
}
