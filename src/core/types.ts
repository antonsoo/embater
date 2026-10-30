/** A point in drawing units: x to the right, y upward from the top of the stylobate. */
export type Pt = readonly [number, number];

export type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "poly"; pts: readonly Pt[]; closed: boolean }
  | { kind: "circle"; cx: number; cy: number; r: number };

/**
 * Whether a cited rule determines this feature within the selected drawing model.
 * "text": prescribed dimension or column arrangement; plan positions still depend
 * on the selected spacing and the assumptions listed beside the drawing.
 * "chosen": Vitruvius names the part but leaves its form or size to the draughtsman,
 * so the drawing had to choose. The renderer draws the two differently.
 */
export type Given = "text" | "chosen";

/** How a piece is painted: an outlined solid, a dark groove, a thin line, or a shadow. */
export type Ink = "solid" | "groove" | "line" | "shade" | "ornament";

export interface Piece {
  /** Vocabulary id of the architectural part this piece belongs to. */
  part: string;
  shape: Shape;
  given: Given;
  ink: Ink;
}

/** A measured dimension, drawn in red with its value in the order's own module. */
export interface Dim {
  from: Pt;
  to: Pt;
  label: string;
  /** Offset of the dimension line from the measured edge, in drawing units. */
  offset: number;
  rule: string;
}

export interface Bounds {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface Elevation {
  pieces: Piece[];
  dims: Dim[];
  bounds: Bounds;
  /** Drawing units per lower column diameter. */
  unitsPerDiameter: number;
  /** Column axes on the front, in drawing units. */
  axes: number[];
}
