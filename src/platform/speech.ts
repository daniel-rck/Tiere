// Speech output with the Web Speech API (spec 5.6): a German system voice,
// rate 0.9, pitch 1.1. No German voice → nothing is said, `onEnd` still fires
// so the animal sound plays. Every new output cancels the running one.

const RATE = 0.9;
const PITCH = 1.1;
/** `onend` is unreliable on some engines: continue after this anyway (spec 5.6). */
export const END_FALLBACK_MS = 2000;

let voice: SpeechSynthesisVoice | null | undefined;

/** Prefers a de-DE voice (known good names first), then any German one. */
export function pickGermanVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const german = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("de"));
  return (
    german.find((v) => v.lang === "de-DE" && /Anna|Petra|Helena|Katja|Google/i.test(v.name)) ??
    german.find((v) => v.lang === "de-DE") ??
    german[0] ??
    null
  );
}

function synth(): SpeechSynthesis | undefined {
  return typeof window !== "undefined" && "speechSynthesis" in window
    ? window.speechSynthesis
    : undefined;
}

function currentVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  if (!voice) voice = pickGermanVoice(s.getVoices());
  return voice;
}

synth()?.addEventListener?.("voiceschanged", () => {
  voice = undefined;
});

let token = 0;
let fallback: ReturnType<typeof setTimeout> | undefined;

/** Stops any speech and forgets a pending `onEnd`. */
export function cancelSpeech(): void {
  token++;
  clearTimeout(fallback);
  synth()?.cancel();
}

/**
 * Says `text` in German. `onEnd` runs once when the speech ends, fails or
 * times out — or right away when there is nothing to speak with.
 */
export function say(text: string, onEnd?: () => void): void {
  cancelSpeech();
  const mine = token;
  let done = false;
  const finish = () => {
    if (done || mine !== token) return;
    done = true;
    clearTimeout(fallback);
    onEnd?.();
  };
  const s = synth();
  const german = currentVoice();
  if (!s || !german || !text) {
    finish();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.voice = german;
  utterance.rate = RATE;
  utterance.pitch = PITCH;
  utterance.addEventListener("end", finish);
  utterance.addEventListener("error", finish);
  fallback = setTimeout(finish, Math.max(END_FALLBACK_MS, text.length * 90));
  s.speak(utterance);
}
