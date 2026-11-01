import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, readSettings } from "../../platform/storage.ts";
import { ParentsArea } from "./ParentsArea.tsx";

afterEach(() => localStorage.clear());

function solve(correct: boolean) {
  const [a, b] = (screen.getByText(/\+/).textContent ?? "").match(/\d+/g)!.map(Number) as [
    number,
    number,
  ];
  const buttons = screen
    .getAllByRole("button")
    .filter((button) => /^\d+$/.test(button.textContent ?? ""));
  const pick = buttons.find((button) => (Number(button.textContent) === a + b) === correct)!;
  fireEvent.click(pick);
}

describe("ParentsArea", () => {
  it("asks a new question after a wrong answer", () => {
    render(<ParentsArea settings={DEFAULT_SETTINGS} onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: "Nur für Eltern" })).toBeInTheDocument();
    solve(false);
    expect(screen.getByText("Nicht richtig. Hier ist eine neue Aufgabe.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nur für Eltern" })).toBeInTheDocument();
  });

  it("opens the settings after the right answer and stores the mode", () => {
    const onClose = vi.fn<() => void>();
    render(<ParentsArea settings={DEFAULT_SETTINGS} onClose={onClose} />);
    solve(true);
    expect(screen.getByRole("heading", { name: "Einstellungen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Entdecker/ }));
    expect(readSettings().mode).toBe("explorer");
    fireEvent.click(screen.getByRole("button", { name: /Tierlaute/ }));
    expect(readSettings().sounds).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Fertig" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("lists the credits with links out", async () => {
    render(<ParentsArea settings={DEFAULT_SETTINGS} onClose={() => {}} />);
    solve(true);
    fireEvent.click(screen.getByRole("button", { name: "Bildnachweise" }));
    // The credits load lazily.
    const links = await screen.findAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    }
  });

  it("closes on Abbrechen", () => {
    const onClose = vi.fn<() => void>();
    render(<ParentsArea settings={DEFAULT_SETTINGS} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(onClose).toHaveBeenCalled();
  });
});
