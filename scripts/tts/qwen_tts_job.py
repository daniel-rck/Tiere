"""Speech worker for `bun run speech:build` (spec 5.6).

Loads Qwen3-TTS (voice cloned from the designed reference voice) and
faster-whisper once, then answers one JSON job per stdin line:
  {"text": "...", "out": "path.wav", "seed": 7}
with a line "@@ {"out": ..., "heard": ...}" on stdout. Other stdout lines
(library warnings) are ignored by the caller.

Usage: python qwen_tts_job.py '<config json>'
"""

import json
import os
import random
import subprocess
import sys

import numpy as np
import soundfile as sf
import torch
from faster_whisper import WhisperModel
from qwen_tts import Qwen3TTSModel


def reply(payload):
    print("@@ " + json.dumps(payload, ensure_ascii=False), flush=True)


def heard_in(path, model, prompt):
    # Decode with ffmpeg: faster-whisper's own decoder trips over some PyAV versions.
    raw = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
        capture_output=True,
        check=True,
    ).stdout
    audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    segments, _ = model.transcribe(audio, language="de", beam_size=5, initial_prompt=prompt)
    return " ".join(segment.text.strip() for segment in segments)


def main():
    config = json.loads(sys.argv[1])
    torch.set_num_threads(os.cpu_count() or 4)
    tts = Qwen3TTSModel.from_pretrained(config["model"], device_map="cpu", dtype=torch.float32)
    voice = tts.create_voice_clone_prompt(
        ref_audio=config["reference"], ref_text=config["referenceText"]
    )
    asr = WhisperModel(config.get("whisper", "small"), device="cpu", compute_type="int8")
    reply({"ready": True})
    for line in sys.stdin:
        if not line.strip():
            continue
        job = json.loads(line)
        seed = int(job["seed"])
        random.seed(seed)
        np.random.seed(seed)
        torch.manual_seed(seed)
        wavs, rate = tts.generate_voice_clone(
            text=job["text"], language=config["language"], voice_clone_prompt=voice
        )
        sf.write(job["out"], wavs[0], rate)
        reply({"out": job["out"], "heard": heard_in(job["out"], asr, config.get("vocabulary"))})


if __name__ == "__main__":
    main()
