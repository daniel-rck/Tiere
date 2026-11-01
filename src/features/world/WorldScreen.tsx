import { useEffect } from "react";
import { animalsOf } from "../../content/catalog.ts";
import type { World } from "../../content/types.ts";
import type { Mode } from "../../platform/storage.ts";
import { BackIcon } from "../shared/icons.tsx";
import { AnimalTile } from "./AnimalTile.tsx";

type Props = {
  world: World;
  mode: Mode;
  onBack: () => void;
  onOpenAnimal: (index: number) => void;
};

/** Spec 3.2: sticky bar in the world colour, grid of animal tiles. */
export function WorldScreen({ world, mode, onBack, onOpenAnimal }: Props) {
  const animals = animalsOf(world.id);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.style.setProperty("--topbar", world.color);
    return () => {
      document.documentElement.style.removeProperty("--topbar");
    };
  }, [world]);

  return (
    <main
      className="screen world"
      style={{ "--c": world.color, "--wink": world.ink } as React.CSSProperties}
    >
      <header className="world-bar">
        <button type="button" className="round-button" aria-label="Zurück" onClick={onBack}>
          <BackIcon />
        </button>
        {/* Criterion 5: no text in the toddler mode, the emoji names the world. */}
        {mode === "kid" ? (
          <span className="world-bar-emoji" role="img" aria-label={world.name}>
            {world.emoji}
          </span>
        ) : (
          <h1 className="world-bar-title">{world.name}</h1>
        )}
      </header>
      <div className="animal-grid">
        {animals.map((animal, index) => (
          <AnimalTile
            key={animal.id}
            animal={animal}
            showName={mode === "explorer"}
            eager={index < 6}
            onOpen={() => onOpenAnimal(index)}
          />
        ))}
      </div>
    </main>
  );
}
