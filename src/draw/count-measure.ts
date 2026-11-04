import { type CountTrial, countMeasures } from "../core/count-measure";

export const measureNumber = (n: number): string => n.toFixed(4).replace(/\.?0+$/, "");

/** Fixed scale across all permitted settings. The drawing never rescales a changed pitch. */
export function countMeasureSvg(flank: number, trial: CountTrial): string {
  const measures = countMeasures(flank, trial);
  const axes = measures[0];
  const selected = measures.find((m) => m.edge === trial.edge);
  if (!axes || !selected) throw new Error("Missing measurement.");
  const k = 12;
  const x = 72;
  const y = 110;
  const outside = 0.5 + trial.margin;
  const height = Math.max(440, Math.ceil(y + (axes.length + outside) * k + 90));
  const footer = height - 43;
  const left = x - outside * k;
  const top = y - outside * k;
  const size = trial.edge === "axes" ? 0 : trial.edge === "faces" ? 0.5 : outside;
  const a = x - size * k;
  const b = y - size * k;
  const w = selected.width * k;
  const h = selected.length * k;
  const dots: string[] = [];
  for (let i = 0; i < flank; i++)
    for (let j = 0; j < 6; j++) {
      if (i > 0 && i < flank - 1 && j > 0 && j < 5) continue;
      dots.push(
        `<circle data-trial-column="" cx="${x + j * trial.frontPitch * k}" cy="${y + i * trial.flankPitch * k}" r="${k / 2}" fill="#f8f9f5" stroke="#1f2328" stroke-width="1"/>`,
      );
    }
  const ruler = `<path d="M${a} ${b}v-26m0 6h${w}m0 -6v26M${a + w} ${b}h28m-6 0v${h}m6 0h-28" stroke="#1f4e9c" fill="none" stroke-width="1.5"/>
    <text x="${a + w / 2}" y="${b - 31}" text-anchor="middle" fill="#1f4e9c" font-size="17">${measureNumber(selected.width)} D</text>
    <text transform="translate(${a + w + 43},${b + h / 2}) rotate(90)" text-anchor="middle" fill="#1f4e9c" font-size="17">${measureNumber(selected.length)} D</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 ${height}" role="img" aria-labelledby="measure-title measure-desc">
  <title id="measure-title">Same columns, different measuring endpoints</title><desc id="measure-desc">Modern trial, six by ${flank} columns. ${selected.label}: width ${measureNumber(selected.width)} D, length ${measureNumber(selected.length)} D, ratio ${measureNumber(selected.ratio)}. Pitch and platform margin are chosen, not surveyed. Fixed drawing scale.</desc>
  <metadata>Original diagram: Copyright 2026 Anthony Mercer; PolyForm Noncommercial 1.0.0. Companion text: Vitruvius III.4.3. The count comes from the selected comparison. Geometry and measuring endpoints are modern trial assumptions. Trial settings: ${JSON.stringify(trial)}; flank columns: ${flank}.</metadata>
  <rect width="520" height="${height}" fill="#f8f9f5"/>
  <g font-family="Georgia,serif" fill="#1f2328">
  <text x="24" y="30" font-size="17">6 × ${flank} columns · ${5 * 2 === flank - 1 ? "double" : "not double"} the spaces</text>
  <text x="24" y="54" font-size="14">Fixed scale · one shaft diameter = D</text>
  <rect x="${left}" y="${top}" width="${(axes.width + 2 * outside) * k}" height="${(axes.length + 2 * outside) * k}" fill="#eceee9" stroke="#8b9199"/>
  <rect x="${x}" y="${y}" width="${axes.width * k}" height="${axes.length * k}" fill="none" stroke="#8b9199" stroke-dasharray="4 4"/>
  ${dots.join("")}
  <rect x="${a}" y="${b}" width="${w}" height="${h}" fill="none" stroke="#1f4e9c" stroke-width="1.4"/>
  ${ruler}
  <path d="M24 ${footer}h120m-120 -4v8m60 -8v8m60 -8v8" stroke="#1f2328" fill="none"/>
  <text x="84" y="${footer + 23}" text-anchor="middle" font-size="13">10 D</text>
  <text x="180" y="${footer - 2}" font-size="14">${selected.label}</text>
  <text x="180" y="${footer + 24}" font-size="21" fill="#1f4e9c">L / W = ${measureNumber(selected.ratio)}</text>
  </g></svg>`;
}
