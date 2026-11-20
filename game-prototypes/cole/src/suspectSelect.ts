/* eslint-disable prettier/prettier */
import { Application, Assets, Graphics, Rectangle, Sprite, Text } from "pixi.js";
import { startGameScreen } from "./game.ts";

function makeSprite(
  spr: Sprite,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  spr.position.set(x, y);
  spr.width = width;
  spr.height = height;
}

function createText(
  app: Application,
  content: string,
  fontName: string,
  size: number,
  x: number,
  y: number,
  width: number,
  fill: string = "#000000",
): Text {
  const text = new Text({
    text: content,
    style: {
      fontSize: size,
      fill: fill,
      fontFamily: fontName,
      wordWrap: true,
      wordWrapWidth: width,
      align: "center",
    },
  });
  text.anchor.set(0.5);
  text.position.set(x, y);
  app.stage.addChild(text);
  return text;
}

export async function startSuspectSelectScreen(
  app: Application,
  onMainMenu: () => void,
): Promise<void> {
  const width = app.screen.width;
  const height = app.screen.height;
  const backgroundTexture = await Assets.load("/assets/suspects-background.png");
  const [suspectTextures, buttonTexture] = await Promise.all([
    Promise.all([
      Assets.load("/assets/suspect-1.png"),
      Assets.load("/assets/suspect-2.png"),
      Assets.load("/assets/suspect-3.png"),
    ]),
    Assets.load("/assets/textbox2.png"),
  ]);
  let menuOpen = false;

  const background = new Sprite(backgroundTexture);
  makeSprite(background, 0, 0, width, height);
  background.eventMode = "none";
  app.stage.addChild(background);

  createText(
    app,
    "Choose a suspect to talk to",
    "PixelFont",
    28,
    width / 2,
    height * 0.1,
    width * 0.8,
    "#000000",
  );

  const margin = width * 0.06;
  const gap = width * 0.05;
  const slotWidth = (width - margin * 2 - gap * 2) / 3;
  const maxPortraitHeight = height * 0.7;
  const bottom = height * 0.94;

  suspectTextures.forEach((texture, index) => {
    const portrait = new Sprite(texture);
    const scale = Math.min(slotWidth / texture.width, maxPortraitHeight / texture.height);
    const portraitWidth = texture.width * scale;
    const portraitHeight = texture.height * scale;
    const slotX = margin + index * (slotWidth + gap);
    makeSprite(
      portrait,
      slotX + (slotWidth - portraitWidth) / 2,
      bottom - portraitHeight,
      portraitWidth,
      portraitHeight,
    );
    portrait.eventMode = "static";
    portrait.cursor = "pointer";
    portrait.addEventListener("pointerdown", () => {
      if (menuOpen) return;
      window.removeEventListener("keydown", handleKeyDown);
      app.stage.removeChildren();
      void startGameScreen(app, () => {
        void startSuspectSelectScreen(app, onMainMenu);
      });
    });
    app.stage.addChild(portrait);
  });

  const overlay = new Graphics();
  overlay.rect(0, 0, width, height);
  overlay.fill("#000000");
  overlay.alpha = 0.5;
  overlay.eventMode = "static";
  overlay.hitArea = new Rectangle(0, 0, width, height);
  overlay.visible = false;
  app.stage.addChild(overlay);

  const menuButtons = ["Resume", "Help", "Settings", "Main Menu"].map(
    (label, index) => {
      const button = new Sprite(buttonTexture);
      makeSprite(button, 0.25 * width, (0.125 + index * 0.2) * height, 0.5 * width, 0.15 * height);
      button.eventMode = "static";
      button.cursor = "pointer";
      button.visible = false;
      app.stage.addChild(button);

      const text = createText(
        app,
        label,
        "PixelFont",
        24,
        width / 2,
        (0.185 + index * 0.2) * height,
        0.7 * width,
      );
      text.visible = false;
      return { button, text };
    },
  );

  function toggleMenu() {
    menuOpen = !menuOpen;
    overlay.visible = menuOpen;
    menuButtons.forEach(({ button, text }) => {
      button.visible = menuOpen;
      text.visible = menuOpen;
    });
    menuButtons[1].text.text = "Help";
    menuButtons[2].text.text = "Settings";
    menuButtons[3].text.text = "Main Menu";
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") toggleMenu();
  };
  window.addEventListener("keydown", handleKeyDown);

  menuButtons[0]?.button.addEventListener("pointerdown", () => {
    if (menuOpen) toggleMenu();
  });
  menuButtons[1]?.button.addEventListener("pointerdown", () => {
    if (menuOpen) menuButtons[1].text.text = "No help here!";
  });
  menuButtons[2]?.button.addEventListener("pointerdown", () => {
    if (menuOpen) menuButtons[2].text.text = "Still not made";
  });
  menuButtons[3]?.button.addEventListener("pointerdown", () => {
    if (!menuOpen) return;
    window.removeEventListener("keydown", handleKeyDown);
    app.stage.removeChildren();
    onMainMenu();
  });
}
