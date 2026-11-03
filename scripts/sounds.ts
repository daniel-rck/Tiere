// Shared sound processing (spec 5.5): skip leading silence, cut to ≤ 4 s with
// a short fade, normalise to about −16 LUFS, AAC 96 kbit/s in .m4a.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const MAX_SECONDS = 4;
const FADE_OUT = 0.4;

export function processSound(input: string, output: string, offset = 0): void {
  mkdirSync(dirname(output), { recursive: true });
  const filters = [
    // Normalise first, so a quiet recording is not mistaken for silence.
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    // Drop silence before the call starts.
    "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.05",
    "asetpts=PTS-STARTPTS",
    `atrim=start=${offset}:duration=${MAX_SECONDS}`,
    "asetpts=PTS-STARTPTS",
    "afade=t=in:d=0.03",
    `afade=t=out:st=${MAX_SECONDS - FADE_OUT}:d=${FADE_OUT}`,
    "aresample=44100",
  ].join(",");
  execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-i",
      input,
      "-vn",
      "-ac",
      "1",
      "-af",
      filters,
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-map_metadata",
      "-1",
      "-movflags",
      "+faststart",
      output,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
}

/**
 * Speech clips (spec 5.6): trim silence at both ends, normalise to about
 * −16 LUFS, 200 ms lead-in (some players clip the start) and 300 ms tail,
 * AAC 64 kbit/s in .m4a.
 */
export function processSpeech(input: string, output: string): void {
  mkdirSync(dirname(output), { recursive: true });
  const trim = "silenceremove=start_periods=1:start_threshold=-50dB";
  const filters = [
    trim,
    "areverse",
    trim,
    "areverse",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    "adelay=200:all=1",
    "apad=pad_dur=0.3",
    "aresample=44100",
  ].join(",");
  execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-i",
      input,
      "-ac",
      "1",
      "-af",
      filters,
      "-c:a",
      "aac",
      "-b:a",
      "64k",
      "-map_metadata",
      "-1",
      "-movflags",
      "+faststart",
      output,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
}
