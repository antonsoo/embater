import { planClaims, planRules } from "../content/plan-reading";
import type { Plan } from "../core/plan";
import { RULES } from "../core/rules";
import { esc } from "./dom";

export function claimsTable(p: Plan): string {
  return `<table class="plan-ledger"><caption>What fixes this ${p.type} drawing?</caption><thead><tr><th scope="col">Basis</th><th scope="col">Feature</th><th scope="col">Reading of this plan</th></tr></thead><tbody>${planClaims(
    p,
  )
    .map(
      (c) =>
        `<tr><td>${c.basis}</td><th scope="row">${esc(c.feature)}</th><td>${esc(c.reading)}${c.rules.length ? `<small>${c.rules.map((id) => `Vitruvius ${esc(RULES.get(id)?.cite ?? id)}`).join("; ")}</small>` : ""}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

export function planPassages(p: Plan): string {
  return planRules(p)
    .map(
      (r) =>
        `<article class="plan-passage"><h3>Vitruvius ${esc(r.cite)}</h3><p lang="la">${esc(r.latin)}</p><p>${esc(r.english)}</p>${r.reading ? `<p>Manuscripts: ${esc(r.reading.manuscripts)}. Printed: ${esc(r.reading.printed)}, ${esc(r.reading.editor)}. ${esc(r.reading.note)}</p>` : ""}<p>Krohn 1912, ${r.pageEnd ? `pp. ${r.page}–${r.pageEnd}` : `p. ${r.page}`}.</p></article>`,
    )
    .join("");
}
