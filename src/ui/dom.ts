export function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function $(selector: string, root: ParentNode = document): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`Missing ${selector}`);
  return el;
}

export type Page = "orders" | "plans" | "world" | "drill";

const PAGES: [Page, string, string][] = [
  ["orders", "./", "Orders"],
  ["plans", "./plans.html", "Plans"],
  ["world", "./world.html", "World"],
  ["drill", "./drill.html", "Drill"],
];

export function masthead(current: Page): string {
  const links = PAGES.map(
    ([page, href, label]) =>
      `<a href="${href}"${page === current ? ' aria-current="page"' : ""}>${label}</a>`,
  ).join("");
  return `<header class="mast">
  <a class="brand" href="./"><span class="brand-greek" lang="grc">ἐμβατήρ</span><span class="brand-name">Embater</span></a>
  <nav class="pages" aria-label="Sections">${links}</nav>
  <button class="theme" type="button" aria-label="Switch between light and dark">
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>
  </button>
</header>`;
}

export function footer(): string {
  return `<footer class="foot">
  <p>Latin from F. Krohn's Teubner Vitruvius (1912); Greek senses from LSJ and Latin from Lewis &amp; Short, via Logeion; temple measurements from the Perseus Digital Library. English translations are new. <a href="https://github.com/antonsoo/embater">Source and notes</a>.</p>
</footer>`;
}

const THEME_KEY = "embater-theme";

export function setupTheme(): void {
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  } catch {
    // Storage can be unavailable; the system preference still applies.
  }
  document.querySelector(".theme")?.addEventListener("click", () => {
    const dark =
      root.dataset.theme === "dark" ||
      (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, root.dataset.theme);
    } catch {
      // Ignore: the choice still holds for this page view.
    }
  });
}
