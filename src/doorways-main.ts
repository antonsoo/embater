import "./fonts/fonts.css";
import "./style.css";
import "./doorways.css";
import { footer, masthead, setupTheme } from "./ui/dom";
import { mountDoorways } from "./ui/doorways";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `${masthead("doorways")}<main id="main"></main>${footer()}`;
  setupTheme();
  const main = app.querySelector<HTMLElement>("#main");
  if (main) mountDoorways(main);
}
