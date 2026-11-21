import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { createDialogueScreen } from "../game/dialogueScreen.ts";

export default function Game() {
  const hostRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let app = null;
    let cancelled = false;

    (async () => {
      const next = new Application();
      try {
        await next.init({
          background: "#1c1915",
          resizeTo: host,
          antialias: true,
        });
        if (cancelled) {
          next.destroy(true);
          return;
        }
        app = next;
        host.appendChild(next.canvas);
        const screen = await createDialogueScreen(next);
        if (cancelled) {
          app = null;
          next.destroy(true);
          return;
        }
        next.stage.addChild(screen);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not start the game.");
        }
        app = null;
        next.destroy(true);
      }
    })();

    return () => {
      cancelled = true;
      const current = app;
      app = null;
      current?.destroy(true);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", height: "calc(100vh - 96px)", overflow: "hidden" }}
    >
      {error ? <p>{error}</p> : null}
    </div>
  );
}
