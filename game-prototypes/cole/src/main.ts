/* eslint-disable prettier/prettier */
import { Application, Assets, Sprite, Graphics, Text } from "pixi.js";
import { createMainMenu } from "./mainmenu.ts";
import { startSuspectSelectScreen } from "./suspectSelect.ts";

const init_text = [
  "Hey Detective! I’m glad you made it.        ",
  "Thanks again for coming.",
  "I’m sure you’ve got cooler cases you could be solving as a big city psychic detective, but I really do need your help.",
  "We’ve had a big spurt of crimes here in Grammeia, and they don’t show any signs of stopping.",
  "It’s mostly small stuff, and I usually don’t have any trouble figuring out who did it, but all the citizens know they can keep getting away with it because I can’t get any proof.",
  "Which is where you come in with the Truth Seeker!",
  "I know you’re a little new to this still, so I’ve set us up with a pretty simple first case so you can get warmed up in the field.",
  "I might not be certified to use the Truth Seeker myself, but I generally know how it works, so I’m happy to jump in and give you some pointers if you need them.",
  "I’ve called all our suspects in, so we can get started as soon as you’re ready!",
  "[Click Enter to Go Inside]",
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
  app: Application,
  content: string,
  fontName: string,
  size: number,
  x: number,
  y: number,
  width: number,
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
  txt.anchor.set(0.5);
  txt.position.set(x, y);
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
  txt.anchor.set(0.5);
  txt.position.set(x, y);
  app.stage.addChild(txt);
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

async function startIntroScreen(app: Application) {
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
  
  makeSprite(sprite1, WIDTH / 3, 0.09 * HEIGHT, WIDTH / 3, HEIGHT / 1.1);
  app.stage.addChild(sprite1);
  
  makeSprite(textbox1, WIDTH / 2 - WIDTH / 2.2, HEIGHT - HEIGHT / 3, WIDTH / 1.1, HEIGHT / 3);
  app.stage.addChild(textbox1);
  
  makeSprite(textbox2, 0.78 * WIDTH, 0.88 * HEIGHT, 0.12 * WIDTH, 0.12 * HEIGHT);
  app.stage.addChild(textbox2);
  textbox2.eventMode = "static";
  textbox2.cursor = "pointer";

  // CREATE TEXT
  createText(app, "[ENTER]", "PixelFont", 16, 0.84 * WIDTH, 0.93 * HEIGHT, 0.7 * WIDTH);
  const dialogue = createDialogue(app, init_text, 0, "PixelFont", 24, WIDTH / 2, HEIGHT - 150, 0.7 * WIDTH);

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
  const exit_text = createText(app, "Exit", "PixelFont", 24, WIDTH / 2, 0.785 * HEIGHT, 0.7 * WIDTH);
  exit_text.visible = false;

  // DIALOGUE ACTION LISTENERS WITH TYPEWRITER EFFECT
  function advanceDialogue() {
    // If text is currently typing out, clicking/pressing enter skips to the full text immediately
    if (typewriterInterval) {
      clearInterval(typewriterInterval);
      typewriterInterval = null;
      setText(dialogue, init_text[init_index], WIDTH / 2);
      
      if (spriteAnimInterval) {
        clearInterval(spriteAnimInterval);
        spriteAnimInterval = null;
      }
      sprite1.texture = t_sprite1;
      isAnimating = false;
      return;
    }

    if (isAnimating) return;

    if (init_index >= init_text.length - 1) {
      // Clean up intro listeners and open the suspect selection screen
      window.removeEventListener("keydown", handleKeyDown);
      app.stage.removeChildren();
      void startSuspectSelectScreen(app, () => {
        void loadMainMenu(app);
      });
      return;
    }

    isAnimating = true;
    init_index++;

    const currentText = init_text[init_index];
    setText(dialogue, "", WIDTH / 2); // Clear text to start typing

    let charIndex = 0;
    const typingSpeed = 30; // Milliseconds per character

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

    // Sprite talking animation synchronized with text length
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
    setText(exit_text, "Menu", WIDTH / 2);
  }

  menu_resume.addEventListener("pointerdown", () => {
    if (menu_flag === 1) toggleMenu();
  });

  menu_help.addEventListener("pointerdown", () => {
    if (menu_flag === 1) setText(help_text, "Not implemented yet :(", WIDTH / 2);
  });

  menu_settings.addEventListener("pointerdown", () => {
    if (menu_flag === 1) setText(settings_text, "Also not made", WIDTH / 2);
  });

  menu_exit.addEventListener("pointerdown", () => {
    if (menu_flag === 1) {
      // Clean up game listeners and return to main menu
      window.removeEventListener("keydown", handleKeyDown);
      app.stage.removeChildren();
      loadMainMenu(app);
    }
  });
}

async function loadMainMenu(app: Application) {
  const mainMenu = await createMainMenu(app, () => {
    app.stage.removeChildren();
    startIntroScreen(app);
  });
  app.stage.addChild(mainMenu);
}

(async () => {
  const app = new Application();
  await app.init({ background: "#000000", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  loadMainMenu(app);
})();