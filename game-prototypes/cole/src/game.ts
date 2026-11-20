/* eslint-disable prettier/prettier */
import { Application, Assets, Sprite, Graphics, Text, Container } from "pixi.js";
import { createMainMenu } from "./mainmenu.ts";

const game_text = [
  "This is temporary text where cases will appear in the future.",
  "I was just in the bakery waiting, to buy a loaf of bread. I come in every week ask anybody! I wasn’t even near the register when the money went missing.",
  "That was an example btw.",
  "[THE END]"
];

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

export async function startGameScreen(app: Application) {
  let init_index = 0;
  let menu_flag = 0;
  let isAnimating = false;
  let typewriterInterval: ReturnType<typeof setInterval> | null = null;
  let spriteAnimInterval: ReturnType<typeof setInterval> | null = null;

  const WIDTH = app.screen.width;
  const HEIGHT = app.screen.height;

  // DECLARING SPRITES
  const t_back1 = await Assets.load("/assets/background.png");
  const t_sprite1 = await Assets.load("/assets/sprite1.png");
  const t_sprite2 = await Assets.load("/assets/sprite2.png");
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
  
  // Larger textbox filling nearly the whole screen
  makeSprite(textbox1, WIDTH / 2 - WIDTH / 2.2, HEIGHT / 2 - (HEIGHT / 1.3) / 2, WIDTH / 1.1, HEIGHT / 1.3);
  app.stage.addChild(textbox1);

  // Dialogue text centered inside the large textbox
  const dialogue = createDialogue(app, game_text, 0, "PixelFont", 22, WIDTH / 2, HEIGHT / 2, 0.65 * WIDTH);

  // Character sprite positioned on the left and added AFTER textbox so it sits in front
  makeSprite(sprite1, 0.05 * WIDTH, 0.15 * HEIGHT, WIDTH / 3.5, HEIGHT / 1.3);
  app.stage.addChild(sprite1);
  
  // Next/advance button
  makeSprite(textbox2, 0.82 * WIDTH, 0.88 * HEIGHT, 0.12 * WIDTH, 0.12 * HEIGHT);
  app.stage.addChild(textbox2);
  textbox2.eventMode = "static";
  textbox2.cursor = "pointer";

  // CREATE INSTRUCTION TEXT
  createText(app, "[ENTER]", "PixelFont", 16, 0.88 * WIDTH, 0.93 * HEIGHT, 0.7 * WIDTH);

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
  const resume_text = createText(app, "Resume", "PixelFont", 24, WIDTH / 2, 0.185 * HEIGHT, 0.7 * WIDTH);
  resume_text.visible = false;
  
  makeSprite(menu_help, 0.25 * WIDTH, 0.325 * HEIGHT, 0.5 * WIDTH, 0.15 * HEIGHT);
  app.stage.addChild(menu_help);
  menu_help.eventMode = "static";
  menu_help.cursor = "pointer";
  menu_help.visible = false;
  const help_text = createText(app, "Help", "PixelFont", 24, WIDTH / 2, 0.385 * HEIGHT, 0.7 * WIDTH);
  help_text.visible = false;

  makeSprite(menu_settings, 0.25 * WIDTH, 0.525 * HEIGHT, 0.5 * WIDTH, 0.15 * HEIGHT);
  app.stage.addChild(menu_settings);
  menu_settings.eventMode = "static";
  menu_settings.cursor = "pointer";
  menu_settings.visible = false;
  const settings_text = createText(app, "Settings", "PixelFont", 24, WIDTH / 2, 0.585 * HEIGHT, 0.7 * WIDTH);
  settings_text.visible = false;

  makeSprite(menu_exit, 0.25 * WIDTH, 0.725 * HEIGHT, 0.5 * WIDTH, 0.15 * HEIGHT);
  app.stage.addChild(menu_exit);
  menu_exit.eventMode = "static";
  menu_exit.cursor = "pointer";
  menu_exit.visible = false;
  const exit_text = createText(app, "Main Menu", "PixelFont", 24, WIDTH / 2, 0.785 * HEIGHT, 0.7 * WIDTH);
  exit_text.visible = false;

  // DIALOGUE ACTION LISTENERS WITH TYPEWRITER EFFECT
  function advanceDialogue() {
    if (init_index >= game_text.length - 1) return;
    
    // Skip typewriter effect on click/enter if currently typing
    if (typewriterInterval) {
      clearInterval(typewriterInterval);
      typewriterInterval = null;
      setText(dialogue, game_text[init_index], WIDTH / 2);
      
      if (spriteAnimInterval) {
        clearInterval(spriteAnimInterval);
        spriteAnimInterval = null;
      }
      sprite1.texture = t_sprite1;
      isAnimating = false;
      return;
    }

    if (isAnimating) return;

    isAnimating = true;
    init_index++;

    const currentText = game_text[init_index];
    setText(dialogue, "", WIDTH / 2);

    let charIndex = 0;
    const typingSpeed = 30;

    typewriterInterval = setInterval(() => {
      charIndex++;
      setText(dialogue, currentText.substring(0, charIndex), WIDTH / 2);

      if (charIndex >= currentText.length) {
        if (typewriterInterval) {
          clearInterval(typewriterInterval);
          typewriterInterval = null;
        }
      }
    }, typingSpeed);

    const duration = Math.max(800, currentText.length * typingSpeed);
    const switchSpeed = 120;
    let elapsed = 0;
    let useAlt = false;

    spriteAnimInterval = setInterval(() => {
      elapsed += switchSpeed;
      useAlt = !useAlt;

      sprite1.texture = useAlt ? t_sprite2 : t_sprite1;

      if (elapsed >= duration || !typewriterInterval) {
        if (spriteAnimInterval) {
          clearInterval(spriteAnimInterval);
          spriteAnimInterval = null;
        }
        sprite1.texture = t_sprite1; 
        isAnimating = false; 
      }
    }, switchSpeed);
  }

  textbox2.addEventListener("pointerdown", () => {
    if (menu_flag === 0) advanceDialogue();
  });

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      if (menu_flag === 0) advanceDialogue();
    }
    if (event.key === "Escape") {
      toggleMenu();
    }
  };
  window.addEventListener("keydown", handleKeyDown);

  // MENU ACTION LISTENERS
  function toggleMenu() {
    menu_flag = menu_flag === 0 ? 1 : 0;
    black.visible = !black.visible;
    menu_resume.visible = !menu_resume.visible;
    resume_text.visible = !resume_text.visible;
    menu_help.visible = !menu_help.visible;
    help_text.visible = !help_text.visible;
    menu_settings.visible = !menu_settings.visible;
    settings_text.visible = !settings_text.visible;
    menu_exit.visible = !menu_exit.visible;
    exit_text.visible = !exit_text.visible;

    setText(help_text, "Help", WIDTH / 2);
    setText(settings_text, "Settings", WIDTH / 2);
    setText(exit_text, "Main Menu", WIDTH / 2);
  }

  menu_resume.addEventListener("pointerdown", () => {
    if (menu_flag === 1) toggleMenu();
  });

  menu_help.addEventListener("pointerdown", () => {
    if (menu_flag === 1) setText(help_text, "No help here!", WIDTH / 2);
  });

  menu_settings.addEventListener("pointerdown", () => {
    if (menu_flag === 1) setText(settings_text, "Still not made", WIDTH / 2);
  });

  menu_exit.addEventListener("pointerdown", () => {
    if (menu_flag === 1) {
      window.removeEventListener("keydown", handleKeyDown);
      app.stage.removeChildren();
      loadMainMenu(app);
    }
  });
}