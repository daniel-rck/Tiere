import { useEffect } from "react";
import { animalsOf, findWorld } from "../../content/catalog.ts";
import { useLayers } from "../../platform/history.ts";
import { say } from "../../platform/speech.ts";
import { useSettings } from "../../platform/storage.ts";
import { GearButton } from "../parents/GearButton.tsx";
import { ParentsArea } from "../parents/ParentsArea.tsx";
import { announce, silence } from "../viewer/announce.ts";
import { Viewer } from "../viewer/Viewer.tsx";
import { WorldScreen } from "../world/WorldScreen.tsx";
import { StartScreen } from "./StartScreen.tsx";

/**
 * The one route: start screen or world as the page, the viewer and the
 * parents' area as layers on top (spec 6, platform/history.ts).
 */
export function HomePage() {
  const { layers, top, open, replaceTop, back } = useLayers();
  const settings = useSettings();
  const worldLayer = layers.find((layer) => layer.kind === "world");
  const world = worldLayer ? findWorld(worldLayer.world) : undefined;
  const animals = world ? animalsOf(world.id) : [];
  const viewer = layers.find((layer) => layer.kind === "viewer");
  const parents = layers.some((layer) => layer.kind === "parents");

  // Escape closes the top layer, like the device's back button (spec 3.3).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back]);

  // Leaving the viewer (back button, Escape) stops speech and sound.
  const viewerOpen = viewer !== undefined;
  useEffect(() => {
    if (!viewerOpen) silence();
  }, [viewerOpen]);

  return (
    <div className={`app mode-${settings.mode}`}>
      {world ? (
        <WorldScreen
          world={world}
          mode={settings.mode}
          onBack={back}
          onOpenAnimal={(index) => {
            const animal = animals[index];
            // Straight from the tap: the first output must come from a user gesture (iOS).
            if (animal) announce(animal, settings);
            open({ kind: "viewer", world: world.id, animal: index });
          }}
        />
      ) : (
        <StartScreen
          mode={settings.mode}
          controls={<GearButton onOpen={() => open({ kind: "parents" })} />}
          onOpenWorld={(next) => {
            // Spec 3.1: in the toddler mode the tile says its world's name.
            if (settings.mode === "kid" && settings.voice) say(next.name);
            open({ kind: "world", world: next.id });
          }}
        />
      )}
      {world && viewer?.kind === "viewer" && (
        <Viewer
          animals={animals}
          index={Math.min(viewer.animal, animals.length - 1)}
          settings={settings}
          onClose={back}
          onChange={(index) => {
            if (top?.kind === "viewer") replaceTop({ ...top, animal: index });
          }}
        />
      )}
      {parents && <ParentsArea settings={settings} onClose={back} />}
    </div>
  );
}
