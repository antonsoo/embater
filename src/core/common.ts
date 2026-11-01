import { poly, rect } from "./geometry";
import type { Piece, Pt } from "./types";

/** Steps on the front: odd in number, 9–10 inches high, 1½–2 feet deep (III.4.4). */
export const STEPS = 3;
const RISER_FEET = 9.5 / 12;
const TREAD_FEET = 1.75;

export function steps(
  width: number,
  unitFeet: number,
  overhang: number,
): { pieces: Piece[]; bottom: number; reach: number } {
  const riser = RISER_FEET / unitFeet;
  const tread = TREAD_FEET / unitFeet;
  const pieces: Piece[] = [];
  for (let k = 0; k < STEPS; k++) {
    const ext = overhang + k * tread;
    pieces.push(
      rect(k === 0 ? "stylobate" : "crepidoma", -ext, -(k + 1) * riser, width + 2 * ext, riser),
    );
  }
  return { pieces, bottom: -STEPS * riser, reach: overhang + (STEPS - 1) * tread };
}

export interface Pediment {
  pieces: Piece[];
  /** Height of the tympanum at the middle. */
  tympanum: number;
  pitchDegrees: number;
  top: number;
  base: number;
  width: number;
  projection: number;
  /** Chosen normal thickness; the ancient text does not specify a section convention. */
  coronaHeight: number;
  ornaments: { x: number; y: number; height: number }[];
}

/**
 * The Greek pediment of III.5.12: the tympanum a ninth of the corona's whole front, the
 * raking corona equal to the horizontal one, the sima an eighth higher than the corona,
 * corner acroteria as high as the tympanum, the middle one an eighth higher.
 * `width` is the face of the frieze; `projection` is how far the corona overhangs it.
 */
export function pediment(
  width: number,
  base: number,
  projection: number,
  coronaHeight: number,
): Pediment {
  const W = width;
  const h = (W + 2 * projection) / 9;
  const slope = h / (W / 2);
  const cos = Math.cos(Math.atan(slope));
  const cx0 = -projection;
  const cx1 = W + projection;
  const apex: Pt = [W / 2, base + h];
  const pieces: Piece[] = [];
  pieces.push(poly("tympanum", [[0, base], [W, base], apex], true));
  const t = coronaHeight / cos;
  const endY = base + t - projection * slope;
  pieces.push(
    poly(
      "raking-corona",
      [
        [cx0, base],
        [0, base],
        apex,
        [W, base],
        [cx1, base],
        [cx1, endY],
        [W / 2, base + h + t],
        [cx0, endY],
      ],
      true,
    ),
  );
  const simaT = (coronaHeight * 9) / 8 / cos;
  pieces.push(
    poly(
      "sima",
      [
        [cx0, endY],
        [W / 2, base + h + t],
        [cx1, endY],
        [cx1, endY + simaT],
        [W / 2, base + h + t + simaT],
        [cx0, endY + simaT],
      ],
      true,
    ),
  );
  const top = base + h + t + simaT;
  const unit = Math.max(h * 0.12, 0.3);
  // Bases sit on the drawn sima, rather than burying the centre ornament in it
  // or using the eave level for an ornament positioned uphill from the eave.
  // Inset and mounting are drawing choices, not recovered ancient details.
  const cornerX = cx0 + unit * 2;
  const cornerY = endY + simaT + (cornerX + h * 0.22 - cx0) * slope;
  const ornaments = [
    { x: cornerX, y: cornerY, height: h },
    { x: W / 2, y: top, height: (h * 9) / 8 },
    { x: W - cornerX, y: cornerY, height: h },
  ];
  for (const ornament of ornaments) {
    const half = ornament.height * 0.22;
    const roofY = (x: number) => top - Math.abs(x - W / 2) * slope;
    // Grey levelling wedges support the horizontal plinths on a sloping roof.
    pieces.push(
      poly(
        "sima",
        [
          [ornament.x - half, roofY(ornament.x - half)],
          [ornament.x, roofY(ornament.x)],
          [ornament.x + half, roofY(ornament.x + half)],
          [ornament.x + half, ornament.y],
          [ornament.x - half, ornament.y],
        ],
        true,
        "chosen",
      ),
    );
    pieces.push(...acroterion(ornament.x, ornament.y, ornament.height));
  }
  return {
    pieces,
    tympanum: h,
    pitchDegrees: (Math.atan(slope) * 180) / Math.PI,
    top: top + (h * 9) / 8,
    base,
    width,
    projection,
    coronaHeight,
    ornaments,
  };
}

/** Acroterion: the text gives only its height, so the palmette outline is drawn as chosen. */
export function acroterion(cx: number, y: number, height: number): Piece[] {
  const plinth = height * 0.12;
  const out: Piece[] = [rect("acroterion", cx - height * 0.22, y, height * 0.44, plinth, "chosen")];
  // An anthemion: rounded petals fanning from a point just above the plinth.
  const root: Pt = [cx, y + plinth + height * 0.1];
  const petals = 7;
  for (let i = 0; i < petals; i++) {
    const t = i / (petals - 1) - 0.5;
    const angle = Math.PI / 2 - t * 2.1;
    // The central tip must end at y + height, including root and plinth.
    const length = (height - plinth - height * 0.1) * (1 - 0.5 * Math.abs(t));
    const width = length * 0.2;
    const dir: Pt = [Math.cos(angle), Math.sin(angle)];
    const nrm: Pt = [-dir[1], dir[0]];
    const outline: Pt[] = [];
    for (let k = 0; k <= 24; k++) {
      const s = k / 24;
      const along = s <= 0.5 ? s * 2 : (1 - s) * 2;
      const side = s <= 0.5 ? 1 : -1;
      const reach = length * along;
      const half = width * Math.sin(Math.PI * along) ** 0.7 * (1 - 0.35 * along);
      outline.push([
        root[0] + dir[0] * reach + nrm[0] * half * side,
        root[1] + dir[1] * reach + nrm[1] * half * side,
      ]);
    }
    out.push(poly("acroterion", outline, true, "chosen", "ornament"));
  }
  for (const side of [-1, 1] as const) {
    const sx = cx + side * height * 0.17;
    const sy = y + plinth + height * 0.09;
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 3;
      const r = height * 0.085 * (1 - i / 48);
      pts.push([sx + side * r * Math.cos(a), sy + r * Math.sin(a)]);
    }
    out.push(poly("acroterion", pts, false, "chosen", "line"));
  }
  return out;
}

const FRACTIONS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 6, "⅙"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [5 / 6, "⅚"],
  [7 / 8, "⅞"],
];

/** Format a count of modules as a whole number and a common fraction when one fits exactly. */
export function fmtModules(value: number): string {
  const whole = Math.floor(value + 1e-9);
  const rest = value - whole;
  if (rest < 1e-6) return String(whole);
  for (const [f, glyph] of FRACTIONS) {
    if (Math.abs(rest - f) < 1e-6) return whole === 0 ? glyph : `${whole}${glyph}`;
  }
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
