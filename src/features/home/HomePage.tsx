import { useEffect } from "react";
import { animalsOf, findWorld } from "../../content/catalog.ts";
import { useAppUpdate } from "../../lib/pwa/useAppUpdate.ts";
import { useLayers } from "../../platform/history.ts";
import { useSettings } from "../../platform/storage.ts";
import { GearButton } from "../parents/GearButton.tsx";
import { ParentsArea } from "../parents/ParentsArea.tsx";
import { RefreshIcon } from "../shared/icons.tsx";
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
  const update = useAppUpdate();
  const worldLayer = layers.find((layer) => layer.kind === "world");
  const world = worldLayer ? findWorld(worldLayer.world) : undefined;
  const animals = world ? animalsOf(world.id) : [];
  const viewer = layers.find((layer) => layer.kind === "viewer");
  const parents = layers.some((layer) => layer.kind === "parents");

  // Spec 8: no context menu (long press on a photo), except in the parents' sheet.
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (!(event.target instanceof Element && event.target.closest(".sheet"))) {
        event.preventDefault();
      }
    };
    window.addEventListener("contextmenu", onContextMenu);
    return () => window.removeEventListener("contextmenu", onContextMenu);
  }, []);

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
          controls={
            <>
              {/* A new version waits: an icon, no text (criterion 5). Tapping reloads. */}
              {update.needRefresh && (
                <button
                  type="button"
                  className="update"
                  aria-label="Neue Version laden"
                  onClick={update.reload}
                >
                  <RefreshIcon />
                </button>
              )}
              <GearButton onOpen={() => open({ kind: "parents" })} />
            </>
          }
          onOpenWorld={(next) => open({ kind: "world", world: next.id })}
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
