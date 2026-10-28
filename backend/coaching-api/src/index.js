import "./load-env.js";
import express from "express";
import { isSpellcheckerReady } from "./coach/heuristics.js";
import { finalizeMechanicsSuggestions } from "./coach/mechanics-pipeline.js";
import {
  assertCoachingInternalSecretConfigured,
  requireCoachingInternalSecret,
} from "./middleware/internal-secret.js";

const PAUSED_DET_MAX = 80;
const TYPING_DET_MAX = 30;

const internalSecret = assertCoachingInternalSecretConfigured();

const app = express();
app.use(express.json({ limit: "512kb" }));

app.get("/", (_req, res) => res.json({ ok: true, service: "mechanics-api" }));
app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "mechanics-api", spellchecker: isSpellcheckerReady() }),
);

app.use(requireCoachingInternalSecret(internalSecret));

app.post("/mechanics", (req, res) => {
  try {
    const { text, coachMode } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text" });
    }
    const mode = coachMode === "typing" ? "typing" : "paused";
    const cap = mode === "paused" ? PAUSED_DET_MAX : TYPING_DET_MAX;
    const suggestions = finalizeMechanicsSuggestions(text.trim().slice(0, 12000), mode, cap);
    res.json({ suggestions });
  } catch (e) {
    console.error("[mechanics-api] error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(8787, "127.0.0.1", () => {
  console.log(
    `[mechanics-api] listening on http://127.0.0.1:8787 spellchecker=${isSpellcheckerReady()}`,
  );
});
