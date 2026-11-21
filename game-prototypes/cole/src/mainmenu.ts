/* eslint-disable prettier/prettier */
import { Container, Text, Application, Assets, Sprite } from "pixi.js";

function makeSprite(
  spr: Sprite,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  spr.anchor.set(0.5);
  spr.position.set(x + width / 2, y + height / 2);
  spr.width = width;
  spr.height = height;
}

function createText(
  parent: Container | Application,
  content: string,
  fontName: string,
  size: number,
  x: number,
  y: number,
  width: number,
  fill: string = "#000000",
): Text {
  const txt = new Text({
    text: content,
    style: {
      fontSize: size,
      fill: fill,
      fontFamily: fontName,
      wordWrap: true,
      wordWrapWidth: width,
    },
  });
  txt.anchor.set(0.5);
  txt.position.set(x, y);
  
  if ("stage" in parent) {
    parent.stage.addChild(txt);
  } else {
    parent.addChild(txt);
  }
  return txt;
}

function createDialogue(
  parent: Container | Application,
  content: string[],
  index: number,
  fontName: string,
  size: number,
  x: number,
  y: number,
  width: number,
  fill: string = "#000000",
): Text {
  const txt = new Text({
    text: content[index],
    style: {
      fontSize: size,
      fill: fill,
      fontFamily: fontName,
      wordWrap: true,
      wordWrapWidth: width,
    },
  });
  txt.anchor.set(0.5);
  txt.position.set(x, y);
  if ("stage" in parent) {
    parent.stage.addChild(txt);
  } else {
    parent.addChild(txt);
  }
  return txt;
}

function setText(
  text: Text,
  content: string,
  x: number
): Text {
  text.text = content;
  text.x = x;
  return text;
}

export async function createMainMenu(app: Application, onStartClicked: () => void): Promise<Container> {
  const menuContainer = new Container();
  const WIDTH = app.screen.width;
  const HEIGHT = app.screen.height;

  const t_textbox1 = await Assets.load("/assets/textbox2.png");
  
  // TITLE TEXT
  createText(menuContainer, "Main Menu", "PixelFont", 48, WIDTH / 2, HEIGHT / 4, WIDTH, "#ffffff");

  // START BUTTON SPRITE & TEXT
  const buttonSprite = new Sprite(t_textbox1);
  makeSprite(buttonSprite, WIDTH / 2 - WIDTH / 8, HEIGHT / 2 - HEIGHT / 12, WIDTH / 4, HEIGHT / 6);
  buttonSprite.eventMode = "static";
  buttonSprite.cursor = "pointer";
  buttonSprite.addEventListener("pointerdown", () => {
    onStartClicked();
  });
  menuContainer.addChild(buttonSprite);

  createText(menuContainer, "START", "PixelFont", 24, WIDTH / 2, HEIGHT / 2, WIDTH, "#000000");

  // SETTINGS BUTTON SPRITE & TEXT
  const settingsSprite = new Sprite(t_textbox1);
  makeSprite(settingsSprite, WIDTH / 2 - WIDTH / 8, (HEIGHT / 2 + HEIGHT / 5) - HEIGHT / 12, WIDTH / 4, HEIGHT / 6);
  settingsSprite.eventMode = "static";
  settingsSprite.cursor = "pointer";
  menuContainer.addChild(settingsSprite);

  const settingsText = createText(menuContainer, "Settings", "PixelFont", 24, WIDTH / 2, HEIGHT / 2 + HEIGHT / 5, WIDTH, "#000000");

  settingsSprite.addEventListener("pointerdown", () => {
    setText(settingsText, "Not implemented yet :(", WIDTH / 2);
  });

  // CREDITS BUTTON SPRITE & TEXT
  const creditsSprite = new Sprite(t_textbox1);
  makeSprite(creditsSprite, WIDTH / 2 - WIDTH / 8, (HEIGHT / 2 + (HEIGHT / 5) * 2) - HEIGHT / 12, WIDTH / 4, HEIGHT / 6);
  creditsSprite.eventMode = "static";
  creditsSprite.cursor = "pointer";
  menuContainer.addChild(creditsSprite);

  const creditsText = createText(menuContainer, "Credits", "PixelFont", 24, WIDTH / 2, HEIGHT / 2 + (HEIGHT / 5) * 2, WIDTH, "#000000");

  creditsSprite.addEventListener("pointerdown", () => {
    setText(creditsText, "Also not made", WIDTH / 2);
  });

  return menuContainer;
}