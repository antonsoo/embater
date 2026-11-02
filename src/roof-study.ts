import { dataUrl, verified } from "./assets";
import { CODE_LICENSE_HASH, FONT_LICENSE_HASH } from "./content/plan-fonts";
import { term } from "./content/terms";
import { VOCABULARY_FONT_LICENSE_HASH, VOCABULARY_FONTS } from "./content/vocabulary-fonts";
import { VOCABULARY_PLATES } from "./content/vocabulary-plates";
import type { Pediment } from "./core/common";
import { feetKey, type OrderState, orderRecord } from "./core/orders-state";
import { RULES } from "./core/rules";
import type { Elevation } from "./core/types";
import { renderElevation } from "./draw/render";
import { ROOF_SVG_STYLE, roofCsv, roofSvg } from "./draw/roof";
import { termCard } from "./ui/card";
import { esc } from "./ui/dom";

const ROOF_FONTS = VOCABULARY_FONTS.filter(
  (font) =>
    font.range.startsWith("U+0000") ||
    font.range.includes("U+27E8") ||
    font.range.includes("U+2159"),
);

/** A static source reading retains the exact experiment and checks every embedded asset. */
export async function roofStudy(
  state: OrderState,
  elevation: Elevation,
  roof: Pediment,
  signal: AbortSignal,
): Promise<string> {
  const record = orderRecord(state);
  const selected = term(state.part ?? "acroterion") ?? term("acroterion");
  const selectedRules = (selected?.rules ?? []).filter(
    (id) => state.order === "doric" || id !== "doric-pediment",
  );
  const ruleIds = new Set([
    "ionic-corona",
    "sima-acroteria",
    ...selectedRules,
    ...(state.order === "doric" ? ["doric-pediment"] : ["ionic-epistyle"]),
  ]);
  const pageNumbers = [
    ...new Set(
      [...ruleIds].flatMap((id) => {
        const rule = RULES.get(id);
        if (!rule) throw new Error("A cited roof rule is missing from this edition.");
        return Array.from(
          { length: (rule.pageEnd ?? rule.page) - rule.page + 1 },
          (_, index) => rule.page + index,
        );
      }),
    ),
  ].sort((a, b) => a - b);
  const plates = pageNumbers.map((number) => {
    const page = VOCABULARY_PLATES.find((page) => page.page === number);
    if (!page)
      throw new Error(`The source for printed page ${number} is missing from this edition.`);
    return page;
  });
  const [images, fonts, mainLicense, extraLicense, codeLicense] = await Promise.all([
    Promise.all(
      plates.map(async (page) => ({
        ...page,
        data: dataUrl(
          await verified(`${import.meta.env.BASE_URL}${page.path}`, page.sha256, signal),
          "image/jpeg",
        ),
      })),
    ),
    Promise.all(
      ROOF_FONTS.map(async (font) => ({
        ...font,
        data: dataUrl(await verified(font.url, font.hash, signal), "font/woff2"),
      })),
    ),
    verified(`${import.meta.env.BASE_URL}FONT-LICENSE.txt`, FONT_LICENSE_HASH, signal),
    verified(
      `${import.meta.env.BASE_URL}fonts/VOCABULARY-OFL.txt`,
      VOCABULARY_FONT_LICENSE_HASH,
      signal,
    ),
    verified(`${import.meta.env.BASE_URL}LICENSE.txt`, CODE_LICENSE_HASH, signal),
  ]);
  signal.throwIfAborted();
  const svg = roofSvg(roof, state.trial, state.dims, state.trialTarget, state);
  const csv = roofCsv(
    roof,
    state.feet[feetKey(state.order)],
    state.trial,
    state.trialTarget,
    state,
  );
  const card = selected
    ? termCard({ ...selected, rules: selectedRules }, { live: false }).replaceAll(
        '<details class="rule">',
        '<details class="rule" open>',
      )
    : "";
  const doric = RULES.get("doric-pediment");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>How tall is the ornament? · Embater</title><style>
${fonts.map((font) => `@font-face{font-family:Reading;src:url(${font.data}) format('woff2');font-weight:400 700;unicode-range:${font.range}}`).join("\n")}
body{font:20px/1.55 Reading,Georgia,serif;color:#1f2328;background:#f8f9f5;max-width:64rem;margin:2rem auto;padding:0 1rem}h1,h2,h3{font-weight:400;line-height:1.2}h1,a{color:#1f4e9c}h1{font-size:2.5rem}p{max-width:75ch}.plate-svg{display:block;width:100%;height:auto}figure{margin:1.5rem 0}.context{max-width:46rem;margin-inline:auto}.source img{display:block;max-width:100%;height:auto}.source{break-before:page}figcaption{margin:.7rem 0}.word-head{font-size:1.25em}.word-source,.rule-page{font-size:.85em}.word-literal{margin-top:0}.quote{margin-left:0;border-left:2px solid #1f4e9c;padding-left:1rem}.rule{border-top:1px solid #c9cdc6;padding-top:.7rem;margin-top:1rem}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.8em}.downloads{display:flex;flex-wrap:wrap;gap:1rem}[lang="la"]{font-feature-settings:"locl" 0;font-language-override:"ENG"}${ROOF_SVG_STYLE}
pre,.plate-svg .dim text,.plate-svg .settings-label{font-family:Reading,serif}
@media(max-width:600px){body{font-size:18px}h1{font-size:2rem}}@media print{body{font-size:11pt;margin:0;background:white}.downloads{display:none}h1,h2,h3{break-after:avoid}.source img{max-height:235mm;width:auto;margin:auto}.context{max-width:120mm}figcaption{font-size:10pt}.rule{break-inside:avoid}@page{size:A4;margin:15mm}}
</style></head><body><h1>How tall is the ornament?</h1>
<p>${esc(record.order)}, ${record.columns} columns, ${esc(record.spacing ?? "")}; one ${esc(record.unitName)} = ${record.unitFeet} Roman feet. Blue measures the ${record.trialTarget} ornament at ${record.trialRatio}h. The triangular field’s height h is one ninth of the corona front.</p>
<figure>${svg}<figcaption>Roof at the saved settings. Corner ornaments h; middle ornament h + h/8. The envelope is a modern measuring aid. Red gives the source’s ratios.</figcaption></figure>
<p lang="la">acroteria angularia tam alta, quantum est tympanum medium, mediana altiora octava parte quam angularia.</p>
<p>The corner ornaments as high as the middle of the tympanum; the middle ornaments an eighth higher than the corner ones. <span lang="la">tam alta, quantum</span> gives equality. <span lang="la">altiora octava parte quam</span> gives an increase by an eighth, making the total 9h/8. Vitruvius III.5.12, Krohn 1912, p. 74. English is modern.</p>
${state.order === "doric" && doric ? `<p lang="la">${esc(doric.latin)}</p><p>${esc(doric.english)} IV.3.6, printed p. 84. This cross-reference is the basis for applying the Ionic roof instructions in this Doric model.</p>` : ""}
<h2>The same roof on its order</h2><figure class="context">${renderElevation(elevation, { id: "saved-order", title: `${record.order} front at the saved roof settings`, dims: state.dims })}<figcaption>The whole front gives scale and context. It uses the existing order model, with black cited dimensions and grey drawing choices. The lower-diameter unit denotes an ordinary column. Corner shafts are a fiftieth thicker; the Ionic and Corinthian base and capital proportions use each column’s own thickness while their axes and tops stay fixed. Those joining choices are explicit parts of the model. The retained source pages here cover the roof rules; the full front gives context rather than a complete reading of every order rule. This is not a surveyed building.</figcaption></figure>
<h2>The selected part</h2>${card}
<p class="downloads"><a href="${dataUrl(new TextEncoder().encode(svg), "image/svg+xml")}" download="embater-${record.order}-roof.svg">Download this roof SVG</a><a href="${dataUrl(new TextEncoder().encode(csv), "text/csv;charset=utf-8")}" download="embater-${record.order}-roof.csv">Download these measurements CSV</a><a href="${esc(record.reopenUrl)}">Reopen these exact choices in Embater</a></p>
<h2>Settings and limits</h2>${record.modelNotes.map((note) => `<p>${esc(note)}</p>`).join("")}<pre id="saved-settings">${esc(JSON.stringify(record, null, 2))}</pre>
<p>The visible numbers use the same unrounded model as the measurements CSV. SVG coordinates are rounded to three decimals. Palmettes, plinths, corner insets, levelling wedges and normal cornice thickness are modern drawing choices. A prescribed height does not determine an ornament’s outline. The grey wedges are grouped with the sima for drawing; the text does not describe those wedges. These drawings combine rules with choices and do not reconstruct a particular temple. No conversion to modern metres is made.</p>
<p>This reading embeds its two drawings, ${images.length} complete source ${images.length === 1 ? "page" : "pages"}, ${fonts.length} font subsets and licenses. It contains no scripts or automatic remote resources. External links need a connection.</p>
${images.map((page) => `<figure class="source"><figcaption>F. Krohn’s 1912 Teubner edition, complete printed page ${page.page}, including the apparatus. Public domain. <a href="${page.url}">Original archive page</a>.</figcaption><img data-source-page="${page.page}" src="${page.data}" alt="Complete Krohn 1912 printed page ${page.page}"></figure>`).join("\n")}
<h2>Credits</h2><p>Drawings and modern English: Copyright 2026 Anthony Mercer, PolyForm Noncommercial. Latin: F. Krohn, <i>Vitruvii De architectura libri decem</i>, Leipzig, 1912, public domain. The English has not had independent philological review. Greek and Latin vocabulary retains the dictionary notes above. EB Garamond by Georg Duffner and Octavio Pardo, with retained supplementary Noto subsets; SIL Open Font License 1.1.</p>
<details><summary>Code and content license</summary><pre>${esc(new TextDecoder().decode(codeLicense))}</pre></details><details><summary>Embedded font licenses</summary><pre>${esc(new TextDecoder().decode(mainLicense))}\n\n${esc(new TextDecoder().decode(extraLicense))}</pre></details>
</body></html>`;
}
