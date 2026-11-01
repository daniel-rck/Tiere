// Minimal Wikimedia Commons client for the build-time scripts (spec 5.1):
// serial requests with a pause, an identifying User-Agent, and patient retries
// on rate limits (429/503 with Retry-After).
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import pkg from "../package.json" with { type: "json" };

const API = "https://commons.wikimedia.org/w/api.php";
export const USER_AGENT = `tiere-app/${pkg.version} (github.com/daniel-rck)`;

const MIN_GAP_MS = 1500;
const MAX_ATTEMPTS = 40;
let lastRequest = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET with the shared pause between requests, a 90 s timeout, and patient
 * retries on 429/5xx and network errors (honouring Retry-After). Used for all
 * build-time media sources, not only Commons.
 */
export async function throttledFetch(url: string, maxAttempts = MAX_ATTEMPTS): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const wait = lastRequest + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    let response: Response | undefined;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(90_000),
      });
    } catch (error) {
      if (attempt >= maxAttempts) throw error;
    }
    if (response && response.status !== 429 && response.status < 500) return response;
    if (attempt >= maxAttempts) {
      throw new Error(`Giving up after ${attempt} attempts (${response?.status}) ${url}`);
    }
    // Back off exponentially (5 s, 10 s, 20 s … up to 5 min): Wikimedia
    // throttles a whole client when it keeps asking during a 429.
    const retryAfter = Number(response?.headers.get("retry-after")) * 1000 || 0;
    const backoff = Math.max(retryAfter, Math.min(300_000, 5000 * 2 ** (attempt - 1)));
    if (response?.status === 429 && attempt % 3 === 0) {
      console.warn(`  429: warte ${Math.round(backoff / 1000)} s`);
    }
    await response?.body?.cancel();
    await sleep(backoff + Math.random() * 2000);
  }
}

// API errors that mean "try again later" rather than "your request is wrong".
const TRANSIENT_ERRORS = new Set(["maxlag", "ratelimited", "cirrussearch-too-busy-error"]);

/** GET on the MediaWiki API with JSON format v2. */
export async function apiGet<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params });
  for (let attempt = 1; ; attempt++) {
    const response = await throttledFetch(`${API}?${query}`);
    if (!response.ok) throw new Error(`Commons API ${response.status}: ${await response.text()}`);
    const body = (await response.json()) as T & { error?: { code: string; info: string } };
    if (!body.error) return body;
    if (!TRANSIENT_ERRORS.has(body.error.code) || attempt >= MAX_ATTEMPTS) {
      throw new Error(`Commons API error ${body.error.code}: ${body.error.info}`);
    }
    await sleep(10_000 + Math.random() * 5000);
  }
}

/** Pause between media downloads: upload.wikimedia.org limits clients strictly. */
const DOWNLOAD_GAP_MS = 4000;
let lastDownload = 0;

/**
 * Downloads a file (original or thumbnail) to `dest`, one at a time with a
 * pause. A 429 from the media servers backs off exponentially (30 s, 1 min,
 * 2 min … up to 10 min) instead of hammering them.
 */
export async function download(url: string, dest: string): Promise<void> {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 8; attempt++) {
    const wait = lastDownload + DOWNLOAD_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastDownload = Date.now();
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(120_000),
    }).catch(() => undefined);
    if (response?.ok) break;
    if (response && response.status !== 429 && response.status < 500) break;
    await response?.body?.cancel();
    const retryAfter = Number(response?.headers.get("retry-after")) * 1000 || 0;
    const backoff = Math.max(retryAfter, Math.min(600_000, 30_000 * 2 ** attempt));
    console.warn(`  ${response?.status ?? "Netzfehler"}: warte ${Math.round(backoff / 1000)} s`);
    await sleep(backoff);
  }
  if (!response?.ok) throw new Error(`Download ${response?.status}: ${url}`);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, new Uint8Array(await response.arrayBuffer()));
}

type ExtValue = { value?: string };

export type CommonsFile = {
  title: string;
  pageUrl: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  mime: string;
  extmetadata: Record<string, ExtValue | undefined>;
};

type SearchResponse = {
  query?: {
    pages?: {
      title: string;
      index?: number;
      imageinfo?: {
        url: string;
        descriptionurl: string;
        thumburl?: string;
        width: number;
        height: number;
        mime: string;
        extmetadata?: Record<string, ExtValue>;
      }[];
    }[];
  };
};

/**
 * Full-text search in the File namespace, with image info in the same request.
 * `thumbWidth` should be a standard Commons thumbnail step (e.g. 330, 500, 960).
 */
export async function searchFiles(
  search: string,
  limit: number,
  thumbWidth: number,
): Promise<CommonsFile[]> {
  const body = await apiGet<SearchResponse>({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: String(limit),
    gsrsearch: search,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(thumbWidth),
    iiextmetadatafilter: "LicenseShortName|License|LicenseUrl|Artist|Credit|ImageDescription",
    iiextmetadatalanguage: "de",
  });
  const pages = (body.query?.pages ?? []).toSorted((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const files: CommonsFile[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    files.push({
      title: page.title,
      pageUrl: info.descriptionurl,
      url: info.url,
      thumbUrl: info.thumburl ?? info.url,
      width: info.width,
      height: info.height,
      mime: info.mime,
      extmetadata: info.extmetadata ?? {},
    });
  }
  return files;
}

type InfoResponse = {
  query?: {
    pages?: {
      title: string;
      missing?: boolean;
      imageinfo?: {
        url: string;
        descriptionurl: string;
        thumburl?: string;
        width: number;
        height: number;
        mime: string;
        extmetadata?: Record<string, ExtValue>;
      }[];
    }[];
    normalized?: { from: string; to: string }[];
  };
};

/**
 * Image info for known file titles ("File:…"), 50 per request. Keys are the
 * given titles; `thumbUrl` is a copy scaled to `thumbWidth` (or the original
 * when it is narrower).
 */
export async function fileInfo(
  titles: string[],
  thumbWidth?: number,
): Promise<Map<string, CommonsFile>> {
  const result = new Map<string, CommonsFile>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const body = await apiGet<InfoResponse>({
      action: "query",
      titles: batch.join("|"),
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      ...(thumbWidth ? { iiurlwidth: String(thumbWidth) } : {}),
      iiextmetadatafilter: "LicenseShortName|License|LicenseUrl|Artist|Credit",
      iiextmetadatalanguage: "de",
    });
    const original = new Map(batch.map((title) => [title, title]));
    for (const { from, to } of body.query?.normalized ?? []) original.set(to, from);
    for (const page of body.query?.pages ?? []) {
      const info = page.imageinfo?.[0];
      if (page.missing || !info) continue;
      result.set(original.get(page.title) ?? page.title, {
        title: page.title,
        pageUrl: info.descriptionurl,
        url: info.url,
        thumbUrl: info.thumburl ?? info.url,
        width: info.width,
        height: info.height,
        mime: info.mime,
        extmetadata: info.extmetadata ?? {},
      });
    }
  }
  return result;
}
