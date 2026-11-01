import type { Bounds } from "../core/types";

/** Find an actually painted point, respecting overlap in this SVG's drawing order.
 * Bounding-box centres can lie in a courtyard, opening, or behind another feature.
 */
export function visiblePartPoint(
  svg: SVGSVGElement,
  view: Bounds,
  part: string,
  preferred: readonly [number, number],
): readonly [number, number] | undefined {
  const scale = Math.abs(svg.getScreenCTM()?.a ?? 1) || 1;
  const pad = 2 / scale;
  const geometry = [...svg.querySelectorAll<SVGGeometryElement>(".pc")].map((element) => {
    const box = element.getBBox();
    const style = getComputedStyle(element);
    return {
      element,
      box,
      fill: style.fill !== "none" && Number(style.fillOpacity) !== 0,
      stroke:
        style.stroke !== "none" &&
        Number(style.strokeOpacity) !== 0 &&
        Number.parseFloat(style.strokeWidth) > 0,
    };
  });
  const selected = geometry.filter((entry) => entry.element.getAttribute("data-part") === part);
  const candidates: { x: number; y: number; distance: number }[] = [];
  for (const entry of selected) {
    const { box } = entry;
    const x0 = Math.max(view.x0, box.x),
      x1 = Math.min(view.x1, box.x + box.width);
    const y0 = Math.max(view.y0, -box.y - box.height),
      y1 = Math.min(view.y1, -box.y);
    if (x1 < x0 || y1 < y0) continue;
    const fractions = [0.5, 0.25, 0.75, 0, 1, 0.1, 0.9];
    for (const u of fractions)
      for (const v of fractions)
        candidates.push({
          x: x0 + (x1 - x0) * u,
          y: y0 + (y1 - y0) * v,
          distance:
            (x0 + (x1 - x0) * u - preferred[0]) ** 2 + (y0 + (y1 - y0) * v - preferred[1]) ** 2,
        });
    // Thin lines and curved boundaries may have no interior grid point at all.
    if (entry.stroke) {
      const length = entry.element.getTotalLength();
      for (const fraction of [0.5, 0.25, 0.75, 0.1, 0.9, 0, 1]) {
        const point = entry.element.getPointAtLength(length * fraction);
        if (point.x >= view.x0 && point.x <= view.x1 && -point.y >= view.y0 && -point.y <= view.y1)
          candidates.push({ x: point.x, y: -point.y, distance: 0.5 });
      }
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const frontToBack = geometry.reverse();
  for (const candidate of candidates) {
    const point = new DOMPoint(candidate.x, -candidate.y);
    const painted = frontToBack.find(
      ({ element, box, fill, stroke }) =>
        point.x >= box.x - pad &&
        point.x <= box.x + box.width + pad &&
        point.y >= box.y - pad &&
        point.y <= box.y + box.height + pad &&
        ((fill && element.isPointInFill(point)) || (stroke && element.isPointInStroke(point))),
    );
    if (painted?.element.getAttribute("data-part") === part) return [candidate.x, candidate.y];
  }
  return undefined;
}
