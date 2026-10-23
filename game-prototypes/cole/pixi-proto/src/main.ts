import { Application, Assets, Sprite, Graphics, Text } from "pixi.js";

(async () => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ background: "#0d117b", resizeTo: window });

  // Append the application canvas to the document body
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // Load the bunny texture
  const texture = await Assets.load("/assets/bunny.png");

  // Create a bunny Sprite
  const bunny = new Sprite(texture);

  // Center the sprite's anchor point
  bunny.anchor.set(0);

  // Move the sprite to the center of the screen
  bunny.position.set(app.screen.width - 60, app.screen.height - 60);

  // Add the bunny to the stage
  app.stage.addChild(bunny);

  // TESTING OUT BOX STUFF
  const box = new Graphics();

  box.rect(0, 0, 800, 300);
  box.fill("#e8eef5");
  box.position.set(20, 20);
  app.stage.addChild(box);

  const text = new Text({
    text: "Player Stats I'm putting a lot of text in here to see what happens",
    style: {
      fontSize: 24,
      fill: "#000000",
      fontFamily: "Arial",
    },
  });

  text.position.set(35, 35);
  app.stage.addChild(text);

  const box2 = new Graphics();

  box2.rect(440, 330, 800, 100);
  box2.fill("#b9daff");
  box2.position.set(20, 20);
  app.stage.addChild(box2);
  const text2 = new Text({
    text: "Player Stats I'm putting a lot of text in here to see what happens",
    style: {
      fontSize: 24,
      fill: "#000000",
      fontFamily: "Arial",
    },
  });

  text2.position.set(440 + 35, 330 + 35);
  app.stage.addChild(text2);

  // Listen for animate update
  app.ticker.add((time) => {
    // Just for fun, let's rotate mr rabbit a little.
    // * Delta is 1 if running at 100% performance *
    // * Creates frame-independent transformation *
    bunny.rotation += 0.3 * time.deltaTime;
  });
})();
