import {
  MEASURE_RULES,
  type MeasureChoice,
  measuredDoor,
  measureRows,
} from "../core/measured-doorway";
import { doorNumber } from "../draw/doorway";
import { measuredSvg } from "../draw/measured-doorway";
import { esc } from "./dom";

export const MEASURE_LIMITS = [
  "The 1927 volume reports what it identifies as the original opening. Its pp. 98–99 explicitly leave later inner linings aside. These are not measurements of today’s clear opening.",
  "The main reported dimensions are 4.882 m high and 2.427 m wide at the bottom; the inward movement of each jamb is reported as 0.044 m on p. 99. The derived upper width is 2.427 − 2 × 0.044 = 2.339 m.",
  "Straight lines join the reported endpoints in the drawing. No moulding profile, casing width, leaf, lintel thickness or wall depth is inferred.",
  "Only the dimensionless lower-width relation is compared. Matching the reported height leaves a lower-width difference; matching the lower width leaves a height difference. Neither the lost ceiling height nor the opening’s age follows from this fit.",
  "The Vitruvian upper-width contraction bands are not applied to these metric data. The survey and ancient text have different units; no length for a Roman foot is assumed.",
  "The exact double square is a comparison to the survey’s word ‘essentially’. Printed dimensions are retained rather than adjusted to force equality. Extra decimal places in calculated outputs do not improve the survey’s precision.",
] as const;

export function measureTable(choice: MeasureChoice): string {
  const m = measuredDoor(choice);
  return `<table class="door-table"><caption>Reported and calculated values · metres</caption><thead><tr><th scope="col">Measure</th><th scope="col">Metres</th><th scope="col">Basis</th></tr></thead><tbody>${measureRows(
    choice,
  )
    .map(
      ([label, value, basis]) =>
        `<tr><th scope="row">${esc(label)}</th><td>${doorNumber(value)}</td><td>${esc(basis)}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table><p>Reported lower width ÷ height = ${doorNumber(m.ratio)}. Selected rule = ${m.rule.numerator}/${m.rule.denominator} = ${doorNumber(m.predictedRatio)}.</p>`;
}

export function measureResult(choice: MeasureChoice): string {
  const m = measuredDoor(choice),
    error = choice.fit === "height" ? m.widthError : m.heightError;
  return `<h3>${esc(m.rule.label)}, ${choice.fit === "height" ? "height" : "lower width"} matched</h3><p>The other dimension is <b>${doorNumber(Math.abs(error) * 1000)} mm ${choice.fit === "height" ? (error > 0 ? "wider" : "narrower") : error > 0 ? "taller" : "shorter"}</b> than the reported opening.</p><p>${choice.fit === "height" ? `At 4.882 m high, the rule gives ${doorNumber(m.predictedWidth)} m at the foot; the report gives 2.427 m.` : `At 2.427 m wide below, the rule gives ${doorNumber(m.predictedHeight)} m high; the report gives 4.882 m.`}</p>`;
}

export function measureReading(choice: MeasureChoice): string {
  return `<section class="measured-reading"><h2>Almost a double square</h2><p>The North Door of the Erechtheion, as reported by the survey published in <i>The Erechtheum</i> (1927), pp. 98–99. This comparison keeps the survey’s original-opening interpretation and its omitted later linings visible.</p><figure class="metric-drawing">${measuredSvg(choice)}</figure>${measureResult(choice)}${measureTable(choice)}<h3>What the comparison assumes</h3><ul>${MEASURE_LIMITS.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></section>`;
}

export function measureControls(choice: MeasureChoice): string {
  return `<fieldset class="seg"><legend>Lower-width relation</legend><div class="seg-row">${Object.entries(
    MEASURE_RULES,
  )
    .map(
      ([id, rule]) =>
        `<label><input type="radio" name="measure-rule" value="${id}"${choice.rule === id ? " checked" : ""}><span>${esc(rule.label)}</span></label>`,
    )
    .join(
      "",
    )}</div></fieldset><fieldset class="seg"><legend>Match one reported dimension</legend><div class="seg-row"><label><input type="radio" name="measure-fit" value="height"${choice.fit === "height" ? " checked" : ""}><span>Match height</span></label><label><input type="radio" name="measure-fit" value="width"${choice.fit === "width" ? " checked" : ""}><span>Match lower width</span></label></div></fieldset>`;
}
