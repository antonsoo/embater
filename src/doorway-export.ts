import { dataUrl, verified } from "./assets";
import { DOOR_PLATES } from "./content/doorway-plates";
import { DOOR_PASSAGES, DOOR_TERMS } from "./content/doorway-reading";
import { CODE_LICENSE_HASH, FONT_LICENSE_HASH, PLAN_FONTS } from "./content/plan-fonts";
import {
  type DoorState,
  doorCsv,
  doorHash,
  doorJson,
  doorMeasurements,
  doorway,
  otherReading,
} from "./core/doorway";
import { DOOR_SVG_STYLE, doorCorner, doorNumber, doorPlate, savedDoorSvg } from "./draw/doorway";
import { esc } from "./ui/dom";

export const DOOR_ASSUMPTIONS = [
  "A reading of Vitruvius IV.6.1–3, not a reconstruction of a particular ancient doorway.",
  "The height comparison omits only Krohn’s second, supplied semis. Other editorial choices stay fixed.",
  "The opening contraction is subtracted once from the whole width, half from each side; the lower jamb supplies the unit.",
  "The shared endpoints 16, 25 and 30 feet belong to the lower contraction band on this desk. The text does not uniquely settle these endpoints.",
  "The Ionic jamb is H/14, as printed on Krohn p. 89. The Doric jamb uses that same value as a stated drawing assumption across Krohn’s lacuna.",
  "Jamb widths are measured horizontally on the face. The upper jamb retains 13/14 of the lower width. The lintel height equals the upper jamb width.",
  "The casing follows the computed rule. Solid blue is the learner’s trial, which can cross into that casing. Both main drawings share a scale; the corner enlargement uses the same scale on both axes.",
  "Mouldings, frieze, consoles, door leaves, wall depth, optical perception and structural performance are not modelled. Roman feet are used without a modern metric conversion.",
] as const;

export function doorTable(s: DoorState): string {
  return `<table class="door-table"><caption>Measurements for the selected reading</caption><thead><tr><th scope="col">Measure</th><th scope="col">Roman feet</th><th scope="col">Basis</th></tr></thead><tbody>${doorMeasurements(
    s,
  )
    .map(
      ([measure, feet, basis]) =>
        `<tr><th scope="row">${esc(measure)}</th><td>${doorNumber(feet)}</td><td>${esc(basis)}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

export function doorPassages(): string {
  return DOOR_PASSAGES.map(
    (p) =>
      `<article class="door-passage" id="door-passage-${p.id}"><h3>${esc(p.cite)} · ${p.id === "kinds" ? "Three doorway kinds" : p.id === "height" ? "A supplied half" : p.id === "width" ? "The lower opening" : p.id === "taper" ? "The opening’s contraction" : p.id === "jamb" ? "The casing’s own taper" : "The Ionic opening and casing"}</h3><p lang="la">${esc(p.latin)}</p><p>${esc(p.english)}</p><p class="muted">${esc(p.note)}</p><p class="door-cite">Krohn 1912, printed p. ${p.page}.</p></article>`,
  ).join("");
}

export function saveDoorFile(content: string, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function doorwayReading(
  s: DoorState,
  reopen: string,
  signal: AbortSignal,
): Promise<string> {
  const [plates, fonts, code, fontLicense] = await Promise.all([
    Promise.all(
      DOOR_PLATES.map(async (p) => ({
        ...p,
        data: dataUrl(
          await verified(`${import.meta.env.BASE_URL}${p.path}`, p.sha256, signal),
          "image/jpeg",
        ),
      })),
    ),
    Promise.all(
      PLAN_FONTS.map(async (f) => ({
        ...f,
        data: dataUrl(await verified(f.url, f.hash, signal), "font/woff2"),
      })),
    ),
    verified(`${import.meta.env.BASE_URL}LICENSE.txt`, CODE_LICENSE_HASH, signal),
    verified(`${import.meta.env.BASE_URL}FONT-LICENSE.txt`, FONT_LICENSE_HASH, signal),
  ]);
  signal.throwIfAborted();
  const encode = (text: string, mime: string) => dataUrl(new TextEncoder().encode(text), mime);
  const files = [
    ["Editable drawing (JSON)", "doorway.json", encode(doorJson(s), "application/json")],
    ["Measurements (CSV)", "doorway.csv", encode(doorCsv(s), "text/csv")],
    ["Selected drawing (SVG)", "doorway.svg", encode(savedDoorSvg(s), "image/svg+xml")],
    [
      "Source and font identities (JSON)",
      "doorway-sources.json",
      encode(
        JSON.stringify(
          {
            originalPdf: {
              url: "https://archive.org/download/vitruviidearchit00vitr_1/vitruviidearchit00vitr_1.pdf",
              sha256: "b13a68789a8a1dc567b6f9b47eabe6a37a306329fbfc2c1a027a6c30a90d5139",
              bytes: 16915191,
            },
            pages: DOOR_PLATES,
            fonts: PLAN_FONTS.map((f) => ({ sha256: f.hash, range: f.range })),
            licenses: { code: CODE_LICENSE_HASH, fonts: FONT_LICENSE_HASH },
          },
          null,
          2,
        ),
        "application/json",
      ),
    ],
  ];
  const m = doorway(s);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A half changes the doorway · Embater</title><style>
${fonts.map((f) => `@font-face{font-family:Reading;src:url(${f.data}) format('woff2');font-weight:400 700;unicode-range:${f.range}}`).join("")}
body{font:20px/1.5 Reading,Georgia,serif;max-width:62rem;margin:2rem auto;padding:0 1rem;color:#1f2328;background:#f8f9f5;overflow-wrap:anywhere}h1,h2,h3{font-weight:400;line-height:1.2}h1{font-size:2.1em}p,li{max-width:76ch}a{color:#1f4e9c}figure{margin:1rem 0}.pair{display:grid;grid-template-columns:1fr 1fr;max-width:45rem;margin:auto;gap:1rem}.corner{max-width:22rem}table{border-collapse:collapse;width:100%;font-size:.9em}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #c9cdc6;padding:.6rem}caption{text-align:left;font-size:1.3em;margin:1rem 0}.door-passage{margin:1.5rem 0;border-top:1px solid #c9cdc6}.door-passage [lang=la]{color:#b3321f}.muted{color:#4a5058}img{display:block;max-width:100%;height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px Reading,serif}.source{break-before:page}.source figcaption{margin:1rem 0}details{margin:1rem 0}${DOOR_SVG_STYLE}
@media(max-width:600px){body{font-size:18px}.pair{grid-template-columns:1fr;max-width:24rem}th,td{padding:.3rem;font-size:.9em}}
@media print{h1,h2,h3{break-after:avoid}p{orphans:3;widows:3}.door-passage{break-inside:avoid}body{font-size:11pt;background:white;margin:0}.pair{grid-template-columns:1fr 1fr;max-width:145mm}.corner{max-width:65mm}tr{break-inside:avoid}img{max-height:233mm;width:auto;margin:auto}.source{break-inside:avoid}details>*{display:block}summary{display:none}a{overflow-wrap:anywhere}.files{display:none}@page{size:A4;margin:14mm}}
</style></head><body><h1>A half changes the doorway</h1><p>Vitruvius’s doorway proportions, read with and without the supplied half. Ceiling ${doorNumber(s.ceiling)} Roman feet; ${s.kind === "doric" ? "Doric" : "Ionic"}; selected reading ${s.reading === "supplied" ? "with ⟨semis⟩ (5/7)" : "without ⟨semis⟩ (4/7)"}. Selected opening height ${doorNumber(m.height)} ft. ${esc(m.band)}.</p>
<div class="pair"><figure>${doorPlate(s, true)}<figcaption>Selected reading. Solid blue: your trial. Dashed red: computed rule.</figcaption></figure><figure>${doorPlate(otherReading(s), false)}<figcaption>The other height reading, with its own contraction band.</figcaption></figure></div><figure class="corner">${doorCorner(s)}</figure>
${doorTable(s)}<h2>Choices and limits</h2><ul>${DOOR_ASSUMPTIONS.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>Words in the drawing</h2>${DOOR_TERMS.map((t) => `<p><b lang="${t.id === "greek" ? "grc" : "la"}">${esc(t.id === "greek" ? "θύρωμα" : t.latin)}</b> · ${esc(t.title)}. ${esc(t.form)}. ${esc(t.text)} (${esc(t.cite)})</p>`).join("")}
<h2>Read the instructions</h2>${doorPassages()}
<h2>Keep working with the drawing</h2><p>This file includes both diagrams, the corner, measurements, Latin, new English translations, complete source pages, four font subsets and licenses. It uses no scripts and opens offline. External links need a connection.</p><p><a href="${esc(reopen.split("#")[0] + doorHash(s))}">Reopen these choices in Embater</a>.</p><ul class="files">${files.map(([label, name, url]) => `<li><a download="${name}" href="${url}">${label}</a></li>`).join("")}</ul>
${plates.map((p) => `<figure class="source"><figcaption>Vitruvius, <i>De architectura</i>, ed. F. Krohn (Teubner, 1912), complete printed p. ${p.page}, PDF page ${p.pdfPage}. Public domain. <a href="${p.url}">Original scan</a>. SHA-256 ${p.sha256}.</figcaption><img src="${p.data}" alt="Complete printed page ${p.page}, including the critical apparatus"></figure>`).join("")}
<h2>Credits and licenses</h2><p>Latin and source pages: F. Krohn’s 1912 Teubner edition, public domain; scans from Internet Archive item vitruviidearchit00vitr_1. Line-break hyphenation, capitalization and punctuation normalized. Angle brackets retain supplements; stars retain the marked lacuna. English translations and teaching model: © 2026 Anthony Mercer, MIT. These translations have not had independent philological review. Fonts: EB Garamond, SIL Open Font License.</p><section class="door-license"><h3>Code and teaching material license</h3><pre>${esc(new TextDecoder().decode(code))}</pre></section><section class="door-license"><h3>Complete font notices and license</h3><pre>${esc(new TextDecoder().decode(fontLicense))}</pre></section></body></html>`;
}
