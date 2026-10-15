#!/usr/bin/env python3
"""Scores the game: one looping music bed per chapter, per story mood, for the menu and for
WITNESS. src/services/audio/sound.ts crossfades between them as the player moves through the game.

Uses Google's Lyria model (lyria-002) through Google Cloud. Needs GOOGLE_TTS_SA_JSON: a service
account key whose project has the Vertex AI (Agent Platform) API on and whose account has the
Agent Platform User role. Never commit the key. ffmpeg is required.

Each ~30 s take is loudness-matched, its tail crossfaded into its head so it loops without a
seam, and encoded as AAC (.m4a, gapless on iOS).

Usage:
    python3 scripts/make-music.py [--only KEY ...] [--force]

Output: assets/music/<key>.m4a, assets/music/manifest.json (the prompt each file was made from,
so only changed beds are re-scored) and src/services/audio/musicBeds.generated.ts.
"""
import argparse
import base64
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "music")
MANIFEST = os.path.join(OUT, "manifest.json")
TS_OUT = os.path.join(ROOT, "src", "services", "audio", "musicBeds.generated.ts")
MODEL = os.environ.get("MUSIC_MODEL", "lyria-002")

STYLE = (
    "Instrumental underscore for a mysterious puzzle game set in the Meridian Vault, an abandoned underground "
    "research facility. Atmospheric and cinematic, steady texture from start to finish so it can loop, "
    "no intro, no big ending, mixed to sit quietly under dialogue and sound effects."
)
NEGATIVE = "vocals, singing, choir, speech, drum kit, upbeat pop, EDM drop, fade out, abrupt ending, applause"

# Keys must match MusicBed in src/services/audio/sound.ts.
BEDS = {
    "menu": "Haunting, curious title theme: a soft felt piano motif over warm analogue pads and gentle tape hiss, distant reverb, a forgotten place waiting to be explored, 70 bpm.",
    # One bed per chapter (src/game/levels/chapters.ts).
    "ch1": "Curious, gentle exploration: plucked music-box tones, soft marimba, airy pads, light mystery, unhurried, 80 bpm.",
    "ch2": "Clockwork mystery: muted ticking percussion, pizzicato strings, low cello drone, locked doors and hidden mechanisms, 90 bpm.",
    "ch3": "Tense and dangerous: pulsing low synth bass, faint metallic scrapes, uneasy high string harmonics, restrained, 95 bpm.",
    "ch4": "Contemplative and focused: slow evolving synth arpeggio, soft electric piano, spacious reverb, calm concentration, 85 bpm.",
    "ch5": "Urgent countdown: a steady ticking clock pulse, tight staccato strings, rising tension that never resolves, 110 bpm.",
    "ch6": "Mechanical motion: rhythmic servo-like synth pulses, a sweeping drone, distant machinery, alert and moving, 100 bpm.",
    "ch7": "Shimmering and disorienting: glassy reversed textures, warped pads, crystalline bells, dreamlike instability, 80 bpm.",
    "ch8": "Intense and layered: a driving low ostinato, soft taiko hits, tense low brass swells, determined, 105 bpm.",
    "ch9": "Brooding and heavy: deep sub drone, slow minor piano chords, distant rumbles, weary resolve, 70 bpm.",
    "ch10": "Climactic yet hopeful: a building string ostinato, warm rising pads, light breaking through darkness, 95 bpm.",
    # Story scenes, by Pip's mood in the shot (src/game/scenes.ts).
    "story-neutral": "Cinematic mystery for storytelling: low strings, soft piano, airy pads, subtle, leaves room for a narrator, 70 bpm.",
    "story-worried": "Uneasy suspense: trembling strings, a low heartbeat pulse, sparse dissonant piano, under a narrator, 75 bpm.",
    "story-determined": "Resolute: a steady low string ostinato, warm horns quietly building, courage, under a narrator, 90 bpm.",
    "story-happy": "Tender and hopeful: warm acoustic piano, soft strings, gentle celesta, under a narrator, 80 bpm.",
    "story-sad": "Melancholic: slow solo cello and piano, sparse and grieving, under a narrator, 60 bpm.",
    "story-surprised": "Awe and discovery: shimmering strings, rising pads, a sense of revelation, under a narrator, 75 bpm.",
    # Under WITNESS's transmissions.
    "witness": "Ominous surveillance drone: deep sub-bass hum, electrical buzz, detuned monitor whine, slow breathing texture, unsettling, no rhythm.",
}

LOOP_S = 28.0  # length of the finished loop
XFADE_S = 3.0  # tail folded into the head
SR = 44100

_spec = importlib.util.spec_from_file_location("make_voices", os.path.join(ROOT, "scripts", "make-voices.py"))
_mv = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mv)


def prompt_for(key):
    return f"{BEDS[key]}\n\n{STYLE}"


def score(key):
    sa = json.loads(os.environ["GOOGLE_TTS_SA_JSON"])
    url = f"https://us-central1-aiplatform.googleapis.com/v1/projects/{sa['project_id']}/locations/us-central1/publishers/google/models/{MODEL}:predict"
    body = {"instances": [{"prompt": prompt_for(key), "negative_prompt": NEGATIVE}], "parameters": {"sample_count": 1}}
    for attempt in range(8):
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "Authorization": f"Bearer {_mv.cloud_token()}"})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                data = json.load(r)
            p = data["predictions"][0]
            return base64.b64decode(p.get("bytesBase64Encoded") or p["audioContent"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")
            if e.code in (429, 500, 503) and attempt < 7:
                print(f"  {e.code}, retrying in {20 * (attempt + 1)}s", flush=True)
                time.sleep(20 * (attempt + 1))
                continue
            raise RuntimeError(f"{key}: HTTP {e.code}: {msg[:300]}")
        except OSError as e:  # timeouts, resets, DNS hiccups
            if attempt < 7:
                print(f"  {e}, retrying in 20s", flush=True)
                time.sleep(20)
                continue
            raise
    raise RuntimeError(f"{key}: gave up")


def read_wav(path):
    with wave.open(path) as w:
        ch, n = w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype="<i2").astype(np.float32) / 32768
    return x.reshape(-1, ch)


def write_wav(path, x):
    with wave.open(path, "w") as w:
        w.setnchannels(x.shape[1])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def make_loop(raw, dest):
    """Loudness-matches a take, folds its tail into its head and encodes it as a seamless loop."""
    with tempfile.TemporaryDirectory() as tmp:
        src, norm, looped = (os.path.join(tmp, n) for n in ("src.wav", "norm.wav", "loop.wav"))
        with open(src, "wb") as fh:
            fh.write(raw)
        # Quiet beds: they sit under the voice lines and sound effects.
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", "loudnorm=I=-20:TP=-2:LRA=7", "-ar", str(SR), "-ac", "2", norm], check=True)
        x = read_wav(norm)
        L, X = int(LOOP_S * SR), int(XFADE_S * SR)
        if len(x) < L + X:
            L = len(x) - X
        # Equal-power crossfade: the loop's last X samples flow into its first X.
        t = np.linspace(0, np.pi / 2, X, dtype=np.float32)[:, None]
        body = x[:L].copy()
        body[:X] = x[:X] * np.sin(t) + x[L : L + X] * np.cos(t)
        write_wav(looped, body)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", looped, "-c:a", "aac", "-b:a", "80k", "-movflags", "+faststart", dest], check=True)


def write_ts():
    keys = sorted(k for k in BEDS if os.path.exists(os.path.join(OUT, f"{k}.m4a")))
    with open(TS_OUT, "w") as fh:
        fh.write("// Generated by scripts/make-music.py. Do not edit.\n/* eslint-disable @typescript-eslint/no-require-imports */\n")
        fh.write("export const MUSIC_BEDS: Record<string, number> = {\n")
        for k in keys:
            fh.write(f"  '{k}': require('../../../assets/music/{k}.m4a'),\n")
        fh.write("};\n")
    print(f"wrote {TS_OUT} ({len(keys)} beds)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--ts-only", action="store_true")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    if not args.ts_only:
        keys = args.only or list(BEDS)
        for i, key in enumerate(keys, 1):
            dest = os.path.join(OUT, f"{key}.m4a")
            if not args.force and manifest.get(key) == prompt_for(key) and os.path.exists(dest):
                continue
            make_loop(score(key), dest)
            manifest[key] = prompt_for(key)
            with open(MANIFEST, "w") as fh:
                json.dump(manifest, fh, indent=2, sort_keys=True)
            print(f"[{i}/{len(keys)}] {key} ({os.path.getsize(dest) // 1024} KB)", flush=True)
    write_ts()


if __name__ == "__main__":
    sys.exit(main())
