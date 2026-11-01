// License allowlist for all media sources (spec 5.1): CC0, public
// domain (PD-*), CC BY 2.0–4.0 and CC BY-SA 2.0–4.0, including ported versions
// such as "CC BY-SA 3.0 de". Everything else (NC, ND, GFDL-only, unclear) is out.

export type LicenseCheck = { ok: true; name: string } | { ok: false; name: string; reason: string };

const CC_PATTERN = /^cc[\s-]+(by(?:[\s-]+sa)?)[\s-]+(\d(?:\.\d)?)(?:[\s-]+([a-z]{2,}))?$/;

function normalizeSpaces(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
}

function checkCode(raw: string): LicenseCheck | undefined {
  const value = normalizeSpaces(raw);
  if (value === "") return undefined;
  if (value === "cc0" || value === "cc0 1.0" || value === "cc-zero")
    return { ok: true, name: "CC0" };
  if (
    value === "pd" ||
    value === "public domain" ||
    value.startsWith("pd-") ||
    value.startsWith("pd ")
  ) {
    return { ok: true, name: "Public Domain" };
  }
  if (/\b(nc|nd)\b/.test(value.replace(/-/g, " "))) {
    return { ok: false, name: raw.trim(), reason: "NC/ND" };
  }
  const match = CC_PATTERN.exec(value);
  if (match) {
    const kind = (match[1] ?? "").replace(/[\s-]+/g, "-").toUpperCase();
    const version = Number(match[2]);
    const port = match[3] ? ` ${match[3]}` : "";
    const versionText = Number.isInteger(version) ? version.toFixed(1) : String(version);
    const name = `CC ${kind} ${versionText}${port}`;
    if (version < 2 || version > 4)
      return { ok: false, name, reason: "CC-Version außerhalb 2.0–4.0" };
    return { ok: true, name };
  }
  return undefined;
}

/**
 * Checks a Commons file's license from its extmetadata. `license` is the
 * machine code (`License`, e.g. "cc-by-sa-4.0"), `shortName` the display name
 * (`LicenseShortName`, e.g. "CC BY-SA 4.0"). The code wins when both are known.
 */
export function checkLicense(shortName: string | undefined, license?: string): LicenseCheck {
  const fromCode = license ? checkCode(license) : undefined;
  if (fromCode) return fromCode;
  const fromName = shortName ? checkCode(shortName) : undefined;
  if (fromName) return fromName;
  const name = (shortName ?? license ?? "").trim();
  return { ok: false, name: name || "unbekannt", reason: "nicht auf der Allowlist" };
}

/** Removes HTML from an extmetadata value (Artist, Credit) and collapses whitespace. */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonical deed URL for an allowlisted license name as returned by
 * checkLicense ("CC BY-SA 3.0 de", "CC0", "Public Domain"). Used when the
 * source gives no license URL.
 */
export function licenseUrl(name: string): string | undefined {
  if (name === "CC0") return "https://creativecommons.org/publicdomain/zero/1.0/";
  if (name === "Public Domain") return "https://creativecommons.org/publicdomain/mark/1.0/";
  const match = /^CC (BY(?:-SA)?) (\d\.\d)(?: ([a-z]{2,}))?$/.exec(name);
  if (!match) return undefined;
  const [, kind = "", version = "", port] = match;
  return `https://creativecommons.org/licenses/${kind.toLowerCase()}/${version}/${port ? `${port}/` : ""}`;
}
