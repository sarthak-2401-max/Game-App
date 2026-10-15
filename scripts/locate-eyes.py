#!/usr/bin/env python3
"""Finds where Pip's and HALE's eyes are in each painted scene, so the story player can make
them blink and glow. Asks Gemini (vision) for bounding boxes; writes src/game/sceneRigs.generated.json
with each eye as a centre and radius in 0..1 image coordinates. Gemini's boxes are rough, so each
eye is snapped to the glowing disc it points at (amber for Pip, cyan for HALE). Needs numpy, scipy
and Pillow. Re-run after make-scenes.py.

Usage: python3 scripts/locate-eyes.py [--only KEY ...]
"""
import argparse
import base64
import importlib.util
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "game", "sceneRigs.generated.json")
_spec = importlib.util.spec_from_file_location("make_voices", os.path.join(ROOT, "scripts", "make-voices.py"))
_mv = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mv)

ASK = (
    "This is a painted scene. Find these if present and return JSON only, no prose:\n"
    '{"pip": [box, box] or [], "hale": box or null}\n'
    "pip: the two round glowing amber eyes of the small orange robot, left eye first. Each box is the glowing eye disc only.\n"
    "hale: the single large round glowing cyan camera eye on a monitor or wall (the iris disc only, not the whole screen). "
    "If there are several, pick the biggest. Null if none.\n"
    "Each box is [ymin, xmin, ymax, xmax] in 0-1000 image coordinates."
)


def ask(path):
    sa = json.loads(os.environ["GOOGLE_TTS_SA_JSON"])
    with open(path, "rb") as fh:
        img = base64.b64encode(fh.read()).decode()
    body = {
        "contents": [{"role": "user", "parts": [{"inlineData": {"mimeType": "image/jpeg", "data": img}}, {"text": ASK}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0},
    }
    url = f"https://aiplatform.googleapis.com/v1/projects/{sa['project_id']}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent"
    for attempt in range(6):
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "Authorization": f"Bearer {_mv.cloud_token()}"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                text = json.load(r)["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(re.sub(r"^```(json)?|```$", "", text.strip()))
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < 5:
                time.sleep(15 * (attempt + 1))
                continue
            raise


def blobs(px, mask, min_area):
    """Connected glowing regions as (cx, cy, rx, ry, area) in pixels."""
    from scipy import ndimage

    labels, n = ndimage.label(mask)
    out = []
    for i, sl in enumerate(ndimage.find_objects(labels), 1):
        area = int((labels[sl] == i).sum())
        if area < min_area:
            continue
        ys, xs = sl
        out.append(((xs.start + xs.stop) / 2, (ys.start + ys.stop) / 2, (xs.stop - xs.start) / 2, (ys.stop - ys.start) / 2, area))
    return out


def snap(path, rough):
    """Moves Gemini's rough eye boxes onto the actual glowing discs."""
    import numpy as np
    from PIL import Image

    im = np.asarray(Image.open(path).convert("RGB")).astype(int)
    h, w, _ = im.shape
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    rig = {}
    if "pip" in rough:
        # The bright yellow core of each eye; the orange head around it is darker and less green.
        amber = (r > 215) & (g > 160) & (b < 190) & (r - b > 60)
        cands = [c for c in blobs(im, amber, 12) if c[2] < w * 0.08 and 0.5 < c[2] / max(c[3], 1) < 2]
        gx = sum(e["x"] for e in rough["pip"]) / 2 * w
        gy = sum(e["y"] for e in rough["pip"]) / 2 * h
        best = None
        for i, a in enumerate(cands):
            for c in cands[i + 1:]:
                ra, rc = max(a[2], a[3]), max(c[2], c[3])
                dx, dy = abs(a[0] - c[0]), abs(a[1] - c[1])
                if dy > 1.2 * max(ra, rc) or not (1.6 * max(ra, rc) < dx < 7.5 * max(ra, rc)) or max(ra, rc) > 2 * min(ra, rc):
                    continue
                d = ((a[0] + c[0]) / 2 - gx) ** 2 + ((a[1] + c[1]) / 2 - gy) ** 2
                if best is None or d < best[0]:
                    best = (d, a, c)
        if best and best[0] ** 0.5 < w * 0.35:
            # The core is smaller than the whole lit eye; grow it to cover the ring.
            rig["pip"] = sorted(({"x": round(e[0] / w, 4), "y": round(e[1] / h, 4), "rx": round(e[2] * 1.35 / w, 4), "ry": round(e[3] * 1.35 / h, 4)} for e in best[1:]), key=lambda e: e["x"])
    if "hale" in rough:
        cyan = (b > 170) & (g > 170) & (r < 170)
        gx, gy = rough["hale"]["x"] * w, rough["hale"]["y"] * h
        cands = [c for c in blobs(im, cyan, 150) if 0.6 < c[2] / max(c[3], 1) < 1.6]
        if cands:
            c = min(cands, key=lambda c: ((c[0] - gx) ** 2 + (c[1] - gy) ** 2) / c[4])
            if ((c[0] - gx) ** 2 + (c[1] - gy) ** 2) ** 0.5 < w * 0.3:
                rig["hale"] = {"x": round(c[0] / w, 4), "y": round(c[1] / h, 4), "rx": round(c[2] / w, 4), "ry": round(c[3] / h, 4)}
    return rig


def circle(box):
    y0, x0, y1, x1 = box
    return {"x": round((x0 + x1) / 2000, 4), "y": round((y0 + y1) / 2000, 4), "rx": round((x1 - x0) / 2000, 4), "ry": round((y1 - y0) / 2000, 4)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*")
    args = ap.parse_args()
    scenes = json.loads(subprocess.run(["npx", "tsx", "scripts/scene-list.ts"], cwd=ROOT, check=True, capture_output=True, text=True).stdout)
    rigs = json.load(open(OUT)) if os.path.exists(OUT) else {}
    for s in scenes:
        if args.only and s["key"] not in args.only:
            continue
        path = os.path.join(ROOT, "assets", "scenes", f"{s['key']}.jpg")
        found = ask(path)
        rough = {}
        pip = [b for b in (found.get("pip") or []) if isinstance(b, list) and len(b) == 4]
        if s.get("pip") and len(pip) == 2:
            rough["pip"] = [circle(b) for b in pip]
        if "HALE" in s["shot"] and isinstance(found.get("hale"), list):
            rough["hale"] = circle(found["hale"])
        rig = snap(path, rough)
        rigs[s["key"]] = rig
        print(s["key"], json.dumps(rig), flush=True)
    with open(OUT, "w") as fh:
        json.dump({k: rigs[k] for k in sorted(rigs)}, fh, indent=1)
        fh.write("\n")


if __name__ == "__main__":
    main()
