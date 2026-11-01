import { TERMS, type Term } from "../content/terms";
import { PLATES } from "../content/world";
import { WORLD_DRAWINGS } from "../draw/world";
import { DORIC_LEVELS, doricElevation } from "./doric";
import { partsInView } from "./geometry";
import { ionicElevation } from "./ionic";
import { plan } from "./plan";
import type { Bounds, Elevation } from "./types";

export interface Deck {
  id: string;
  label: string;
  elevation: Elevation;
  view: Bounds;
  terms: Term[];
}

function orderView(
  e: Elevation & { shaftTop?: number; entablatureTop?: number },
  top: number,
): Bounds {
  const a0 = e.axes[0] ?? 0.5;
  return { x0: a0 - 1.8, x1: a0 + 1.9, y0: -0.4, y1: top };
}

export function buildDecks(): Deck[] {
  const decks: Deck[] = [];
  const d = doricElevation({ columns: 6, spacing: "diastyle", moduleFeet: 1.5 });
  const dv = {
    x0: -1.6,
    x1: (d.axes[1] ?? 8) + 1.4,
    y0: d.bounds.y0,
    y1: DORIC_LEVELS.coronaTop + 2,
  };
  decks.push(withTerms("doric", "Doric", d, dv));
  const io = ionicElevation({
    order: "ionic",
    columns: 6,
    spacing: "eustyle",
    base: "attic",
    moduleFeet: 2.5,
    sculptedFrieze: false,
  });
  decks.push(withTerms("ionic", "Ionic", io, orderView(io, io.entablatureTop + 0.6)));
  const co = ionicElevation({
    order: "corinthian",
    columns: 6,
    spacing: "eustyle",
    base: "attic",
    moduleFeet: 2.5,
    sculptedFrieze: false,
  });
  decks.push(withTerms("corinthian", "Corinthian", co, orderView(co, co.entablatureTop + 0.6)));
  const p = plan("peripteral");
  decks.push(withTerms("plan", "Temple plan", p, p.bounds));
  for (const plate of PLATES) {
    const make = WORLD_DRAWINGS[plate.id];
    if (!make) continue;
    const e = make();
    const drawn = new Set(e.pieces.map((x) => x.part));
    decks.push({
      id: plate.id,
      label: plate.place.split(",")[0] ?? plate.id,
      elevation: e,
      view: e.bounds,
      terms: plate.terms.filter((t) => drawn.has(t.id) && t.words.length > 0),
    });
  }
  return decks;
}

function withTerms(id: string, label: string, e: Elevation, view: Bounds): Deck {
  const visible = partsInView(e.pieces, view);
  const terms = visible.map((p) => TERMS.get(p)).filter((t): t is Term => t !== undefined);
  return { id, label, elevation: e, view, terms };
}
