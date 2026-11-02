import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallChoice } from "./InstallChoice.tsx";

afterEach(() => vi.restoreAllMocks());

/** A `beforeinstallprompt` as Chromium fires it. */
function offerInstall() {
  const prompt = vi.fn<() => Promise<void>>(async () => {});
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return prompt;
}

const button = () => screen.queryByRole("button", { name: /App installieren/ });

describe("InstallChoice", () => {
  it("shows nothing while the browser offers no install", () => {
    render(<InstallChoice />);
    expect(button()).toBeNull();
  });

  it("prompts once the browser offers it, then hides", async () => {
    render(<InstallChoice />);
    const prompt = offerInstall();
    fireEvent.click(button()!);
    expect(prompt).toHaveBeenCalled();
    // The prompt event is used up: the button goes away.
    await act(async () => {});
    expect(button()).toBeNull();
  });

  it("shows nothing when installed", () => {
    const original = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      ...original(query),
      matches: query === "(display-mode: fullscreen)",
    }));
    const { rerender } = render(<InstallChoice />);
    const prompt = offerInstall();
    expect(button()).toBeNull();
    // Back in a tab, use the event up: the next test starts without one.
    vi.restoreAllMocks();
    rerender(<InstallChoice />);
    fireEvent.click(button()!);
    expect(prompt).toHaveBeenCalled();
  });

  it("explains the steps on iOS", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
    );
    render(<InstallChoice />);
    expect(screen.queryByText(/Zum Home-Bildschirm/)).toBeNull();
    fireEvent.click(button()!);
    expect(button()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Zum Home-Bildschirm/)).toBeInTheDocument();
  });
});
