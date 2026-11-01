import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  readSettings,
  useSettings,
  writeSettings,
} from "./storage.ts";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("parseSettings", () => {
  it("defaults to the toddler mode", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.mode).toBe("kid");
  });

  it("ignores broken or unknown values", () => {
    expect(parseSettings("{oops")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"mode":"admin","voice":"ja"}')).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid values", () => {
    expect(parseSettings('{"mode":"explorer","voice":false,"sounds":true}')).toEqual({
      mode: "explorer",
      voice: false,
      sounds: true,
    });
  });
});

describe("settings storage", () => {
  it("survives a reload", () => {
    writeSettings({ mode: "explorer" });
    expect(localStorage.getItem("tiere.settings")).toContain("explorer");
    expect(readSettings().mode).toBe("explorer");
  });

  it("keeps working when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => writeSettings({ voice: false })).not.toThrow();
  });

  it("re-renders on change", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.sounds).toBe(true);
    act(() => writeSettings({ sounds: false }));
    expect(result.current.sounds).toBe(false);
  });
});
