import "./fonts/fonts.css";
import "./style.css";
import "./compare.css";
import { mountComparison } from "./ui/compare";
import { footer, masthead, setupTheme } from "./ui/dom";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `${masthead("compare")}<main id="main"></main>${footer()}`;
  setupTheme();
  const main = app.querySelector<HTMLElement>("#main");
  if (main) mountComparison(main);
}
