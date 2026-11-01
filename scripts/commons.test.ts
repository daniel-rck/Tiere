import { describe, expect, it } from "vitest";
import { commonsAudio, commonsThumb, extensionOf } from "./commons.ts";

describe("commonsAudio", () => {
  const ogg = "https://upload.wikimedia.org/wikipedia/commons/3/3b/Cow_moo.ogg?utm_source=x";
  it("points non-MP3 audio at the MP3 transcode", () => {
    expect(commonsAudio(ogg, "application/ogg")).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3b/Cow_moo.ogg/Cow_moo.ogg.mp3",
    );
    expect(extensionOf(commonsAudio(ogg, "audio/wav"))).toBe("mp3");
  });

  it("keeps MP3 files", () => {
    const mp3 = "https://upload.wikimedia.org/wikipedia/commons/3/3b/Cow.mp3";
    expect(commonsAudio(mp3, "audio/mpeg")).toBe(mp3);
  });
});

const ORIGINAL =
  "https://upload.wikimedia.org/wikipedia/commons/f/f4/Ch%C3%A8vre_%2810%29.jpg?utm_source=commons.wikimedia.org";
const thumb = (step: number) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Ch%C3%A8vre_%2810%29.jpg/${step}px-Ch%C3%A8vre_%2810%29.jpg`;

describe("commonsThumb", () => {
  it("caps at 1920 px for large originals", () => {
    expect(commonsThumb(ORIGINAL, 4000)).toBe(thumb(1920));
  });

  it("takes the largest standard step narrower than the original", () => {
    expect(commonsThumb(ORIGINAL, 1920)).toBe(thumb(1280));
    expect(commonsThumb(ORIGINAL, 1600)).toBe(thumb(1280));
    expect(commonsThumb(ORIGINAL, 1280)).toBe(thumb(960));
  });

  it("keeps small originals, without tracking parameters", () => {
    expect(commonsThumb(ORIGINAL, 900)).toBe(ORIGINAL.split("?")[0]);
  });

  it("leaves other hosts alone", () => {
    const url = "https://inaturalist-open-data.s3.amazonaws.com/photos/1/original.jpg";
    expect(commonsThumb(url, 4000)).toBe(url);
  });
});
