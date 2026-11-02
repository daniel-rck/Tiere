// Settings in localStorage (spec 2, 3.4). Every access is guarded: private
// mode, quota or a blocked storage must never break the app, it then simply
// forgets the settings.
import { useSyncExternalStore } from "react";

export type Mode = "kid" | "explorer";

export type Settings = {
  mode: Mode;
  /** Speak names and facts. */
  voice: boolean;
  /** Play animal sounds. */
  sounds: boolean;
};

export const DEFAULT_SETTINGS: Settings = { mode: "kid", voice: true, sounds: true };

const KEY = "tiere.settings";
const EVENT = "tiere:settings";

/** Reads settings from a stored JSON string; anything unknown falls back to the default. */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof Settings, unknown>>;
    return {
      mode: value.mode === "explorer" ? "explorer" : "kid",
      voice: typeof value.voice === "boolean" ? value.voice : DEFAULT_SETTINGS.voice,
      sounds: typeof value.sounds === "boolean" ? value.sounds : DEFAULT_SETTINGS.sounds,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let cache: { raw: string | null; settings: Settings } | undefined;

export function readSettings(): Settings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* storage unavailable: defaults */
  }
  if (!cache || cache.raw !== raw) cache = { raw, settings: parseSettings(raw) };
  return cache.settings;
}

export function writeSettings(change: Partial<Settings>): void {
  const next = { ...readSettings(), ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the change lasts until the page reloads */
    cache = { raw: cache?.raw ?? null, settings: next };
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The current settings; re-renders when they change (also in another tab). */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, readSettings, () => DEFAULT_SETTINGS);
}

// The parents' onboarding (spec 3.5): shown once per browser session.
const ONBOARDED_KEY = "tiere.onboarded";
let onboardedFallback = false;

export function readOnboarded(): boolean {
  try {
    return sessionStorage.getItem(ONBOARDED_KEY) === "1" || onboardedFallback;
  } catch {
    return onboardedFallback;
  }
}

export function writeOnboarded(): void {
  onboardedFallback = true;
  try {
    sessionStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    /* storage unavailable: remembered until the page reloads */
  }
}
