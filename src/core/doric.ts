import { fmtModules, pediment, steps } from "./common";
import { band, fluteLines, mirrored, poly, quad, rect, taperRatio } from "./geometry";
import type { Dim, Elevation, Piece, Pt } from "./types";

export type DoricSpacing = "diastyle" | "systyle";

export interface DoricInput {
  columns: 4 | 6 | 8;
  spacing: DoricSpacing;
  /** Size of one module in Roman feet. Vitruvius's taper depends on absolute height. */
  moduleFeet: number;
}

export interface FrontLayout {
  /** Axis-to-axis span of each intercolumniation, in modules. */
  spans: number[];
  /** Column axes measured from the outer edge of the left corner column at its foot. */
  axes: number[];
  /** Front width at the column feet: the number Vitruvius divides into parts. */
  width: number;
  /** Triglyph centres. */
  triglyphs: number[];
}

/** Centre-to-centre distance of triglyphs: a triglyph (1) plus a square metope (1½). */
export const TRIGLYPH_PITCH = 2.5;

/**
 * Lay out a Doric front from the triglyph rhythm of IV.3.5 and IV.3.7. Each ordinary
 * intercolumniation holds two triglyphs (diastyle) or one (systyle) between the columns,
 * the middle one a triglyph more; a triglyph stands over every column.
 */
export function doricFront(columns: number, spacing: DoricSpacing): FrontLayout {
  const between = spacing === "diastyle" ? 2 : 1;
  const middleIndex = columns / 2 - 1;
  const spans = Array.from({ length: columns - 1 }, (_, i) => {
    const triglyphsBetween = i === middleIndex ? between + 1 : between;
    return (triglyphsBetween + 1) * TRIGLYPH_PITCH;
  });
  const axes = [1];
  for (const span of spans) axes.push((axes.at(-1) ?? 0) + span);
  const width = (axes.at(-1) ?? 0) + 1;
  const triglyphs: number[] = [];
  for (let i = 0; i < spans.length; i++) {
    const start = axes[i] ?? 0;
    const count = Math.round((spans[i] ?? 0) / TRIGLYPH_PITCH);
    for (let j = 0; j < count; j++) triglyphs.push(start + j * TRIGLYPH_PITCH);
  }
  triglyphs.push(axes.at(-1) ?? 0);
  return { spans, axes, width, triglyphs };
}

/** Vertical stations of the Doric order in modules, from the top of the stylobate (IV.3.4–6). */
export const DORIC_LEVELS = {
  shaftTop: 13,
  neckTop: 13 + 1 / 3,
  echinusTop: 13 + 2 / 3,
  capitalTop: 14,
  epistyleTop: 15,
  friezeTop: 16.5,
  coronaTop: 17,
} as const;

/** Pediment height at the middle: a ninth of the corona's whole front (III.5.12, applied by IV.3.6). */
export function tympanumHeight(width: number, coronaProjection: number): number {
  return (width + 2 * coronaProjection) / 9;
}

export interface DoricElevation extends Elevation {
  layout: FrontLayout;
  taper: { ratio: number; parts: [number, number]; columnFeet: number };
  tympanum: number;
  pitchDegrees: number;
}

const L = DORIC_LEVELS;
const CORONA_PROJECTION = 1 / 2 + 1 / 6;
const ABACUS_HALF = (2 + 1 / 6) / 2;

function column(axis: number, corner: boolean, ratio: number): Piece[] {
  const r0 = corner ? 1 + 1 / 50 : 1;
  const r1 = r0 * ratio;
  const out: Piece[] = [];
  out.push(
    poly(
      "shaft",
      [
        [axis - r0, 0],
        [axis + r0, 0],
        [axis + r1, L.shaftTop],
        [axis - r1, L.shaftTop],
      ],
      true,
    ),
  );
  out.push(
    poly(
      "shaft",
      [
        [axis + r0 * 0.42, 0],
        [axis + r0, 0],
        [axis + r1, L.shaftTop],
        [axis + r1 * 0.42, L.shaftTop],
      ],
      true,
      "chosen",
      "shade",
    ),
  );
  out.push(...fluteLines("flute", axis, r0, r1, 0, L.neckTop, 20, 0.5));
  out.push(band("hypotrachelion", axis, r1, L.shaftTop, L.neckTop));
  out.push(band("hypotrachelion", axis, r1, L.shaftTop, L.shaftTop + 0.018, "chosen", "groove"));
  // Rings and echinus share the middle third; the text gives the third, not the profile.
  const ringH = 1 / 30;
  for (let k = 0; k < 3; k++) {
    const y = L.neckTop + k * ringH;
    out.push(band("annuli", axis, r1 + 0.04 + k * 0.012, y, y + ringH, "chosen"));
  }
  const echinusBase = L.neckTop + 3 * ringH;
  const echinusHalf: Pt[] = [
    [0, echinusBase],
    ...quad(
      [r1 + 0.08, echinusBase],
      [ABACUS_HALF - 0.02, echinusBase + 0.05],
      [ABACUS_HALF - 0.05, L.echinusTop],
    ),
    [0, L.echinusTop],
  ];
  out.push(poly("echinus", mirrored(axis, echinusHalf), true, "chosen"));
  out.push(band("abacus", axis, ABACUS_HALF, L.echinusTop, L.capitalTop));
  return out;
}

export function doricElevation(input: DoricInput): DoricElevation {
  const layout = doricFront(input.columns, input.spacing);
  const { width: W, axes, triglyphs } = layout;
  const columnFeet = 14 * input.moduleFeet;
  const taper = taperRatio(columnFeet);
  const pieces: Piece[] = [];
  const dims: Dim[] = [];

  const base = steps(W, input.moduleFeet, 0.4);
  pieces.push(...base.pieces);

  axes.forEach((axis, i) => {
    pieces.push(...column(axis, i === 0 || i === axes.length - 1, taper.ratio));
  });

  // Epistyle with taenia; regulae and guttae under every triglyph (IV.3.4).
  pieces.push(rect("epistyle", 0, L.capitalTop, W, 1));
  pieces.push(rect("taenia", -0.04, L.epistyleTop - 1 / 7, W + 0.08, 1 / 7));
  const hang = 1 / 6;
  for (const c of triglyphs) {
    const top = L.epistyleTop - 1 / 7;
    pieces.push(rect("regula", c - 0.5, top - hang / 3, 1, hang / 3));
    for (let g = 0; g < 6; g++) {
      const gx = c - 0.5 + (g + 0.5) / 6;
      pieces.push(
        poly(
          "guttae",
          [
            [gx - 0.05, top - hang / 3],
            [gx + 0.05, top - hang / 3],
            [gx + 0.065, top - hang],
            [gx - 0.065, top - hang],
          ],
          true,
          "chosen",
        ),
      );
    }
  }

  // Frieze: triglyphs one module wide, square metopes, half-metopes at the corners.
  const glyphTop = L.friezeTop - 1 / 6;
  for (const c of triglyphs) {
    const x0 = c - 0.5;
    pieces.push(rect("triglyph", x0, L.epistyleTop, 1, 1.5));
    for (const [a, b] of [
      [0, 1 / 12],
      [1 / 4, 5 / 12],
      [7 / 12, 3 / 4],
      [11 / 12, 1],
    ] as const) {
      pieces.push(
        rect(
          "glyph",
          x0 + a,
          L.epistyleTop,
          b - a,
          glyphTop - 0.05 - L.epistyleTop,
          "text",
          "groove",
        ),
      );
    }
    for (const a of [1 / 12, 5 / 12, 3 / 4] as const) {
      pieces.push(
        rect("meros", x0 + a, L.epistyleTop, 1 / 6, glyphTop - L.epistyleTop, "text", "line"),
      );
    }
    pieces.push(rect("triglyph-capital", x0, glyphTop, 1, 1 / 6));
  }
  for (let j = 0; j < triglyphs.length - 1; j++) {
    const a = (triglyphs[j] ?? 0) + 0.5;
    const b = (triglyphs[j + 1] ?? 0) - 0.5;
    pieces.push(rect("metope", a, L.epistyleTop, b - a, 1.5));
  }
  pieces.push(rect("hemimetope", 0, L.epistyleTop, 0.5, 1.5));
  pieces.push(rect("hemimetope", W - 0.5, L.epistyleTop, 0.5, 1.5));

  // Corona projects two thirds of a module beyond the frieze on every side (IV.3.6).
  const cx0 = -CORONA_PROJECTION;
  const cx1 = W + CORONA_PROJECTION;
  pieces.push(rect("cymatium", cx0 + 0.05, L.friezeTop, cx1 - cx0 - 0.1, 1 / 12, "chosen"));
  pieces.push(rect("corona", cx0, L.friezeTop + 1 / 12, cx1 - cx0, 1 / 3));
  pieces.push(
    rect("cymatium", cx0 - 0.04, L.coronaTop - 1 / 12, cx1 - cx0 + 0.08, 1 / 12, "chosen"),
  );

  // Mutules over every triglyph and every metope centre, six drops in a row; the gaps are "roads".
  const mutuleCentres: number[] = [];
  for (let j = 0; j < triglyphs.length; j++) {
    const c = triglyphs[j] ?? 0;
    mutuleCentres.push(c);
    const next = triglyphs[j + 1];
    if (next !== undefined) mutuleCentres.push((c + next) / 2);
  }
  mutuleCentres.forEach((c, j) => {
    const mh = 1 / 12;
    pieces.push(rect("mutule", c - 0.5, L.friezeTop, 1, mh, "chosen"));
    for (let g = 0; g < 6; g++) {
      const gx = c - 0.5 + (g + 0.5) / 6;
      pieces.push(
        poly(
          "mutule-guttae",
          [
            [gx - 0.045, L.friezeTop],
            [gx + 0.045, L.friezeTop],
            [gx + 0.055, L.friezeTop - 0.07],
            [gx - 0.055, L.friezeTop - 0.07],
          ],
          true,
          "chosen",
        ),
      );
    }
    const next = mutuleCentres[j + 1];
    if (next !== undefined) {
      pieces.push(rect("via", c + 0.5, L.friezeTop, next - c - 1, 1 / 12, "text", "line"));
    }
  });

  const ped = pediment(W, L.coronaTop, CORONA_PROJECTION, 0.5);
  pieces.push(...ped.pieces);
  const h = ped.tympanum;

  // Dimensions, in modules.
  const stepsBottom = base.bottom;
  axes.slice(0, -1).forEach((axis, i) => {
    const span = layout.spans[i] ?? 0;
    dims.push({
      from: [axis, stepsBottom],
      to: [axis + span, stepsBottom],
      label: fmtModules(span),
      offset: -0.9,
      rule: "doric-triglyph",
    });
  });
  dims.push({
    from: [0, stepsBottom],
    to: [W, stepsBottom],
    label: `${fmtModules(W)} modules`,
    offset: -2.1,
    rule: input.spacing === "diastyle" ? "doric-module" : "doric-systyle",
  });
  const right = cx1 + 0.4;
  dims.push({
    from: [right, 0],
    to: [right, L.capitalTop],
    label: "14",
    offset: 0.9,
    rule: "doric-column",
  });
  dims.push({
    from: [right, L.capitalTop],
    to: [right, L.epistyleTop],
    label: "1",
    offset: 0.9,
    rule: "doric-epistyle",
  });
  dims.push({
    from: [right, L.epistyleTop],
    to: [right, L.friezeTop],
    label: "1½",
    offset: 0.9,
    rule: "doric-triglyph",
  });
  dims.push({
    from: [right, L.friezeTop],
    to: [right, L.coronaTop],
    label: "½",
    offset: 0.9,
    rule: "doric-corona",
  });
  dims.push({
    from: [right, L.coronaTop],
    to: [right, L.coronaTop + h],
    label: fmtModules(h),
    offset: 0.9,
    rule: "ionic-corona",
  });

  return {
    pieces,
    dims,
    bounds: {
      x0: Math.min(-base.reach, cx0 - 0.6),
      x1: Math.max(W + base.reach, cx1 + 0.6),
      y0: stepsBottom,
      y1: ped.top,
    },
    unitsPerDiameter: 2,
    axes,
    layout,
    taper: { ...taper, columnFeet },
    tympanum: h,
    pitchDegrees: ped.pitchDegrees,
  };
}
