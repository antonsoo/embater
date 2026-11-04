import { dataUrl, verified } from "./assets";
import { CODE_LICENSE_HASH, FONT_LICENSE_HASH, PLAN_FONTS } from "./content/plan-fonts";
import { PLAN_PLATES } from "./content/plan-plates";
import { esc } from "./ui/dom";

/** Retain real source and licensed fonts; an incomplete save never becomes a reading. */
export async function countStudyAssets(
  signal: AbortSignal,
): Promise<{ style: string; source: string; licenses: string }> {
  const page = PLAN_PLATES.find((p) => p.page === 69);
  if (!page) throw new Error("The complete count-rule source page is missing.");
  const [scan, fonts, fontLicense, codeLicense] = await Promise.all([
    verified(`${import.meta.env.BASE_URL}${page.path}`, page.sha256, signal),
    Promise.all(
      PLAN_FONTS.map(async (font) => ({
        ...font,
        bytes: await verified(font.url, font.hash, signal),
      })),
    ),
    verified(`${import.meta.env.BASE_URL}FONT-LICENSE.txt`, FONT_LICENSE_HASH, signal),
    verified(`${import.meta.env.BASE_URL}LICENSE.txt`, CODE_LICENSE_HASH, signal),
  ]);
  signal.throwIfAborted();
  return {
    style: `${fonts.map((font) => `@font-face{font-family:CountReading;src:url(${dataUrl(font.bytes, "font/woff2")}) format('woff2');font-weight:400 700;unicode-range:${font.range}}`).join("\n")}body,svg text{font-family:CountReading,Georgia,serif}[lang="la"]{font-feature-settings:"locl" 0;font-language-override:"ENG"}.measure-table{border-collapse:collapse;width:100%;font-size:.9em}.measure-table th,.measure-table td{border-bottom:1px solid #aaa;padding:.5em;text-align:right}.measure-table th:first-child{text-align:left}.measure-selected{color:#1f4e9c}.trial-figure{max-width:28rem;margin:auto}.source{break-before:page}.source img{max-width:100%;height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.8em}@media print{.source img{max-height:240mm;width:auto;display:block;margin:auto}.trial-figure{max-width:105mm}h2{break-after:avoid}.measure-table{font-size:10pt}}`,
    source: `<figure class="source"><figcaption>Complete printed page 69, including the apparatus. F. Krohn, <i>Vitruvii De architectura libri decem</i>, Leipzig, 1912. Public domain. <a href="${page.url}">Original archive image</a>. The excerpt is in lines 3–9; the page also contains other sections.</figcaption><img data-source-page="69" src="${dataUrl(scan, "image/jpeg")}" alt="Complete printed page 69 of Krohn’s 1912 Vitruvius, including the doubled-space rule"></figure>`,
    licenses: `<details><summary>Original code, diagrams and English: PolyForm Noncommercial 1.0.0</summary><pre>${esc(new TextDecoder().decode(codeLicense))}</pre></details><details><summary>Embedded EB Garamond: SIL Open Font License 1.1</summary><pre>${esc(new TextDecoder().decode(fontLicense))}</pre></details>`,
  };
}
