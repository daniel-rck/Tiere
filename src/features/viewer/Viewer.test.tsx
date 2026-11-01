import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { animalsOf } from "../../content/catalog.ts";
import { DEFAULT_SETTINGS } from "../../platform/storage.ts";
import { Viewer } from "./Viewer.tsx";

const farm = animalsOf("bauernhof");

describe("Viewer", () => {
  it("shows the animal's photo uncropped with its sound word", () => {
    const { container } = render(
      <Viewer
        animals={farm}
        index={0}
        settings={DEFAULT_SETTINGS}
        onClose={() => {}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Kuh" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Kuh" })).toHaveClass("photo-fg");
    expect(container.querySelector(".bubble")?.textContent).toBe("Muuuh!");
    expect(container.querySelectorAll(".dot")).toHaveLength(farm[0]!.photos.length);
  });

  it("switches animals cyclically with the arrows and keys", () => {
    const onChange = vi.fn<(index: number) => void>();
    render(
      <Viewer
        animals={farm}
        index={0}
        settings={DEFAULT_SETTINGS}
        onClose={() => {}}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Vorheriges Tier" }));
    expect(onChange).toHaveBeenLastCalledWith(farm.length - 1);
    fireEvent.click(screen.getByRole("button", { name: "Nächstes Tier" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("closes with the back button", () => {
    const onClose = vi.fn<() => void>();
    render(
      <Viewer
        animals={farm}
        index={2}
        settings={DEFAULT_SETTINGS}
        onClose={onClose}
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a 🤫 for quiet animals", () => {
    const quiet = { ...farm[0]!, voice: { kind: "quiet" as const, text: "Psst." } };
    const { container } = render(
      <Viewer
        animals={[quiet]}
        index={0}
        settings={DEFAULT_SETTINGS}
        onClose={() => {}}
        onChange={() => {}}
      />,
    );
    expect(container.querySelector(".bubble")?.textContent).toBe("🤫");
  });
});
