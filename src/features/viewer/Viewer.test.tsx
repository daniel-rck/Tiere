import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { animalsOf } from "../../content/catalog.ts";
import { DEFAULT_SETTINGS } from "../../platform/storage.ts";
import { Viewer } from "./Viewer.tsx";

const audio = vi.hoisted(() => ({
  playSound: vi.fn<(src: string) => void>(),
  primeSound: vi.fn<(src: string) => void>(),
  stopSound: vi.fn<() => void>(),
}));
vi.mock("../../platform/audio.ts", () => audio);

const farm = animalsOf("bauernhof");
const cow = farm[0]!;

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

  describe("sound", () => {
    beforeEach(() => vi.clearAllMocks());

    const renderCow = (settings = DEFAULT_SETTINGS, animal = cow) =>
      render(
        <Viewer
          animals={[animal, ...farm.slice(1)]}
          index={0}
          settings={settings}
          onClose={() => {}}
          onChange={() => {}}
        />,
      );

    it("plays only on the sound button", () => {
      const { container } = renderCow();
      expect(audio.playSound).not.toHaveBeenCalled();
      const stage = container.querySelector<HTMLElement>(".stage")!;
      stage.setPointerCapture = () => {}; // jsdom has no pointer capture
      fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerUp(stage, { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.click(screen.getByRole("button", { name: "Nächstes Tier" }));
      expect(audio.playSound).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Tierlaut abspielen: Kuh" }));
      expect(audio.playSound).toHaveBeenCalledWith(cow.sound!.src);
    });

    it("stops the running sound when the animal changes", () => {
      renderCow();
      fireEvent.click(screen.getByRole("button", { name: "Nächstes Tier" }));
      expect(audio.stopSound).toHaveBeenCalled();
    });

    it("hides the button with the sounds off or without a recording", () => {
      const { unmount } = renderCow({ ...DEFAULT_SETTINGS, sounds: false });
      expect(screen.queryByRole("button", { name: /Tierlaut/ })).not.toBeInTheDocument();
      unmount();
      renderCow(DEFAULT_SETTINGS, { ...cow, sound: null });
      expect(screen.queryByRole("button", { name: /Tierlaut/ })).not.toBeInTheDocument();
    });
  });
});
