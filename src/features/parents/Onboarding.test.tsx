import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, readSettings } from "../../platform/storage.ts";
import { Onboarding } from "./Onboarding.tsx";

afterEach(() => localStorage.clear());

describe("Onboarding", () => {
  it("explains the app, points to the gear and sets the mode", () => {
    const onDone = vi.fn<() => void>();
    render(<Onboarding settings={DEFAULT_SETTINGS} onDone={onDone} />);
    expect(screen.getByRole("dialog", { name: "Willkommen bei Tiere" })).toBeInTheDocument();
    expect(screen.getByText(/hinter dem Zahnrad oben rechts/)).toBeInTheDocument();
    // Focus starts on the first control.
    expect(screen.getByRole("button", { name: /Kleinkind/ })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /Entdecker/ }));
    expect(readSettings().mode).toBe("explorer");
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Los geht's" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("does not close on Escape", () => {
    const onDone = vi.fn<() => void>();
    render(<Onboarding settings={DEFAULT_SETTINGS} onDone={onDone} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDone).not.toHaveBeenCalled();
  });
});
