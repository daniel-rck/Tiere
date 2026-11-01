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

async function throttledFetch(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const wait = lastRequest + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    let response: Response | undefined;
    try {
      response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) throw error;
    }
    if (response && response.status !== 429 && response.status < 500) return response;
    if (attempt >= MAX_ATTEMPTS) {
      throw new Error(`Commons: giving up after ${attempt} attempts (${response?.status}) ${url}`);
    }
    const retryAfter = Number(response?.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000;
    await response?.body?.cancel();
    await sleep(backoff + Math.random() * 2000);
  }
}

/** GET on the MediaWiki API with JSON format v2. */
export async function apiGet<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params });
  const response = await throttledFetch(`${API}?${query}`);
  if (!response.ok) throw new Error(`Commons API ${response.status}: ${await response.text()}`);
  const body = (await response.json()) as T & { error?: { code: string; info: string } };
  if (body.error) throw new Error(`Commons API error ${body.error.code}: ${body.error.info}`);
  return body;
}

/** Downloads a file (original or thumbnail) to `dest`. */
export async function download(url: string, dest: string): Promise<void> {
  const response = await throttledFetch(url);
  if (!response.ok) throw new Error(`Download ${response.status}: ${url}`);
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
