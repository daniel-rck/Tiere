import { useEffect } from "react";
import { findWorld } from "../../content/catalog.ts";
import { useLayers } from "../../platform/history.ts";
import { useSettings } from "../../platform/storage.ts";
import { WorldScreen } from "../world/WorldScreen.tsx";
import { StartScreen } from "./StartScreen.tsx";

/**
 * The one route: start screen or world as the page, the viewer and the
 * parents' area as layers on top (spec 6, platform/history.ts).
 */
export function HomePage() {
  const { layers, open, back } = useLayers();
  const settings = useSettings();
  const worldLayer = layers.find((layer) => layer.kind === "world");
  const world = worldLayer ? findWorld(worldLayer.world) : undefined;

  // Escape closes the top layer, like the device's back button (spec 3.3).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back]);

  return (
    <div className={`app mode-${settings.mode}`}>
      {world ? (
        <WorldScreen
          world={world}
          mode={settings.mode}
          onBack={back}
          onOpenAnimal={(animal) => open({ kind: "viewer", world: world.id, animal })}
        />
      ) : (
        <StartScreen
          mode={settings.mode}
          onOpenWorld={(next) => open({ kind: "world", world: next.id })}
        />
      )}
    </div>
  );
}
