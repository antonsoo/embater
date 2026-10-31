import type { DoorTerm } from "../content/doorway-reading";
import { type DoorState, doorway } from "../core/doorway";
import { esc } from "../ui/dom";

export const doorNumber = (n: number): string =>
  Math.abs(n) < 1e-10 ? "0" : Number(n.toFixed(4)).toString();
const n = (v: number) => Number(v.toFixed(4));

export const DOOR_SVG_STYLE = `
.door-svg{display:block;width:100%;height:auto;font-family:Georgia,serif;color:#1f2328}
.door-svg text{fill:currentColor;font-size:17px}
.door-svg .stone{fill:#e0e4df;stroke:currentColor;stroke-width:1.2}
.door-svg .opening{fill:#e8eef3;stroke:currentColor;stroke-width:1.2}
.door-svg .reference{fill:none;stroke:#8b9199;stroke-width:1}
.door-svg .rule-line{fill:none;stroke:#b3321f;stroke-width:2;stroke-dasharray:5 4}
.door-svg .trial-line{fill:none;stroke:#1f4e9c;stroke-width:2.5}
.door-svg .measure{fill:none;stroke:#b3321f;stroke-width:1}
.door-svg .measure-text{fill:#b3321f;font-size:17px}
.door-svg .part.selected{fill:#c8daf2;stroke:#1f4e9c;stroke-width:2.5}
.door-svg .ruler-fill{fill:#d5dfeb;stroke:none}
.door-svg .small{font-size:14px}
`;

export function doorPlate(s: DoorState, trial: boolean, selected?: DoorTerm): string {
  const m = doorway(s);
  const scale = 440 / s.ceiling;
  const floor = 520,
    ceiling = 80,
    cx = 215;
  const X = (x: number) => n(cx + x * scale);
  const Y = (y: number) => n(floor - y * scale);
  const poly = (id: DoorTerm, pts: number[][], cls: string) =>
    `<polygon data-door-part="${id}" class="part ${cls}${selected === id ? " selected" : ""}" points="${pts.map(([x = 0, y = 0]) => `${X(x)},${Y(y)}`).join(" ")}"/>`;
  const b = m.bottom / 2,
    t = m.top / 2;
  const opening = [
    [-b, 0],
    [b, 0],
    [t, m.height],
    [-t, m.height],
  ];
  const parts = [poly("opening", opening, "opening")];
  for (const side of [-1, 1])
    parts.push(
      poly(
        "jamb",
        [
          [side * b, 0],
          [side * (b + m.jamb), 0],
          [side * (t + m.jambTop), m.height],
          [side * t, m.height],
        ],
        "stone",
      ),
    );
  parts.push(
    poly(
      "lintel",
      [
        [-t - m.jambTop, m.height],
        [t + m.jambTop, m.height],
        [t + m.jambTop, m.height + m.jambTop],
        [-t - m.jambTop, m.height + m.jambTop],
      ],
      "stone",
    ),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" class="door-svg" viewBox="0 0 360 610" role="img" aria-labelledby="${trial ? "chosen" : "other"}-title" aria-describedby="${trial ? "chosen" : "other"}-desc">
<title id="${trial ? "chosen" : "other"}-title">${s.kind === "ionic" ? "Ionic" : "Doric"} opening ${s.reading === "supplied" ? "with" : "without"} the supplied half</title>
<desc id="${trial ? "chosen" : "other"}-desc">Ceiling ${doorNumber(s.ceiling)} Roman feet. Opening ${doorNumber(m.height)} high, ${doorNumber(m.bottom)} wide below and ${doorNumber(m.top)} wide above. Each lower jamb ${doorNumber(m.jamb)} wide. ${esc(m.band)}.${trial ? ` Blue trial upper width ${doorNumber(m.trialTop)}; dashed red marks the computed opening.` : ""} Both diagrams share a scale.</desc>
<text x="180" y="25" text-anchor="middle">${s.reading === "supplied" ? "With ⟨semis⟩" : "Without ⟨semis⟩"}</text>
<text x="180" y="50" text-anchor="middle" class="small">${s.reading === "supplied" ? "Krohn’s supplied half: 5/7" : "Omit that supplement: 4/7"}</text>
<rect class="ruler-fill" x="39" y="${Y(m.height)}" width="14" height="${n(m.height * scale)}"/>
<path class="reference" d="M39 ${ceiling}H53V${floor}H39Z M75 ${ceiling}H340 M75 ${floor}H340"/>
${Array.from({ length: 8 }, (_, i) => `<path class="reference" d="M35 ${n(ceiling + (i * 440) / 7)}H57"/><text class="small" x="24" y="${n(ceiling + (i * 440) / 7 + 5)}" text-anchor="end">${7 - i}</text>`).join("")}
<text data-door-part="ceiling" class="part" x="205" y="72" text-anchor="middle">Ceiling ${doorNumber(s.ceiling)} ft</text>
${parts.join("")}
<path class="measure" d="M${X(b + m.jamb + 0.3)} ${Y(0)}h10 M${X(b + m.jamb + 0.3) + 5} ${Y(0)}V${Y(m.height)} M${X(b + m.jamb + 0.3)} ${Y(m.height)}h10"/>
<text x="${X(b + m.jamb + 0.3) + 18}" y="${Y(m.height / 2)}" transform="rotate(-90 ${X(b + m.jamb + 0.3) + 18} ${Y(m.height / 2)})" text-anchor="middle" class="measure-text">H = ${doorNumber(m.height)} ft</text>
<text x="215" y="${Y(m.height) + n((m.height * scale) / 2)}" text-anchor="middle" class="small">${s.kind === "doric" ? "Doric" : "Ionic"}</text>
<path class="rule-line" d="M${X(-b)} ${floor}L${X(-t)} ${Y(m.height)}H${X(t)}L${X(b)} ${floor}"/>
${trial ? `<path class="trial-line" d="M${X(-b)} ${floor}L${X(-m.trialTop / 2)} ${Y(m.height)}H${X(m.trialTop / 2)}L${X(b)} ${floor}"/>` : ""}
<path class="measure" d="M${X(-b)} 535V550 M${X(-b)} 543H${X(b)} M${X(b)} 535V550"/>
<text class="measure-text" x="215" y="570" text-anchor="middle">Foot ${doorNumber(m.bottom)} ft</text>
<text class="measure-text" x="215" y="595" text-anchor="middle">Head ${doorNumber(m.top)} ft</text>
</svg>`;
}

/** A uniform-scale enlargement of the upper right corner, with the same geometry. */
export function doorCorner(s: DoorState): string {
  const m = doorway(s),
    scale = 72 / m.jamb;
  const X = (x: number) => n(190 + (x - m.top / 2) * scale);
  const Y = (y: number) => n(120 + (m.height - y) * scale);
  const low = m.height - 2.6 * m.jamb;
  const right = (y: number) => m.bottom / 2 - (m.inset * y) / m.height;
  const outer = (y: number) => right(y) + m.jamb - ((m.jamb - m.jambTop) * y) / m.height;
  const trial = (y: number) => m.bottom / 2 - (m.trialInset * y) / m.height;
  const polygon = [
    [right(low), low],
    [outer(low), low],
    [outer(m.height), m.height],
    [right(m.height), m.height],
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" class="door-svg" viewBox="0 0 360 380" role="img" aria-label="Uniform-scale enlargement of the upper right corner; solid blue trial and dashed red rule">
<text x="15" y="25">Upper right corner, enlarged</text>
<path class="stone" d="M${X(right(m.height) - 1.6 * m.jamb)} ${Y(m.height)}H${X(outer(m.height))}V${Y(m.height + m.jambTop)}H${X(right(m.height) - 1.6 * m.jamb)}Z"/>
<polygon class="stone" points="${polygon.map(([x = 0, y = 0]) => `${X(x)},${Y(y)}`).join(" ")}"/>
<path class="rule-line" d="M${X(right(low))} ${Y(low)}L${X(right(m.height))} ${Y(m.height)}H75"/>
<path class="trial-line" d="M${X(trial(low))} ${Y(low)}L${X(trial(m.height))} ${Y(m.height)}H75"/>
<text x="15" y="345" class="small">Both axes enlarged equally. Stone follows the rule.</text>
<text x="15" y="367" class="small">Trial differs by ${doorNumber(m.error / 2)} ft at this corner.</text>
</svg>`;
}

export function savedDoorSvg(s: DoorState): string {
  return doorPlate(s, true).replace(
    /<\/desc>/,
    `</desc><style>${DOOR_SVG_STYLE}</style><metadata>${esc(JSON.stringify({ model: "Vitruvius IV.6.1–3 reading; not a historical reconstruction", choices: s, unit: "Roman foot", assumptions: ["Ionic H/14 jamb extended to Doric by choice", "contraction removed from whole width, symmetrically", "shared endpoints assigned to lower band", "mouldings and door leaves omitted"] }))}</metadata>`,
  );
}
