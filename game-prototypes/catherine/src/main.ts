import { Application } from "pixi.js";
import { mountDialogueScreen } from "./dialogueScreen.ts";

const app = new Application();

await app.init({
  background: "#1c1915",
  resizeTo: window,
  antialias: true,
});

const container = document.getElementById("pixi-container");
if (!container) {
  throw new Error("Missing #pixi-container");
}

container.appendChild(app.canvas);
await mountDialogueScreen(app);
