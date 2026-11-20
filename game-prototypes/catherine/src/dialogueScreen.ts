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
import { loadSuspectScript, type Answer, type PieceDef } from "./loadSuspects.ts";

const TEXT_COLOR = "#1c1915";
const GREEN = 0x1b8a3e;
const BLUE = 0x2f6fed;
const YELLOW = 0xf5c518;
const RED = 0xff2a2a;
const FONT = "Georgia, Palatino, serif";
const FONT_SIZES = [44, 40, 36, 34, 32, 30, 28, 24];
const SEEKER_W = 280;
const SEEKER_H = 48;
const NEXT_W = 280;
const NEXT_H = 42;
const TOOL_SIZE = 68;

const OXFORD_NOTE =
  "That last comma is actually optional! It\u2019s called an Oxford comma, and it really just depends on who you ask whether or not you should use it. It often adds extra clarity to what you\u2019re trying to say, so it\u2019s often a good idea to include it when you\u2019re unsure.";

const LINEUP_REVEAL =
  "nice detective work! click anywhere to reveal where a suspect lied.";

const BLUE_HINT =
  "You currently have a comma missing from a sentence that needs it. Try look for words like \u201cfor,\u201d \u201cand,\u201d \u201cnor,\u201d \u201cbut,\u201d \u201cor,\u201d and \u201ctherefore,\u201d and check if they separate two ideas that work as complete sentences on their own. Also check for lists of items or actions, and see if each item is separated by a comma.";

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

export async function createDialogueScreen(
  app: Application,
  onExit: () => void = () => {},
): Promise<Container> {
  const [textureResult, scriptResult] = await Promise.all([
    Promise.all([
      requireTexture(sceneAssets.background),
      requireTexture(sceneAssets.suspectsBackground),
      ...sceneAssets.suspects.map((url) => requireTexture(url)),
    ]),
    loadSuspectScript(),
  ]);
  const [backgroundTex, suspectsBackgroundTex, ...suspectTextures] = textureResult;
  const script = scriptResult.suspects;
  const scriptError = scriptResult.error;

  const page = new Container();
  page.eventMode = "static";
  page.cursor = "none";
  page.on("destroyed", onExit);

  const lineupLayer = new Container();
  const lineupBg = new Container();
  lineupLayer.eventMode = "static";
  lineupBg.eventMode = "none";
  lineupLayer.addChild(lineupBg);

  const backgroundLayer = new Container();
  const characterLayer = new Container();
  const panelLayer = new Container();
  backgroundLayer.eventMode = "none";
  characterLayer.eventMode = "none";
  panelLayer.eventMode = "none";

  const backgroundSprite = new Sprite(backgroundTex);
  backgroundSprite.eventMode = "none";
  backgroundLayer.addChild(backgroundSprite);
  const lineupBackground = new Sprite(suspectsBackgroundTex);
  lineupBackground.eventMode = "none";
  lineupBg.addChild(lineupBackground);

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
  let transitioning = false;
  let liesRevealed = false;
  let suspectIndex = 0;
  let pieces = createPieces(script[suspectIndex] ?? []);
  for (const piece of pieces) textLayer.addChild(piece.view);

  const seeker = createSeeker();
  const backButton = createBackButton();
  const note = createNote();
  const hint = createHint();
  const bulb = createLightBulb();
  const glassTool = createToolPlaceholder("glass");
  const bulbTool = createToolPlaceholder("bulb");
  backButton.visible = false;
  bulb.visible = false;
  panelLayer.addChild(backButton, glassTool, bulbTool);
  page.addChild(
    lineupLayer,
    backgroundLayer,
    characterLayer,
    panelLayer,
    note.view,
    hint.view,
    bulb,
    seeker.view,
  );

  const portraitHosts = sceneAssets.suspects.map(() => {
    const host = new Container();
    host.eventMode = "static";
    host.cursor = "pointer";
    lineupLayer.addChild(host);
    return host;
  });
  const visitStatus: Array<"unseen" | "unfinished" | "corrected"> = portraitHosts.map(
    () => "unseen",
  );
  const allCorrected = () =>
    visitStatus.length > 0 && visitStatus.every((status) => status === "corrected");

  const lineupPrompt = createLineupPrompt();
  lineupLayer.addChild(lineupPrompt.view);

  const scriptErrorView = new Container();
  const scriptErrorBg = new Graphics();
  const scriptErrorLabel = new Text({
    text: "",
    style: {
      fontFamily: FONT,
      fontSize: 18,
      fill: TEXT_COLOR,
      wordWrap: true,
    },
  });
  scriptErrorBg.eventMode = "none";
  scriptErrorLabel.eventMode = "none";
  scriptErrorView.eventMode = "none";
  scriptErrorView.visible = false;
  scriptErrorView.addChild(scriptErrorBg, scriptErrorLabel);
  lineupLayer.addChild(scriptErrorView);

  const showNote = () =>
    !solved && pieces.some((piece) => piece.marked && piece.answer === "oxford");
  const showHint = () => pieces.some((piece) => piece.marked && !piece.answer);

  const layout = () => {
    const width = app.screen.width;
    const height = app.screen.height;
    const margin = 24;
    const padX = 28;
    const padY = 22;
    const top = margin + SEEKER_H + 12;
    const charCol = Math.min(width * 0.38, Math.max(280, (height - top) * 0.52));
    const bubbleX = margin + charCol + 18;
    const toolGap = 18;
    const bubbleW = width - margin - bubbleX - TOOL_SIZE - toolGap;
    const innerW = bubbleW - padX * 2;
    const bulbSize = 48;
    const hintCardW = width - margin * 2 - bulbSize - 12;

    drawNote(note, hintCardW);
    drawHint(hint, hintCardW);
    const noteFullH = note.label.height + 20;
    const hintFullH = hint.label.height + 20;
    const reservedH = noteFullH + hintFullH + 10;
    const noteH = showNote() ? noteFullH : 0;
    const hintH = showHint() ? hintFullH : 0;
    const betweenCards = noteH > 0 && hintH > 0 ? 10 : 0;
    const hintStackH = noteH + hintH + betweenCards;
    const showBulb = hintStackH > 0;
    const rowH = showBulb ? Math.max(hintStackH, bulbSize) : 0;
    const bubbleH = Math.max(240, height - top - margin - reservedH - 14);
    const bubbleY = top;
    const textMaxH = Math.max(64, bubbleH - padY * 2 - NEXT_H - 36);

    page.hitArea = new Rectangle(0, 0, width, height);
    layoutLineup(width, height);

    makeSprite(backgroundSprite, 0, 0, width, height);

    layoutPieces(pieces, innerW, textMaxH);
    const textH = piecesHeight(pieces);

    const characterMaxH = Math.max(140, bubbleH);
    const portraitTex = suspectTextures[suspectIndex];
    if (!portraitTex) {
      throw new Error(`Missing ${sceneAssets.suspects[suspectIndex]}`);
    }
    const characterView = portraitSprite(portraitTex, charCol, characterMaxH);
    characterView.position.set(
      margin + Math.max(0, (charCol - characterView.width) / 2),
      bubbleY + bubbleH - characterView.height,
    );
    replaceLayer(characterLayer, characterView);

    panelLayer.hitArea = new Rectangle(bubbleX, bubbleY, bubbleW, bubbleH);
    panelBg.clear();
    const headY = characterView.y + characterView.height * 0.22;
    const tailY = Math.max(bubbleY + 20, Math.min(headY - 16, bubbleY + bubbleH - 64));
    panelBg
      .roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 18)
      .fill({ color: 0xf4efe4, alpha: 0.96 })
      .stroke({ width: 2, color: 0xd9cbb6 });
    panelBg
      .poly([bubbleX - 26, tailY + 22, bubbleX + 10, tailY, bubbleX + 10, tailY + 44])
      .fill({ color: 0xf4efe4, alpha: 0.96 });

    const textW = piecesWidth(pieces);
    const textAreaH = Math.max(36, bubbleH - padY * 2 - NEXT_H - 24);
    textLayer.position.set(
      bubbleX + padX + Math.max(0, (innerW - textW) / 2),
      bubbleY + padY + Math.max(0, (textAreaH - textH) / 2),
    );
    textLayer.hitArea = new Rectangle(0, 0, Math.max(36, textW), Math.max(36, textH + 8));
    drawMarks(pieces, false, lieLayer);

    backButton.visible = true;
    backButton.position.set(
      bubbleX + bubbleW - padX - NEXT_W,
      bubbleY + bubbleH - padY - NEXT_H,
    );

    const toolX = bubbleX + bubbleW + toolGap;
    glassTool.position.set(toolX, bubbleY);
    bulbTool.position.set(toolX, bubbleY + bubbleH - TOOL_SIZE);

    const rowY = bubbleY + bubbleH + 14;
    const stackY = rowY + (rowH - hintStackH) / 2;
    note.view.visible = noteH > 0;
    if (note.view.visible) note.view.position.set(margin, stackY);
    hint.view.visible = hintH > 0;
    if (hint.view.visible) {
      hint.view.position.set(margin, stackY + (noteH > 0 ? noteH + betweenCards : 0));
    }
    bulb.visible = showBulb;
    if (bulb.visible) {
      bulb.position.set(width - margin - bulbSize, rowY + (rowH - bulbSize) / 2);
    }

    seeker.view.position.set(width - SEEKER_W - margin, margin);
    drawSeeker(seeker, solved);
  };

  const refresh = () => {
    solved = marksAreCorrect(pieces);
    layout();
  };

  const setSpeechAlpha = (alpha: number) => {
    backgroundLayer.alpha = alpha;
    characterLayer.alpha = alpha;
    panelLayer.alpha = alpha;
    note.view.alpha = alpha;
    hint.view.alpha = alpha;
    bulb.alpha = alpha;
    seeker.view.alpha = alpha;
  };

  const layoutLineup = (width: number, height: number) => {
    makeSprite(lineupBackground, 0, 0, width, height);

    lineupLayer.hitArea = new Rectangle(0, 0, width, height);
    const margin = 36;
    const gap = 28;
    const slotW = (width - margin * 2 - gap * 2) / 3;
    const quoteWidth = slotW - 8;
    const quotes = liesRevealed
      ? script.map((defs) =>
          createQuoteCard(quoteTokens(defs), quoteWidth, Math.max(180, height - 190)),
        )
      : [];
    const quoteBand = quotes.reduce(
      (tallest, card) => Math.max(tallest, card.getLocalBounds().height),
      0,
    );
    const portraitCeiling = liesRevealed ? 12 + quoteBand + 10 : 0;
    const maxH = liesRevealed
      ? Math.max(110, height - 16 - portraitCeiling)
      : Math.max(140, height - margin * 2);
    const bottom = height - 16;
    portraitHosts.forEach((host, index) => {
      const texture = suspectTextures[index];
      if (!texture) {
        throw new Error(`Missing ${sceneAssets.suspects[index]}`);
      }
      const art = portraitSprite(texture, slotW, maxH);
      replaceLayer(host, art);
      const bounds = art.getLocalBounds();
      host.position.set(
        margin + index * (slotW + gap) + (slotW - bounds.width) / 2 - bounds.x,
        bottom - bounds.y - bounds.height,
      );
      if (liesRevealed) {
        const card = quotes[index];
        const cardH = card?.getLocalBounds().height ?? 0;
        if (card) {
          card.position.set(
            bounds.x + (bounds.width - quoteWidth) / 2,
            bounds.y - 8 - cardH,
          );
          host.addChild(card);
        }
        host.hitArea = new Rectangle(
          bounds.x,
          bounds.y - cardH - 16,
          bounds.width,
          bounds.height + cardH + 16,
        );
      } else {
        host.hitArea = new Rectangle(bounds.x, bounds.y - 44, bounds.width, bounds.height + 44);
        const badge = createVisitBadge(visitStatus[index] ?? "unseen");
        badge.position.set(bounds.x + (bounds.width - 34) / 2, bounds.y - 40);
        host.addChild(badge);
      }
    });

    const revealReady = allCorrected() && !liesRevealed;
    lineupPrompt.view.visible = revealReady;
    if (revealReady) {
      const promptW = Math.min(520, width - 48);
      drawLineupPrompt(lineupPrompt, promptW);
      lineupPrompt.view.position.set((width - promptW) / 2, 14);
    }

    scriptErrorView.visible = scriptError !== null;
    if (scriptError) {
      scriptErrorLabel.style.wordWrapWidth = Math.max(200, width - 100);
      scriptErrorLabel.text = scriptError;
      const boxWidth = Math.min(width - 72, scriptErrorLabel.width + 28);
      const boxHeight = scriptErrorLabel.height + 28;
      scriptErrorBg.clear();
      scriptErrorBg
        .roundRect(0, 0, boxWidth, boxHeight, 12)
        .fill({ color: 0xf4efe4, alpha: 0.96 })
        .stroke({ width: 2, color: 0x1c1915 });
      scriptErrorLabel.position.set(14, 14);
      scriptErrorView.position.set(36, 36);
    }
  };

  const showSuspect = (index: number) => {
    suspectIndex = index;
    for (const piece of pieces) piece.view.destroy({ children: true });
    pieces = createPieces(script[suspectIndex] ?? []);
    for (const piece of pieces) textLayer.addChild(piece.view);
    solved = false;
    layout();
  };

  textLayer.on("pointerdown", (event: FederatedPointerEvent) => {
    if (transitioning) return;
    const local = textLayer.toLocal(event.global);
    const piece = pieceAt(pieces, local.x, local.y);
    if (!piece) return;
    event.stopPropagation();
    const correctMark =
      piece.answer === "add" || piece.answer === "remove" || piece.answer === "oxford";
    if (piece.marked && correctMark) return;
    piece.marked = !piece.marked;
    refresh();
  });

  const glass = createMagnifier();
  let cursorClicking = false;
  const setCursorClicking = (clicking: boolean) => {
    cursorClicking = clicking;
    const pointing = clicking || (lineupLayer.visible && allCorrected() && !liesRevealed);
    glass.visible = !pointing;
    page.cursor = pointing ? "pointer" : "none";
  };
  page.addChild(glass);
  const revealCursor = () => lineupLayer.visible && allCorrected() && !liesRevealed;
  page.on("globalpointermove", (event: FederatedPointerEvent) => {
    if (!page.visible) return;
    const pointing = cursorClicking || revealCursor();
    glass.visible = !pointing;
    page.cursor = pointing ? "pointer" : "none";
    const local = page.toLocal(event.global);
    glass.position.set(local.x, local.y);
  });

  const openSuspect = (index: number) => {
    if (transitioning || scriptError || !script[index]) return;
    transitioning = true;
    setCursorClicking(false);
    for (const host of portraitHosts) host.eventMode = "none";
    lineupLayer.visible = false;
    lineupLayer.alpha = 0;
    showSuspect(index);
    setSpeechAlpha(1);
    panelLayer.eventMode = "static";
    transitioning = false;
  };

  const returnToLineup = () => {
    if (transitioning) return;
    transitioning = true;
    setCursorClicking(false);
    panelLayer.eventMode = "none";
    setSpeechAlpha(0);
    const current = visitStatus[suspectIndex];
    if (current !== "corrected") {
      visitStatus[suspectIndex] = solved ? "corrected" : "unfinished";
    }
    layout();
    lineupLayer.visible = true;
    lineupLayer.alpha = 1;
    for (const host of portraitHosts) host.eventMode = "static";
    transitioning = false;
    setCursorClicking(cursorClicking);
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
      if (transitioning) return;
      if (allCorrected() && !liesRevealed) {
        liesRevealed = true;
        layout();
        return;
      }
      setCursorClicking(true);
      void openSuspect(index);
    });
  });

  lineupLayer.on("pointerdown", () => {
    if (transitioning || liesRevealed || !lineupLayer.visible || !allCorrected()) return;
    liesRevealed = true;
    layout();
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
  return page;
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

function piecesWidth(pieces: Piece[]): number {
  let right = 0;
  for (const piece of pieces) {
    if (!piece.view.visible) continue;
    right = Math.max(right, piece.view.x + piece.slotWidth);
  }
  return right;
}

function piecesHeight(pieces: Piece[]): number {
  let bottom = 0;
  for (const piece of pieces) {
    if (!piece.view.visible) continue;
    bottom = Math.max(bottom, piece.view.y + piece.text.height);
  }
  return bottom;
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

type QuoteToken = { text: string; lie: boolean };

function quoteTokens(defs: PieceDef[]): QuoteToken[] {
  const tokens: QuoteToken[] = [];
  for (const def of defs) {
    if (def.text === "," && def.answer === "remove") continue;
    tokens.push({ text: def.text, lie: def.lie ?? false });
    if (
      (def.answer === "add" || def.answer === "oxford") &&
      def.text !== " " &&
      def.text !== ","
    ) {
      tokens.push({ text: ",", lie: false });
    }
  }
  return tokens;
}

const QUOTE_FONTS = [18, 17, 16];

function createQuoteCard(tokens: QuoteToken[], width: number, maxHeight: number): Container {
  let chosen = buildQuote(tokens, width, 16);
  for (const size of QUOTE_FONTS) {
    const card = buildQuote(tokens, width, size);
    if (card.getLocalBounds().height <= maxHeight) {
      chosen.destroy({ children: true });
      chosen = card;
      break;
    }
    card.destroy({ children: true });
  }
  chosen.eventMode = "none";
  return chosen;
}

function buildQuote(tokens: QuoteToken[], width: number, fontSize: number): Container {
  const padX = 10;
  const padY = 8;
  const inner = Math.max(40, width - padX * 2);
  const lineHeight = fontSize * 1.35;
  const view = new Container();
  const content = new Container();
  const lieLayer = new Graphics();
  content.eventMode = "none";
  lieLayer.eventMode = "none";
  content.addChild(lieLayer);

  const glyphs = tokens.map((token) => {
    const text = new Text({
      text: token.text,
      style: { fontFamily: FONT, fontSize, fill: TEXT_COLOR },
    });
    text.eventMode = "none";
    return {
      text,
      lie: token.lie,
      glyphWidth: token.text === " " ? Math.max(text.width, 3) : text.width,
    };
  });

  const units: Array<typeof glyphs> = [];
  for (let index = 0; index < glyphs.length; index += 1) {
    const glyph = glyphs[index];
    const next = glyphs[index + 1];
    if (!glyph) continue;
    if (next && next.text.text === "," && glyph.text.text !== " ") {
      units.push([glyph, next]);
      index += 1;
    } else {
      units.push([glyph]);
    }
  }

  type Placed = { x: number; y: number; width: number; lie: boolean };
  const placed: Placed[] = [];
  let x = 0;
  let y = 0;
  for (const unit of units) {
    const unitWidth = unit.reduce((sum, glyph) => sum + glyph.glyphWidth, 0);
    const onlySpace = unit.length === 1 && unit[0]?.text.text === " ";
    if (x > 0 && x + unitWidth > inner) {
      x = 0;
      y += lineHeight;
      if (onlySpace) continue;
    }
    if (x === 0 && onlySpace) continue;
    for (const glyph of unit) {
      glyph.text.position.set(x, y);
      content.addChild(glyph.text);
      placed.push({ x, y, width: glyph.glyphWidth, lie: glyph.lie });
      x += glyph.glyphWidth;
    }
  }

  let index = 0;
  while (index < placed.length) {
    const start = placed[index];
    if (!start?.lie) {
      index += 1;
      continue;
    }
    let end = index;
    while (end + 1 < placed.length) {
      const next = placed[end + 1];
      if (!next?.lie || next.y !== start.y) break;
      end += 1;
    }
    const last = placed[end];
    if (last) {
      lieLayer
        .roundRect(start.x, start.y - 1, last.x + last.width - start.x, fontSize + 4, 3)
        .fill(RED);
    }
    index = end + 1;
  }

  const textH = glyphs.reduce((tallest, glyph) => Math.max(tallest, glyph.text.height), fontSize);
  const bg = new Graphics();
  bg.eventMode = "none";
  bg.roundRect(0, 0, width, y + textH + padY * 2, 10)
    .fill({ color: 0xf4efe4, alpha: 0.96 })
    .stroke({ width: 2, color: 0x1c1915 });
  content.position.set(padX, padY);
  view.addChild(bg, content);
  view.eventMode = "none";
  return view;
}

function createLineupPrompt(): { view: Container; bg: Graphics; label: Text } {
  const view = new Container();
  const bg = new Graphics();
  const label = new Text({
    text: LINEUP_REVEAL,
    style: {
      fontFamily: FONT,
      fontSize: 16,
      fill: TEXT_COLOR,
      wordWrap: true,
      wordWrapWidth: 480,
      align: "center",
    },
  });
  label.eventMode = "none";
  bg.eventMode = "none";
  view.eventMode = "none";
  view.visible = false;
  view.addChild(bg, label);
  return { view, bg, label };
}

function drawLineupPrompt(prompt: { bg: Graphics; label: Text }, width: number) {
  prompt.label.style.wordWrapWidth = Math.max(200, width - 28);
  const height = prompt.label.height + 20;
  prompt.bg.clear();
  prompt.bg
    .roundRect(0, 0, width, height, 12)
    .fill(0xe7f6ec)
    .stroke({ width: 2, color: GREEN });
  prompt.label.position.set((width - prompt.label.width) / 2, 10);
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

function createVisitBadge(status: "unseen" | "unfinished" | "corrected"): Container {
  const size = 34;
  const view = new Container();
  view.eventMode = "none";
  const bg = new Graphics();
  const fill = status === "corrected" ? GREEN : status === "unfinished" ? RED : YELLOW;
  bg.circle(size / 2, size / 2, size / 2).fill(fill).stroke({ width: 2, color: 0x1c1915 });
  view.addChild(bg);

  if (status === "unseen") {
    const label = new Text({
      text: "?",
      style: { fontFamily: FONT, fontSize: 22, fill: TEXT_COLOR },
    });
    label.anchor.set(0.5);
    label.position.set(size / 2, size / 2 + 1);
    label.eventMode = "none";
    view.addChild(label);
    return view;
  }

  const mark = new Graphics();
  mark.eventMode = "none";
  if (status === "corrected") {
    mark.moveTo(9, 18).lineTo(15, 24).lineTo(26, 11).stroke({ width: 3, color: 0xf4efe4 });
  } else {
    mark.moveTo(10, 10).lineTo(24, 24).stroke({ width: 3, color: 0xf4efe4 });
    mark.moveTo(24, 10).lineTo(10, 24).stroke({ width: 3, color: 0xf4efe4 });
  }
  view.addChild(mark);
  return view;
}

function createToolPlaceholder(kind: "glass" | "bulb"): Container {
  const view = new Container();
  view.eventMode = "none";
  const bg = new Graphics();
  bg.eventMode = "none";
  bg.circle(TOOL_SIZE / 2, TOOL_SIZE / 2, TOOL_SIZE / 2)
    .fill({ color: 0xf4efe4, alpha: 0.96 })
    .stroke({ width: 2, color: 0x1c1915 });
  view.addChild(bg);

  if (kind === "glass") {
    const icon = new Graphics();
    icon.eventMode = "none";
    const cx = 30;
    const cy = 28;
    icon.circle(cx, cy, 13).fill({ color: 0xd7e8f5, alpha: 0.95 }).stroke({ width: 3, color: 0x1c1915 });
    icon.moveTo(cx + 9, cy + 9).lineTo(cx + 22, cy + 22).stroke({ width: 4, color: 0x1c1915 });
    view.addChild(icon);
    return view;
  }

  const icon = createLightBulb();
  icon.position.set((TOOL_SIZE - 48) / 2, (TOOL_SIZE - 46) / 2);
  view.addChild(icon);
  return view;
}

function createLightBulb(): Container {
  const view = new Container();
  view.eventMode = "none";
  const rays = new Graphics();
  const glass = new Graphics();
  const base = new Graphics();
  rays.eventMode = "none";
  glass.eventMode = "none";
  base.eventMode = "none";
  const cx = 24;
  const cy = 20;
  rays.moveTo(cx, 1).lineTo(cx, 6).stroke({ width: 2, color: 0xc8960a });
  rays.moveTo(7, 8).lineTo(11, 12).stroke({ width: 2, color: 0xc8960a });
  rays.moveTo(41, 8).lineTo(37, 12).stroke({ width: 2, color: 0xc8960a });
  glass.circle(cx, cy, 13).fill(YELLOW).stroke({ width: 2, color: 0x1c1915 });
  glass.moveTo(cx - 3, cy - 2).lineTo(cx + 1, cy + 5).lineTo(cx + 4, cy - 1).stroke({
    width: 2,
    color: 0x8a6a10,
  });
  base.roundRect(cx - 8, cy + 11, 16, 8, 2).fill(0x6e6256).stroke({ width: 2, color: 0x1c1915 });
  view.addChild(rays, glass, base);
  return view;
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

function makeSprite(spr: Sprite, x: number, y: number, width: number, height: number): void {
  spr.position.set(x, y);
  spr.width = width;
  spr.height = height;
}

function portraitSprite(texture: Texture, maxWidth: number, maxHeight: number): Sprite {
  const sprite = new Sprite(texture);
  const scale = Math.min(maxWidth / texture.width, maxHeight / texture.height);
  sprite.eventMode = "none";
  makeSprite(sprite, 0, 0, texture.width * scale, texture.height * scale);
  return sprite;
}

async function requireTexture(url: string): Promise<Texture> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Missing ${url}`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error(`Missing ${url}`);
  return Assets.load<Texture>(url);
}

function replaceLayer(layer: Container, next: Container) {
  for (const child of layer.removeChildren()) {
    child.destroy({ children: true });
  }
  layer.addChild(next);
}

