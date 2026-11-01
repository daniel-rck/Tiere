// Animal sounds (spec 3.3, 5.5): one shared <audio> element, so a new tap
// stops the running sound instead of layering it (criterion 3).

let element: HTMLAudioElement | undefined;
let token = 0;

function player(): HTMLAudioElement | undefined {
  if (typeof Audio === "undefined") return undefined;
  element ??= new Audio();
  return element;
}

export function stopSound(): void {
  token++;
  const audio = element;
  if (!audio) return;
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    /* not seekable yet */
  }
}

/** Plays `src` from the start; a later playSound or stopSound cuts it off. */
export function playSound(src: string): void {
  stopSound();
  const audio = player();
  if (!audio) return;
  const mine = token;
  if (!audio.src.endsWith(src)) audio.src = src;
  // Autoplay refused or the file is missing: the name was said, that is enough.
  play(audio, () => {
    if (mine === token) stopSound();
  });
}

/** play() synchronously (iOS wants it inside the gesture), tolerating engines without a promise. */
function play(audio: HTMLAudioElement, onError: () => void): Promise<void> {
  try {
    return Promise.resolve(audio.play()).catch(onError);
  } catch {
    onError();
    return Promise.resolve();
  }
}

/**
 * Unlocks audio on iOS: call from a user gesture before the sound is due (it
 * plays after the name, outside the gesture). A muted play and pause of the
 * shared element there allows later play() calls.
 */
export function primeSound(src: string): void {
  const audio = player();
  if (!audio || audio.dataset.unlocked) return;
  audio.dataset.unlocked = "1";
  audio.src = src;
  audio.muted = true;
  void play(audio, () => undefined).finally(() => {
    audio.pause();
    audio.muted = false;
  });
}
