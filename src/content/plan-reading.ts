import type { Plan } from "../core/plan";
import { RULES } from "../core/rules";
import { PLAN_CARDS } from "./terms";

export interface PlanClaim {
  basis: "Text" | "Calculation" | "Drawing choice";
  feature: string;
  reading: string;
  rules: string[];
}

const n = (v: number) => String(Math.round(v * 1000) / 1000);

/** Claims describe both the selected geometry and the limits of its authority. */
export function planClaims(p: Plan): PlanClaim[] {
  const rows: PlanClaim[] = [];
  const add = (basis: PlanClaim["basis"], feature: string, reading: string, rules: string[] = []) =>
    rows.push({ basis, feature, reading, rules });
  if (p.body) {
    add(
      "Text",
      "Columns",
      p.type === "in-antis"
        ? "Two columns between the antae."
        : p.type === "prostyle"
          ? "The in-antis arrangement gains two corner columns opposite the antae; four are drawn across the front."
          : "Everything the prostyle has, with columns and a pediment added at the rear. Four columns at each end in this drawing; the cella is kept intact.",
      p.type === "in-antis" ? ["types"] : ["prostyle"],
    );
    add(
      "Drawing choice",
      "Combining passages",
      "These three drawings apply the body proportions of IV.4.1 to the arrangements named in III.2. This is an illustrative combination, not a recovered plan of a named building. Rear columns do not require cutting another enclosed porch out of the cella.",
      ["cella-plan"],
    );
    const b = p.body;
    add(
      "Calculation",
      "Body and rooms",
      `Width B = ${n(b.width)} D; body length 2B = ${n(b.length)} D. Cella allocation 5B/4 = ${n(b.cella)} D; front porch 3B/4 = ${n(b.porch)} D. The drawing treats the cella allocation as including its two end walls. Clear floor after the chosen walls: ${n(b.clearWidth)} × ${n(b.clearLength)} D.`,
      ["cella-plan"],
    );
  } else {
    const fixed = p.type === "peripteral" || p.type === "pseudodipteral";
    const rule =
      p.type === "peripteral"
        ? "peripteral"
        : p.type === "pseudodipteral"
          ? "pseudodipteral"
          : "dipteral";
    add(
      "Text",
      "Front and back",
      `${p.front} columns across each end${p.innerColumns ? "; a double ring around the temple" : ""}. Corner columns are included in the side counts.`,
      [rule],
    );
    add(
      fixed ? "Text" : "Drawing choice",
      "Long sides",
      fixed
        ? `${p.flank} columns on each long side, explicitly stated in III.2.`
        : `${p.flank} columns on each long side. III.2 does not state this count for the ${p.type}. The initial ${p.type === "dipteral" ? "15" : "19"} extends the double-intercolumniation rule of III.4.3, whose wording specifically says “in peripteral temples”. Other counts here test that assumption.`,
      fixed ? [rule] : ["dipteral", "flanks"],
    );
    add(
      "Calculation",
      "Count each corner once",
      `Outer ring: 2 × ${p.front} + 2 × ${p.flank} − 4 = ${p.columns} columns.${p.innerColumns ? ` The chosen inner rectangle is ${p.front - 2} × ${p.flank - 2}: ${p.innerColumns} columns.` : ""}`,
    );
    if (p.type === "dipteral" || p.type === "pseudodipteral")
      add(
        "Calculation",
        "The 34-column reading",
        p.type === "dipteral"
          ? `This inner ring has ${p.innerColumns} columns. Krohn prints 34 for the rows Hermogenes removed, adopting Philander’s correction of the transmitted 38. An 8 × 15 outer rectangle gives 34 inside; an 8 × 17 gives 38. Geometry alone cannot decide the wording: the assumed plan has changed too.`
          : "Removing the inner 6 × 13 rectangle from an 8 × 15 double ring saves 34 columns. Krohn prints 34, an editorial correction of the transmitted 38. Agreement with this drawing is conditional on its rectangular arrangement.",
        ["hermogenes"],
      );
    if (p.type === "hypaethral")
      add(
        "Text",
        "Open sky and access",
        "The middle is unroofed, with two-storey interior colonnades set away from the walls and doorways at both ends. The plan shows both openings; it cannot show the second storey. The interior column count and opening sizes are chosen.",
        ["dipteral"],
      );
    add(
      "Drawing choice",
      "Walls and rooms",
      `Wall thickness 1 D; doorway width one quarter of the body width. Porch partitions, end setbacks and internal columns are illustrative. ${p.type === "peripteral" ? "The side clearance is one intercolumniation." : p.type === "pseudodipteral" ? "The side walls align with the four middle column axes; the side clearance is two clear gaps plus one diameter." : "Both exterior rings share an axis grid; the inner ring is inset by one axis interval."}`,
      [rule],
    );
  }
  add(
    "Drawing choice",
    "Spacing and scale",
    `D is the lower column diameter. Clear gap ${p.clear} D; axis interval ${p.clear + 1} D. III.3 describes 1½, 2 and 3 D spacings separately from the plan types. Choosing one here does not establish that an ancient temple used it. Platform margins, door widths and all wall thicknesses away from the antae are drawing choices.`,
    ["species"],
  );
  return rows;
}

export function planRules(p: Plan) {
  const card = PLAN_CARDS[p.type];
  if (!card) throw new Error("Unknown plan card");
  const ids = new Set([...card.rules, ...planClaims(p).flatMap((c) => c.rules)]);
  return [...ids].map((id) => {
    const rule = RULES.get(id);
    if (!rule) throw new Error(`Unknown rule ${id}`);
    return rule;
  });
}

export function planPages(p: Plan): number[] {
  return [
    ...new Set(planRules(p).flatMap((r) => (r.pageEnd ? [r.page, r.pageEnd] : [r.page]))),
  ].sort((a, b) => a - b);
}
