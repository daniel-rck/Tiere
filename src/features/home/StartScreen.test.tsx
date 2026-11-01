import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { animalsOf, catalog } from "../../content/catalog.ts";
import type { World } from "../../content/types.ts";
import { WorldScreen } from "../world/WorldScreen.tsx";
import { StartScreen } from "./StartScreen.tsx";

describe("StartScreen", () => {
  it("shows the four worlds and opens one", () => {
    const onOpenWorld = vi.fn<(world: World) => void>();
    render(<StartScreen mode="kid" onOpenWorld={onOpenWorld} />);
    const tiles = screen.getAllByRole("button");
    expect(tiles.map((tile) => tile.textContent)).toEqual([
      "🐄Bauernhof",
      "🦒Zoo",
      "🐒Dschungel",
      "🐠Meer",
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Meer/ }));
    expect(onOpenWorld).toHaveBeenCalledWith(expect.objectContaining({ id: "meer" }));
  });

  it("hides the title in the toddler mode (criterion 5)", () => {
    const { rerender } = render(<StartScreen mode="kid" onOpenWorld={() => {}} />);
    expect(screen.getByRole("heading", { name: "Tiere" })).toHaveClass("sr-only");
    rerender(<StartScreen mode="explorer" onOpenWorld={() => {}} />);
    expect(screen.getByRole("heading", { name: "Tiere" })).not.toHaveClass("sr-only");
  });
});

describe("WorldScreen", () => {
  const farm = catalog.worlds.find((world) => world.id === "bauernhof")!;
  const animals = animalsOf(farm.id);

  it("shows one tile per animal, names only for explorers", () => {
    const { container, rerender } = render(
      <WorldScreen world={farm} mode="kid" onBack={() => {}} onOpenAnimal={() => {}} />,
    );
    // Tiles plus the back button.
    expect(screen.getAllByRole("button")).toHaveLength(animals.length + 1);
    expect(container.querySelector(".tile-name")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    rerender(
      <WorldScreen world={farm} mode="explorer" onBack={() => {}} onOpenAnimal={() => {}} />,
    );
    expect(container.querySelectorAll(".tile-name")).toHaveLength(animals.length);
    expect(screen.getByRole("heading", { name: "Bauernhof" })).toBeInTheDocument();
  });

  it("opens an animal by its index and goes back", () => {
    const onOpenAnimal = vi.fn<(index: number) => void>();
    const onBack = vi.fn<() => void>();
    render(<WorldScreen world={farm} mode="kid" onBack={onBack} onOpenAnimal={onOpenAnimal} />);
    fireEvent.click(screen.getByRole("button", { name: "Schwein" }));
    expect(onOpenAnimal).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(onBack).toHaveBeenCalled();
  });
});
