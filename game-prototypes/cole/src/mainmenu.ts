/* eslint-disable prettier/prettier */
import { Container, Text, Application, Assets, Sprite } from "pixi.js";

export async function createMainMenu(app: Application, onStartClicked: () => void): Promise<Container> {
  const menuContainer = new Container();
  const WIDTH = app.screen.width;
  const HEIGHT = app.screen.height;

  const t_textbox1 = await Assets.load("/assets/textbox2.png");
  
  const titleText = new Text({
    text: "Main Menu",
    style: { fontSize: 48, fill: "#ffffff", fontFamily: "PixelFont" },
  });
  titleText.anchor.set(0.5);
  titleText.position.set(WIDTH / 2, HEIGHT / 4);
  menuContainer.addChild(titleText);

  const buttonSprite = new Sprite(t_textbox1);
  buttonSprite.width = WIDTH / 4;
  buttonSprite.height = HEIGHT / 6;
  buttonSprite.anchor.set(0.5);
  buttonSprite.position.set(WIDTH / 2, HEIGHT / 2);
  buttonSprite.eventMode = "static";
  buttonSprite.cursor = "pointer";

  buttonSprite.addEventListener("pointerdown", () => {
    onStartClicked();
  });

  menuContainer.addChild(buttonSprite);

  const btnText = new Text({
    text: "START",
    style: { fontSize: 24, fill: "#000000", fontFamily: "PixelFont" },
  });
  btnText.anchor.set(0.5);
  btnText.position.set(WIDTH / 2, HEIGHT / 2);
  menuContainer.addChild(btnText);

  const settingsSprite = new Sprite(t_textbox1);
  settingsSprite.width = WIDTH / 4;
  settingsSprite.height = HEIGHT / 6;
  settingsSprite.anchor.set(0.5);
  settingsSprite.position.set(WIDTH / 2, HEIGHT / 2 + HEIGHT / 5);
  menuContainer.addChild(settingsSprite);

  const settingsText = new Text({
    text: "Settings",
    style: { fontSize: 24, fill: "#000000", fontFamily: "PixelFont" },
  });
  settingsText.anchor.set(0.5);
  settingsText.position.set(WIDTH / 2, HEIGHT / 2 + HEIGHT / 5);
  menuContainer.addChild(settingsText);

  const creditsSprite = new Sprite(t_textbox1);
  creditsSprite.width = WIDTH / 4;
  creditsSprite.height = HEIGHT / 6;
  creditsSprite.anchor.set(0.5);
  creditsSprite.position.set(WIDTH / 2, HEIGHT / 2 + (HEIGHT / 5) * 2);
  menuContainer.addChild(creditsSprite);

  const creditsText = new Text({
    text: "Credits",
    style: { fontSize: 24, fill: "#000000", fontFamily: "PixelFont" },
  });
  creditsText.anchor.set(0.5);
  creditsText.position.set(WIDTH / 2, HEIGHT / 2 + (HEIGHT / 5) * 2);
  menuContainer.addChild(creditsText);

  return menuContainer;
}