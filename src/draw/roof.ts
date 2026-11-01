import { fmtModules, type Pediment } from "../core/common";
import { rect } from "../core/geometry";
import type { Elevation } from "../core/types";
import { renderElevation } from "./render";

/** A blue trial is a modern measuring envelope, never part of the ancient prescription. */
export function roofDrawing(
  roof: Pediment,
  ratio: number,
  dims: boolean,
  target: "corner" | "middle" = "corner",
): string {
  const corner = roof.ornaments[0];
  const middle = roof.ornaments[1];
  if (!corner || !middle) throw new Error("The roof needs corner and middle ornaments.");
  const h = roof.tympanum;
  const selected = target === "middle" ? middle : corner;
  const trial = rect(
    "roof-trial",
    selected.x - selected.height * 0.22,
    selected.y,
    selected.height * 0.44,
    h * ratio,
    "chosen",
    "line",
  );
  const elevation: Elevation = {
    pieces: [...roof.pieces, trial],
    axes: [],
    unitsPerDiameter: 1,
    bounds: {
      x0: -roof.projection - 1,
      x1: roof.width + roof.projection + 1,
      y0: roof.base - 0.5,
      y1: Math.max(roof.top, selected.y + h * ratio) + 0.5,
    },
    dims: [
      {
        from: [corner.x + h * 0.5, corner.y],
        to: [corner.x + h * 0.5, corner.y + h],
        offset: 0.5,
        label: "h",
        rule: "sima-acroteria",
      },
      {
        from: [middle.x + middle.height * 0.5, middle.y],
        to: [middle.x + middle.height * 0.5, middle.y + middle.height],
        offset: 0.5,
        label: "9h/8",
        rule: "sima-acroteria",
      },
      {
        from: [roof.width, roof.base],
        to: [roof.width, roof.base + h],
        offset: 0.5,
        label: "h",
        rule: "ionic-corona",
      },
      {
        from: [-roof.projection, roof.base],
        to: [roof.width + roof.projection, roof.base],
        offset: -0.45,
        label: `9h = ${fmtModules(9 * h)}`,
        rule: "ionic-corona",
      },
    ],
  };
  return renderElevation(elevation, {
    id: "roof",
    title: `Vitruvian pediment: corner ornaments h, middle ornament 9h/8, blue ${target} trial envelope`,
    dims,
    labelSize: (roof.width + 2 * roof.projection) / 65,
  });
}

export function roofCsv(
  roof: Pediment,
  unitFeet: number,
  ratio: number,
  target: "corner" | "middle" = "corner",
): string {
  const rows = [
    ["Measurement", "Drawing units", "Roman feet", "Rule or convention"],
    [
      "Corona front",
      String(roof.tympanum * 9),
      String(roof.tympanum * 9 * unitFeet),
      "III.5.12: front / 9 = h",
    ],
    ["Tympanum h", String(roof.tympanum), String(roof.tympanum * unitFeet), "III.5.12"],
    ["Corner ornament", String(roof.tympanum), String(roof.tympanum * unitFeet), "III.5.12: h"],
    [
      "Middle ornament",
      String((roof.tympanum * 9) / 8),
      String(((roof.tympanum * 9) / 8) * unitFeet),
      "III.5.12: 9h/8",
    ],
    [
      "Blue trial envelope",
      String(roof.tympanum * ratio),
      String(roof.tympanum * ratio * unitFeet),
      `Modern ${target} trial: ${ratio}h`,
    ],
    [
      "Model boundary",
      "",
      "",
      "Palmettes, plinths, mounting wedges, corner insets and normal cornice thickness are drawing choices; not a building survey. Doric applies III.5.12 through IV.3.6.",
    ],
  ];
  return `${rows.map((row) => row.map((v) => `"${v.replaceAll('"', '""')}"`).join(",")).join("\r\n")}\r\n`;
}

export function roofSvg(
  roof: Pediment,
  ratio: number,
  dims: boolean,
  target: "corner" | "middle" = "corner",
): string {
  const svg = roofDrawing(roof, ratio, dims, target);
  return svg.replace(
    /(<svg[^>]*>)/,
    `$1<title>Embater: measured roof ornaments</title><desc>Modern schematic reading of Vitruvius III.5.12, Krohn 1912 printed page 74. h is a ninth of the model corona front. Corners h; middle 9h/8. Blue ${target} trial ${ratio}h. Palmettes, plinths, grey mounting wedges, corner insets and normal cornice thickness are drawing choices. No historical reconstruction is implied. https://archive.org/details/vitruviidearchit00vitr_1/page/n91/mode/1up . Drawing: Copyright 2026 Anthony Mercer, MIT.</desc><style>
svg{background:#f8f9f5;color:#1f2328}.pc{vector-effect:non-scaling-stroke;stroke-linejoin:round}.solid{fill:#f8f9f5;stroke:#1f2328;stroke-width:.9px}.solid.chosen,.ornament{stroke:#626870}.ornament{fill:#f8f9f5;stroke-width:.8px}.line{fill:none;stroke:#1f2328;stroke-width:.55px}.hatch-line{stroke:#1f2328;opacity:.38}.dim{fill:#b3321f}.dim line{vector-effect:non-scaling-stroke;stroke:#b3321f;stroke-width:.8px}.dim text{stroke:none;font-family:Georgia,serif;text-anchor:middle}[data-part="roof-trial"]{stroke:#1f4e9c;stroke-width:1.8px;stroke-dasharray:5 4;fill:none}
</style>`,
  );
}
