import "./fonts/fonts.css";
import "./style.css";
import "./vocabulary-source.css";
import "./drill.css";
import { footer, masthead, setupTheme } from "./ui/dom";
import { mountDrill } from "./ui/drill";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `${masthead("drill")}<main id="main"></main>${footer()}`;
  setupTheme();
  const main = app.querySelector<HTMLElement>("#main");
  if (main) mountDrill(main);
}
