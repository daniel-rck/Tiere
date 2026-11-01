import { describe, expect, it } from "vitest";
import { checkLicense } from "../licenses.ts";
import { inaturalistLicense } from "./inaturalist.ts";
import { openverseLicense } from "./openverse.ts";

describe("openverseLicense", () => {
  it.each([
    ["by", "2.0", "CC BY 2.0"],
    ["by-sa", "4.0", "CC BY-SA 4.0"],
    ["cc0", "1.0", "CC0"],
    ["pdm", "1.0", "Public Domain"],
  ])("maps %s %s onto the allowlist", (license, version, name) => {
    expect(checkLicense(undefined, openverseLicense(license, version))).toEqual({ ok: true, name });
  });

  it("keeps NC out", () => {
    expect(checkLicense(undefined, openverseLicense("by-nc", "2.0")).ok).toBe(false);
  });
});

describe("inaturalistLicense", () => {
  it.each([
    ["cc0", "CC0"],
    ["cc-by", "CC BY 4.0"],
    ["cc-by-sa", "CC BY-SA 4.0"],
  ])("maps %s onto the allowlist", (code, name) => {
    expect(checkLicense(undefined, inaturalistLicense(code))).toEqual({ ok: true, name });
  });

  it("keeps NC out", () => {
    expect(checkLicense(undefined, inaturalistLicense("cc-by-nc")).ok).toBe(false);
  });
});
