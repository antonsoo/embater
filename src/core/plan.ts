import { circlePiece, rect } from "./geometry";
import type { Elevation, Piece } from "./types";

/** Vitruvius's seven kinds of temple plan, in his order (III.2.1). */
export const PLAN_TYPES = [
  "in-antis",
  "prostyle",
  "amphiprostyle",
  "peripteral",
  "pseudodipteral",
  "dipteral",
  "hypaethral",
] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

/** Axis-to-axis spacing used in the plans: systyle, two diameters clear (III.3.2). */
export const PLAN_SPACING = 3;
export const CLEAR_SPACINGS = [1.5, 2, 3] as const;
export type ClearSpacing = (typeof CLEAR_SPACINGS)[number];
export interface PlanOptions {
  clear?: ClearSpacing;
  flank?: number | undefined;
}
export function flankChoices(type: PlanType): readonly number[] {
  return type === "dipteral" ? [13, 15, 17] : type === "hypaethral" ? [17, 19, 21] : [];
}
const WALL = 1;

export interface Plan extends Elevation {
  type: PlanType;
  clear: ClearSpacing;
  body:
    | {
        width: number;
        length: number;
        porch: number;
        cella: number;
        clearWidth: number;
        clearLength: number;
      }
    | undefined;
  front: number;
  flank: number;
  /** Columns counted on the outermost ring, or in the porches for non-peripteral plans. */
  columns: number;
  /** Columns on an inner ring, where there is one. */
  innerColumns: number;
}

/** Front and flank counts: six by eleven for the peripteral, eight by fifteen for the pseudodipteral (III.2.5–6). */
export function ringCounts(type: PlanType): { front: number; flank: number } {
  switch (type) {
    case "peripteral":
      return { front: 6, flank: 11 };
    case "pseudodipteral":
    case "dipteral":
      return { front: 8, flank: 15 };
    case "hypaethral":
      return { front: 10, flank: 19 };
    default:
      return { front: 4, flank: 0 };
  }
}

function ring(part: string, x0: number, y0: number, nx: number, ny: number, a: number): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      if (i > 0 && i < nx - 1 && j > 0 && j < ny - 1) continue;
      out.push(circlePiece(part, x0 + i * a, y0 + j * a, 0.5));
    }
  }
  return out;
}

/** The cella building: walls of one diameter, antae at the front (and back), a door into the cella. */
function cellaBuilding(
  x0: number,
  y0: number,
  width: number,
  length: number,
  porch: number,
  backPorch: number,
  given: "text" | "chosen",
  rearDoor = false,
): Piece[] {
  const out: Piece[] = [];
  const x1 = x0 + width;
  const y1 = y0 + length;
  const naos0 = y0 + porch;
  const naos1 = y1 - backPorch;
  out.push(rect("pronaos", x0 + WALL, y0, width - 2 * WALL, porch, given, "shade"));
  out.push(
    rect("naos", x0 + WALL, naos0 + WALL, width - 2 * WALL, naos1 - naos0 - 2 * WALL, given),
  );
  if (backPorch > 0)
    out.push(rect("opisthodomos", x0 + WALL, naos1, width - 2 * WALL, backPorch, given, "shade"));
  // Side walls run the full length; their ends are the antae.
  out.push(rect("anta", x0, y0, WALL, length, given, "groove"));
  out.push(rect("anta", x1 - WALL, y0, WALL, length, given, "groove"));
  // Door wall with a central opening a quarter of the width.
  const door = width / 4;
  const mid = x0 + width / 2;
  out.push(rect("naos", x0 + WALL, naos0, mid - door / 2 - x0 - WALL, WALL, given, "groove"));
  out.push(rect("naos", mid + door / 2, naos0, x1 - WALL - mid - door / 2, WALL, given, "groove"));
  if (rearDoor) {
    out.push(
      rect("naos", x0 + WALL, naos1 - WALL, mid - door / 2 - x0 - WALL, WALL, given, "groove"),
    );
    out.push(
      rect("naos", mid + door / 2, naos1 - WALL, x1 - WALL - mid - door / 2, WALL, given, "groove"),
    );
  } else out.push(rect("naos", x0 + WALL, naos1 - WALL, width - 2 * WALL, WALL, given, "groove"));
  return out;
}

export function plan(type: PlanType, options: PlanOptions = {}): Plan {
  const clear = options.clear ?? 2;
  if (!CLEAR_SPACINGS.includes(clear)) throw new RangeError("Unsupported clear spacing");
  const choices = flankChoices(type);
  if (options.flank !== undefined && !choices.includes(options.flank))
    throw new RangeError("This flank count is not an available drawing choice");
  const a = clear + 1;
  let body: Plan["body"];
  const pieces: Piece[] = [];
  let front = 0;
  let flank = 0;
  let columns = 0;
  let innerColumns = 0;
  let x0b = 0;
  let x1b = 0;
  let y1b = 0;
  let y0b = 0;

  if (type === "in-antis" || type === "prostyle" || type === "amphiprostyle") {
    // IV.4.1: the temple twice as long as wide; the cella with its door wall a quarter longer
    // than wide; the remaining three quarters run forward as the pronaos to the antae.
    const B = 3 * a + WALL;
    const L = 2 * B;
    const porch = (3 / 4) * B;
    // III.2.4 adds rear columns and a pediment, not a second partition within the cella.
    const rearColumns = type === "amphiprostyle";
    body = {
      width: B,
      length: L,
      porch,
      cella: L - porch,
      clearWidth: B - 2 * WALL,
      clearLength: L - porch - 2 * WALL,
    };
    const x0 = -B / 2;
    pieces.push(
      rect(
        "stylobate",
        x0 - 1.2,
        -(type === "in-antis" ? 1.2 : a + 1.2),
        B + 2.4,
        L + (type === "in-antis" ? 1.2 : a + 1.2) + (rearColumns ? a + 1.2 : 1.2),
        "chosen",
      ),
    );
    pieces.push(...cellaBuilding(x0, 0, B, L, porch, 0, "chosen"));
    const xs = [x0 + 0.5, x0 + 0.5 + a, x0 + 0.5 + 2 * a, x0 + 0.5 + 3 * a];
    if (type === "in-antis") {
      for (const x of xs.slice(1, 3)) pieces.push(circlePiece("column", x, 0.5, 0.5));
      columns = 2;
      front = 2;
    } else {
      for (const x of xs) pieces.push(circlePiece("column", x, -a + 0.5, 0.5));
      columns = 4;
      front = 4;
      if (type === "amphiprostyle") {
        for (const x of xs) pieces.push(circlePiece("column", x, L + a - 0.5, 0.5));
        columns = 8;
      }
    }
    x0b = x0 - 1.2;
    x1b = x0 + B + 1.2;
    y0b = -(type === "in-antis" ? 1.2 : a + 1.2);
    y1b = L + (rearColumns ? a + 1.2 : 1.2);
  } else {
    const counts = ringCounts(type);
    front = counts.front;
    flank = options.flank ?? counts.flank;
    const W = (front - 1) * a;
    const Lc = (flank - 1) * a;
    const xa = -W / 2;
    pieces.push(rect("stylobate", xa - 1.5, -1.5, W + 3, Lc + 3, "chosen"));
    pieces.push(rect("pteroma", xa - 0.5, -0.5, W + 1, Lc + 1, "chosen", "shade"));
    pieces.push(...ring("column", xa, 0, front, flank, a));
    columns = 2 * front + 2 * flank - 4;
    // Distance from the wall to the outer row: one intercolumniation for the peripteral
    // (III.2.5); two and a column's thickness for the pseudodipteral (III.2.6).
    // The dipteral and hypaethral drawings reuse this inset as a stated model choice.
    const inset = type === "peripteral" ? a : 2 * a;
    if (type === "dipteral" || type === "hypaethral") {
      pieces.push(...ring("column", xa + a, a, front - 2, flank - 2, a));
      innerColumns = 2 * (front - 2) + 2 * (flank - 2) - 4;
    }
    const cx0 = xa + inset - WALL / 2;
    const cy0 = inset - WALL / 2;
    const cw = W - 2 * inset + WALL;
    const cl = Lc - 2 * inset + WALL;
    pieces.push(rect("naos", cx0, cy0, cw, cl, "chosen"));
    const porch = Math.min(a * 1.5, cl / 4);
    pieces.push(
      ...cellaBuilding(
        cx0,
        cy0,
        cw,
        cl,
        porch,
        type === "hypaethral" ? 0 : porch,
        "chosen",
        type === "hypaethral",
      ),
    );
    if (type === "hypaethral") {
      // Inside, two-storey colonnades stand clear of the walls; the middle is open to the sky (III.2.8).
      const ix0 = cx0 + WALL + a * 0.7;
      const ix1 = cx0 + cw - WALL - a * 0.7;
      const iy0 = cy0 + porch + WALL + a * 0.7;
      const iy1 = cy0 + cl - WALL - a * 0.7;
      pieces.push(
        rect("sub-divo", ix0 + 0.6, iy0 + 0.6, ix1 - ix0 - 1.2, iy1 - iy0 - 1.2, "chosen", "shade"),
      );
      const nx = Math.max(2, Math.round((ix1 - ix0) / a) + 1);
      const ny = Math.max(2, Math.round((iy1 - iy0) / a) + 1);
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          if (i > 0 && i < nx - 1 && j > 0 && j < ny - 1) continue;
          pieces.push(
            circlePiece(
              "column",
              ix0 + (i * (ix1 - ix0)) / (nx - 1),
              iy0 + (j * (iy1 - iy0)) / (ny - 1),
              0.35,
              "chosen",
            ),
          );
        }
      }
    } else {
      // Columns in antis on the porches.
      for (const y of [cy0 + 0.5, cy0 + cl - 0.5]) {
        for (const f of [1 / 3, 2 / 3])
          pieces.push(circlePiece("column", cx0 + cw * f, y, 0.5, "chosen"));
      }
    }
    x0b = xa - 1.5;
    x1b = xa + W + 1.5;
    y0b = -1.5;
    y1b = Lc + 1.5;
  }
  return {
    type,
    clear,
    body,
    front,
    flank,
    columns,
    innerColumns,
    pieces,
    dims: [],
    bounds: { x0: x0b, x1: x1b, y0: y0b, y1: y1b },
    unitsPerDiameter: 1,
    axes: [],
  };
}
