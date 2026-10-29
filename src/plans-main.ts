import "./fonts/fonts.css";
import "./style.css";
import { footer, masthead, setupTheme } from "./ui/dom";
import { mountPlans } from "./ui/plans";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `${masthead("plans")}<main id="main"></main>${footer()}`;
  setupTheme();
  const main = app.querySelector<HTMLElement>("#main");
  if (main) mountPlans(main);
}
