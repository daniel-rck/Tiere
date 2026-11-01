// Layer stack on top of react-router's history (spec 3.3, 6; criterion 8).
// Tiere has one route; World, Viewer and the parents' area are layers. Every
// opened layer is one history entry carrying the whole stack in its state, so
// the device's back button closes the layers one by one and only leaves the
// app from the start screen. Switching the animal inside the viewer replaces
// the top entry instead of adding one.
import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type Layer =
  | { kind: "world"; world: string }
  | { kind: "viewer"; world: string; animal: number }
  | { kind: "parents" };

type LayerState = { layers: Layer[] };

const isLayer = (value: unknown): value is Layer => {
  if (typeof value !== "object" || value === null) return false;
  const layer = value as Record<string, unknown>;
  switch (layer.kind) {
    case "world":
      return typeof layer.world === "string";
    case "viewer":
      return typeof layer.world === "string" && Number.isInteger(layer.animal);
    case "parents":
      return true;
    default:
      return false;
  }
};

/** The layer stack stored in a history entry's state; anything else is the start screen. */
export function readLayers(state: unknown): Layer[] {
  const layers = (state as Partial<LayerState> | null)?.layers;
  return Array.isArray(layers) && layers.every(isLayer) ? layers : [];
}

export type Layers = {
  layers: Layer[];
  top: Layer | undefined;
  /** Opens a layer on top (one history entry). */
  open: (layer: Layer) => void;
  /** Swaps the top layer without a new history entry (next animal in the viewer). */
  replaceTop: (layer: Layer) => void;
  /** Closes the top layer, like the device's back button. No-op on the start screen. */
  back: () => void;
};

// A reload keeps the history state, but the app always starts on the start
// screen: on the first render, step back to the entry the stack grew from.
let booted = false;

/** For tests: forget that the app has started. */
export function resetBoot(): void {
  booted = false;
}

export function useLayers(): Layers {
  const location = useLocation();
  const navigate = useNavigate();
  const layers = useMemo(() => readLayers(location.state), [location.state]);
  const path = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (booted) return;
    booted = true;
    if (layers.length > 0) void navigate(-layers.length);
  }, [layers.length, navigate]);

  const open = useCallback(
    (layer: Layer) => void navigate(path, { state: { layers: [...layers, layer] } }),
    [layers, navigate, path],
  );
  const replaceTop = useCallback(
    (layer: Layer) =>
      void navigate(path, { replace: true, state: { layers: [...layers.slice(0, -1), layer] } }),
    [layers, navigate, path],
  );
  const back = useCallback(() => {
    if (layers.length > 0) void navigate(-1);
  }, [layers.length, navigate]);

  return { layers, top: layers.at(-1), open, replaceTop, back };
}
