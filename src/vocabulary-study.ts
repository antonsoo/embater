import { dataUrl, verified } from "./assets";
import { CODE_LICENSE_HASH, FONT_LICENSE_HASH } from "./content/plan-fonts";
import type { Lang, Term } from "./content/terms";
import { VOCABULARY_CONTEXTS } from "./content/vocabulary-contexts";
import { VOCABULARY_FONT_LICENSE_HASH, VOCABULARY_FONTS } from "./content/vocabulary-fonts";
import { settingsHash } from "./core/drill";
import type { Deck } from "./core/drill-decks";
import { type DetailPose, detailWindow } from "./core/drill-detail";
import { RULES } from "./core/rules";
import { renderElevation } from "./draw/render";
import { LANG_NAMES, termCard } from "./ui/card";
import { esc } from "./ui/dom";
import { platesForRule } from "./ui/vocabulary-source";

export interface VocabularyStudy {
  deck: Deck;
  language: Lang;
  term: Term;
  pose: DetailPose;
}

const SVG_STYLE = `.plate-svg{display:block;width:100%;height:auto}.pc{vector-effect:non-scaling-stroke;stroke-linejoin:round}.solid{fill:#f8f9f5;stroke:#1f2328;stroke-width:.9px}.solid.chosen,.ornament{stroke:#8b9199}.ornament{fill:#f8f9f5;stroke-width:.8px}.groove{fill:#2a2f36;stroke:none}.groove.chosen{fill:#8b9199}.shade{fill:var(--hatch);stroke:none}.hatch-line{stroke:#1f2328;opacity:.38}.line{fill:none;stroke:#1f2328;stroke-width:.55px;opacity:.75}.line.chosen{stroke:#8b9199}.sel.solid,.sel.ornament,.sel.groove{fill:#4770a9;stroke:#1f4e9c}.sel.line{stroke:#1f4e9c;stroke-width:1.6px;opacity:1}.sel.shade{fill:#4770a9}`;

function selectedSvg(study: VocabularyStudy, detail: boolean): string {
  const view = detail
    ? detailWindow(study.deck.elevation, study.deck.view, study.term.id, study.pose)
    : study.deck.view;
  return renderElevation(study.deck.elevation, {
    id: detail ? "saved-detail" : "saved-plate",
    title: `${study.deck.label}: ${study.term.english}${detail ? ", local crop" : ", whole plate"}`,
    view,
    dims: false,
    margin: detail ? 0 : 0.4,
  }).replace(/class="(pc [^"]*)" data-part="([^"]+)"/g, (full, classes: string, part: string) =>
    part === study.term.id ? `class="${classes} sel" data-part="${part}"` : full,
  );
}

function vocabularyCsv(study: VocabularyStudy): string {
  const rows = [
    ["English part", "Language", "Stored name", "Reading aid", "Literal sense", "Source"],
  ];
  for (const term of study.deck.terms) {
    const word = term.words.find((entry) => entry.lang === study.language);
    if (word)
      rows.push([
        term.english,
        LANG_NAMES[word.lang],
        word.word,
        word.romanized ?? "",
        word.literal,
        word.source,
      ]);
  }
  return `${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n")}\r\n`;
}

/** Retains actual source/font/license bytes; no scripts or automatic remote resources. */
export async function vocabularyStudy(
  study: VocabularyStudy,
  signal: AbortSignal,
): Promise<string> {
  const contextRule = VOCABULARY_CONTEXTS[study.term.id]?.rule;
  const rules = [
    ...new Set([...(study.term.rules ?? []), ...(contextRule ? [contextRule] : [])]),
  ].flatMap((id) => {
    const rule = RULES.get(id);
    return rule ? [rule] : [];
  });
  const pages = [
    ...new Map(rules.flatMap(platesForRule).map((page) => [page.page, page])).values(),
  ].sort((a, b) => a.page - b.page);
  const [images, fonts, fontLicense, codeLicense, supplementaryLicense] = await Promise.all([
    Promise.all(
      pages.map(async (page) => ({
        ...page,
        data: dataUrl(
          await verified(`${import.meta.env.BASE_URL}${page.path}`, page.sha256, signal),
          "image/jpeg",
        ),
      })),
    ),
    Promise.all(
      VOCABULARY_FONTS.map(async (font) => ({
        ...font,
        data: dataUrl(await verified(font.url, font.hash, signal), "font/woff2"),
      })),
    ),
    verified(`${import.meta.env.BASE_URL}FONT-LICENSE.txt`, FONT_LICENSE_HASH, signal),
    verified(`${import.meta.env.BASE_URL}LICENSE.txt`, CODE_LICENSE_HASH, signal),
    verified(
      `${import.meta.env.BASE_URL}fonts/VOCABULARY-OFL.txt`,
      VOCABULARY_FONT_LICENSE_HASH,
      signal,
    ),
  ]);
  signal.throwIfAborted();
  const card = termCard(study.term, { live: false })
    .replaceAll('<details class="rule">', '<section class="rule">')
    .replaceAll("</details>", "</section>")
    .replaceAll("<summary>", "<h3>")
    .replaceAll("</summary>", "</h3>");
  const reopen = `https://antonsoo.github.io/embater/drill.html${settingsHash({ deck: study.deck, language: study.language, mode: "study", romanized: true, part: study.term.id })}`;
  const csv = dataUrl(new TextEncoder().encode(vocabularyCsv(study)), "text/csv;charset=utf-8");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(study.term.english)} · Embater illustrated study</title><style>
${fonts.map((font) => `@font-face{font-family:Reading;src:url(${font.data}) format('woff2');font-weight:400 700;unicode-range:${font.range}}`).join("")}
[lang="la"]{font-feature-settings:"locl" 0;font-language-override:"ENG"}body{font:20px/1.55 Reading,Georgia,serif;color:#1f2328;background:#f8f9f5;max-width:65rem;margin:2rem auto;padding:0 1rem}h1,h2,h3{font-weight:400;line-height:1.25}h1,a{color:#1f4e9c}figure{margin:1.2rem 0}figcaption{font-size:.9em;margin:.6rem 0}img{display:block;max-width:100%;height:auto}.plates{display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:center}.whole{max-width:25rem;margin:auto}.word-head{font-size:1.3em;margin-bottom:0}.word-literal{margin-top:.2rem}.word-source,.rule-page{font-size:.85em}.word-context{padding:.8rem 0;border-block:1px solid #c9cdc6}.word-context mark{color:#1f4e9c;background:transparent;border-bottom:1px solid #1f4e9c}.context-phrase{font-size:1.25em}.rule{border-top:1px solid #c9cdc6;margin-top:1.4rem}.rule-reading{padding:.7rem;border:1px solid #c9cdc6}.quote{border-left:2px solid #1f4e9c;padding-left:1rem;margin-left:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.75em}.source{break-before:page}${SVG_STYLE}
@media(max-width:600px){body{font-size:18px}.plates{grid-template-columns:1fr}.whole{max-width:20rem}}@media print{h1,h2,h3{break-after:avoid}body{font-size:11pt;margin:0;background:white}.plates{gap:1rem}.whole{max-width:70mm}.source img{max-height:235mm;width:auto;margin:auto}.source figcaption{margin-bottom:4mm}.rule,.word{break-inside:avoid}@page{size:A4;margin:15mm}}
</style></head><body><h1>${esc(study.term.english)}</h1><p>${esc(study.deck.label)} · ${LANG_NAMES[study.language]} study. Blue identifies the selected part.</p>
<div class="plates"><figure class="whole">${selectedSvg(study, false)}<figcaption>Whole plate. Geometry and grey drawing choices are those of the workshop.</figcaption></figure><figure>${selectedSvg(study, true)}<figcaption>Local crop at ${study.pose.zoom}× its initial local zoom. This enlarges the same geometry and can show only a portion of a long feature; no carving detail is added.</figcaption></figure></div>
${card}<p><a href="${csv}" download="embater-${study.deck.id}-${study.language}-vocabulary.csv">Download this deck’s ${LANG_NAMES[study.language]} vocabulary CSV</a> · <a href="${esc(reopen)}">Reopen this selected study in Embater</a></p>
<p>This file includes its drawings, fonts, licenses${images.length ? ` and ${images.length} complete printed source ${images.length === 1 ? "page" : "pages"}` : ""}. It opens without scripts or a connection. External source links need a connection. It contains no practice scores.</p>
${images.map((page) => `<figure class="source"><figcaption>F. Krohn’s 1912 Teubner Vitruvius, complete printed page ${page.page}, including the critical apparatus. Public domain. <a href="${page.url}">Original scan</a>.</figcaption><img src="${page.data}" alt="Complete Krohn 1912 printed page ${page.page}"></figure>`).join("")}
<h2>Reading and model boundaries</h2><p>The diagrams are modern schematic illustrations, not surveys or recovered ancient drawings. Enlarge the geometry without treating its chosen ornament as measured evidence. Latin excerpts retain marked omissions and editorial supplements, with case and punctuation normalized. The complete source pages preserve the edition and apparatus. English and instructional explanations are modern and have not had independent philological review. Source notes preserve the existing entries’ differing evidence; they do not establish every etymology or an ancient pronunciation.</p>
<p>Original code, drawings and English: © 2026 Anthony Mercer, MIT. Source editions retain the credits above and within the word notes. EB Garamond by Georg Duffner and Octavio Pardo; additional glyphs use retained Noto font subsets. Font credits and SIL Open Font License 1.1 notices are included below.</p><details><summary>Code and content license</summary><pre>${esc(new TextDecoder().decode(codeLicense))}</pre></details><details><summary>Embedded font license</summary><pre>${esc(new TextDecoder().decode(fontLicense))}

${esc(new TextDecoder().decode(supplementaryLicense))}</pre></details></body></html>`;
}
