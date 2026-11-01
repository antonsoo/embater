import type { DoricSpacing } from "./doric";
import { type BaseKind, CLEAR, columnHeight, epistyleHeight, type IonicSpacing } from "./ionic";

export type Order = "doric" | "ionic" | "corinthian" | "tuscan";

export interface OrderState {
  order: Order;
  columns: 4 | 6 | 8;
  doricSpacing: DoricSpacing;
  ionicSpacing: IonicSpacing;
  base: BaseKind;
  carved: boolean;
  /** Doric module, Ionic/Corinthian lower diameter, or Tuscan temple width, in Roman feet. */
  feet: Record<"doric" | "ionic" | "tuscan", number>;
  view: "front" | "detail" | "roof";
  trial: number;
  trialTarget: "corner" | "middle";
  dims: boolean;
  part: string | null;
}

const DEFAULTS: OrderState = {
  order: "doric",
  columns: 6,
  doricSpacing: "diastyle",
  ionicSpacing: "eustyle",
  base: "attic",
  carved: false,
  feet: { doric: 1.5, ionic: 2.5, tuscan: 60 },
  view: "front",
  trial: 0.5,
  trialTarget: "corner",
  dims: true,
  part: null,
};

export const FEET_RANGE = {
  doric: { min: 0.5, max: 4, step: 0.25, label: "One module" },
  ionic: { min: 1, max: 6, step: 0.25, label: "Ordinary lower diameter" },
  tuscan: { min: 20, max: 100, step: 5, label: "Temple width" },
} as const;

export function feetKey(order: Order): "doric" | "ionic" | "tuscan" {
  return order === "corinthian" ? "ionic" : order;
}

export function readOrders(hash: string): OrderState {
  const s: OrderState = structuredClone(DEFAULTS);
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const order = params.get("order");
  if (order === "doric" || order === "ionic" || order === "corinthian" || order === "tuscan")
    s.order = order;
  const cols = Number(params.get("columns"));
  if (cols === 4 || cols === 6 || cols === 8) s.columns = cols;
  const spacing = params.get("spacing");
  if (spacing === "diastyle" || spacing === "systyle") s.doricSpacing = spacing;
  if (spacing && Object.hasOwn(CLEAR, spacing)) s.ionicSpacing = spacing as IonicSpacing;
  const base = params.get("base");
  if (base === "attic" || base === "ionic") s.base = base;
  s.carved = params.get("frieze") === "carved";
  const feet = Number(params.get("feet"));
  const key = feetKey(s.order);
  const range = FEET_RANGE[key];
  if (Number.isFinite(feet) && feet >= range.min && feet <= range.max)
    s.feet[key] = range.min + Math.round((feet - range.min) / range.step) * range.step;
  const view = params.get("view");
  s.view =
    view === "roof" && s.order !== "tuscan" ? "roof" : view === "detail" ? "detail" : "front";
  const trial = Number(params.get("trial"));
  if (params.has("trial") && Number.isFinite(trial) && trial >= 0.125 && trial <= 1.5)
    s.trial = Math.round(trial * 40) / 40;
  s.trialTarget = params.get("target") === "middle" ? "middle" : "corner";
  s.dims = params.get("dims") !== "off";
  const part = params.get("part");
  s.part = part && /^[a-z][a-z0-9-]{0,63}$/.test(part) ? part : null;
  return s;
}

export function ordersHash(s: OrderState): string {
  const p = new URLSearchParams();
  p.set("order", s.order);
  if (s.order !== "tuscan") p.set("columns", String(s.columns));
  if (s.order === "doric") p.set("spacing", s.doricSpacing);
  if (s.order === "ionic" || s.order === "corinthian") {
    p.set("spacing", s.ionicSpacing);
    p.set("base", s.base);
    if (s.carved) p.set("frieze", "carved");
  }
  p.set("feet", String(s.feet[feetKey(s.order)]));
  if (s.view !== "front") p.set("view", s.view);
  if (s.view === "roof") {
    p.set("trial", String(s.trial));
    if (s.trialTarget === "middle") p.set("target", "middle");
  }
  if (!s.dims) p.set("dims", "off");
  if (s.part) p.set("part", s.part);
  return `#${p.toString()}`;
}

/** Canonical settings accompany portable diagrams so a ratio retains its experiment. */
export function orderRecord(state: OrderState) {
  const key = feetKey(state.order);
  const ionic = state.order === "ionic" || state.order === "corinthian";
  const columnFeet = ionic
    ? columnHeight(state.order as "ionic" | "corinthian", state.ionicSpacing) * state.feet[key]
    : state.order === "doric"
      ? 14 * state.feet.doric
      : state.feet.tuscan / 3;
  const modelNotes = [
    ...(state.order !== "tuscan" ? ["The corner addition retains the nominal column axes."] : []),
    ...(ionic
      ? [
          "Bases and capitals use each column’s own lower diameter; their tops stay level by adjusting shaft length.",
        ]
      : []),
    ...(ionic &&
    epistyleHeight(
      columnHeight(state.order as "ionic" | "corinthian", state.ionicSpacing),
      columnFeet,
    ).extrapolated
      ? [
          "The architrave is outside the stated 12–30-foot range. Its height and dependent roof projection continue the model’s pattern; the text does not give this numeric extension.",
        ]
      : []),
    ...(state.order === "ionic"
      ? [
          "The Ionic volute joins prescribed quarter-turn radii with a modern linear interpolation and a chosen fillet.",
        ]
      : []),
    ...(state.order !== "tuscan" && columnFeet > 50
      ? [
          "Above 50 feet, the taper uses a modern half-part step per ten feet to interpret pro rata.",
        ]
      : []),
  ];
  return {
    format: "embater-orders-v1",
    modelNotes,
    order: state.order,
    columns: state.order === "tuscan" ? 4 : state.columns,
    spacing:
      state.order === "tuscan"
        ? null
        : state.order === "doric"
          ? state.doricSpacing
          : state.ionicSpacing,
    base: state.order === "ionic" || state.order === "corinthian" ? state.base : null,
    sculptedFrieze: state.order === "ionic" || state.order === "corinthian" ? state.carved : null,
    unitFeet: state.feet[key],
    unitName:
      state.order === "tuscan"
        ? "temple width"
        : state.order === "doric"
          ? "Doric module"
          : "ordinary lower diameter",
    view: state.view,
    dimensions: state.dims,
    selectedPart: state.part,
    trialRatio: state.trial,
    trialTarget: state.trialTarget,
    reopenUrl: `https://antonsoo.github.io/embater/${ordersHash(state)}`,
  };
}

/** A hand-edited link can request an in-between value that the native slider cannot retain. */
export function ordersNotice(hash: string, state: OrderState): string {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (!params.has("feet")) return "";
  const requested = Number(params.get("feet"));
  const key = feetKey(state.order);
  const range = FEET_RANGE[key];
  if (
    Number.isFinite(requested) &&
    requested >= range.min &&
    requested <= range.max &&
    Math.abs(requested - state.feet[key]) > 1e-9
  )
    return `The shared size ${requested} ft was rounded to ${state.feet[key]} ft to match this control’s ${range.step}-foot steps.`;
  return "";
}
