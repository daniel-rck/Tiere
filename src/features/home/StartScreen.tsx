import { catalog } from "../../content/catalog.ts";
import type { World } from "../../content/types.ts";
import type { Mode } from "../../platform/storage.ts";

type Props = {
  mode: Mode;
  onOpenWorld: (world: World) => void;
  /** Extra controls in the top bar (gear, update). */
  controls?: React.ReactNode;
};

/** Spec 3.1: four world tiles, always 2×2 like the quadrants of a plane. */
export function StartScreen({ mode, onOpenWorld, controls }: Props) {
  return (
    <main className="screen start">
      <header className="start-head">
        {/* Criterion 5: the toddler mode shows no text besides the world names. */}
        <h1 className={mode === "kid" ? "sr-only" : "start-title"}>Tiere</h1>
        <div className="start-controls">{controls}</div>
      </header>
      <nav className="worlds" aria-label="Welten">
        {catalog.worlds.map((world) => (
          <button
            key={world.id}
            type="button"
            className="world-tile"
            style={{ "--c": world.color, "--wink": world.ink } as React.CSSProperties}
            onClick={() => onOpenWorld(world)}
          >
            <span className="world-emoji" aria-hidden="true">
              {world.emoji}
            </span>
            <span className="world-name">{world.name}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
