import { type MeasureChoice, measuredDoor } from "../core/measured-doorway";
import { esc } from "../ui/dom";
import { doorNumber } from "./doorway";

export const MEASURE_SVG_STYLE = `.measured-svg{display:block;width:100%;height:auto;font-family:Georgia,serif;color:#1f2328}.measured-svg text{fill:currentColor;font-size:16px}.measured-svg .recorded{fill:#e8eef3;stroke:currentColor;stroke-width:1.5}.measured-svg .reference{fill:none;stroke:#8b9199;stroke-width:1}.measured-svg .prediction{fill:none;stroke:#b3321f;stroke-width:2}.measured-svg .predicted-label{fill:#b3321f}.measured-svg .small{font-size:13px}`;

export function measuredSvg(choice: MeasureChoice): string {
  const m = measuredDoor(choice),
    scale = 58,
    floor = 430,
    cx = 182;
  const X = (x: number) => Number((cx + x * scale).toFixed(4));
  const Y = (y: number) => Number((floor - y * scale).toFixed(4));
  const b = m.bottom / 2,
    t = m.upper / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="measured-svg" viewBox="0 0 400 550" role="img" aria-labelledby="measure-title" aria-describedby="measure-desc"><title id="measure-title">Erechtheion opening: ${esc(m.rule.label)}, ${choice.fit} matched</title><desc id="measure-desc">Reported opening ${m.height} metres high and ${m.bottom} wide below. Calculated upper width ${m.upper} metres. Rule comparison height ${doorNumber(m.predictedHeight)} and lower width ${doorNumber(m.predictedWidth)} metres. Red shows a single compared dimension, not an upper profile or a reconstruction of the casing.</desc>
<path class="reference" d="M35 ${floor}H365"/>
<polygon class="recorded" points="${X(-b)},${Y(0)} ${X(b)},${Y(0)} ${X(t)},${Y(m.height)} ${X(-t)},${Y(m.height)}"/>
<text x="182" y="${Y(m.height) + 24}" text-anchor="middle">2.339 m, derived</text>
<text x="182" y="${Y(m.height / 2)}" text-anchor="middle">Reported opening</text>
<path class="reference" d="M85 ${Y(0)}V${Y(m.height)}M78 ${Y(0)}H92 M78 ${Y(m.height)}H92"/>
<text x="64" y="${Y(m.height / 2)}" transform="rotate(-90 64 ${Y(m.height / 2)})" text-anchor="middle">4.882 m</text>
<text x="182" y="455" text-anchor="middle">Lower width: 2.427 m</text>
${choice.fit === "height" ? `<path class="prediction" d="M${X(-m.predictedWidth / 2)} 485H${X(m.predictedWidth / 2)}M${X(-m.predictedWidth / 2)} 477V493 M${X(m.predictedWidth / 2)} 477V493"/><text class="predicted-label" x="182" y="518" text-anchor="middle">Rule lower width: ${doorNumber(m.predictedWidth)} m</text>` : `<path class="prediction" d="M325 ${Y(0)}V${Y(m.predictedHeight)}M318 ${Y(0)}H332 M318 ${Y(m.predictedHeight)}H332"/><text class="predicted-label" x="348" y="${Y(m.predictedHeight / 2)}" transform="rotate(-90 348 ${Y(m.predictedHeight / 2)})" text-anchor="middle">Rule height: ${doorNumber(m.predictedHeight)} m</text>`}
<text class="small" x="182" y="544" text-anchor="middle">Metres from the survey; no Roman foot conversion.</text></svg>`;
}
