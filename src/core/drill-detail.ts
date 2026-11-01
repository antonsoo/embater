import { pieceBounds } from "./geometry";
import type { Bounds, Elevation } from "./types";

export interface DetailPose {
  zoom: number;
  /** Displacement in drawing units from the selected component's centre. */
  x: number;
  y: number;
  /** A painted point chosen by the SVG reader; absent callers use the component centre. */
  focus?: readonly [number, number];
}

const overlaps = (a: Bounds, b: Bounds) =>
  a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
const clipped = (a: Bounds, b: Bounds): Bounds => ({
  x0: Math.max(a.x0, b.x0),
  x1: Math.min(a.x1, b.x1),
  y0: Math.max(a.y0, b.y0),
  y1: Math.min(a.y1, b.y1),
});

/** Locate one visible occurrence, instead of spanning every repeated column or bead. */
export function detailAnchor(elevation: Elevation, view: Bounds, part: string): Bounds {
  const boxes = elevation.pieces
    .filter((piece) => piece.part === part)
    .map(pieceBounds)
    .filter((box) => overlaps(box, view))
    .map((box) => clipped(box, view));
  if (!boxes.length) return view;
  const area = (b: Bounds) => (b.x1 - b.x0) * (b.y1 - b.y0);
  const seed = boxes.reduce((best, box) => (area(box) > area(best) ? box : best));
  let group = { ...seed };
  // Adjacent pieces of one occurrence belong together. Disjoint repetitions do not.
  for (let pass = 0; pass < boxes.length; pass++) {
    const before = { ...group };
    for (const box of boxes)
      if (overlaps(box, group))
        group = {
          x0: Math.min(group.x0, box.x0),
          x1: Math.max(group.x1, box.x1),
          y0: Math.min(group.y0, box.y0),
          y1: Math.max(group.y1, box.y1),
        };
    if (
      Object.keys(group).every((key) => group[key as keyof Bounds] === before[key as keyof Bounds])
    )
      break;
  }
  return group;
}

/** A crop of the original drawing, with equal horizontal/vertical units. No new detail. */
export function detailWindow(
  elevation: Elevation,
  view: Bounds,
  part: string,
  pose: DetailPose,
): Bounds {
  const anchor = detailAnchor(elevation, view, part);
  const diameter = elevation.unitsPerDiameter;
  const context = Math.max(
    diameter * 1.5,
    Math.min(Math.max(anchor.x1 - anchor.x0, anchor.y1 - anchor.y0) * 1.4, diameter * 4),
  );
  const zoom = Math.min(8, Math.max(1, Number.isFinite(pose.zoom) ? pose.zoom : 1));
  const width = context / zoom;
  const height = width * 0.75;
  const bound = elevation.bounds;
  const safe = (value: number) => (Number.isFinite(value) ? value : 0);
  const x = Math.min(
    bound.x1,
    Math.max(bound.x0, (pose.focus?.[0] ?? (anchor.x0 + anchor.x1) / 2) + safe(pose.x)),
  );
  const y = Math.min(
    bound.y1,
    Math.max(bound.y0, (pose.focus?.[1] ?? (anchor.y0 + anchor.y1) / 2) + safe(pose.y)),
  );
  return { x0: x - width / 2, x1: x + width / 2, y0: y - height / 2, y1: y + height / 2 };
}
