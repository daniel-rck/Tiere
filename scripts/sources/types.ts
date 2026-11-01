// A photo from a source other than Wikimedia Commons, normalized for the
// candidate pipeline. `id` is what goes into content/animals.json as `file`
// ("openverse:<uuid>", "inaturalist:<photo id>").
export type ExtraPhoto = {
  id: string;
  /** Human-readable title for the contact sheet. */
  name: string;
  pageUrl: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  /** Machine license code as understood by checkLicense (e.g. "cc-by-sa-4.0", "cc0"). */
  license: string;
  author: string;
};

export type ExtraSource = "openverse" | "inaturalist";
