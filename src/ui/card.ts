import type { Lang, Term } from "../content/terms";
import { VOCABULARY_CONTEXTS } from "../content/vocabulary-contexts";
import { RULES } from "../core/rules";
import { esc } from "./dom";

export const LANG_NAMES: Record<Lang, string> = {
  grc: "Greek",
  la: "Latin",
  egy: "Egyptian",
  akk: "Akkadian",
  sux: "Sumerian",
  sa: "Sanskrit",
  pra: "Prakrit",
  zh: "Chinese",
  nah: "Nahuatl",
  peo: "Old Persian",
  en: "English",
};

/** The card for one part: its names, what they meant, the note, and Vitruvius's own words. */
export function termCard(
  term: Term,
  options: { rules?: boolean; sourceActions?: boolean; live?: boolean } = {},
): string {
  const words = term.words
    .map(
      (w) => `<div class="word">
  <p class="word-head"><span class="word-native" lang="${w.lang}">${esc(w.word)}</span>${
    w.romanized ? ` <span class="word-rom">${esc(w.romanized)}</span>` : ""
  } <span class="word-lang">${LANG_NAMES[w.lang]}</span></p>
  <p class="word-literal">${esc(w.literal)}</p>
  <p class="word-source">${esc(w.source)}</p>
</div>`,
    )
    .join("");
  const context = VOCABULARY_CONTEXTS[term.id];
  const contextRule = context ? RULES.get(context.rule) : undefined;
  const contextHtml =
    context && contextRule
      ? `<section class="word-context"><h3>Read the word in a phrase</h3><p lang="la" class="context-phrase">${esc(context.before)}<mark>${esc(context.form)}</mark>${esc(context.after)}</p><p>${esc(context.translation)}</p><p>${esc(context.explanation)}</p><p class="word-source">From Vitruvius ${esc(contextRule.cite)}, Krohn 1912, ${contextRule.pageEnd ? `pp. ${contextRule.page}–${contextRule.pageEnd}` : `p. ${contextRule.page}`}. Reading note and English are modern.</p>${options.sourceActions ? `<button type="button" class="read-source" data-source-rule="${contextRule.id}">Check this phrase on printed page ${contextRule.page}</button>` : ""}</section>`
      : "";
  const quote = term.quote
    ? `<blockquote class="quote"><p lang="${term.quote.lang}">${esc(term.quote.text)}</p><p class="quote-en">${esc(term.quote.translation)}</p><cite>${esc(term.quote.cite)}</cite></blockquote>`
    : "";
  const rules =
    options.rules === false
      ? ""
      : (term.rules ?? [])
          .map((id) => RULES.get(id))
          .filter((r) => r !== undefined)
          .map(
            (r) => `<details class="rule"><summary>Vitruvius ${esc(r.cite)}</summary>
<p class="rule-la" lang="la">${esc(r.latin)}</p><p class="rule-en">${esc(r.english)}</p><p class="rule-page">Krohn 1912, ${r.pageEnd ? `pp. ${r.page}–${r.pageEnd}` : `p. ${r.page}`}</p>${r.reading ? `<p class="rule-reading">Krohn prints ${esc(r.reading.printed)}; manuscript reading: ${esc(r.reading.manuscripts)}. ${esc(r.reading.note)}</p>` : ""}${options.sourceActions ? `<button type="button" class="read-source" data-source-rule="${r.id}">Read complete printed ${r.pageEnd ? `pages ${r.page}–${r.pageEnd}` : `page ${r.page}`}</button>` : ""}</details>`,
          )
          .join("");
  const deeper = term.deeper
    ? `<p class="deeper"><a href="${esc(term.deeper.url)}">${esc(term.deeper.label)}</a></p>`
    : "";
  return `<article class="card-body"${options.live === false ? "" : ' aria-live="polite"'}>
<h2 class="card-title">${esc(term.english)}</h2>
${words}${contextHtml}
<p class="card-note">${esc(term.note)}</p>
${quote}${rules}${deeper}
</article>`;
}
