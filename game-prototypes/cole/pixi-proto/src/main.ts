/* eslint-disable prettier/prettier */
import { Application, Assets, Sprite, Graphics, Text } from "pixi.js";

const init_text = [
  "This is the first box.",
  "Woah it made it to the second box",
  "Well now you're never going to believe this",
];

let init_index = 0;
let menu_flag = 0;
let sprite_flag = 0;

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
  centered_flag: number,
): Text {
  const txt = new Text({
    text: content,
    style: {
      fontSize: size,
      fill: "#000000",
      fontFamily: fontName,
      wordWrap: true,
      wordWrapWidth: width,
    },
  });
  if (centered_flag == 1) txt.position.set(x - txt.width / 2, y);
  else txt.position.set(x, y);
  app.stage.addChild(txt);
  return txt;
}

function createDialogue(
  app: Application,
  content: string[],
  index: number,
  fontName: string,
  size: number,
  x: number,
  y: number,
  width: number,
): Text {
  const txt = new Text({
    text: content[index],
    style: {
      fontSize: size,
      fill: "#000000",
      fontFamily: fontName,
      wordWrap: true,
      wordWrapWidth: width,
    },
  });
  txt.position.set(x - txt.width / 2, y);
  app.stage.addChild(txt);
  return txt;
}

function setText(
  text: Text,
  content: string,
  x: number
): Text {
  text.text = content;
  text.x = x - text.width / 2;
  return text;
}

(async () => {
  const app = new Application();
  await app.init({ background: "#0d117b", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // GLOBALS KINDA
  const WIDTH = app.screen.width;
  const HEIGHT = app.screen.height;

  // DECLARING SPRITES
  const t_back1 = await Assets.load("/assets/background.png");
  const t_sprite1 = await Assets.load("/assets/sprite1.png");
  const t_sprite2 = await Assets.load("/assets/sprite2.png")
  const t_textbox1 = await Assets.load("/assets/textbox1.png");
  const t_textbox2 = await Assets.load("/assets/textbox2.png");
  const back1 = new Sprite(t_back1);
  const sprite1 = new Sprite(t_sprite1);
  const textbox1 = new Sprite(t_textbox1);
  const textbox2 = new Sprite(t_textbox2);
  const menu_resume = new Sprite(t_textbox2);
  const menu_help = new Sprite(t_textbox2);
  const menu_settings = new Sprite(t_textbox2);
  const menu_exit = new Sprite(t_textbox2);

  // SET SPRITE DIMENSIONS
  makeSprite(back1, 0, 0, WIDTH, HEIGHT);
  app.stage.addChild(back1);
  makeSprite(sprite1, WIDTH/3, 0.09*HEIGHT, WIDTH/3, HEIGHT/1.1);
  app.stage.addChild(sprite1);
  makeSprite(textbox1, WIDTH/2 - WIDTH/2.2, HEIGHT - HEIGHT/3, WIDTH/1.1, HEIGHT/3);
  app.stage.addChild(textbox1);
  makeSprite(textbox2, 0.78 * WIDTH, 0.88 * HEIGHT, 0.12 * WIDTH, 0.12 * HEIGHT);
  app.stage.addChild(textbox2);
  textbox2.eventMode = "static";
  textbox2.cursor = "pointer";

  // CREATE TEXT
  createText(app, "[ENTER]", "PixelFont", 16, 0.84 * WIDTH, 0.93 * HEIGHT, 0.7 * WIDTH, 1);
  const dialogue = createDialogue(app, init_text, 0, "PixelFont", 24, WIDTH/2, HEIGHT - 150, 0.7 * WIDTH);

    // SET MENU SPRITE DIMENSIONS
  const black = new Graphics();
  black.rect(0, 0, WIDTH, HEIGHT);
  black.fill("#000000");
  black.alpha = 0.5;
  black.visible = false;
  app.stage.addChild(black);

  makeSprite(menu_resume, 0.25 * WIDTH, 0.125 * HEIGHT, 0.5 * WIDTH, 0.15 * HEIGHT);
  app.stage.addChild(menu_resume);
  menu_resume.eventMode = "static";
  menu_resume.cursor = "pointer";
  menu_resume.visible = false;
  const resume_text = createText(app, "Resume", "PixelFont", 24, WIDTH/2, 0.185 * HEIGHT, 0.7 * WIDTH, 1);
  resume_text.visible = false;
  makeSprite(menu_help, 0.25 * WIDTH, 0.325 * HEIGHT, 0.5 * WIDTH, 0.15 * HEIGHT);
  app.stage.addChild(menu_help);
  menu_help.eventMode = "static";
  menu_help.cursor = "pointer";
  menu_help.visible = false;
  const help_text = createText(app, "Help", "PixelFont", 24, WIDTH/2, 0.385 * HEIGHT, 0.7 * WIDTH, 1);
  help_text.visible = false;
  makeSprite(menu_settings, 0.25 * WIDTH, 0.525 * HEIGHT, 0.5 * WIDTH, 0.15 * HEIGHT);
  app.stage.addChild(menu_settings);
  menu_settings.eventMode = "static";
  menu_settings.cursor = "pointer";
  menu_settings.visible = false;
  const settings_text = createText(app, "Settings", "PixelFont", 24, WIDTH/2, 0.585 * HEIGHT, 0.7 * WIDTH, 1);
  settings_text.visible = false;
  makeSprite(menu_exit, 0.25 * WIDTH, 0.725 * HEIGHT, 0.5 * WIDTH, 0.15 * HEIGHT);
  app.stage.addChild(menu_exit);
  menu_exit.eventMode = "static";
  menu_exit.cursor = "pointer";
  menu_exit.visible = false;
  const exit_text = createText(app, "Exit", "PixelFont", 24, WIDTH/2, 0.785 * HEIGHT, 0.7 * WIDTH, 1);
  exit_text.visible = false;





  //  DIALOGUE ACTION LISTENERS
  function advanceDialogue() {
    init_index++;

    if (sprite_flag === 0)  {
      sprite1.texture = t_sprite2;
      sprite_flag = 1;
    } else { 
      sprite1.texture = t_sprite1;
      sprite_flag = 0;
    }

    if (init_index < init_text.length) {
      setText(dialogue, init_text[init_index], WIDTH / 2);
    } else {
      setText(dialogue, "(End of conversation)", WIDTH / 2);
    }
  }

  textbox2.addEventListener("pointerdown", () => {
    if (menu_flag === 0) advanceDialogue();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (menu_flag === 0) advanceDialogue();
    }
  });


  // MENU ACTION LISTENERS
  function toggleMenu() {
    if (menu_flag === 0) {
      menu_flag = 1;
    } else {
      menu_flag = 0;
    }
    black.visible = !black.visible;
    menu_resume.visible = !menu_resume.visible;
    resume_text.visible = !resume_text.visible;
    menu_help.visible = !menu_help.visible;
    help_text.visible = !help_text.visible;
    menu_settings.visible = !menu_settings.visible;
    settings_text.visible = !settings_text.visible;
    menu_exit.visible = !menu_exit.visible;
    exit_text.visible = !exit_text.visible;

    // TEMPORARY FOR THE BIT
    setText(help_text, "Help", WIDTH / 2);
    setText(settings_text, "Settings", WIDTH / 2);
    setText(exit_text, "Menu", WIDTH / 2);
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      toggleMenu();
    }
  });

  menu_resume.addEventListener("pointerdown", () => {
    if (menu_flag === 1) toggleMenu();
  });

  menu_help.addEventListener("pointerdown", () => {
    if (menu_flag === 1) setText(help_text, "Not implemented yet :(", WIDTH / 2); //help_text.text = "Not implemented yet :(";
  });

  menu_settings.addEventListener("pointerdown", () => {
    if (menu_flag === 1) setText(settings_text, "Also not made", WIDTH / 2);
  });

  menu_exit.addEventListener("pointerdown", () => {
    if (menu_flag === 1) setText(exit_text, "You could've guessed", WIDTH / 2);
  });
})();

/*
  

  
  
  
  
  
  
 

  // Load the bunny texture
  const texture = await Assets.load("/assets/bunny.png");
  const bunny = new Sprite(texture);
  bunny.anchor.set(0);
  bunny.position.set(app.screen.width - 60, app.screen.height - 60);
  app.stage.addChild(bunny);

  // Listen for animate update
  app.ticker.add((time) => {
    // Just for fun, let's rotate mr rabbit a little.
    // * Delta is 1 if running at 100% performance *
    // * Creates frame-independent transformation *
    bunny.rotation += 0.3 * time.deltaTime;
  });

GOALS:
  - Allow text to wrap X
  - Be able to load the next bit of text X
  - Have a pop up menu
  - Make the sprite change between sprites
  - Menu buttons have functionality
*/
