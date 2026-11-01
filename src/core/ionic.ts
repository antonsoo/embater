import { fmtModules, type Pediment, pediment, steps } from "./common";
import {
  band,
  circlePiece,
  mirrored,
  poly,
  quad,
  rect,
  spiral,
  strip,
  taperRatio,
} from "./geometry";
import type { Dim, Elevation, Piece, Pt } from "./types";

export type IonicSpacing = "pycnostyle" | "systyle" | "eustyle" | "diastyle";
export type BaseKind = "attic" | "ionic";

export interface IonicInput {
  order: "ionic" | "corinthian";
  columns: 4 | 6 | 8;
  spacing: IonicSpacing;
  base: BaseKind;
  /** Lower diameter in Roman feet: the module of III.3.7. */
  moduleFeet: number;
  sculptedFrieze: boolean;
}

/** Clear width of an intercolumniation in lower diameters (III.3.1–4, III.3.6). */
export const CLEAR: Record<IonicSpacing, number> = {
  pycnostyle: 1.5,
  systyle: 2,
  eustyle: 2.25,
  diastyle: 3,
};

/** Column height in lower diameters (III.3.10). */
export const IONIC_HEIGHT: Record<IonicSpacing, number> = {
  pycnostyle: 10,
  systyle: 9.5,
  eustyle: 9.5,
  diastyle: 8.5,
};

export interface IonicFront {
  spans: number[];
  axes: number[];
  /** Columns plus intercolumniations: what III.3.7 divides into modules. */
  width: number;
}

export function ionicFront(columns: number, spacing: IonicSpacing): IonicFront {
  const middleIndex = columns / 2 - 1;
  const spans = Array.from({ length: columns - 1 }, (_, i) => {
    const clear = spacing === "eustyle" && i === middleIndex ? 3 : CLEAR[spacing];
    return clear + 1;
  });
  const axes = [0.5];
  for (const span of spans) axes.push((axes.at(-1) ?? 0) + span);
  return { spans, axes, width: (axes.at(-1) ?? 0) + 0.5 };
}

/** Column height in lower diameters: Corinthian adds two thirds for its taller capital (IV.1.1). */
export function columnHeight(order: "ionic" | "corinthian", spacing: IonicSpacing): number {
  return IONIC_HEIGHT[spacing] + (order === "corinthian" ? 2 / 3 : 0);
}

/**
 * Epistyle height from the column's height in feet (III.5.8). The text starts at twelve
 * feet and stops at thirty; below and above we continue its pattern, and say so.
 */
export function epistyleHeight(
  heightDiameters: number,
  columnFeet: number,
): {
  height: number;
  rule: string;
  extrapolated: boolean;
} {
  if (columnFeet <= 15)
    return { height: 0.5, rule: "half the lower diameter", extrapolated: columnFeet < 12 };
  const bands: [number, number][] = [
    [20, 13],
    [25, 12.5],
    [30, 12],
  ];
  for (const [limit, parts] of bands) {
    if (columnFeet <= limit)
      return {
        height: heightDiameters / parts,
        rule: `1/${parts} of the column`,
        extrapolated: false,
      };
  }
  const parts = 12 - Math.ceil((columnFeet - 30) / 5) * 0.5;
  return { height: heightDiameters / parts, rule: `1/${parts} of the column`, extrapolated: true };
}

/** Lower-diameter units of the Ionic capital: the abacus side and its 9½ parts (III.5.5, III.5.7). */
export function ionicCapitalUnits(columnFeet: number): { abacus: number; part: number } {
  const abacus = columnFeet > 25 ? 1 + 1 / 9 : 1 + 1 / 18;
  return { abacus, part: abacus / 2 / 9.5 };
}

export interface IonicElevation extends Elevation {
  roof: Pediment;
  front: IonicFront;
  height: number;
  taper: { ratio: number; parts: [number, number]; columnFeet: number };
  epistyle: ReturnType<typeof epistyleHeight>;
  tympanum: number;
  pitchDegrees: number;
  shaftTop: number;
  /** Top of the horizontal corona. */
  entablatureTop: number;
}

function torus(
  part: string,
  axis: number,
  y0: number,
  y1: number,
  rEnd: number,
  rMax: number,
): Piece {
  const half: Pt[] = [[0, y0]];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    half.push([rEnd + (rMax - rEnd) * Math.sin(Math.PI * t), y0 + (y1 - y0) * t]);
  }
  half.push([0, y1]);
  return poly(part, mirrored(axis, half), true, "chosen");
}

function hollow(
  part: string,
  axis: number,
  y0: number,
  y1: number,
  rEnd: number,
  rMin: number,
): Piece {
  const half: Pt[] = [[0, y0]];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    // Deeper towards the bottom, as a scotia is usually cut.
    const depth = Math.sin(Math.PI * t ** 0.8);
    half.push([rEnd - (rEnd - rMin) * depth, y0 + (y1 - y0) * t]);
  }
  half.push([0, y1]);
  return poly(part, mirrored(axis, half), true, "chosen");
}

function columnBase(axis: number, kind: BaseKind): Piece[] {
  const out: Piece[] = [];
  if (kind === "attic") {
    // III.5.2: plinth ⅙, then the remaining ⅓ in four: lower torus ⅛, scotia ⅛, upper torus 1/12.
    out.push(band("plinth", axis, 0.75, 0, 1 / 6));
    out.push(torus("torus", axis, 1 / 6, 1 / 6 + 1 / 8, 0.64, 0.745));
    out.push(band("scotia", axis, 0.6, 1 / 6 + 1 / 8, 1 / 6 + 1 / 8 + 0.012));
    out.push(hollow("scotia", axis, 1 / 6 + 1 / 8 + 0.012, 0.5 - 1 / 12 - 0.012, 0.6, 0.5));
    out.push(band("scotia", axis, 0.56, 0.5 - 1 / 12 - 0.012, 0.5 - 1 / 12));
    out.push(torus("torus", axis, 0.5 - 1 / 12, 0.5, 0.55, 0.64));
  } else {
    // III.5.3: width 1⅜; plinth ⅙; the rest in seven: two trochili of 2/21 with astragals, torus 1/7.
    const h = 1 / 3 / 7;
    out.push(band("plinth", axis, 0.6875, 0, 1 / 6));
    out.push(hollow("scotia", axis, 1 / 6, 1 / 6 + 2 * h, 0.66, 0.54));
    const ab = (2 * h) / 8;
    out.push(torus("astragal", axis, 1 / 6 + 2 * h, 1 / 6 + 2 * h + ab, 0.6, 0.63));
    out.push(torus("astragal", axis, 1 / 6 + 2 * h + ab, 1 / 6 + 2 * h + 2 * ab, 0.6, 0.63));
    out.push(hollow("scotia", axis, 1 / 6 + 2 * h + 2 * ab, 1 / 6 + 4 * h, 0.6, 0.5));
    out.push(torus("torus", axis, 1 / 6 + 4 * h, 0.5, 0.5, 0.6875));
  }
  return out;
}

function shaft(axis: number, y0: number, y1: number, r0: number, r1: number): Piece[] {
  const out: Piece[] = [
    poly(
      "shaft",
      [
        [axis - r0, y0],
        [axis + r0, y0],
        [axis + r1, y1],
        [axis - r1, y1],
      ],
      true,
    ),
    poly(
      "shaft",
      [
        [axis + r0 * 0.4, y0],
        [axis + r0, y0],
        [axis + r1, y1],
        [axis + r1 * 0.4, y1],
      ],
      true,
      "chosen",
      "shade",
    ),
  ];
  // Twenty-four flutes with fillets between them (III.5.14); flutes stop short of both ends.
  const fillet = (2 * Math.PI) / 24 / 5;
  const f0 = y0 + 0.12;
  const f1 = y1 - 0.12;
  for (let k = 0; k < 24; k++) {
    const edge = (k / 24) * 2 * Math.PI - Math.PI;
    for (const d of [-fillet / 2, fillet / 2]) {
      const theta = edge + d;
      if (Math.cos(theta) <= 0.03) continue;
      const s = Math.sin(theta);
      const ra = r0 + (r1 - r0) * ((f0 - y0) / (y1 - y0));
      const rb = r0 + (r1 - r0) * ((f1 - y0) / (y1 - y0));
      out.push(
        poly(
          "flute",
          [
            [axis + ra * s, f0],
            [axis + rb * s, f1],
          ],
          false,
          "text",
          "line",
        ),
      );
    }
  }
  return out;
}

function ionicCapital(axis: number, top: number, rTop: number, columnFeet: number): Piece[] {
  const { abacus, part: p } = ionicCapitalUnits(columnFeet);
  const half = abacus / 2;
  const out: Piece[] = [];
  const astragalTop = top - 6.5 * p;
  // Eye on a line one and a half parts inside the cathetus, which itself lies 1½/18 of the
  // abacus inside its edge: one reading of III.5.5, whose horizontal wording is disputed.
  const eyeX = half - (1.5 / 18) * abacus - 1.5 * p;
  const eyeY = top - 6 * p;
  out.push(band("astragal", axis, rTop + 0.03, astragalTop - 0.6 * p, astragalTop, "chosen"));
  out.push(band("echinus", axis, half * 0.98, astragalTop, top - 2.5 * p, "text"));
  // Egg-and-dart on the echinus, visible between the volutes.
  const eggs = 5;
  for (let i = 0; i < eggs; i++) {
    const cx = axis + (i - (eggs - 1) / 2) * (eyeX * 0.42);
    const pts: Pt[] = [];
    for (let k = 0; k <= 20; k++) {
      const a = (k / 20) * 2 * Math.PI;
      pts.push([cx + Math.cos(a) * 0.055, top - 4.6 * p + Math.sin(a) * 1.55 * p]);
    }
    out.push(poly("echinus", pts, true, "chosen", "ornament"));
  }
  out.push(band("canalis", axis, eyeX + 4 * p, top - 2.5 * p, top - 1.5 * p, "chosen"));
  for (const side of [-1, 1] as const) {
    const cx = axis + side * eyeX;
    const dir = side === 1 ? 1 : -1;
    const turn = dir as 1 | -1;
    const outer = spiral(cx, eyeY, 4.5 * p, 0.5 * p, 4, Math.PI / 2, turn, 120);
    // Fill the first turn so the volute covers the shaft behind it.
    out.push(poly("volute", [...outer, [cx, eyeY + 4.5 * p]], true, "text"));
    // The spiral fillet: a band between the prescribed spiral and one a third of a part inside it.
    const a = spiral(cx, eyeY, 4.5 * p, 0.5 * p, 7.6, Math.PI / 2, turn, 260);
    const b = spiral(cx, eyeY, 4.5 * p - 0.38 * p, 0.5 * p - 0.03 * p, 7.6, Math.PI / 2, turn, 260);
    out.push(poly("volute", [...a, ...b.reverse()], true, "text", "groove"));
    out.push(circlePiece("oculus", cx, eyeY, 0.5 * p));
  }
  out.push(band("abacus", axis, half, top - 1.5 * p, top));
  out.push(band("abacus", axis, half + 0.02, top - 0.45 * p, top, "chosen"));
  return out;
}

/**
 * A stylised acanthus leaf in elevation: deep notches between three lobes on each side,
 * a serrated edge, a midrib, and a tip that falls forward over the top.
 */
function acanthus(cx: number, y0: number, height: number, width: number): Piece[] {
  const edge = (side: 1 | -1): Pt[] => {
    const line: Pt[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * 0.86;
      const envelope = Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.08)) * (1 - 0.35 * t);
      const notch = Math.max(
        Math.exp(-(((t - 0.34) / 0.035) ** 2)),
        Math.exp(-(((t - 0.6) / 0.035) ** 2)),
      );
      const serration = 1 - 0.07 * Math.abs(Math.sin(t * 22 * Math.PI));
      line.push([
        cx + side * (width / 2) * envelope * (1 - 0.38 * notch) * serration,
        y0 + height * t,
      ]);
    }
    return line;
  };
  const right = edge(1);
  const left = edge(-1).reverse();
  const top = right.at(-1) as Pt;
  const overfall = quad(
    top,
    [cx + width * 0.05, y0 + height * 1.02],
    [cx - width * 0.1, y0 + height * 0.8],
    8,
  );
  const back = quad(
    overfall.at(-1) as Pt,
    [cx - width * 0.12, y0 + height * 0.86],
    left[0] as Pt,
    4,
  );
  return [
    poly("acanthus", [...right, ...overfall, ...back, ...left], true, "chosen", "ornament"),
    poly(
      "acanthus",
      [
        [cx, y0 + height * 0.03],
        [cx + width * 0.02, y0 + height * 0.8],
      ],
      false,
      "chosen",
      "line",
    ),
  ];
}

function corinthianCapital(axis: number, bottom: number, rTop: number): Piece[] {
  const out: Piece[] = [];
  const H = 1;
  const abacusT = H / 7;
  const third = (H - abacusT) / 3;
  const halfSide = Math.SQRT2 / 2;
  const top = bottom + H - abacusT;
  // The bell (calathus), mostly hidden by the leaves.
  out.push(
    poly(
      "calathus",
      mirrored(axis, [
        [0, bottom],
        ...quad([rTop, bottom], [rTop, bottom + 0.55], [0.5, top], 10),
        [0, top],
      ]),
      true,
      "chosen",
    ),
  );
  // Stalks in the top third, each crowned by a cup of leaves from which the spirals spring.
  for (const side of [-1, 1] as const) {
    const sx = axis + side * 0.29;
    out.push(
      poly(
        "cauliculus",
        strip(
          [
            [sx, bottom + 2 * third - 0.06],
            [sx + side * 0.025, bottom + 2 * third + 0.09],
          ],
          0.07,
        ),
        true,
        "chosen",
      ),
    );
    const cup = bottom + 2 * third + 0.09;
    const volute = [
      ...quad(
        [sx + side * 0.03, cup],
        [axis + side * 0.6, cup + 0.02],
        [axis + side * (halfSide - 0.07), top - 0.04],
        14,
      ),
      ...spiral(
        axis + side * (halfSide - 0.115),
        top - 0.085,
        0.05,
        0.011,
        3.2,
        0,
        (side === 1 ? -1 : 1) as 1 | -1,
        34,
      ),
    ];
    out.push(poly("helix", strip(volute, 0.042, 0.55), true, "chosen"));
    const helix = [
      ...quad(
        [sx - side * 0.01, cup],
        [axis + side * 0.2, cup + 0.06],
        [axis + side * 0.12, top - 0.03],
        12,
      ),
      ...spiral(
        axis + side * 0.085,
        top - 0.07,
        0.04,
        0.009,
        3,
        Math.PI,
        (side === 1 ? 1 : -1) as 1 | -1,
        30,
      ),
    ];
    out.push(poly("helix", strip(helix, 0.032, 0.55), true, "chosen"));
    out.push(...acanthus(sx, cup - 0.07, 0.13, 0.16));
  }
  // Second row, set between the leaves of the first; then the first row in front.
  for (const theta of [-67.5, -22.5, 22.5, 67.5]) {
    const t = (theta * Math.PI) / 180;
    out.push(
      ...acanthus(axis + 0.48 * Math.sin(t), bottom + 0.01, third * 2, 0.36 * Math.cos(t) + 0.1),
    );
  }
  for (const theta of [-90, -45, 0, 45, 90]) {
    const t = (theta * Math.PI) / 180;
    out.push(
      ...acanthus(axis + 0.45 * Math.sin(t), bottom, third * 1.02, 0.38 * Math.cos(t) + 0.09),
    );
  }
  out.push(band("abacus", axis, halfSide, top, bottom + H));
  out.push(
    band("abacus", axis, halfSide + 0.015, bottom + H - abacusT * 0.35, bottom + H, "chosen"),
  );
  // The flower on the abacus face is as large as the abacus is thick (IV.1.12).
  const fy = top + abacusT / 2;
  const petals: Pt[] = [];
  for (let k = 0; k <= 72; k++) {
    const ang = (k / 72) * 2 * Math.PI;
    const r = (abacusT / 2) * (0.62 + 0.38 * Math.abs(Math.cos(3 * ang)));
    petals.push([axis + r * Math.cos(ang), fy + r * Math.sin(ang)]);
  }
  out.push(poly("flos", petals, true, "text", "ornament"));
  return out;
}

export function ionicElevation(input: IonicInput): IonicElevation {
  const front = ionicFront(input.columns, input.spacing);
  const { width: W, axes } = front;
  const H = columnHeight(input.order, input.spacing);
  const columnFeet = H * input.moduleFeet;
  const taper = taperRatio(columnFeet);
  const pieces: Piece[] = [];
  const dims: Dim[] = [];
  const base = steps(W, input.moduleFeet, 0.6);
  pieces.push(...base.pieces);

  const capitalAboveShaft =
    input.order === "corinthian" ? 1 : 6.5 * ionicCapitalUnits(columnFeet).part;
  const shaftTop = H - capitalAboveShaft;
  axes.forEach((axis, i) => {
    const corner = i === 0 || i === axes.length - 1;
    const r0 = 0.5 * (corner ? 1 + 1 / 50 : 1);
    const r1 = r0 * taper.ratio;
    pieces.push(...columnBase(axis, input.base));
    pieces.push(...shaft(axis, 0.5, shaftTop, r0, r1));
    pieces.push(
      ...(input.order === "corinthian"
        ? corinthianCapital(axis, shaftTop, r1)
        : ionicCapital(axis, H, r1, columnFeet)),
    );
  });

  // Entablature (III.5.8–11): epistyle by column height, then zophorus, dentils and corona.
  const ep = epistyleHeight(H, columnFeet);
  const E = ep.height;
  const cym = E / 7;
  const unit = (E - cym) / 12;
  const rTop = 0.5 * taper.ratio;
  let y = H;
  [3, 4, 5].forEach((parts, i) => {
    const inset = (0.5 - rTop) * (1 - (i + 1) / 3);
    pieces.push(rect("fascia", inset, y, W - 2 * inset, parts * unit));
    y += parts * unit;
  });
  pieces.push(rect("cymatium", -cym * 0.6, y, W + cym * 1.2, cym, "text"));
  y += cym;
  const epistyleTop = y;
  const Z = input.sculptedFrieze ? E * 1.25 : E * 0.75;
  pieces.push(rect("zophorus", 0, y, W, Z - Z / 7));
  if (input.sculptedFrieze) pieces.push(...frieze(0, y, W, Z - Z / 7));
  pieces.push(rect("cymatium", -0.04, y + Z - Z / 7, W + 0.08, Z / 7, "text"));
  y += Z;
  const friezeTop = y;
  const dentilH = 4 * unit;
  const dentilW = dentilH / 2;
  const gap = (dentilW * 2) / 3;
  const dentilBand = dentilH - dentilH / 6;
  const proj = dentilH + 4 * unit;
  pieces.push(rect("denticulus", -dentilH, y, W + 2 * dentilH, dentilBand, "chosen"));
  const pitch = dentilW + gap;
  const count = Math.floor((W + 2 * dentilH - gap) / pitch);
  const startX = -dentilH + (W + 2 * dentilH - (count * pitch - gap)) / 2;
  for (let k = 0; k < count; k++) {
    const x = startX + k * pitch;
    pieces.push(rect("denticulus", x, y, dentilW, dentilBand));
    if (k < count - 1)
      pieces.push(rect("metoche", x + dentilW, y, gap, dentilBand, "text", "groove"));
  }
  pieces.push(
    rect("cymatium", -dentilH - 0.02, y + dentilBand, W + 2 * dentilH + 0.04, dentilH / 6, "text"),
  );
  y += dentilH;
  const coronaH = 4 * unit;
  pieces.push(rect("corona", -proj + 0.03, y, W + 2 * proj - 0.06, coronaH * 0.78));
  pieces.push(rect("cymatium", -proj, y + coronaH * 0.78, W + 2 * proj, coronaH * 0.22, "chosen"));
  y += coronaH;
  const ped = pediment(W, y, proj, coronaH);
  pieces.push(...ped.pieces);

  axes.slice(0, -1).forEach((axis, i) => {
    const span = front.spans[i] ?? 0;
    dims.push({
      from: [axis, base.bottom],
      to: [axis + span, base.bottom],
      label: fmtModules(span),
      offset: -0.6,
      rule: "species",
    });
  });
  dims.push({
    from: [0, base.bottom],
    to: [W, base.bottom],
    label: `${fmtModules(W)} modules`,
    offset: -1.4,
    rule: input.spacing === "eustyle" ? "eustyle" : "species",
  });
  const right = W + proj + 0.4;
  dims.push({
    from: [right, 0],
    to: [right, H],
    label: fmtModules(H),
    offset: 0.7,
    rule: input.order === "corinthian" ? "corinthian-column" : "heights",
  });
  dims.push({
    from: [right, H],
    to: [right, epistyleTop],
    label: fmtModules(E),
    offset: 0.7,
    rule: "ionic-epistyle",
  });
  dims.push({
    from: [right, epistyleTop],
    to: [right, friezeTop],
    label: fmtModules(Z),
    offset: 0.7,
    rule: "zophorus",
  });
  dims.push({
    from: [right, y],
    to: [right, y + ped.tympanum],
    label: fmtModules(ped.tympanum),
    offset: 0.7,
    rule: "ionic-corona",
  });

  return {
    pieces,
    dims,
    roof: ped,
    bounds: {
      x0: Math.min(-base.reach, -proj - 0.4),
      x1: Math.max(W + base.reach, W + proj + 0.4),
      y0: base.bottom,
      y1: ped.top,
    },
    unitsPerDiameter: 1,
    axes,
    front,
    height: H,
    taper: { ...taper, columnFeet },
    epistyle: ep,
    tympanum: ped.tympanum,
    pitchDegrees: ped.pitchDegrees,
    shaftTop,
    entablatureTop: y,
  };
}

/** The text asks only that a carved zophorus be taller; the relief is indicated, not drawn. */
function frieze(x0: number, y0: number, w: number, h: number): Piece[] {
  return [rect("sigilla", x0 + h * 0.12, y0 + h * 0.1, w - h * 0.24, h * 0.8, "chosen", "shade")];
}
