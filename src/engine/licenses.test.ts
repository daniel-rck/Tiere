import { describe, expect, it } from "vitest";
import { checkLicense, licenseUrl, stripHtml } from "./licenses.ts";

describe("checkLicense", () => {
  it.each([
    ["CC0", undefined, "CC0"],
    [undefined, "cc0", "CC0"],
    ["Public domain", "pd", "Public Domain"],
    ["PD-self", undefined, "Public Domain"],
    ["CC BY 2.0", "cc-by-2.0", "CC BY 2.0"],
    ["CC BY 2.5", undefined, "CC BY 2.5"],
    ["CC BY-SA 3.0", "cc-by-sa-3.0", "CC BY-SA 3.0"],
    ["CC BY-SA 4.0", "cc-by-sa-4.0", "CC BY-SA 4.0"],
    ["CC BY-SA 3.0 de", "cc-by-sa-3.0-de", "CC BY-SA 3.0 de"],
    ["CC BY 4.0", undefined, "CC BY 4.0"],
  ])("accepts %s / %s", (shortName, license, name) => {
    expect(checkLicense(shortName, license)).toEqual({ ok: true, name });
  });

  it.each([
    ["CC BY-NC 2.0", "cc-by-nc-2.0"],
    ["CC BY-NC-SA 4.0", undefined],
    ["CC BY-ND 3.0", undefined],
    ["CC BY 1.0", "cc-by-1.0"],
    ["CC BY-SA 1.0", undefined],
    ["GFDL", "gfdl"],
    ["Copyrighted free use", undefined],
    [undefined, undefined],
  ])("rejects %s / %s", (shortName, license) => {
    expect(checkLicense(shortName, license).ok).toBe(false);
  });

  it("prefers the machine code over the display name", () => {
    expect(checkLicense("Some odd name", "cc-by-sa-4.0")).toEqual({
      ok: true,
      name: "CC BY-SA 4.0",
    });
  });
});

describe("stripHtml", () => {
  it("removes tags and entities", () => {
    expect(
      stripHtml('<a href="//commons.wikimedia.org/wiki/User:X">X&amp;Y</a>&nbsp; <b>Z</b>'),
    ).toBe("X&Y Z");
  });
});

describe("licenseUrl", () => {
  it.each([
    ["CC0", "https://creativecommons.org/publicdomain/zero/1.0/"],
    ["Public Domain", "https://creativecommons.org/publicdomain/mark/1.0/"],
    ["CC BY 2.0", "https://creativecommons.org/licenses/by/2.0/"],
    ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"],
    ["CC BY-SA 3.0 de", "https://creativecommons.org/licenses/by-sa/3.0/de/"],
  ])("%s → %s", (name, url) => {
    expect(licenseUrl(name)).toBe(url);
  });

  it("knows nothing else", () => {
    expect(licenseUrl("GFDL")).toBeUndefined();
  });
});
