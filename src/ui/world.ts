import { PLATES } from "../content/world";
import { renderElevation } from "../draw/render";
import { WORLD_DRAWINGS } from "../draw/world";
import { termCard } from "./card";
import { $, esc } from "./dom";

export function mountWorld(root: HTMLElement): void {
  const fromHash = new URLSearchParams(location.hash.slice(1)).get("plate");
  let current = PLATES.find((p) => p.id === fromHash) ?? PLATES[0];
  let part: string | null = null;

  root.innerHTML = `
<section class="lede">
  <h1>Other ancient builders, in their own words</h1>
  <p>Six traditions beyond the Greek temple, each with a drawing and the names its builders used. These plates are schematic: unlike the Greek orders, they are not computed from an ancient rulebook, and grey marks what is reconstructed.</p>
</section>
<section class="bench">
  <form class="controls" aria-label="Tradition"><fieldset class="seg"><legend>Tradition</legend><div class="seg-row">${PLATES.map(
    (p) =>
      `<label><input type="radio" name="plate" value="${p.id}"${p === current ? " checked" : ""}><span>${esc(p.place.split(",")[0] ?? p.id)}</span></label>`,
  ).join("")}</div></fieldset></form>
  <div class="plate-wrap"><figure class="plate world-plate" id="world-plate"></figure>
  <p class="legend"><span class="ink-text">Black</span>: schematic, after the surviving buildings and models. <span class="ink-chosen">Grey</span>: reconstructed or uncertain.</p></div>
  <aside class="side"><div class="card" id="world-card"></div><div class="key"><h2>Parts and words</h2><ul id="world-key"></ul></div></aside>
</section>
<section class="below world-below"><div class="derivation" id="world-text"></div><div class="facts" id="world-words"></div></section>`;

  const plateEl = $("#world-plate", root);
  const card = $("#world-card", root);
  const key = $("#world-key", root);

  function select(id: string | null): void {
    if (!current) return;
    part = id;
    for (const el of plateEl.querySelectorAll(".sel")) el.classList.remove("sel");
    for (const el of key.querySelectorAll("[aria-pressed]"))
      el.setAttribute("aria-pressed", "false");
    const t = current.terms.find((x) => x.id === id);
    if (id && t) {
      for (const el of plateEl.querySelectorAll(`[data-part="${CSS.escape(id)}"]`))
        el.classList.add("sel");
      key.querySelector(`[data-part="${CSS.escape(id)}"]`)?.setAttribute("aria-pressed", "true");
      card.innerHTML = termCard(t, { rules: false });
    } else {
      card.innerHTML = `<article class="card-body"><h2 class="card-title">${esc(current.title)}</h2><p class="card-count">${esc(current.place)}</p><p class="card-note">${esc(current.lede)}</p><p class="card-hint">Select a part of the drawing, or a name below.</p></article>`;
    }
  }

  function draw(): void {
    if (!current) return;
    const make = WORLD_DRAWINGS[current.id];
    if (make)
      plateEl.innerHTML = renderElevation(make(), {
        id: current.id,
        title: `${current.title}: ${current.place}`,
        dims: false,
        margin: 0.8,
      });
    key.innerHTML = current.terms
      .map((t) => {
        const native = t.words[0];
        return `<li><button type="button" data-part="${t.id}" aria-pressed="false"><span class="key-en">${esc(t.english)}</span>${native ? ` <span class="key-native" lang="${native.lang}">${esc(native.word)}</span>` : ""}</button></li>`;
      })
      .join("");
    const quote = current.terms.find((t) => t.quote)?.quote;
    $("#world-text", root).innerHTML =
      `<h2>${esc(current.title)}</h2><p class="muted">${esc(current.place)}</p>${current.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}${
        quote
          ? `<blockquote class="quote"><p lang="${quote.lang}">${esc(quote.text)}</p><p class="quote-en">${esc(quote.translation)}</p><cite>${esc(quote.cite)}</cite></blockquote>`
          : ""
      }<h3>Sources</h3><ul class="sources">${current.sources.map((s) => `<li><a href="${esc(s.url)}">${esc(s.label)}</a></li>`).join("")}</ul>`;
    $("#world-words", root).innerHTML = current.words?.length
      ? `<h2 class="words-title">More words</h2><dl>${current.words
          .map(
            (w) =>
              `<div><dt>${esc(w.english)}</dt><dd><span lang="${w.word.lang}">${esc(w.word.word)}</span>${w.word.romanized ? ` <i>${esc(w.word.romanized)}</i>` : ""}: ${esc(w.word.literal)} <span class="muted">(${esc(w.word.source)})</span></dd></div>`,
          )
          .join("")}</dl>`
      : "";
    select(null);
    history.replaceState(null, "", `#plate=${current.id}`);
  }

  draw();
  root.querySelector("form")?.addEventListener("input", (e) => {
    current = PLATES.find((p) => p.id === (e.target as HTMLInputElement).value) ?? current;
    draw();
  });
  plateEl.addEventListener("click", (e) => {
    const id = (e.target as Element).closest("[data-part]")?.getAttribute("data-part") ?? null;
    if (id && current?.terms.some((t) => t.id === id)) select(id === part ? null : id);
  });
  key.addEventListener("click", (e) => {
    const id = (e.target as Element).closest("button")?.dataset.part;
    if (id) select(id === part ? null : id);
  });
}
