#!/usr/bin/env python3
"""Records every story and WITNESS line.

Two engines:
  gemini (default): Google's Gemini text-to-speech, which acts each line from its persona and
      direction (src/game/voiceDirection.ts). Needs GEMINI_API_KEY in the environment. Never
      commit the key. Optional GEMINI_TTS_MODEL (default gemini-2.5-pro-preview-tts).
  kokoro: the offline Kokoro-82M model (Apache-2.0). Natural but flat; no acting.
      python3 -m pip install kokoro-onnx soundfile, and KOKORO_DIR holding kokoro-v1.0.onnx and
      voices-v1.0.bin from https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Usage:
    python3 scripts/make-voices.py [--engine gemini|kokoro] [--only ID_OR_KEY ...] [--force]

ffmpeg is required for the effects and MP3 encoding. Progress is saved after every clip, so an
interrupted run (or a hit rate limit) picks up where it stopped.

Output: assets/voice/<key>.mp3, assets/voice/manifest.json (what each file was made from, so only
changed lines are re-recorded) and src/services/audio/voiceClips.generated.ts.
"""
import argparse
import base64
import json
import time
import urllib.error
import urllib.request
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "voice")
MANIFEST = os.path.join(OUT, "manifest.json")
TS_OUT = os.path.join(ROOT, "src", "services", "audio", "voiceClips.generated.ts")

FX = {
    # Clean, close voice.
    "none": "highpass=f=70,loudnorm=I=-18:TP=-2:LRA=9",
    # WITNESS: a human voice heard through the facility's monitors, with a faint room echo.
    "monitor": "highpass=f=90,lowpass=f=7000,aecho=0.8:0.55:70|140:0.22|0.1,loudnorm=I=-19:TP=-2:LRA=9",
    # Recovered logs: an old recording, narrower band.
    "log": "highpass=f=220,lowpass=f=4800,acompressor=threshold=-20dB:ratio=3,loudnorm=I=-19:TP=-2:LRA=9",
}

WORDS = {"OK": "okay", "UNIT-7": "Unit 7", "T.R.": "T R"}


def speakable(text: str) -> str:
    """Rewrites things the phonemiser reads badly (all-caps names would be spelled out)."""
    for a, b in WORDS.items():
        text = text.replace(a, b)
    text = re.sub(r"\s\+\s", " and ", text)
    text = re.sub(r"\b([A-Z]{2,})\b", lambda m: m.group(1).capitalize(), text)
    return text


SCENE = "An abandoned underground research facility, sealed for over a year. Quiet, echoing rooms. A small maintenance robot named Pip is finding its way through."


def gemini_prompt(l):
    notes = l.get("direction") or "in the character's usual manner"
    return (
        f"# AUDIO PROFILE\n{l['persona']}\n\n## THE SCENE\n{SCENE}\n\n"
        f"### DIRECTOR'S NOTES\nPerformance: {notes}. Natural human delivery with real feeling, varied pacing and pauses where they help.\n\n"
        f"#### TRANSCRIPT\n{speakable(l['spoken'])}"
    )


def gemini_pcm(l):
    """Returns 24 kHz mono 16-bit PCM for one line, waiting out rate limits."""
    key = os.environ["GEMINI_API_KEY"]
    model = os.environ.get("GEMINI_TTS_MODEL", "gemini-2.5-pro-preview-tts")
    body = {
        "contents": [{"parts": [{"text": gemini_prompt(l)}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": l["cast"]["gemini"]}}},
        },
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    for attempt in range(8):
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = json.load(r)
            part = data["candidates"][0]["content"]["parts"][0]["inlineData"]
            return base64.b64decode(part["data"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")
            if e.code in (429, 500, 503) and attempt < 7:
                wait = 20 * (attempt + 1)
                m = re.search(r'"retryDelay":\s*"(\d+)s"', msg)
                if m:
                    wait = int(m.group(1)) + 2
                if e.code == 429 and "PerDay" in msg:
                    sys.exit(f"Daily quota reached; run again later to continue.\n{msg[:500]}")
                print(f"  {e.code}, retrying in {wait}s", flush=True)
                time.sleep(wait)
                continue
            sys.exit(f"Gemini error {e.code}: {msg[:800]}")
        except (KeyError, IndexError):
            if attempt < 7:
                time.sleep(5)
                continue
            sys.exit(f"Unexpected Gemini response: {json.dumps(data)[:800]}")
    sys.exit("Gemini kept failing")


def lines():
    out = subprocess.run(["npx", "tsx", "scripts/voice-lines.ts"], cwd=ROOT, check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def save_manifest(manifest):
    with open(MANIFEST, "w") as fh:
        json.dump(manifest, fh, indent=1, sort_keys=True)
        fh.write("\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["gemini", "kokoro"], default="gemini")
    ap.add_argument("--only", nargs="*", help="record just these line ids or keys")
    ap.add_argument("--force", action="store_true", help="re-record even unchanged lines")
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    todo = lines()
    wanted = {l["key"] for l in todo}

    kokoro = None
    if args.engine == "kokoro":
        from kokoro_onnx import Kokoro

        kdir = os.environ.get("KOKORO_DIR", ".")
        kokoro = Kokoro(os.path.join(kdir, "kokoro-v1.0.onnx"), os.path.join(kdir, "voices-v1.0.bin"))
    elif not os.environ.get("GEMINI_API_KEY"):
        sys.exit("Set GEMINI_API_KEY (or use --engine kokoro).")

    made = 0
    for i, l in enumerate(todo):
        cast = l["cast"]
        if args.engine == "gemini":
            spec = {"engine": "gemini", "spoken": l["spoken"], "voice": cast["gemini"], "fx": cast["fx"], "persona": l["persona"], "direction": l.get("direction")}
        else:
            spec = {"engine": "kokoro", "spoken": l["spoken"], "voice": cast["voice"], "speed": cast["speed"], "fx": cast["fx"]}
        path = os.path.join(OUT, f"{l['key']}.mp3")
        if args.only and l["key"] not in args.only and l["id"] not in args.only:
            continue
        if not args.force and manifest.get(l["key"]) == spec and os.path.exists(path):
            continue
        with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
            if args.engine == "gemini":
                raw = ["-f", "s16le", "-ar", "24000", "-ac", "1"]
                with open(wav.name, "wb") as fh:
                    fh.write(gemini_pcm(l))
            else:
                import soundfile as sf

                voice = spec["voice"]
                audio, sr = kokoro.create(speakable(spec["spoken"]), voice=voice, speed=spec["speed"], lang="en-gb" if voice.startswith("b") else "en-us")
                sf.write(wav.name, audio, sr)
                raw = []
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", *raw, "-i", wav.name, "-af", FX[spec["fx"]], "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", path],
                check=True,
            )
        manifest[l["key"]] = spec
        made += 1
        save_manifest(manifest)
        print(f"[{i + 1}/{len(todo)}] {l['id']} {spec['voice']}: {spec['spoken'][:60]}", flush=True)

    # Drop recordings of lines that no longer exist.
    for f in os.listdir(OUT):
        key = f[:-4] if f.endswith(".mp3") else None
        if key and key not in wanted:
            os.remove(os.path.join(OUT, f))
            manifest.pop(key, None)
    manifest = {k: manifest[k] for k in sorted(manifest) if k in wanted}
    save_manifest(manifest)

    keys = sorted(k for k in wanted if os.path.exists(os.path.join(OUT, f"{k}.mp3")))
    with open(TS_OUT, "w") as fh:
        fh.write("// Generated by scripts/make-voices.py. Do not edit.\n")
        fh.write("/* eslint-disable @typescript-eslint/no-require-imports */\n")
        fh.write("export const VOICE_CLIPS: Record<string, number> = {\n")
        for k in keys:
            fh.write(f"  '{k}': require('../../../assets/voice/{k}.mp3'),\n")
        fh.write("};\n")
    print(f"recorded {made}, total {len(keys)} of {len(wanted)}")
    if len(keys) < len(wanted):
        sys.exit(1)


if __name__ == "__main__":
    main()
