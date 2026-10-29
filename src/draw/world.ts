import { circlePiece, mirrored, poly, quad, rect, strip } from "../core/geometry";
import type { Bounds, Elevation, Piece, Pt } from "../core/types";

/** Schematic plates for other traditions. Shapes are drawn by convention; grey marks reconstruction. */
function plate(pieces: Piece[], bounds: Bounds): Elevation {
  return { pieces, dims: [], bounds, unitsPerDiameter: 1, axes: [] };
}

function bundleLines(
  part: string,
  cx: number,
  y0: number,
  y1: number,
  r0: number,
  r1: number,
  n: number,
): Piece[] {
  const out: Piece[] = [];
  for (let i = 1; i < n; i++) {
    const t = i / n - 0.5;
    out.push(
      poly(
        part,
        [
          [cx + 2 * t * r0 * 0.96, y0],
          [cx + 2 * t * r1 * 0.96, y1],
        ],
        false,
        "text",
        "line",
      ),
    );
  }
  return out;
}

function bands(part: string, cx: number, y: number, r: number, count: number, h: number): Piece[] {
  return Array.from({ length: count }, (_, i) =>
    rect(part, cx - r - 0.05, y + i * h, 2 * r + 0.1, h),
  );
}

function egyptColumn(kind: string, cx: number): Piece[] {
  const out: Piece[] = [rect(kind, cx - 1.3, 0, 2.6, 0.35)];
  const shaft = (r0: number, r1: number, y1: number) =>
    poly(
      kind,
      [
        [cx - r0, 0.35],
        [cx + r0, 0.35],
        [cx + r1, y1],
        [cx - r1, y1],
      ],
      true,
    );
  if (kind === "papyriform-closed" || kind === "lotiform") {
    // Stems swell from a rounded foot, under triangular sheath leaves.
    const foot: Pt[] = [
      [0, 0.35],
      ...quad([0.82, 0.35], [1.05, 0.7], [0.95, 1.3], 6),
      [0.82, 7],
      [0, 7],
    ];
    out.push(poly(kind, mirrored(cx, foot), true));
    for (const dx of [-0.6, -0.2, 0.2, 0.6]) {
      out.push(
        poly(
          kind,
          [
            [cx + dx - 0.18, 0.4],
            [cx + dx, 1.4],
            [cx + dx + 0.18, 0.4],
          ],
          true,
          "chosen",
          "line",
        ),
      );
    }
    out.push(...bundleLines(kind, cx, 1.3, 7, 0.95, 0.82, kind === "lotiform" ? 6 : 4));
    out.push(...bands(kind, cx, 7, 0.82, 5, 0.13));
    if (kind === "papyriform-closed") {
      const bud: Pt[] = [[0, 7.65], ...quad([0.82, 7.65], [1.3, 8.5], [0.6, 9.4], 10), [0, 9.4]];
      out.push(poly(kind, mirrored(cx, bud), true));
      out.push(...bundleLines(kind, cx, 7.7, 9.35, 0.85, 0.55, 4));
    } else {
      // Lotus: a cluster of closed buds.
      for (const [dx, w, h] of [
        [-0.62, 0.42, 1.45],
        [0, 0.5, 1.75],
        [0.62, 0.42, 1.45],
      ] as const) {
        const b: Pt[] = [
          [0, 7.65],
          ...quad([w, 7.65], [w * 1.35, 7.65 + h * 0.55], [0, 7.65 + h], 8),
        ];
        out.push(poly(kind, mirrored(cx + dx, b), true));
      }
    }
    out.push(rect("egypt-abacus", cx - 0.65, 9.4, 1.3, 0.6));
  } else if (kind === "papyriform-open") {
    out.push(shaft(1.0, 0.85, 6.7));
    out.push(...bands(kind, cx, 6.7, 0.85, 4, 0.12));
    const bell: Pt[] = [[0, 7.18], ...quad([0.85, 7.18], [1.0, 8.9], [2.0, 9.4], 12), [0, 9.4]];
    out.push(poly(kind, mirrored(cx, bell), true));
    for (const dx of [-1.2, -0.6, 0, 0.6, 1.2]) {
      out.push(
        poly(
          kind,
          [
            [cx + dx * 0.55, 7.25],
            [cx + dx * 1.05, 9.35],
          ],
          false,
          "chosen",
          "line",
        ),
      );
    }
    out.push(rect("egypt-abacus", cx - 0.75, 9.4, 1.5, 0.6));
  } else if (kind === "palmiform") {
    out.push(shaft(0.9, 0.75, 7.2));
    out.push(...bands(kind, cx, 7.2, 0.75, 3, 0.12));
    for (let i = 0; i < 9; i++) {
      const t = i / 8 - 0.5;
      const base: Pt = [cx + t * 1.3, 7.56];
      const tip: Pt = [cx + t * 3.6, 9.55 - Math.abs(t) * 0.9];
      const path = quad(base, [cx + t * 1.5, 9.2], tip, 10);
      out.push(poly(kind, strip(path, 0.34, 0.75), true, "text", "ornament"));
    }
    out.push(rect("egypt-abacus", cx - 0.62, 9.4, 1.24, 0.6));
  } else if (kind === "hathoric") {
    out.push(shaft(0.95, 0.85, 6.9));
    // The goddess's face on a block, with cow's ears, under a little shrine.
    out.push(rect(kind, cx - 1.05, 6.9, 2.1, 2.1));
    const face: Pt[] = [];
    for (let k = 0; k <= 40; k++) {
      const a = (k / 40) * 2 * Math.PI;
      face.push([cx + Math.cos(a) * 0.62, 8.0 + Math.sin(a) * 0.82]);
    }
    out.push(poly(kind, face, true, "text", "ornament"));
    for (const s of [-1, 1] as const) {
      out.push(
        poly(
          kind,
          [
            [cx + s * 0.6, 8.55],
            [cx + s * 1.25, 8.85],
            [cx + s * 0.75, 8.2],
          ],
          true,
          "text",
          "ornament",
        ),
      );
      out.push(
        poly(
          kind,
          [
            [cx + s * 0.62, 7.3],
            [cx + s * 0.95, 7.0],
            [cx + s * 0.95, 8.7],
          ],
          false,
          "chosen",
          "line",
        ),
      );
    }
    out.push(rect("hathoric", cx - 0.85, 9.0, 1.7, 0.75));
    out.push(rect("hathoric", cx - 0.25, 9.05, 0.5, 0.6, "chosen", "groove"));
    out.push(rect("egypt-abacus", cx - 1.0, 9.75, 2.0, 0.25));
  } else {
    // Sixteen facets: eight visible, drawn at the projected edges.
    out.push(shaft(0.9, 0.78, 9.6));
    for (let k = 0; k < 16; k++) {
      const a = ((k + 0.5) / 16) * 2 * Math.PI - Math.PI;
      if (Math.cos(a) <= 0.05) continue;
      out.push(
        poly(
          kind,
          [
            [cx + 0.9 * Math.sin(a), 0.35],
            [cx + 0.78 * Math.sin(a), 9.6],
          ],
          false,
          "text",
          "line",
        ),
      );
    }
    out.push(rect("egypt-abacus", cx - 1.05, 9.6, 2.1, 0.4));
  }
  return out;
}

export function egyptPlate(): Elevation {
  const kinds = [
    "papyriform-closed",
    "papyriform-open",
    "lotiform",
    "palmiform",
    "hathoric",
    "protodoric",
  ];
  const pieces: Piece[] = [rect("papyriform-open", -2.6, -0.4, 28.2, 0.4, "chosen", "shade")];
  kinds.forEach((k, i) => {
    pieces.push(...egyptColumn(k, i * 5));
  });
  return plate(pieces, { x0: -3, x1: 28, y0: -0.6, y1: 10.4 });
}

export function zigguratPlate(): Elevation {
  const pieces: Piece[] = [];
  const terrace = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    batter: number,
    part: string,
    given: "text" | "chosen" = "text",
  ) =>
    poly(
      part,
      [
        [x0, y0],
        [x1, y0],
        [x1 - batter, y1],
        [x0 + batter, y1],
      ],
      true,
      given,
    );
  // First stage: baked-brick skin on a mud-brick core, broken by shallow buttresses.
  pieces.push(terrace(0, 64, 0, 11, 1.4, "agurru"));
  for (let x = 3; x <= 61; x += 4) {
    if (x > 26 && x < 38) continue;
    pieces.push(
      poly(
        "buttress",
        [
          [x - 0.6, 0],
          [x + 0.6, 0],
          [x + 0.6 - 0.25, 10.7],
          [x - 0.6 + 0.25, 10.7],
        ],
        true,
      ),
    );
  }
  // A cut-away at the right corner shows the core and the bitumen-laid courses.
  pieces.push(
    poly(
      "libittu",
      [
        [52, 0.5],
        [62.3, 0.5],
        [61.2, 7.5],
        [52, 7.5],
      ],
      true,
      "text",
      "shade",
    ),
  );
  for (let y = 1.4; y < 7.5; y += 1.05)
    pieces.push(
      poly(
        "bitumen",
        [
          [52, y],
          [62.2 - (y / 11) * 1.4, y],
        ],
        false,
        "text",
        "line",
      ),
    );
  pieces.push(
    poly(
      "agurru",
      [
        [62.3, 0.5],
        [64, 0],
        [62.6, 11],
      ],
      false,
      "text",
      "line",
    ),
  );
  // The three stairways meet at a gateway on the first terrace.
  pieces.push(rect("stairway", 29.5, 0, 5, 11));
  for (let y = 0.45; y < 11; y += 0.45)
    pieces.push(
      poly(
        "stairway",
        [
          [29.5, y],
          [34.5, y],
        ],
        false,
        "text",
        "line",
      ),
    );
  for (const side of [-1, 1] as const) {
    const foot = side === -1 ? 6 : 58;
    const top = side === -1 ? 29.5 : 34.5;
    const w = 3.2 * side;
    pieces.push(
      poly(
        "stairway",
        [
          [foot, 0],
          [foot - w, 0],
          [top, 11],
          [top + w, 11],
        ],
        true,
      ),
    );
    for (let k = 1; k < 22; k++) {
      const t = k / 22;
      const x = foot + (top - foot) * t;
      pieces.push(
        poly(
          "stairway",
          [
            [x, 11 * t],
            [x - w, 11 * t],
          ],
          false,
          "text",
          "line",
        ),
      );
    }
  }
  pieces.push(rect("shrine", 28.6, 11, 6.8, 2.6, "chosen"));
  pieces.push(terrace(10, 54, 11, 16.5, 1.1, "ziqqurratu"));
  pieces.push(terrace(19, 45, 16.5, 20.2, 0.8, "ziqqurratu", "chosen"));
  pieces.push(rect("shrine", 25.5, 20.2, 13, 4.3, "chosen"));
  pieces.push(rect("shrine", 30.5, 20.2, 3, 2.6, "chosen", "groove"));
  pieces.push(rect("ziqqurratu", -2, -0.5, 68, 0.5, "chosen", "shade"));
  return plate(pieces, { x0: -2.5, x1: 66.5, y0: -0.8, y1: 25 });
}

export function stupaPlate(): Elevation {
  const pieces: Piece[] = [];
  pieces.push(rect("pradakshina", -27, -0.4, 54, 0.4, "chosen", "shade"));
  // Dome on its drum terrace.
  const dome: Pt[] = [];
  for (let k = 0; k <= 60; k++) {
    const a = (k / 60) * Math.PI;
    dome.push([Math.cos(a) * 16.3, 4.3 + Math.sin(a) * 12]);
  }
  pieces.push(poly("anda", dome, true));
  pieces.push(rect("medhi", -18.3, 0, 36.6, 4.3));
  for (let x = -17.6; x <= 17.6; x += 0.88)
    pieces.push(rect("medhi", x - 0.12, 4.3, 0.24, 1.0, "text", "line"));
  pieces.push(rect("medhi", -18.3, 5.05, 36.6, 0.25));
  // Stair to the terrace, in front on the right.
  pieces.push(
    poly(
      "medhi",
      [
        [9, 0],
        [13.5, 0],
        [17, 4.3],
        [15, 4.3],
      ],
      true,
    ),
  );
  for (let k = 1; k < 10; k++) {
    const t = k / 10;
    pieces.push(
      poly(
        "medhi",
        [
          [9 + 6 * t, 4.3 * t],
          [13.5 + 3.5 * t, 4.3 * t],
        ],
        false,
        "text",
        "line",
      ),
    );
  }
  pieces.push(rect("harmika", -2.6, 16.3, 5.2, 2.1));
  for (let x = -2.2; x <= 2.2; x += 0.55)
    pieces.push(rect("harmika", x - 0.08, 16.4, 0.16, 1.9, "text", "line"));
  pieces.push(rect("yashti", -0.18, 18.4, 0.36, 4.4));
  for (const [y, w] of [
    [19.4, 4.6],
    [20.7, 3.5],
    [21.9, 2.4],
  ] as const) {
    pieces.push(
      poly(
        "chattra",
        [
          [-w / 2, y],
          [w / 2, y],
          [w / 2 - 0.3, y + 0.38],
          [-w / 2 + 0.3, y + 0.38],
        ],
        true,
      ),
    );
  }
  // Ground railing, in front of the drum.
  for (let x = -24; x <= 24; x += 1.2) pieces.push(rect("vedika", x - 0.22, 0, 0.44, 3.2));
  for (const y of [0.75, 1.55, 2.35]) pieces.push(rect("vedika", -24.3, y, 48.6, 0.42));
  pieces.push(rect("vedika", -24.3, 3.2, 48.6, 0.5));
  // A gateway, set in front on the left.
  const gx0 = -22;
  const gx1 = -12;
  for (const x of [gx0, gx1]) pieces.push(rect("torana", x - 0.55, 0, 1.1, 9));
  for (const [y, sag] of [
    [9.3, 0.25],
    [11.2, 0.3],
    [13.1, 0.35],
  ] as const) {
    const beam = quad([gx0 - 2.4, y + 0.4], [(gx0 + gx1) / 2, y - sag], [gx1 + 2.4, y + 0.4], 12);
    pieces.push(poly("torana", strip(beam, 0.75), true));
    for (const [ex, dir] of [
      [gx0 - 2.4, -1],
      [gx1 + 2.4, 1],
    ] as const) {
      const curl: Pt[] = [];
      for (let k = 0; k <= 20; k++) {
        const a = (k / 20) * Math.PI * 1.6;
        const r = 0.42 * (1 - k / 26);
        curl.push([ex + dir * r * Math.sin(a), y + 0.4 - r * Math.cos(a) + 0.42]);
      }
      pieces.push(poly("torana", curl, false, "text", "line"));
    }
  }
  for (const x of [gx0 + 2.5, gx0 + 5, gx0 + 7.5]) {
    pieces.push(rect("torana", x - 0.25, 9.6, 0.5, 1.4, "chosen"));
    pieces.push(rect("torana", x - 0.25, 11.5, 0.5, 1.4, "chosen"));
  }
  pieces.push(circlePiece("torana", (gx0 + gx1) / 2, 14.9, 0.9, "chosen", "ornament"));
  return plate(pieces, { x0: -27, x1: 27, y0: -0.6, y1: 23 });
}

export function hanPlate(): Elevation {
  const pieces: Piece[] = [];
  pieces.push(rect("tai", -15, 0, 30, 2.2));
  for (let k = 0; k < 4; k++)
    pieces.push(
      rect("tai", -2.4 + k * 0.4, -0.01 - 0 + k * 0.55, 4.8 - k * 0.8, 0.55, "chosen", "line"),
    );
  const posts = [-9, -3, 3, 9];
  for (const x of posts) {
    pieces.push(rect("chu", x - 0.7, 2.2, 1.4, 0.4));
    pieces.push(rect("zhu", x - 0.32, 2.6, 0.64, 6.3));
  }
  pieces.push(rect("zhu", -10.2, 8.4, 20.4, 0.5, "chosen"));
  // Bracket sets: a block on the post, an arm, three small blocks carrying the purlin.
  for (const x of posts) {
    pieces.push(
      poly(
        "dou",
        [
          [x - 0.6, 8.9],
          [x + 0.6, 8.9],
          [x + 0.45, 9.4],
          [x - 0.45, 9.4],
        ],
        true,
      ),
    );
    pieces.push(
      poly(
        "dou",
        [
          [x - 0.85, 9.4],
          [x + 0.85, 9.4],
          [x + 0.85, 9.55],
          [x - 0.85, 9.55],
        ],
        true,
      ),
    );
    const arm: Pt[] = [
      [x - 2.1, 9.95],
      ...quad([x - 2.1, 9.95], [x - 1.4, 9.5], [x, 9.55], 6),
      ...quad([x, 9.55], [x + 1.4, 9.5], [x + 2.1, 9.95], 6),
      [x + 2.1, 10.3],
      [x - 2.1, 10.3],
    ];
    pieces.push(poly("gong", arm, true));
    for (const dx of [-1.75, 0, 1.75]) {
      pieces.push(
        poly(
          "dougong",
          [
            [x + dx - 0.42, 10.3],
            [x + dx + 0.42, 10.3],
            [x + dx + 0.32, 10.7],
            [x + dx - 0.32, 10.7],
          ],
          true,
        ),
      );
    }
  }
  pieces.push(rect("yan", -12.2, 10.7, 24.4, 0.45));
  // Roof: a hipped roof of tile rows, with round tile-ends along the eaves.
  const eaveL: Pt = [-16.5, 11.15];
  const eaveR: Pt = [16.5, 11.15];
  pieces.push(poly("wa", [eaveL, eaveR, [5.5, 15.8], [-5.5, 15.8]], true));
  for (let x = -15.5; x <= 15.5; x += 0.9) {
    const topX = x * (5.5 / 16.5);
    pieces.push(
      poly(
        "wa",
        [
          [x, 11.2],
          [topX, 15.8],
        ],
        false,
        "text",
        "line",
      ),
    );
  }
  pieces.push(rect("yan", -16.8, 10.95, 33.6, 0.3));
  for (let x = -16.2; x <= 16.2; x += 0.9) pieces.push(circlePiece("wadang", x, 10.95, 0.28));
  pieces.push(
    poly(
      "wa",
      [
        [-6.2, 15.7],
        [6.2, 15.7],
        [6.6, 16.6],
        [-6.6, 16.6],
      ],
      true,
    ),
  );
  pieces.push(
    poly(
      "wa",
      [
        [-6.6, 16.6],
        [-7.4, 17.5],
        [-6.9, 16.6],
      ],
      true,
      "chosen",
    ),
  );
  pieces.push(
    poly(
      "wa",
      [
        [6.6, 16.6],
        [7.4, 17.5],
        [6.9, 16.6],
      ],
      true,
      "chosen",
    ),
  );
  return plate(pieces, { x0: -17.5, x1: 17.5, y0: -0.3, y1: 18 });
}

export function temploPlate(): Elevation {
  const pieces: Piece[] = [];
  const pyramid = (
    cx: number,
    w: number,
    h: number,
    part: string,
    given: "text" | "chosen",
    ink: "solid" | "line",
  ) => {
    const out: Piece[] = [];
    const levels = 4;
    for (let k = 0; k < levels; k++) {
      const y0 = (h / levels) * k;
      const y1 = (h / levels) * (k + 1);
      const half0 = w / 2 - k * (w * 0.065);
      const half1 = half0 - w * 0.035;
      out.push(
        poly(
          part,
          [
            [cx - half0, y0],
            [cx + half0, y0],
            [cx + half1, y1],
            [cx - half1, y1],
          ],
          true,
          given,
          ink,
        ),
      );
    }
    return out;
  };
  // Outer temple, then the earlier ones it encloses, drawn as an X-ray.
  pieces.push(...pyramid(40, 80, 28, "teocalli", "text", "solid"));
  const phases: [number, number][] = [
    [62, 22],
    [50, 18],
    [40, 15],
    [30, 12],
    [22, 9],
    [14, 6.5],
  ];
  for (const [w, h] of phases) {
    pieces.push(
      poly(
        "phase",
        [
          [40 - w / 2, 0.02],
          [40 + w / 2, 0.02],
          [40 + w / 2 - w * 0.17, h],
          [40 - w / 2 + w * 0.17, h],
        ],
        true,
        "chosen",
        "line",
      ),
    );
    for (const s of [-1, 1] as const) {
      pieces.push(
        rect("phase", 40 + s * w * 0.14 - w * 0.07, h, w * 0.14, h * 0.28, "chosen", "line"),
      );
    }
  }
  // Twin stairs between balustrades, each to its own shrine.
  for (const [x0, x1] of [
    [23, 37],
    [43, 57],
  ] as const) {
    pieces.push(rect("stair", x0, 0, x1 - x0, 28));
    for (let y = 0.6; y < 28; y += 0.6)
      pieces.push(
        poly(
          "stair",
          [
            [x0, y],
            [x1, y],
          ],
          false,
          "text",
          "line",
        ),
      );
    pieces.push(rect("stair", x0 - 1.2, 0, 1.2, 28.6));
    pieces.push(rect("stair", x1, 0, 1.2, 28.6));
  }
  pieces.push(rect("teocalli", 18, 28, 44, 1));
  // Shrines: Tlaloc's with banded walls, Huitzilopochtli's with a stepped crest. Reconstructed.
  pieces.push(rect("tlaloc", 22, 29, 16, 8.5, "chosen"));
  for (let y = 31; y < 37.5; y += 1.3)
    pieces.push(
      poly(
        "tlaloc",
        [
          [22, y],
          [38, y],
        ],
        false,
        "chosen",
        "line",
      ),
    );
  pieces.push(rect("tlaloc", 27.5, 29, 5, 4.6, "chosen", "groove"));
  pieces.push(rect("huitzilopochtli", 42, 29, 16, 8.5, "chosen"));
  for (let k = 0; k < 8; k++)
    pieces.push(rect("huitzilopochtli", 42.4 + k * 2, 37.5, 1.2, 1.4, "chosen"));
  pieces.push(rect("huitzilopochtli", 47.5, 29, 5, 4.6, "chosen", "groove"));
  // Talud and tablero, the platform profile seen at Teotihuacan, set beside for comparison.
  const tx = 88;
  for (let k = 0; k < 3; k++) {
    const y = k * 7;
    const inset = k * 1.8;
    pieces.push(
      poly(
        "talud",
        [
          [tx + inset, y],
          [tx + 12 - inset, y],
          [tx + 10.6 - inset, y + 2.6],
          [tx + 1.4 + inset, y + 2.6],
        ],
        true,
      ),
    );
    pieces.push(rect("tablero", tx + 1.1 + inset, y + 2.6, 9.8 - 2 * inset, 4.4));
    pieces.push(rect("tablero", tx + 1.8 + inset, y + 3.3, 8.4 - 2 * inset, 3.0, "text", "shade"));
  }
  pieces.push(rect("teocalli", -2, -0.5, 106, 0.5, "chosen", "shade"));
  return plate(pieces, { x0: -2.5, x1: 102, y0: -0.8, y1: 40 });
}

export function persiaPlate(): Elevation {
  const pieces: Piece[] = [];
  const cx = 0;
  // Stepped plinth and bell base with petals.
  pieces.push(rect("bell-base", cx - 2.6, 0, 5.2, 0.5));
  pieces.push(rect("bell-base", cx - 2.2, 0.5, 4.4, 0.45));
  const bell: Pt[] = [[0, 0.95], ...quad([2.0, 0.95], [1.5, 2.4], [0.95, 3.0], 12), [0, 3.0]];
  pieces.push(poly("bell-base", mirrored(cx, bell), true));
  for (let k = -4; k <= 4; k++) {
    const x = cx + k * 0.42;
    pieces.push(
      poly(
        "bell-base",
        [
          [x - 0.2, 1.0],
          [x, 2.6 - Math.abs(k) * 0.12],
          [x + 0.2, 1.0],
        ],
        false,
        "chosen",
        "line",
      ),
    );
  }
  pieces.push(rect("bell-base", cx - 1.05, 3.0, 2.1, 0.3));
  // A tall fluted shaft.
  const top = 21;
  pieces.push(
    poly(
      "stuna",
      [
        [cx - 0.85, 3.3],
        [cx + 0.85, 3.3],
        [cx + 0.78, top],
        [cx - 0.78, top],
      ],
      true,
    ),
  );
  for (let k = 0; k < 24; k++) {
    const a = ((k + 0.5) / 24) * 2 * Math.PI - Math.PI;
    if (Math.cos(a) <= 0.05) continue;
    pieces.push(
      poly(
        "stuna",
        [
          [cx + 0.85 * Math.sin(a), 3.3],
          [cx + 0.78 * Math.sin(a), top],
        ],
        false,
        "text",
        "line",
      ),
    );
  }
  pieces.push(
    poly(
      "stuna",
      [
        [cx + 0.35, 3.3],
        [cx + 0.85, 3.3],
        [cx + 0.78, top],
        [cx + 0.32, top],
      ],
      true,
      "chosen",
      "shade",
    ),
  );
  // Crown: drooping leaves, then an upturned flower.
  for (let k = -3; k <= 3; k++) {
    const x = cx + k * 0.32;
    const path = quad([x, top], [x + k * 0.25, top + 1.4], [x + k * 0.42, top + 0.5], 8);
    pieces.push(poly("crown", strip(path, 0.26, 0.6), true, "text", "ornament"));
  }
  const flower: Pt[] = [
    [0, top + 1.0],
    ...quad([0.7, top + 1.0], [1.5, top + 1.8], [1.6, top + 3.0], 10),
    [0, top + 3.0],
  ];
  pieces.push(poly("crown", mirrored(cx, flower), true));
  for (let k = -3; k <= 3; k++)
    pieces.push(
      poly(
        "crown",
        [
          [cx + k * 0.2, top + 1.05],
          [cx + k * 0.48, top + 2.95],
        ],
        false,
        "chosen",
        "line",
      ),
    );
  // Block with paired vertical volutes.
  const vb = top + 3.0;
  pieces.push(rect("persian-volute", cx - 1.4, vb, 2.8, 3.6));
  for (const side of [-1, 1] as const) {
    const x = cx + side * 0.8;
    for (const [y, dir] of [
      [vb + 0.85, 1],
      [vb + 2.75, -1],
    ] as const) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 60; i++) {
        const t = (i / 60) * Math.PI * 4;
        const r = 0.55 * (1 - i / 72);
        pts.push([x + side * r * Math.sin(t), y - dir * r * Math.cos(t)]);
      }
      pieces.push(poly("persian-volute", pts, false, "text", "line"));
    }
    pieces.push(
      poly(
        "persian-volute",
        [
          [x + side * 0.55, vb + 0.85],
          [x + side * 0.55, vb + 2.75],
        ],
        false,
        "text",
        "line",
      ),
    );
  }
  // Two kneeling bulls back to back; the roof beam rests in the saddle between their necks.
  const by = vb + 3.6;
  for (const side of [-1, 1] as const) {
    const s = side;
    const body: Pt[] = [
      [cx, by],
      [cx + s * 2.4, by],
      [cx + s * 2.7, by + 0.6],
      [cx + s * 2.4, by + 1.2],
      [cx + s * 3.3, by + 1.5],
      [cx + s * 3.6, by + 2.1],
      [cx + s * 3.2, by + 2.4],
      [cx + s * 2.6, by + 2.3],
      [cx + s * 2.3, by + 2.9],
      [cx + s * 1.8, by + 3.0],
      [cx + s * 1.5, by + 2.3],
      [cx + s * 0.6, by + 2.1],
      [cx + s * 0.5, by + 1.7],
      [cx, by + 1.7],
    ];
    pieces.push(poly("protome", body, true));
    pieces.push(
      poly(
        "protome",
        [
          [cx + s * 2.35, by + 2.75],
          [cx + s * 2.0, by + 3.5],
          [cx + s * 2.5, by + 3.1],
        ],
        false,
        "text",
        "line",
      ),
    );
    pieces.push(
      poly(
        "protome",
        [
          [cx + s * 1.1, by + 0.1],
          [cx + s * 1.25, by + 0.8],
          [cx + s * 2.2, by + 0.8],
        ],
        false,
        "chosen",
        "line",
      ),
    );
    pieces.push(circlePiece("protome", cx + s * 2.95, by + 2.0, 0.09));
  }
  pieces.push(rect("apadana", cx - 0.62, by + 1.7, 1.24, 1.0, "chosen"));
  pieces.push(rect("apadana", cx - 4.6, by + 2.7, 9.2, 0.9, "chosen"));
  pieces.push(rect("apadana", cx - 5, -0.4, 10, 0.4, "chosen", "shade"));
  return plate(pieces, { x0: -5.4, x1: 5.4, y0: -0.6, y1: by + 4.0 });
}

export function pantheonPlate(): Elevation {
  const pieces: Piece[] = [];
  const R = 21.65;
  const wall = 6.4;
  const oculus = 9.1 / 2;
  // The drum, cut through, as high as the dome's radius.
  for (const side of [-1, 1] as const) {
    const x0 = side * R;
    const x1 = side * (R + wall);
    pieces.push(
      poly(
        "rotunda",
        [
          [x0, 0],
          [x1, 0],
          [x1, R + 1.5],
          [x0, R],
        ],
        true,
        "text",
        "groove",
      ),
    );
    pieces.push(
      rect("rotunda", Math.min(x0, x1) + (side === 1 ? 0.6 : 0.6), 2, wall - 1.2, 9, "chosen"),
    );
  }
  // The dome: inner hemisphere, outer surface thinning from 6.4 m to 1.2 m at the opening.
  const inner: Pt[] = [];
  const outer: Pt[] = [];
  const top = Math.acos(oculus / R);
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * top;
    inner.push([R * Math.cos(a), R + R * Math.sin(a)]);
    const t = a / top;
    const thick = wall - (wall - 1.2) * t ** 0.8;
    outer.push([(R + thick) * Math.cos(a), R + (R + thick) * Math.sin(a)]);
  }
  for (const side of [-1, 1] as const) {
    const flip = (p: Pt): Pt => [side * p[0], p[1]];
    pieces.push(
      poly(
        "tholus",
        [...inner.map(flip), ...[...outer].reverse().map(flip)],
        true,
        "text",
        "groove",
      ),
    );
    // Coffers: five rings of sunken panels on the inner surface.
    for (let k = 0; k < 5; k++) {
      const a0 = 0.12 + k * 0.2;
      const a1 = a0 + 0.13;
      const d = 0.9;
      const p = (a: number, r: number): Pt => flip([r * Math.cos(a), R + r * Math.sin(a)]);
      pieces.push(
        poly(
          "lacunaria",
          [p(a0, R), p(a0, R + d), p(a1, R + d), p(a1, R)],
          true,
          "chosen",
          "solid",
        ),
      );
    }
  }
  // The opening at the top.
  pieces.push(rect("oculus-dome", -oculus, 2 * R - 0.4, 2 * oculus, 1.6, "text", "shade"));
  // The sphere that fits inside.
  pieces.push({
    part: "sphere",
    shape: { kind: "circle", cx: 0, cy: R, r: R },
    given: "chosen",
    ink: "line",
  });
  pieces.push(circlePiece("sphere", 0, R, 0.35, "chosen"));
  // The porch on the left, schematic: two columns of its depth under a pediment roof.
  const px0 = -(R + wall) - 16;
  for (const x of [px0 + 1.2, px0 + 8.5]) {
    pieces.push(rect("porticus", x - 0.75, 0, 1.5, 12.5));
    pieces.push(rect("porticus", x - 1.1, 12.5, 2.2, 1.6, "chosen", "ornament"));
  }
  pieces.push(rect("porticus", px0 - 0.4, 14.1, 16.6, 2.4));
  pieces.push(
    poly(
      "porticus",
      [
        [px0 - 0.8, 16.5],
        [-(R + wall), 16.5],
        [-(R + wall), 22.5],
      ],
      true,
    ),
  );
  pieces.push(rect("rotunda", -(R + wall) - 14, -0.6, 2 * (R + wall) + 14, 0.6, "chosen", "shade"));
  return plate(pieces, { x0: px0 - 1.5, x1: R + wall + 3, y0: -0.8, y1: 2 * R + 2 });
}

export const WORLD_DRAWINGS: Record<string, () => Elevation> = {
  egypt: egyptPlate,
  mesopotamia: zigguratPlate,
  rome: pantheonPlate,
  persia: persiaPlate,
  india: stupaPlate,
  china: hanPlate,
  mexico: temploPlate,
};
