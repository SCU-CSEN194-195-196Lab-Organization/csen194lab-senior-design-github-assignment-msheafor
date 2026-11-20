/**
 * Gets a hint from the backend's POST /game/hint endpoint.
 *
 * Vite forwards /game/... to the FastAPI server (see vite.config.ts).
 * Returns null if the backend is off, slow, or returns an error, so the
 * game can keep showing its built-in hint.
 */

export type Hint = {
  text: string;
  speaker: string;
  grammar_type: string;
};

const TIMEOUT_MS = 2500;

export async function fetchHint(
  caseNumber: number,
  suspectId: number,
): Promise<Hint | null> {
   try {
      const res = await fetch("/game/hint", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ case_number: caseNumber, suspect_id: suspectId }),
         signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return null;
      return (await res.json()) as Hint;
   } catch {
      return null;
   }
}