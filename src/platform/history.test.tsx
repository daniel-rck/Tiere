import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { type Layers, readLayers, resetBoot, useLayers } from "./history.ts";

function setup(initialState?: unknown) {
  const box: { current?: Layers } = {};
  function Probe() {
    const layers = useLayers();
    useEffect(() => {
      box.current = layers;
    });
    return null;
  }
  const router = createMemoryRouter([{ path: "/", Component: Probe }], {
    initialEntries: [{ pathname: "/", state: initialState }],
  });
  render(<RouterProvider router={router} />);
  return { get: () => box.current!, router };
}

beforeEach(() => {
  resetBoot();
});

describe("readLayers", () => {
  it("treats a missing or foreign state as the start screen", () => {
    expect(readLayers(null)).toEqual([]);
    expect(readLayers({ layers: [{ kind: "nope" }] })).toEqual([]);
    expect(readLayers({ usr: 1 })).toEqual([]);
  });

  it("reads a valid stack", () => {
    const layers = [
      { kind: "world", world: "zoo" },
      { kind: "viewer", world: "zoo", animal: 2 },
    ];
    expect(readLayers({ layers })).toEqual(layers);
  });
});

describe("useLayers", () => {
  it("opens and closes layers one by one", async () => {
    const app = setup();
    expect(app.get().layers).toEqual([]);
    await act(async () => app.get().open({ kind: "world", world: "meer" }));
    await act(async () => app.get().open({ kind: "viewer", world: "meer", animal: 0 }));
    expect(app.get().top).toEqual({ kind: "viewer", world: "meer", animal: 0 });

    await act(async () => app.get().replaceTop({ kind: "viewer", world: "meer", animal: 1 }));
    expect(app.get().layers).toHaveLength(2);

    await act(async () => app.get().back());
    expect(app.get().layers).toEqual([{ kind: "world", world: "meer" }]);
    await act(async () => app.get().back());
    expect(app.get().layers).toEqual([]);
  });

  it("does not leave the app from the start screen", async () => {
    const app = setup();
    await act(async () => app.get().back());
    expect(app.router.state.location.pathname).toBe("/");
    expect(app.get().layers).toEqual([]);
  });
});
