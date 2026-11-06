import {
  Application,
  Assets,
  Container,
  FederatedPointerEvent,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import { sceneAssets } from "./sceneAssets.ts";

const TEXT_COLOR = "#1c1915";
const GREEN = 0x1b8a3e;
const BLUE = 0x2f6fed;
const YELLOW = 0xf5c518;
const RED = 0xff2a2a;
const FONT = "Georgia, Palatino, serif";
const FONT_SIZES = [28, 26, 24, 22, 20, 18, 16];
const SEEKER_W = 280;
const SEEKER_H = 48;
const NEXT_W = 280;
const NEXT_H = 42;

type Answer = "remove" | "add" | "oxford";

type PieceDef = {
  text: string;
  answer?: Answer;
  fix?: string;
  lie?: boolean;
};

const OXFORD_NOTE =
  "That last comma is actually optional! It\u2019s called an Oxford comma, and it really just depends on who you ask whether or not you should use it. It often adds extra clarity to what you\u2019re trying to say, so it\u2019s often a good idea to include it when you\u2019re unsure.";

const LIE_PROMPT =
  "nice detective work! click anywhere in the textbox to reveal where the suspect lied.";

const BLUE_HINT =
  "You currently have a comma missing from a sentence that needs it. Try look for words like \u201cfor,\u201d \u201cand,\u201d \u201cnor,\u201d \u201cbut,\u201d \u201cor,\u201d and \u201ctherefore,\u201d and check if they separate two ideas that work as complete sentences on their own. Also check for lists of items or actions, and see if each item is separated by a comma.";

const SUSPECTS: PieceDef[][] = [
  [
    { text: "I" },
    { text: " " },
    { text: "was" },
    { text: " " },
    { text: "just" },
    { text: " " },
    { text: "in" },
    { text: " " },
    { text: "the" },
    { text: " " },
    { text: "bakery" },
    { text: " " },
    { text: "waiting", answer: "remove", fix: "waiting" },
    { text: ",", answer: "remove", fix: "waiting" },
    { text: " ", answer: "remove", fix: "waiting" },
    { text: "to" },
    { text: " " },
    { text: "buy" },
    { text: " " },
    { text: "a" },
    { text: " " },
    { text: "loaf" },
    { text: " " },
    { text: "of" },
    { text: " " },
    { text: "bread." },
    { text: " " },
    { text: "I" },
    { text: " " },
    { text: "come" },
    { text: " " },
    { text: "in" },
    { text: " " },
    { text: "every" },
    { text: " " },
    { text: "week", answer: "add", fix: "week" },
    { text: " ", answer: "add", fix: "week" },
    { text: "ask" },
    { text: " " },
    { text: "anybody!" },
    { text: " " },
    { text: "I" },
    { text: " " },
    { text: "wasn\u2019t" },
    { text: " " },
    { text: "even" },
    { text: " " },
    { text: "near" },
    { text: " " },
    { text: "the" },
    { text: " " },
    { text: "register" },
    { text: " " },
    { text: "when" },
    { text: " " },
    { text: "the" },
    { text: " " },
    { text: "money" },
    { text: " " },
    { text: "went" },
    { text: " " },
    { text: "missing." },
  ],
  [
    { text: "I\u2019m" },
    { text: " " },
    { text: "throwing" },
    { text: " " },
    { text: "a" },
    { text: " " },
    { text: "party", answer: "remove", fix: "party" },
    { text: ",", answer: "remove", fix: "party" },
    { text: " ", answer: "remove", fix: "party" },
    { text: "tomorrow," },
    { text: " " },
    { text: "so" },
    { text: " " },
    { text: "I" },
    { text: " " },
    { text: "was" },
    { text: " " },
    { text: "buying" },
    { text: " " },
    { text: "baked" },
    { text: " " },
    { text: "goods" },
    { text: " " },
    { text: "for" },
    { text: " " },
    { text: "my" },
    { text: " " },
    { text: "guests." },
    { text: " " },
    { text: "I" },
    { text: " " },
    { text: "got" },
    { text: " " },
    { text: "a" },
    { text: " " },
    { text: "dozen" },
    { text: " " },
    { text: "cupcakes", answer: "add", fix: "cupcakes" },
    { text: " ", answer: "add", fix: "cupcakes" },
    { text: "two" },
    { text: " " },
    { text: "dozen" },
    { text: " " },
    { text: "cookies", answer: "oxford" },
    { text: " ", answer: "oxford" },
    { text: "and" },
    { text: " " },
    { text: "a" },
    { text: " " },
    { text: "chocolate" },
    { text: " " },
    { text: "cake." },
    { text: " " },
    { text: "I" },
    { text: " " },
    { text: "paid" },
    { text: " " },
    { text: "the" },
    { text: " " },
    { text: "full" },
    { text: " " },
    { text: "amount," },
    { text: " " },
    { text: "I" },
    { text: " " },
    { text: "promise!" },
  ],
  [
    { text: "I" },
    { text: " " },
    { text: "don\u2019t" },
    { text: " " },
    { text: "know" },
    { text: " " },
    { text: "why" },
    { text: " " },
    { text: "you\u2019re" },
    { text: " " },
    { text: "questioning" },
    { text: " " },
    { text: "me." },
    { text: " " },
    { text: "I\u2019ve" },
    { text: " " },
    { text: "worked" },
    { text: " " },
    { text: "at" },
    { text: " " },
    { text: "the" },
    { text: " " },
    { text: "bakery" },
    { text: " " },
    { text: "for" },
    { text: " " },
    { text: "years." },
    { text: " " },
    { text: "I" },
    { text: " " },
    { text: "took" },
    { text: " " },
    { text: "the" },
    { text: " " },
    { text: "money", answer: "add", fix: "money" },
    { text: " ", answer: "add", fix: "money" },
    { text: "put", lie: true },
    { text: " ", lie: true },
    { text: "all", lie: true },
    { text: " ", lie: true },
    { text: "of", lie: true },
    { text: " ", lie: true },
    { text: "it", lie: true },
    { text: " ", lie: true },
    { text: "into", lie: true },
    { text: " ", lie: true },
    { text: "the", lie: true },
    { text: " ", lie: true },
    { text: "register", answer: "add", fix: "register", lie: true },
    { text: " ", answer: "add", fix: "register" },
    { text: "went" },
    { text: " " },
    { text: "to" },
    { text: " " },
    { text: "grab" },
    { text: " " },
    { text: "the" },
    { text: " " },
    { text: "order", answer: "oxford" },
    { text: " ", answer: "oxford" },
    { text: "and" },
    { text: " " },
    { text: "came" },
    { text: " " },
    { text: "back." },
    { text: " " },
    { text: "It" },
    { text: " " },
    { text: "must" },
    { text: " " },
    { text: "have" },
    { text: " " },
    { text: "gotten" },
    { text: " " },
    { text: "stolen" },
    { text: " " },
    { text: "while", lie: true },
    { text: " ", lie: true },
    { text: "my", lie: true },
    { text: " ", lie: true },
    { text: "back", lie: true },
    { text: " ", lie: true },
    { text: "was", lie: true },
    { text: " ", lie: true },
    { text: "turned.", lie: true },
  ],
];

type Piece = {
  view: Container;
  text: Text;
  mark: Graphics;
  hitArea: Rectangle;
  answer: Answer | null;
  fix: string | null;
  lie: boolean;
  marked: boolean;
  slotWidth: number;
};

export async function mountDialogueScreen(app: Application): Promise<void> {
  const [backgroundTex, suspectsBackgroundTex, ...suspectTextures] =
    await Promise.all([
      loadOptionalTexture(sceneAssets.background),
      loadOptionalTexture(sceneAssets.suspectsBackground),
      ...sceneAssets.suspects.map((url) => loadOptionalTexture(url)),
    ]);

  hideSystemCursor(app);

  const lineupLayer = new Container();
  const lineupBg = new Container();
  lineupLayer.eventMode = "passive";
  lineupBg.eventMode = "none";
  lineupLayer.addChild(lineupBg);

  const backgroundLayer = new Container();
  const characterLayer = new Container();
  const panelLayer = new Container();
  backgroundLayer.eventMode = "none";
  characterLayer.eventMode = "none";
  panelLayer.eventMode = "none";
  app.stage.addChild(lineupLayer, backgroundLayer, characterLayer, panelLayer);

  const panelBg = new Graphics();
  panelBg.eventMode = "none";
  const textLayer = new Container();
  textLayer.eventMode = "static";
  textLayer.cursor = "none";
  const lieLayer = new Graphics();
  lieLayer.eventMode = "none";
  textLayer.addChild(lieLayer);
  panelLayer.addChild(panelBg, textLayer);

  let solved = false;
  let lieRevealed = false;
  let transitioning = false;
  let suspectIndex = 0;
  let pieces = createPieces(SUSPECTS[suspectIndex]);
  for (const piece of pieces) textLayer.addChild(piece.view);

  const seeker = createSeeker();
  const backButton = createBackButton();
  const note = createNote();
  const prompt = createPrompt();
  const hint = createHint();
  backButton.visible = false;
  panelLayer.addChild(backButton);
  app.stage.addChild(note.view, prompt.view, hint.view, seeker.view);

  const portraitHosts = sceneAssets.suspects.map(() => {
    const host = new Container();
    host.eventMode = "static";
    host.cursor = "pointer";
    lineupLayer.addChild(host);
    return host;
  });

  const showBack = () => {
    if (!solved) return false;
    const hasLie = pieces.some((piece) => piece.lie);
    return hasLie ? lieRevealed : true;
  };
  const showNote = () =>
    !lieRevealed &&
    pieces.some((piece) => piece.marked && piece.answer === "oxford");
  const awaitingReveal = () =>
    solved && pieces.some((piece) => piece.lie) && !lieRevealed;
  const showHint = () => pieces.some((piece) => piece.marked && !piece.answer);

  const revealLie = (event: FederatedPointerEvent) => {
    if (!awaitingReveal()) return;
    event.stopPropagation();
    lieRevealed = true;
    layout();
  };

  const layout = () => {
    const width = app.screen.width;
    const height = app.screen.height;
    const margin = 24;
    const panelW = width - margin * 2;
    const padX = 28;
    const padY = 22;
    const buttonSpace = showBack() ? NEXT_H + 12 : 0;
    const promptWidth = panelW - padX * 2;

    if (showNote()) drawNote(note, promptWidth);
    const noteH = showNote() ? note.label.height + 20 : 0;
    const noteSpace = noteH > 0 ? noteH + 12 : 0;
    if (awaitingReveal()) drawPrompt(prompt, promptWidth);
    const promptH = awaitingReveal() ? prompt.label.height + 20 : 0;
    const promptSpace = promptH > 0 ? promptH + 12 : 0;
    if (showHint()) drawHint(hint, promptWidth);
    const hintH = showHint() ? hint.label.height + 20 : 0;
    const hintSpace = hintH > 0 ? hintH + 12 : 0;
    const basePanelH = Math.max(168, Math.min(230, height * 0.34));
    const panelH = Math.min(
      height - margin * 2 - 8,
      basePanelH + noteSpace + promptSpace + hintSpace,
    );
    const panelY = height - panelH - margin;
    const overlap = 28;

    app.stage.hitArea = new Rectangle(0, 0, width, height);
    layoutLineup(width, height);

    replaceLayer(
      backgroundLayer,
      backgroundTex
        ? coverSprite(backgroundTex, width, height)
        : backgroundPlaceholder(width, height),
    );

    const characterMaxH = Math.max(96, panelY + overlap - 8);
    const characterMaxW = Math.min(480, width * 0.46);
    const portraitTex = suspectTextures[suspectIndex] ?? null;
    const characterView = portraitTex
      ? fittedSprite(portraitTex, characterMaxW, characterMaxH)
      : suspectPlaceholder(
          characterMaxW,
          characterMaxH,
          `suspect-${suspectIndex + 1}.png`,
          suspectIndex,
        );
    characterView.position.set(
      (width - characterView.width) / 2,
      panelY + overlap - characterView.height,
    );
    replaceLayer(characterLayer, characterView);

    panelLayer.hitArea = new Rectangle(margin, panelY, panelW, panelH);
    panelBg.clear();
    panelBg
      .roundRect(margin, panelY, panelW, panelH, 18)
      .fill({ color: 0xf4efe4, alpha: 0.96 })
      .stroke({ width: 2, color: 0xd9cbb6 });

    const innerW = panelW - padX * 2;
    const innerH = panelH - padY * 2;
    layoutPieces(
      pieces,
      innerW,
      Math.max(36, innerH - buttonSpace - noteSpace - promptSpace - hintSpace),
    );
    textLayer.position.set(margin + padX, panelY + padY);
    textLayer.hitArea = new Rectangle(0, 0, innerW, innerH - buttonSpace);
    drawMarks(pieces, solved && lieRevealed, lieLayer);

    backButton.visible = showBack();
    backButton.position.set(
      margin + panelW - padX - NEXT_W,
      panelY + panelH - padY - NEXT_H,
    );

    hint.view.visible = hintH > 0;
    if (hint.view.visible) {
      hint.view.position.set(
        margin + padX,
        panelY + panelH - padY - buttonSpace - hintH,
      );
    }

    prompt.view.visible = promptH > 0;
    if (prompt.view.visible) {
      prompt.view.position.set(
        margin + padX,
        panelY + panelH - padY - buttonSpace - hintSpace - promptH,
      );
    }

    note.view.visible = noteH > 0;
    if (note.view.visible) {
      note.view.position.set(
        margin + padX,
        panelY + panelH - padY - buttonSpace - hintSpace - promptSpace - noteH,
      );
    }

    seeker.view.position.set(width - SEEKER_W - margin, margin);
    drawSeeker(seeker, solved);
  };

  const refresh = () => {
    solved = marksAreCorrect(pieces);
    if (!solved) lieRevealed = false;
    layout();
  };

  const setSpeechAlpha = (alpha: number) => {
    backgroundLayer.alpha = alpha;
    characterLayer.alpha = alpha;
    panelLayer.alpha = alpha;
    note.view.alpha = alpha;
    prompt.view.alpha = alpha;
    hint.view.alpha = alpha;
    seeker.view.alpha = alpha;
  };

  const fadeLayer = (layer: Container, from: number, to: number, duration: number) =>
    new Promise<void>((resolve) => {
      let elapsed = 0;
      const step = () => {
        elapsed += app.ticker.deltaMS;
        const t = Math.min(1, elapsed / duration);
        const eased = to > from ? 1 - (1 - t) * (1 - t) : t * t;
        layer.alpha = from + (to - from) * eased;
        if (t < 1) return;
        app.ticker.remove(step);
        resolve();
      };
      app.ticker.add(step);
    });

  const layoutLineup = (width: number, height: number) => {
    replaceLayer(
      lineupBg,
      suspectsBackgroundTex
        ? coverSprite(suspectsBackgroundTex, width, height)
        : backgroundPlaceholder(width, height, "suspects-background.png"),
    );

    const margin = 36;
    const gap = 28;
    const slotW = (width - margin * 2 - gap * 2) / 3;
    const maxH = Math.max(140, height - margin * 2);
    const bottom = height - 16;
    portraitHosts.forEach((host, index) => {
      const texture = suspectTextures[index] ?? null;
      const art = texture
        ? fittedSprite(texture, slotW, maxH)
        : suspectPlaceholder(slotW, maxH, `suspect-${index + 1}.png`, index);
      replaceLayer(host, art);
      const bounds = art.getLocalBounds();
      host.position.set(
        margin + index * (slotW + gap) + (slotW - bounds.width) / 2 - bounds.x,
        bottom - bounds.y - bounds.height,
      );
      host.hitArea = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
    });
  };

  const fadeSpeech = (from: number, to: number, duration: number) =>
    new Promise<void>((resolve) => {
      let elapsed = 0;
      const step = () => {
        elapsed += app.ticker.deltaMS;
        const t = Math.min(1, elapsed / duration);
        const eased = to > from ? 1 - (1 - t) * (1 - t) : t * t;
        setSpeechAlpha(from + (to - from) * eased);
        if (t < 1) return;
        app.ticker.remove(step);
        resolve();
      };
      app.ticker.add(step);
    });

  const showSuspect = (index: number) => {
    suspectIndex = index;
    for (const piece of pieces) piece.view.destroy({ children: true });
    pieces = createPieces(SUSPECTS[suspectIndex] ?? []);
    for (const piece of pieces) textLayer.addChild(piece.view);
    solved = false;
    lieRevealed = false;
    layout();
  };

  textLayer.on("pointerdown", (event: FederatedPointerEvent) => {
    if (transitioning) return;
    if (awaitingReveal()) {
      revealLie(event);
      return;
    }
    const local = textLayer.toLocal(event.global);
    const piece = pieceAt(pieces, local.x, local.y);
    if (!piece) return;
    event.stopPropagation();
    piece.marked = !piece.marked;
    refresh();
  });

  panelLayer.on("pointerdown", (event: FederatedPointerEvent) => {
    revealLie(event);
  });

  const glass = createMagnifier();
  let cursorClicking = false;
  const setCursorClicking = (clicking: boolean) => {
    cursorClicking = clicking;
    glass.visible = !clicking;
    app.canvas.style.cursor = clicking ? "pointer" : "none";
  };
  app.stage.addChild(glass);
  app.stage.eventMode = "static";
  app.stage.cursor = "none";
  app.stage.on("globalpointermove", (event: FederatedPointerEvent) => {
    glass.visible = !cursorClicking;
    glass.position.set(event.global.x, event.global.y);
  });

  const openSuspect = async (index: number) => {
    if (transitioning) return;
    transitioning = true;
    setCursorClicking(false);
    for (const host of portraitHosts) host.eventMode = "none";
    await fadeLayer(lineupLayer, 1, 0, 420);
    lineupLayer.visible = false;
    showSuspect(index);
    setSpeechAlpha(0);
    await fadeSpeech(0, 1, 480);
    panelLayer.eventMode = "static";
    transitioning = false;
  };

  const returnToLineup = async () => {
    if (transitioning || !showBack()) return;
    transitioning = true;
    setCursorClicking(false);
    panelLayer.eventMode = "none";
    await fadeSpeech(1, 0, 420);
    lineupLayer.visible = true;
    lineupLayer.alpha = 0;
    await fadeLayer(lineupLayer, 0, 1, 480);
    for (const host of portraitHosts) host.eventMode = "static";
    transitioning = false;
  };

  portraitHosts.forEach((host, index) => {
    host.on("pointerover", () => {
      setCursorClicking(true);
    });
    host.on("pointerout", () => {
      setCursorClicking(false);
    });
    host.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      setCursorClicking(true);
      void openSuspect(index);
    });
  });

  backButton.on("pointerover", () => {
    setCursorClicking(true);
  });
  backButton.on("pointerout", () => {
    setCursorClicking(false);
  });
  backButton.on("pointerdown", (event: FederatedPointerEvent) => {
    event.stopPropagation();
    setCursorClicking(true);
    void returnToLineup();
  });

  setSpeechAlpha(0);
  layout();
  app.renderer.on("resize", layout);
}

function createPieces(sentence: PieceDef[]): Piece[] {
  return sentence.map((def) => {
    const text = new Text({
      text: def.text,
      style: {
        fontFamily: FONT,
        fontSize: 28,
        fill: TEXT_COLOR,
      },
    });
    text.eventMode = "none";

    const mark = new Graphics();
    mark.eventMode = "none";
    mark.visible = false;

    const hitArea = new Rectangle();
    const view = new Container();
    view.eventMode = "none";
    view.hitArea = hitArea;
    view.addChild(mark, text);

    const piece: Piece = {
      view,
      text,
      mark,
      hitArea,
      answer: def.answer ?? null,
      fix: def.fix ?? null,
      lie: def.lie ?? false,
      marked: false,
      slotWidth: 0,
    };

    return piece;
  });
}

function marksAreCorrect(pieces: Piece[]): boolean {
  const marked = pieces.filter((piece) => piece.marked);
  if (marked.some((piece) => !piece.answer)) return false;
  const required = new Set(
    pieces.flatMap((piece) => (piece.fix ? [piece.fix] : [])),
  );
  if (required.size === 0) return false;
  const found = new Set(
    marked.flatMap((piece) => (piece.fix ? [piece.fix] : [])),
  );
  for (const fix of required) {
    if (!found.has(fix)) return false;
  }
  return true;
}

function pieceAt(pieces: Piece[], x: number, y: number): Piece | null {
  const inBox = (piece: Piece, left: number, right: number) => {
    const top = piece.view.y - 8;
    const bottom = piece.view.y + piece.text.height + 8;
    return x >= left && x <= right && y >= top && y <= bottom;
  };

  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index];
    if (!piece || !piece.view.visible || piece.text.text !== "," || !piece.answer) {
      continue;
    }
    const previous = pieces[index - 1];
    const left =
      previous && previous.view.visible
        ? previous.view.x + previous.slotWidth * 0.45
        : piece.view.x - 16;
    const right = piece.view.x + Math.max(piece.slotWidth, 14);
    if (inBox(piece, left, right)) return piece;
  }

  for (const piece of pieces) {
    if (!piece.view.visible || piece.text.text !== " " || !piece.answer) continue;
    const left = piece.view.x + 2;
    const right = piece.view.x + Math.max(piece.slotWidth, 14);
    if (inBox(piece, left, right)) return piece;
  }

  let closest: Piece | null = null;
  let best = Number.POSITIVE_INFINITY;

  for (const piece of pieces) {
    if (!piece.view.visible) continue;
    const left = piece.view.x;
    const top = piece.view.y;
    const right = left + piece.slotWidth;
    const bottom = top + piece.text.height;
    const dx = Math.max(left - x, 0, x - right);
    const dy = Math.max(top - y, 0, y - bottom);
    const dist = dx * dx + dy * dy;
    if (dist < best) {
      best = dist;
      closest = piece;
    }
  }

  return closest && best <= 36 * 36 ? closest : null;
}

function drawMarks(pieces: Piece[], showLies: boolean, lieLayer: Graphics) {
  lieLayer.clear();
  for (const piece of pieces) {
    piece.mark.clear();
    piece.mark.visible = false;
    piece.text.style.fill = TEXT_COLOR;
  }

  if (showLies) drawLieRuns(pieces, lieLayer);

  for (const piece of pieces) {
    // Once the lie is out, only the red phrases stay. Green, blue, and yellow marks go away.
    if (showLies || !piece.marked || !piece.view.visible) continue;
    const oxford = piece.answer === "oxford";
    const width = Math.max(piece.slotWidth, 10);
    const height = Math.max(piece.text.height, 18);
    piece.mark.visible = true;
    const correct = piece.answer === "remove" || piece.answer === "add";
    piece.mark.roundRect(-2, -4, width + 4, height + 6, 5).fill(
      oxford ? YELLOW : correct ? GREEN : BLUE,
    );
    piece.text.style.fill = oxford ? TEXT_COLOR : "#f7fbff";
  }
}

function drawLieRuns(pieces: Piece[], lieLayer: Graphics) {
  let index = 0;
  while (index < pieces.length) {
    const start = pieces[index];
    if (!start || !start.lie || !start.view.visible) {
      index += 1;
      continue;
    }

    let end = index;
    const line = start.view.y;
    while (end + 1 < pieces.length) {
      const next = pieces[end + 1];
      if (!next || !next.lie || !next.view.visible || next.view.y !== line) break;
      end += 1;
    }

    const last = pieces[end];
    if (!last) break;
    const width = last.view.x + last.slotWidth - start.view.x;
    const height = Math.max(start.text.height, 18);
    lieLayer
      .roundRect(start.view.x - 1, start.view.y - 4, width + 2, height + 6, 4)
      .fill(RED);
    for (let mark = index; mark <= end; mark += 1) {
      const piece = pieces[mark];
      if (piece && !piece.marked && piece.answer !== "oxford") {
        piece.text.style.fill = TEXT_COLOR;
      }
    }
    index = end + 1;
  }
}

function layoutPieces(pieces: Piece[], maxWidth: number, maxHeight: number) {
  const lastSize = FONT_SIZES[FONT_SIZES.length - 1] ?? 18;

  for (const size of FONT_SIZES) {
    for (const piece of pieces) {
      piece.text.style.fontSize = size;
    }
    const placed = placePieces(pieces, maxWidth);
    if (placed.height <= maxHeight || size === lastSize) return;
  }
}

function placePieces(pieces: Piece[], maxWidth: number): { height: number } {
  const fontSize = Number(pieces[0]?.text.style.fontSize ?? 28);
  const lineHeight = fontSize * 1.55;
  let x = 0;
  let y = 0;

  for (const piece of pieces) {
    const width = slotWidth(piece);
    const isGap = piece.text.text === " ";
    const keepGap =
      piece.answer === "add" ||
      piece.answer === "oxford" ||
      piece.answer === "remove";
    if (isGap && x === 0 && !keepGap) {
      piece.view.visible = false;
      continue;
    }
    if (x > 0 && x + width > maxWidth) {
      x = 0;
      y += lineHeight;
      if (isGap && !keepGap) {
        piece.view.visible = false;
        continue;
      }
    }

    piece.view.visible = true;
    piece.slotWidth = width;
    piece.view.position.set(x, y);
    piece.hitArea.x = 0;
    piece.hitArea.y = -2;
    piece.hitArea.width = width;
    piece.hitArea.height = piece.text.height + 8;
    x += width;
  }

  const lastVisible = [...pieces].reverse().find((piece) => piece.view.visible);
  return { height: y + (lastVisible ? lastVisible.text.height : 0) };
}

function slotWidth(piece: Piece): number {
  const natural = piece.text.width;
  if (piece.text.text === " ") return Math.max(natural, 4);
  return natural;
}

function createBackButton(): Container {
  const view = new Container();
  const bg = new Graphics();
  const label = new Text({
    text: "back to the suspects",
    style: {
      fontFamily: FONT,
      fontSize: 16,
      fill: TEXT_COLOR,
    },
  });
  label.eventMode = "none";
  bg.eventMode = "none";
  bg.roundRect(0, 0, NEXT_W, NEXT_H, 12)
    .fill(0xf4efe4)
    .stroke({ width: 2, color: 0x1c1915 });
  label.position.set((NEXT_W - label.width) / 2, (NEXT_H - label.height) / 2);
  view.eventMode = "static";
  view.cursor = "pointer";
  view.hitArea = new Rectangle(0, 0, NEXT_W, NEXT_H);
  view.addChild(bg, label);
  return view;
}

function createPrompt(): { view: Container; bg: Graphics; label: Text } {
  const view = new Container();
  const bg = new Graphics();
  const label = new Text({
    text: LIE_PROMPT,
    style: {
      fontFamily: FONT,
      fontSize: 16,
      fill: TEXT_COLOR,
      wordWrap: true,
      wordWrapWidth: 520,
    },
  });
  label.eventMode = "none";
  bg.eventMode = "none";
  view.eventMode = "none";
  view.visible = false;
  view.addChild(bg, label);
  return { view, bg, label };
}

function drawPrompt(prompt: { bg: Graphics; label: Text }, width: number) {
  prompt.label.style.wordWrapWidth = Math.max(200, width - 28);
  const height = prompt.label.height + 20;
  prompt.bg.clear();
  prompt.bg
    .roundRect(0, 0, width, height, 12)
    .fill(0xe7f6ec)
    .stroke({ width: 2, color: GREEN });
  prompt.label.position.set(14, 10);
}

function createNote(): { view: Container; bg: Graphics; label: Text } {
  const view = new Container();
  const bg = new Graphics();
  const label = new Text({
    text: OXFORD_NOTE,
    style: {
      fontFamily: FONT,
      fontSize: 15,
      fill: TEXT_COLOR,
      wordWrap: true,
      wordWrapWidth: 520,
    },
  });
  label.eventMode = "none";
  bg.eventMode = "none";
  view.eventMode = "none";
  view.visible = false;
  view.addChild(bg, label);
  return { view, bg, label };
}

function createHint(): { view: Container; bg: Graphics; label: Text } {
  const view = new Container();
  const bg = new Graphics();
  const label = new Text({
    text: BLUE_HINT,
    style: {
      fontFamily: FONT,
      fontSize: 15,
      fill: TEXT_COLOR,
      wordWrap: true,
      wordWrapWidth: 520,
    },
  });
  label.eventMode = "none";
  bg.eventMode = "none";
  view.eventMode = "none";
  view.visible = false;
  view.addChild(bg, label);
  return { view, bg, label };
}

function drawHint(hint: { bg: Graphics; label: Text }, width: number) {
  hint.label.style.wordWrapWidth = Math.max(200, width - 28);
  const height = hint.label.height + 20;
  hint.bg.clear();
  hint.bg
    .roundRect(0, 0, width, height, 12)
    .fill(0xe7f0ff)
    .stroke({ width: 2, color: BLUE });
  hint.label.position.set(14, 10);
}

function drawNote(note: { bg: Graphics; label: Text }, width: number) {
  note.label.style.wordWrapWidth = Math.max(200, width - 28);
  const height = note.label.height + 20;
  note.bg.clear();
  note.bg
    .roundRect(0, 0, width, height, 12)
    .fill(0xfff6d8)
    .stroke({ width: 2, color: YELLOW });
  note.label.position.set(14, 10);
}

function createSeeker(): { view: Container; bg: Graphics; label: Text } {
  const view = new Container();
  const bg = new Graphics();
  const label = new Text({
    text: "Truth Seeker",
    style: {
      fontFamily: FONT,
      fontSize: 20,
      fill: TEXT_COLOR,
    },
  });
  label.eventMode = "none";
  bg.eventMode = "none";
  view.eventMode = "none";
  view.addChild(bg, label);
  return { view, bg, label };
}

function drawSeeker(seeker: { bg: Graphics; label: Text }, solved: boolean) {
  seeker.bg.clear();
  seeker.bg
    .roundRect(0, 0, SEEKER_W, SEEKER_H, 12)
    .fill(solved ? GREEN : 0xf4efe4)
    .stroke({ width: 2, color: 0x1c1915 });
  seeker.label.style.fontSize = solved ? 18 : 20;
  seeker.label.text = solved ? "nice detective work" : "Truth Seeker";
  seeker.label.style.fill = solved ? "#f4efe4" : TEXT_COLOR;
  seeker.label.position.set(
    (SEEKER_W - seeker.label.width) / 2,
    (SEEKER_H - seeker.label.height) / 2,
  );
}

function createMagnifier(): Container {
  const glass = new Container();
  const lens = new Graphics();
  lens.circle(0, 0, 14).fill({ color: 0xbae0ff, alpha: 0.45 });
  lens.circle(0, 0, 14).stroke({ width: 3, color: 0x1a1a1a });
  const handle = new Graphics();
  handle.moveTo(10, 10).lineTo(26, 26).stroke({ width: 4, color: 0x1a1a1a });
  glass.addChild(lens, handle);
  glass.eventMode = "none";
  glass.interactiveChildren = false;
  glass.visible = false;
  return glass;
}

function hideSystemCursor(app: Application) {
  app.canvas.style.cursor = "none";
  const styles = app.renderer.events.cursorStyles;
  styles.default = "none";
  styles.pointer = "pointer";
  styles.grab = "none";
  styles.grabbing = "none";
  styles.magnifier = "none";
}

function coverSprite(texture: Texture, width: number, height: number): Sprite {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.scale.set(Math.max(width / texture.width, height / texture.height));
  sprite.position.set(width / 2, height / 2);
  sprite.eventMode = "none";
  return sprite;
}

function fittedSprite(
  texture: Texture,
  maxWidth: number,
  maxHeight: number,
): Sprite {
  const sprite = new Sprite(texture);
  sprite.scale.set(
    Math.min(maxWidth / texture.width, maxHeight / texture.height),
  );
  sprite.eventMode = "none";
  return sprite;
}

function backgroundPlaceholder(
  width: number,
  height: number,
  title = "background.png",
): Container {
  const view = new Container();
  const wall = new Graphics();
  wall.rect(0, 0, width, height).fill("#3f342c");
  wall.rect(0, height * 0.72, width, height * 0.28).fill("#2a221c");
  view.addChild(wall);

  const label = new Text({
    text: title,
    style: {
      fontFamily: FONT,
      fontSize: 20,
      fill: "#e6d7c3",
    },
  });
  label.position.set(24, 20);
  view.addChild(label);
  view.eventMode = "none";
  return view;
}

const SUSPECT_COLORS = ["#3d5a4c", "#6b4a3a", "#3a4a6b"];

function suspectPlaceholder(
  maxWidth: number,
  maxHeight: number,
  title: string,
  index: number,
): Container {
  const view = new Container();
  const height = Math.min(maxHeight, 640);
  const width = Math.min(maxWidth, height * 0.62);
  const bodyW = width * 0.72;
  const bodyH = height * 0.58;
  const bodyX = (width - bodyW) / 2;
  const bodyY = height - bodyH;
  const headR = width * 0.22;

  const figure = new Graphics();
  figure.roundRect(bodyX, bodyY, bodyW, bodyH, 40).fill(SUSPECT_COLORS[index] ?? "#3d5a4c");
  figure
    .roundRect(bodyX, bodyY + bodyH * 0.58, bodyW, bodyH * 0.42, 18)
    .fill("#2c241e");
  figure.circle(width / 2, bodyY - headR * 0.2, headR).fill("#e2c2a4");
  view.addChild(figure);

  const label = new Text({
    text: title,
    style: {
      fontFamily: FONT,
      fontSize: Math.max(16, Math.min(22, width * 0.12)),
      fill: "#f4efe4",
      align: "center",
    },
  });
  label.anchor.set(0.5);
  label.position.set(width / 2, bodyY + bodyH * 0.32);
  view.addChild(label);
  view.eventMode = "none";
  return view;
}

function replaceLayer(layer: Container, next: Container) {
  for (const child of layer.removeChildren()) {
    child.destroy({ children: true });
  }
  layer.addChild(next);
}

async function loadOptionalTexture(url: string): Promise<Texture | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    return await Assets.load<Texture>(url);
  } catch {
    return null;
  }
}
