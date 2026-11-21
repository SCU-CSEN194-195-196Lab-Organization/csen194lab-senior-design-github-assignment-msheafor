export type Answer = "remove" | "add" | "oxford";

export type PieceDef = {
  text: string;
  answer?: Answer;
  fix?: string;
  lie?: boolean;
};

type WordPair = [string, string];

type SuspectScript = {
  text: string;
  remove?: string[];
  add?: WordPair[];
  oxford?: WordPair[];
  lies?: string[];
};

type ScriptFile = {
  suspects: SuspectScript[];
};

type Token = PieceDef & { start: number; end: number };

export async function loadSuspectScript(): Promise<{
  suspects: PieceDef[][];
  error: string | null;
}> {
  try {
    const response = await fetch("/suspects.json");
    if (!response.ok) {
      return {
        suspects: [],
        error: "Could not load suspects.json. Add it under public/suspects.json and refresh.",
      };
    }
    const data = (await response.json()) as ScriptFile;
    if (!Array.isArray(data.suspects) || data.suspects.length === 0) {
      return { suspects: [], error: "suspects.json does not list any suspects." };
    }
    return {
      suspects: data.suspects.map((suspect, index) => tokenizeSuspect(suspect, index + 1)),
      error: null,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Could not read suspects.json.";
    return { suspects: [], error: detail };
  }
}

function tokenizeSuspect(suspect: SuspectScript, number: number): PieceDef[] {
  if (typeof suspect.text !== "string" || suspect.text.length === 0) {
    throw new Error(`Suspect ${number} is missing the testimony line.`);
  }

  const remove = new Set(listStrings(suspect.remove, number, "remove"));
  const add = listPairs(suspect.add, number, "add");
  const oxford = listPairs(suspect.oxford, number, "oxford");
  const lies = listStrings(suspect.lies, number, "lies");
  const pieces = splitLine(suspect.text, remove, number);
  markGaps(pieces, add, "add", number);
  markGaps(pieces, oxford, "oxford", number);
  markLies(pieces, suspect.text, lies, number);

  return pieces.map(({ text, answer, fix, lie }) => ({
    text,
    ...(answer ? { answer } : {}),
    ...(fix ? { fix } : {}),
    ...(lie ? { lie } : {}),
  }));
}

function splitLine(text: string, remove: Set<string>, number: number): Token[] {
  const pieces: Token[] = [];
  const found = new Set<string>();
  let index = 0;

  while (index < text.length) {
    const character = text[index] ?? "";
    if (character === " " || character === "\n" || character === "\t") {
      pieces.push({ text: character, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    let end = index;
    while (
      end < text.length &&
      text[end] !== " " &&
      text[end] !== "\n" &&
      text[end] !== "\t"
    ) {
      end += 1;
    }
    const token = text.slice(index, end);
    const stem = token.endsWith(",") ? token.slice(0, -1) : "";
    if (stem && remove.has(stem)) {
      pieces.push({
        text: stem,
        answer: "remove",
        fix: stem,
        start: index,
        end: index + stem.length,
      });
      pieces.push({
        text: ",",
        answer: "remove",
        fix: stem,
        start: index + stem.length,
        end: end,
      });
      found.add(stem);
    } else {
      pieces.push({ text: token, start: index, end });
    }
    index = end;
  }

  for (const word of remove) {
    if (!found.has(word)) {
      throw new Error(
        `Suspect ${number}: could not find the comma after "${word}" to remove.`,
      );
    }
  }

  for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex += 1) {
    const piece = pieces[pieceIndex];
    const space = pieces[pieceIndex + 1];
    if (piece?.text === "," && piece.answer === "remove" && space?.text === " ") {
      space.answer = "remove";
      space.fix = piece.fix;
    }
  }

  return pieces;
}

function markGaps(
  pieces: Token[],
  pairs: WordPair[],
  answer: "add" | "oxford",
  number: number,
): void {
  const used = new Set<number>();
  for (const [left, right] of pairs) {
    const match = pieces.findIndex((piece, index) => {
      if (used.has(index) || piece.text !== left || piece.answer === "remove") return false;
      return nextWord(pieces, index) === right;
    });
    if (match < 0) {
      throw new Error(
        `Suspect ${number}: could not find a comma spot between "${left}" and "${right}".`,
      );
    }
    const space = pieces[match + 1];
    if (space?.text !== " ") {
      throw new Error(
        `Suspect ${number}: "${left}" and "${right}" need a single space between them.`,
      );
    }
    const fix = answer === "add" ? left : undefined;
    pieces[match].answer = answer;
    if (fix) pieces[match].fix = fix;
    space.answer = answer;
    if (fix) space.fix = fix;
    used.add(match);
  }
}

function markLies(pieces: Token[], text: string, lies: string[], number: number): void {
  for (const phrase of lies) {
    const start = text.indexOf(phrase);
    if (start < 0) {
      throw new Error(`Suspect ${number}: could not find the lie "${phrase}".`);
    }
    const end = start + phrase.length;
    for (const piece of pieces) {
      const overlaps = piece.end > start && piece.start < end;
      const inside = piece.start >= start && piece.end <= end;
      if (overlaps && !inside) {
        throw new Error(`Suspect ${number}: the lie "${phrase}" splits a word.`);
      }
      if (inside) piece.lie = true;
    }
  }
}

function nextWord(pieces: Token[], index: number): string | null {
  for (let cursor = index + 1; cursor < pieces.length; cursor += 1) {
    const piece = pieces[cursor];
    if (!piece || piece.text.trim() === "") continue;
    return piece.text;
  }
  return null;
}

function listStrings(value: string[] | undefined, number: number, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`Suspect ${number}: "${label}" must be a list of phrases.`);
  }
  return value;
}

function listPairs(value: WordPair[] | undefined, number: number, label: string): WordPair[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some(
      (pair) =>
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        typeof pair[0] !== "string" ||
        typeof pair[1] !== "string" ||
        pair[0].length === 0 ||
        pair[1].length === 0,
    )
  ) {
    throw new Error(
      `Suspect ${number}: "${label}" must be a list of word pairs, such as ["week", "ask"].`,
    );
  }
  return value;
}
