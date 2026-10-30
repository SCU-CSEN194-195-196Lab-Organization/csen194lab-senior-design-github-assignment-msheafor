import { Application, Assets, Sprite, Graphics, Text, Texture } from "pixi.js";

function makeSprite(
  app: Application,
  texture: Texture,
  x: number,
  y: number,
  width: number,
  height: number,
): Sprite {
  const sprite = new Sprite(texture);
  sprite.position.set(x, y);
  sprite.width = width;
  sprite.height = height;
  app.stage.addChild(sprite);
  return sprite;
}

(async () => {
  let counter = 0;
  const app = new Application();
  await app.init({ background: "#0d117b", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const t_back1 = await Assets.load("/assets/background1.png");
  const t_sprite1 = await Assets.load("/assets/sprite1.png");

  const back1 = makeSprite(
    app,
    t_back1,
    0,
    0,
    app.screen.width,
    app.screen.height,
  );

  const sprite1 = makeSprite(
    app,
    t_sprite1,
    app.screen.width/2 - (app.screen.width / 3)/2,
    app.screen.height - (app.screen.height / 1.1),
    app.screen.width / 3,
    app.screen.height / 1.1,
  );

  /*
  
  
  
  
  
  
  //const lsprite1 = await Assets.load("/assets/sprite1.png");
  //const lsprite2 = await Assets.load("/assets/sprite2.png");
  const ltextbox1 = await Assets.load("/assets/textbox1.png");
  //const ltextbox2 = await Assets.load("/assets/textbox2.png");

  //const sprite1 = new Sprite(lsprite1);
  //const sprite2 = new Sprite(lsprite2);
  const textbox1 = new Sprite(ltextbox1);
  //const textbox2 = new Sprite(ltextbox2);

  //sprite1.height = app.screen.height / 1.1;
  //sprite1.width = app.screen.width / 3;
  //sprite1.position.set(app.screen.width/2 - sprite1.width/2, app.screen.height - sprite1.height);
  //app.stage.addChild(sprite1);

  textbox1.height = app.screen.height / 3;
  textbox1.width = app.screen.width / 1.1;
  textbox1.position.set(app.screen.width/2 - textbox1.width/2, app.screen.height / 1 - textbox1.height);
  app.stage.addChild(textbox1);

  const text25 = new Text({
    text: "I'm working on it, okay?",
    style: {
      fontSize: 24,
      fill: "#000000",
      fontFamily: "Arial",
    },
  });

  text25.position.set(app.screen.width/2 - text25.width/2, app.screen.height - 150);
  app.stage.addChild(text25);

  const text26 = new Text({
    text: "This is why it's a prototype",
    style: {
      fontSize: 24,
      fill: "#000000",
      fontFamily: "Arial",
    },
  });

  text26.position.set(app.screen.width/2 - text26.width/2, app.screen.height - 125);
  app.stage.addChild(text26);

  // Load the bunny texture
  const texture = await Assets.load("/assets/bunny.png");
  const bunny = new Sprite(texture);
  bunny.anchor.set(0);
  bunny.position.set(app.screen.width - 60, app.screen.height - 60);
  app.stage.addChild(bunny);

  // TESTING OUT BOX STUFF
  const box = new Graphics();

  box.roundRect(0, 0, 800, 300, 15);
  box.fill("#e8eef5");
  box.position.set(20, 20);
  //app.stage.addChild(box);

  const text = new Text({
    text: "This would be the NPC text where you would correct the grammar",
    style: {
      fontSize: 24,
      fill: "#000000",
      fontFamily: "Arial",
    },
  });

  text.position.set(35, 35);
  //app.stage.addChild(text);

  // BUTTON
  const button = new Graphics();

  button.roundRect(1140, 500, 100, 100, 15);
  button.fill("#e8eef5");
  button.position.set(20, 20);
  app.stage.addChild(button);

  button.eventMode = "static";
  button.cursor = "pointer";

  const buttontext = new Text({
    text: "->",
    style: {
      fontSize: 24,
      fill: "#000000",
      fontFamily: "Arial",
    },
  });

  buttontext.position.set(1140 + 35, 500 + 35);
  app.stage.addChild(buttontext);

  // Listen for animate update
  app.ticker.add((time) => {
    // Just for fun, let's rotate mr rabbit a little.
    // * Delta is 1 if running at 100% performance *
    // * Creates frame-independent transformation *
    bunny.rotation += 0.3 * time.deltaTime;
  });

  button.on("pointerdown", () => {
    if (counter == 0) {
      const box2 = new Graphics();

      box2.roundRect(440, 330, 800, 100);
      box2.fill("#b9daff");
      box2.position.set(20, 20);
      app.stage.addChild(box2);
      const text2 = new Text({
        text: "This would be the text that you say (for story cohesiveness)",
        style: {
          fontSize: 24,
          fill: "#000000",
          fontFamily: "Arial",
        },
      });

      text2.position.set(440 + 35, 330 + 35);
      app.stage.addChild(text2);
      counter++;
    } else {
      const box3 = new Graphics();

      box3.roundRect(0, 460, 800, 150, 15);
      box3.fill("#e8eef5");
      box3.position.set(20, 20);
      app.stage.addChild(box3);

      const text3 = new Text({
        text: "This would be the NPC text where you would correct the grammar",
        style: {
          fontSize: 24,
          fill: "#000000",
          fontFamily: "Arial",
        },
      });

      text3.position.set(35, 460 + 35);
      app.stage.addChild(text3);
    } 
  }); */
})();

/*
GOALS:
  - Allow text to wrap
  - Be able to load the next bit of text
  - Have a pop up menu
  - Make the sprite change between sprites
  - Menu buttons have functionality
*/
