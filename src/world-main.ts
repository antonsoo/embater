import "./fonts/fonts.css";
import "./style.css";
import "./vocabulary-source.css";
import { footer, masthead, setupTheme } from "./ui/dom";
import { mountWorld } from "./ui/world";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `${masthead("world")}<main id="main"></main>${footer()}`;
  setupTheme();
  const main = app.querySelector<HTMLElement>("#main");
  if (main) mountWorld(main);
}
