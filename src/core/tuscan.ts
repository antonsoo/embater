import { fmtModules } from "./common";
import { band, mirrored, poly, quad, rect } from "./geometry";
import type { Dim, Elevation, Piece, Pt } from "./types";

export interface TuscanInput {
  /** Width of the temple between the outer faces of its side walls, in Roman feet. */
  widthFeet: number;
}

/**
 * The Tuscan temple of IV.7, measured in lower column diameters. Everything follows from
 * the temple's width: column height a third of it, lower diameter a seventh of the height,
 * so the width is 21 diameters. Front columns stand on the lines of the walls (IV.7.2).
 */
export const TUSCAN = {
  width: 21,
  height: 7,
  /** Front column axes as tenths of the width: outer walls at 0 and 10, inner walls at 3 and 7. */
  axisTenths: [0, 3, 7, 10],
  baseTop: 0.5,
  plinthTop: 0.25,
  shaftTop: 6.5,
  capitalThird: 1 / 6,
  topRatio: 3 / 4,
  mutuleProjection: 7 / 4,
} as const;

export interface TuscanElevation extends Elevation {
  diameterFeet: number;
  tympanum: number;
  pitchDegrees: number;
  roofBase: number;
}

export function tuscanElevation(input: TuscanInput): TuscanElevation {
  const T = TUSCAN;
  const W = T.width;
  const diameterFeet = input.widthFeet / W;
  const axes = T.axisTenths.map((t) => (t / 10) * W);
  const pieces: Piece[] = [];
  const dims: Dim[] = [];

  // A podium with a frontal stair. Vitruvius does not describe it in IV.7; it is drawn as chosen.
  const podiumH = 2.2;
  pieces.push(rect("podium", -1.2, -podiumH, W + 2.4, podiumH, "chosen"));
  pieces.push(rect("podium", -1.35, -0.25, W + 2.7, 0.25, "chosen"));
  pieces.push(rect("podium", -1.35, -podiumH, W + 2.7, 0.3, "chosen"));

  // The three cellae doors seen through the wide intercolumniations: chosen sizes.
  const wallY1 = T.height + 0.7;
  pieces.push(rect("cella", 0, 0, W, wallY1, "chosen"));
  for (const [a, b] of [
    [0, 3],
    [3, 7],
    [7, 10],
  ] as const) {
    const mid = ((a + b) / 20) * W;
    const half = ((b - a) / 10) * W * (a === 3 ? 0.16 : 0.2);
    pieces.push(
      rect("valvae", mid - half, 0, 2 * half, T.height * (a === 3 ? 0.72 : 0.62), "chosen"),
    );
    pieces.push(
      rect(
        "valvae",
        mid - half,
        0,
        2 * half,
        T.height * (a === 3 ? 0.72 : 0.62),
        "chosen",
        "shade",
      ),
    );
  }

  const r0 = 0.5;
  const r1 = r0 * T.topRatio;
  for (const axis of axes) {
    // Base: round plinth and a torus with its apophysis, each a quarter diameter (IV.7.3).
    pieces.push(band("plinth", axis, 0.7, 0, T.plinthTop, "text"));
    const torusHalf: Pt[] = [[0, T.plinthTop]];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      torusHalf.push([0.5 + 0.17 * Math.sin(Math.PI * t * 0.9), T.plinthTop + 0.2 * t]);
    }
    torusHalf.push(...quad([0.52, T.plinthTop + 0.2], [0.5, T.baseTop - 0.02], [r0, T.baseTop], 4));
    torusHalf.push([0, T.baseTop]);
    pieces.push(poly("torus", mirrored(axis, torusHalf), true, "text"));
    pieces.push(
      poly(
        "shaft",
        [
          [axis - r0, T.baseTop],
          [axis + r0, T.baseTop],
          [axis + r1, T.shaftTop],
          [axis - r1, T.shaftTop],
        ],
        true,
      ),
    );
    pieces.push(
      poly(
        "shaft",
        [
          [axis + r0 * 0.4, T.baseTop],
          [axis + r0, T.baseTop],
          [axis + r1, T.shaftTop],
          [axis + r1 * 0.4, T.shaftTop],
        ],
        true,
        "chosen",
        "shade",
      ),
    );
    // Capital: hypotrachelion with apophysis, echinus, abacus as wide as the lower diameter.
    const c = T.capitalThird;
    pieces.push(band("hypotrachelion", axis, r1, T.shaftTop, T.shaftTop + c));
    pieces.push(band("hypotrachelion", axis, r1 + 0.04, T.shaftTop, T.shaftTop + 0.03, "chosen"));
    const echinus: Pt[] = [
      [0, T.shaftTop + c],
      ...quad(
        [r1 + 0.03, T.shaftTop + c],
        [0.5, T.shaftTop + c + 0.04],
        [0.48, T.shaftTop + 2 * c],
        8,
      ),
      [0, T.shaftTop + 2 * c],
    ];
    pieces.push(poly("echinus", mirrored(axis, echinus), true, "chosen"));
    pieces.push(band("abacus", axis, 0.5, T.shaftTop + 2 * c, T.height));
  }

  // Compound timber beams on the columns; their depth is left to the size of the work.
  const beamH = 0.8;
  pieces.push(rect("trabes", -r1, T.height, W + 2 * r1, beamH, "chosen"));
  pieces.push(
    rect("trabes", -r1, T.height + beamH * 0.47, W + 2 * r1, beamH * 0.06, "chosen", "groove"),
  );
  const P = T.mutuleProjection;
  // Beam ends over the walls and columns project a quarter of the column height (IV.7.5).
  const mutY = T.height + beamH;
  const mutH = 0.7;
  pieces.push(rect("mutulus", -P, mutY, W + 2 * P, mutH));
  for (const axis of axes)
    pieces.push(rect("antepagmentum", axis - 0.42, mutY + 0.08, 0.84, mutH - 0.16, "chosen"));
  for (const x of [-P, W + P - 0.2])
    pieces.push(rect("antepagmentum", x, mutY + 0.08, 0.2, mutH - 0.16, "chosen"));

  // Timber pediment and roof. The clause on the roof's fall is obscure; the pitch is chosen.
  const roofBase = mutY + mutH;
  const span = W + 2 * P;
  const rise = span / 2 / 3;
  const apex: Pt = [W / 2, roofBase + rise];
  pieces.push(
    poly(
      "tympanum",
      [
        [0, roofBase],
        [W, roofBase],
        [W / 2, roofBase + rise * (W / span)],
      ],
      true,
      "chosen",
    ),
  );
  const eave = 0.45;
  pieces.push(
    poly(
      "cantherius",
      [
        [-P, roofBase],
        [W / 2, roofBase + rise],
        [W + P, roofBase],
        [W + P, roofBase + eave],
        [W / 2, roofBase + rise + eave],
        [-P, roofBase + eave],
      ],
      true,
      "chosen",
    ),
  );
  pieces.push(
    rect("columen", W / 2 - 0.35, roofBase + rise * (W / span) - 0.2, 0.7, 0.7, "chosen"),
  );
  // Terracotta revetments along the roof edge, as the araeostyle temples of III.3.5 carry them.
  const tiles = 26;
  for (let i = 0; i <= tiles; i++) {
    const t = i / tiles;
    const x = -P + t * span;
    const yy = roofBase + eave + rise * (1 - Math.abs(2 * t - 1));
    pieces.push(
      poly(
        "antefixa",
        [
          [x - 0.18, yy],
          [x, yy + 0.42],
          [x + 0.18, yy],
        ],
        true,
        "chosen",
        "ornament",
      ),
    );
  }

  axes.slice(0, -1).forEach((axis, i) => {
    const next = axes[i + 1] ?? axis;
    dims.push({
      from: [axis, -podiumH],
      to: [next, -podiumH],
      label: fmtModules(next - axis),
      offset: -0.7,
      rule: "tuscan-plan",
    });
  });
  dims.push({
    from: [0, -podiumH],
    to: [W, -podiumH],
    label: `${W} diameters`,
    offset: -1.6,
    rule: "tuscan-plan",
  });
  const right = W + P + 0.4;
  dims.push({
    from: [right, 0],
    to: [right, T.height],
    label: "7",
    offset: 0.8,
    rule: "tuscan-column",
  });
  dims.push({
    from: [right, mutY],
    to: [right, mutY + mutH],
    label: "",
    offset: 0.8,
    rule: "tuscan-beams",
  });

  return {
    pieces,
    dims,
    bounds: { x0: -P - 0.6, x1: W + P + 0.6, y0: -podiumH, y1: apex[1] + eave + 0.6 },
    unitsPerDiameter: 1,
    axes,
    diameterFeet,
    tympanum: rise,
    roofBase,
    pitchDegrees: (Math.atan(rise / (span / 2)) * 180) / Math.PI,
  };
}
