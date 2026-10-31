import { dataUrl, verified } from "./assets";
import { CODE_LICENSE_HASH, FONT_LICENSE_HASH, PLAN_FONTS } from "./content/plan-fonts";
import { PLAN_PLATES } from "./content/plan-plates";
import { planPages } from "./content/plan-reading";
import { PLAN_CARDS } from "./content/terms";
import type { Plan } from "./core/plan";
import { renderElevation } from "./draw/render";
import { esc } from "./ui/dom";
import { claimsTable, planPassages } from "./ui/plan-reading";

export { verified } from "./assets";

export const PLAN_SVG_STYLE = `.plate-svg{display:block;width:100%;height:auto}.pc{vector-effect:non-scaling-stroke;stroke-linejoin:round}.solid{fill:#f8f9f5;stroke:#1f2328;stroke-width:.9px}.solid.chosen{stroke:#8b9199}.groove{fill:#2a2f36;stroke:none}.groove.chosen{fill:#8b9199}.shade{fill:var(--hatch);stroke:none}.hatch-line{stroke:#1f2328;opacity:.38}`;

export function planSvg(p: Plan): string {
  const svg = renderElevation(p, {
    id: "saved-plan",
    title: `${p.type} illustrative plan; ${p.clear} diameters clear${p.flank ? `; ${p.front} by ${p.flank} outer columns` : ""}`,
    dims: false,
    margin: 0.6,
  });
  const description = `Vitruvius-based illustrative model, not a recovered ancient building. ${p.columns} outer or porch columns; ${p.innerColumns} inner-ring columns. Black: column arrangement. Grey: illustrative geometry. Front at bottom. Spacing and some flank counts are drawing choices. See the companion HTML reading for prescriptions, calculations, assumptions and source pages.`;
  return svg.replace(
    /(<svg[^>]*>)/,
    `$1<title>${esc(p.type)} plan</title><desc>${esc(description)}</desc><style>${PLAN_SVG_STYLE}</style>`,
  );
}

export function planHash(p: Plan): string {
  const q = new URLSearchParams({ type: p.type, clear: String(p.clear) });
  if (p.type === "dipteral" || p.type === "hypaethral") q.set("flank", String(p.flank));
  return `#${q}`;
}

export async function planReading(p: Plan): Promise<string> {
  const pages = planPages(p);
  const [plates, fonts, license, code] = await Promise.all([
    Promise.all(
      PLAN_PLATES.filter((s) => pages.includes(s.page)).map(async (s) => ({
        ...s,
        data: dataUrl(
          await verified(`${import.meta.env.BASE_URL}${s.path}`, s.sha256),
          "image/jpeg",
        ),
      })),
    ),
    Promise.all(
      PLAN_FONTS.map(async (f) => ({
        ...f,
        data: dataUrl(await verified(f.url, f.hash), "font/woff2"),
      })),
    ),
    verified(`${import.meta.env.BASE_URL}FONT-LICENSE.txt`, FONT_LICENSE_HASH),
    verified(`${import.meta.env.BASE_URL}LICENSE.txt`, CODE_LICENSE_HASH),
  ]);
  if (plates.length !== pages.length)
    throw new Error("A cited source page is missing from this edition.");
  const card = PLAN_CARDS[p.type];
  if (!card) throw new Error("Unknown plan card");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${p.type} — Embater plan reading</title><style>
  ${fonts.map((f) => `@font-face{font-family:Reading;src:url(${f.data}) format('woff2');font-weight:400 700;unicode-range:${f.range}}`).join("")}
  body{font:20px/1.5 Reading,Georgia,serif;max-width:64rem;margin:2rem auto;padding:0 1rem;color:#1f2328;background:#f8f9f5}h1,h2,h3{font-weight:400;line-height:1.2}h1{color:#1f4e9c}a{color:#1f4e9c}figure{margin:1rem 0}.drawing{max-width:22rem;margin:auto}small{display:block}table{border-collapse:collapse;width:100%;font-size:.9em}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #c9cdc6;padding:.6rem}caption{text-align:left;font-size:1.3em;margin:1rem 0}td:first-child{min-width:7rem}img{display:block;max-width:100%;height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px Reading,serif}.plan-passage{border-top:1px solid #c9cdc6;margin-top:1.5rem}.source{break-before:page}.source figcaption{margin-bottom:1rem}${PLAN_SVG_STYLE}@media(max-width:600px){body{font-size:18px}th,td{padding:.35rem}td:first-child{min-width:0}.plan-ledger,.plan-ledger tbody{display:block}.plan-ledger thead{position:absolute;clip-path:inset(50%);width:1px;height:1px;overflow:hidden}.plan-ledger tr{display:grid;grid-template-columns:1fr 2fr;border-bottom:1px solid #c9cdc6}.plan-ledger td,.plan-ledger th{border:0}.plan-ledger td:last-child{grid-column:1 / -1}.plan-ledger caption{display:block}}@media print{body{margin:0;background:white;font-size:11pt}.drawing{max-width:55mm}tr{break-inside:avoid}img{max-height:238mm;width:auto;margin:auto}details> *{display:block}summary{display:none}@page{size:A4;margin:15mm}}
  </style><h1>${esc(card.english)}</h1><p lang="grc">${esc(card.word.word)}</p><p>${esc(card.note)}</p><p>${p.clear} D clear between columns; ${p.columns} columns ${p.flank ? "on the outer ring" : "in the porticoes"}${p.innerColumns ? `; ${p.innerColumns} on the inner ring` : ""}. D is one lower column diameter.</p><figure class="drawing">${planSvg(p)}<figcaption>Front at bottom. Black columns show the type’s arrangement within the selected model. Grey geometry includes drawing choices. Read their basis below.</figcaption></figure>
  ${claimsTable(p)}<h2>Read the passages</h2>${planPassages(p)}<p>This static reading includes the diagram, complete cited source pages and four font subsets. It opens offline without scripts. External links need a connection. <a href="https://antonsoo.github.io/embater/plans.html${esc(planHash(p))}">Reopen these choices in Embater</a>.</p>
  ${plates.map((s) => `<figure class="source"><figcaption>Vitruvius, F. Krohn’s 1912 Teubner edition, complete printed p. ${s.page}. Public domain. <a href="${s.url}">Internet Archive image</a>.</figcaption><img src="${s.data}" alt="Complete printed page ${s.page} of Krohn’s 1912 Vitruvius"></figure>`).join("")}
  <h2>Credits</h2><p>Latin: F. Krohn, <i>Vitruvii De architectura libri decem</i> (Leipzig: Teubner, 1912), public domain. Omissions marked; case and punctuation normalized. English translations, drawings and teaching model: © 2026 Anthony Mercer, MIT. These illustrations combine passages with stated assumptions; they are not archaeological reconstructions. The English has not had independent philological review.</p><details><summary>Code and content license</summary><pre>${esc(new TextDecoder().decode(code))}</pre></details><details><summary>Included font licenses</summary><pre>${esc(new TextDecoder().decode(license))}</pre></details></html>`;
}
