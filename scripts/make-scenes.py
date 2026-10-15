#!/usr/bin/env python3
"""Paints the illustrated scenes behind the story cards (src/game/scenes.ts).

Uses Gemini image generation (gemini-2.5-flash-image) through Google Cloud. Needs
GOOGLE_TTS_SA_JSON: a service account key whose project has the Vertex AI (Agent Platform)
API on and whose account has the Agent Platform User role. Never commit the key.
Scenes with Pip are painted from scripts/scene-refs/pip.jpg so the robot stays the same.

Usage:
    python3 scripts/make-scenes.py [--only KEY ...] [--force]

Output: assets/scenes/<key>.jpg (768x1344, JPEG), assets/scenes/manifest.json (the prompt each
file was made from, so only changed scenes are repainted) and
src/services/story/sceneImages.generated.ts.
"""
import argparse
import base64
import importlib.util
import io
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "scenes")
MANIFEST = os.path.join(OUT, "manifest.json")
TS_OUT = os.path.join(ROOT, "src", "services", "story", "sceneImages.generated.ts")
PIP_REF = os.path.join(ROOT, "scripts", "scene-refs", "pip.jpg")
MODEL = os.environ.get("SCENE_MODEL", "gemini-2.5-flash-image")

STYLE = (
    "Cinematic still from a stylised animated film, painterly concept art, teal and amber palette, "
    "soft volumetric light, haze, rich shadows, vertical 9:16 composition with the subject in the middle third "
    "and calm darker space at the bottom for subtitles. Setting: an abandoned underground research facility "
    "called the Meridian Vault, sealed for over a year. No text, no captions, no logos, no watermark."
)

# The OAuth helper lives in the voice script; reuse it.
_spec = importlib.util.spec_from_file_location("make_voices", os.path.join(ROOT, "scripts", "make-voices.py"))
_mv = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mv)


def prompt_for(scene):
    p = f"{scene['shot']}.\n\n{STYLE}"
    if scene.get("pip"):
        p += "\n\nThe small robot in the reference image is Pip. Draw Pip exactly as in the reference: same shape, colours, eyes, antenna and treads."
    return p


def paint(scene):
    sa = json.loads(os.environ["GOOGLE_TTS_SA_JSON"])
    parts = [{"text": prompt_for(scene)}]
    if scene.get("pip"):
        with open(PIP_REF, "rb") as fh:
            parts.insert(0, {"inlineData": {"mimeType": "image/jpeg", "data": base64.b64encode(fh.read()).decode()}})
    body = {"contents": [{"role": "user", "parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "9:16"}}}
    url = f"https://aiplatform.googleapis.com/v1/projects/{sa['project_id']}/locations/global/publishers/google/models/{MODEL}:generateContent"
    for attempt in range(6):
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "Authorization": f"Bearer {_mv.cloud_token()}"})
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                data = json.load(r)
            img = next(p["inlineData"] for p in data["candidates"][0]["content"]["parts"] if "inlineData" in p)
            return base64.b64decode(img["data"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")
            if e.code in (429, 500, 503) and attempt < 5:
                print(f"  {e.code}, retrying in {20 * (attempt + 1)}s", flush=True)
                time.sleep(20 * (attempt + 1))
                continue
            sys.exit(f"Image error {e.code}: {msg[:800]}")
        except (TimeoutError, urllib.error.URLError, KeyError, IndexError, StopIteration) as e:
            if attempt < 5:
                print(f"  {e!r}, retrying in 20s", flush=True)
                time.sleep(20)
                continue
            raise
    sys.exit("Image generation kept failing")


def letterbox(im):
    """Rows of near-black at the top and bottom: the model sometimes paints cinema bars."""
    g = im.convert("L")
    w, h = g.size

    def dark(y):
        row = [g.getpixel((x, y)) for x in range(0, w, 4)]
        return max(row) - min(row) < 8 and sum(row) / len(row) < 24
    top = next((y for y in range(h) if not dark(y)), h)
    bottom = next((y for y in range(h - 1, -1, -1) if not dark(y)), 0)
    return top, h - 1 - bottom


def fill_frame(im):
    """Crops away painted bars and fills 768x1344 again."""
    top, bottom = letterbox(im)
    w, h = im.size
    im = im.crop((0, top, w, h - bottom))
    w, h = im.size
    cw = min(w, round(h * 9 / 16))
    ch = min(h, round(cw * 16 / 9))
    x, y = (w - cw) // 2, (h - ch) // 2
    return im.crop((x, y, x + cw, y + ch)).resize((768, 1344), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="paint just these scene keys")
    ap.add_argument("--force", action="store_true", help="repaint even unchanged scenes")
    args = ap.parse_args()
    if not os.environ.get("GOOGLE_TTS_SA_JSON"):
        sys.exit("Set GOOGLE_TTS_SA_JSON.")

    os.makedirs(OUT, exist_ok=True)
    manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    scenes = json.loads(subprocess.run(["npx", "tsx", "scripts/scene-list.ts"], cwd=ROOT, check=True, capture_output=True, text=True).stdout)
    wanted = {s["key"] for s in scenes}

    for i, s in enumerate(scenes):
        spec = {"model": MODEL, "prompt": prompt_for(s)}
        path = os.path.join(OUT, f"{s['key']}.jpg")
        if args.only and s["key"] not in args.only:
            continue
        if not args.force and manifest.get(s["key"]) == spec and os.path.exists(path):
            continue
        for tries in range(3):
            im = Image.open(io.BytesIO(paint(s))).convert("RGB")
            if letterbox(im)[0] < 24:
                break
            print(f"  {s['key']} came back letterboxed, repainting", flush=True)
        else:
            im = fill_frame(im)
        im.save(path, "JPEG", quality=82, optimize=True, progressive=True)
        manifest[s["key"]] = spec
        with open(MANIFEST, "w") as fh:
            json.dump(manifest, fh, indent=1, sort_keys=True)
            fh.write("\n")
        print(f"[{i + 1}/{len(scenes)}] {s['key']} {im.size}", flush=True)

    for f in os.listdir(OUT):
        if f.endswith(".jpg") and f[:-4] not in wanted:
            os.remove(os.path.join(OUT, f))
    manifest = {k: v for k, v in sorted(manifest.items()) if k in wanted}
    with open(MANIFEST, "w") as fh:
        json.dump(manifest, fh, indent=1, sort_keys=True)
        fh.write("\n")

    keys = sorted(k for k in wanted if os.path.exists(os.path.join(OUT, f"{k}.jpg")))
    os.makedirs(os.path.dirname(TS_OUT), exist_ok=True)
    with open(TS_OUT, "w") as fh:
        fh.write("// Generated by scripts/make-scenes.py. Do not edit.\n")
        fh.write("/* eslint-disable @typescript-eslint/no-require-imports */\n")
        fh.write("export const SCENE_IMAGES: Record<string, number> = {\n")
        for k in keys:
            fh.write(f"  '{k}': require('../../../assets/scenes/{k}.jpg'),\n")
        fh.write("};\n")
    print(f"total {len(keys)} of {len(wanted)}")


if __name__ == "__main__":
    main()
