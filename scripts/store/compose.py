"""Frames raw screenshots with captions for store listings and draws the Play feature graphic.
Usage: python3 scripts/store/compose.py <raw_dir> <out_dir> <width> <height>
       python3 scripts/store/compose.py --feature <out.png> <gameplay_raw.png>"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIR = Path("/usr/share/fonts/opentype/inter")
BOLD = str(FONT_DIR / "Inter-ExtraBold.otf")
MED = str(FONT_DIR / "Inter-Medium.otf")
BG_TOP, BG_BOT = (10, 14, 24), (4, 6, 11)
CYAN = (59, 232, 255)
TEXT = (232, 238, 249)
DIM = (154, 166, 191)

CAPTIONS = {
    "1-home": ("100 hand-built escape rooms", "Ten chapters. One way out of each."),
    "2-gameplay": ("One room. One mistake.", "Plan every step before you take it."),
    "3-timer": ("Beat the clock", "Countdowns, timed spikes and pulsing lasers."),
    "4-drones": ("Outsmart the patrol", "Drones, platforms, switches and doors."),
    "5-escaped": ("Earn coins as you escape", "Find hidden caches for bonus rewards."),
    "6-rooms": ("A new twist every chapter", "Keys, portals, crumbling floors and more."),
    "7-shop": ("Make it yours", "Unlock skins, trails, themes and exits."),
}


def gradient(w, h):
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOT)))
    return img


def rounded(im, r):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], radius=r, fill=255)
    out = Image.new("RGBA", im.size)
    out.paste(im, (0, 0), mask)
    return out


def fit_font(path, text, max_w, size):
    while size > 10:
        f = ImageFont.truetype(path, size)
        if f.getlength(text) <= max_w:
            return f
        size -= 2
    return ImageFont.truetype(path, size)


def frame(raw: Image.Image, title: str, sub: str, W: int, H: int) -> Image.Image:
    canvas = gradient(W, H).convert("RGBA")
    d = ImageDraw.Draw(canvas)
    margin = int(W * 0.07)
    tf = fit_font(BOLD, title, W - 2 * margin, int(W * 0.075))
    sf = fit_font(MED, sub, W - 2 * margin, int(W * 0.036))
    ty = int(H * 0.05)
    d.text((W / 2, ty), title, font=tf, fill=TEXT, anchor="mt")
    sy = ty + tf.size + int(H * 0.012)
    d.text((W / 2, sy), sub, font=sf, fill=DIM, anchor="mt")
    top = sy + sf.size + int(H * 0.035)
    avail_h = H - top - int(H * 0.03)
    scale = min(avail_h / raw.size[1], (W - 2 * margin) / raw.size[0])
    shot = raw.convert("RGB").resize((int(raw.size[0] * scale), int(raw.size[1] * scale)), Image.LANCZOS)
    r = int(shot.size[0] * 0.07)
    x = (W - shot.size[0]) // 2
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle([x - 6, top - 6, x + shot.size[0] + 6, top + shot.size[1] + 6], radius=r + 6, fill=CYAN + (90,))
    canvas = Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(W * 0.025)))
    ImageDraw.Draw(canvas).rounded_rectangle([x - 3, top - 3, x + shot.size[0] + 3, top + shot.size[1] + 3], radius=r + 3, fill=(38, 48, 74))
    canvas.alpha_composite(rounded(shot, r), (x, top))
    return canvas.convert("RGB")


def feature(out: str, gameplay: str):
    W, H = 1024, 500
    canvas = gradient(W, H).convert("RGBA")
    raw = Image.open(gameplay).convert("RGB")
    # Crop the board area of the gameplay capture.
    bw, bh = raw.size
    board = raw.crop((0, int(bh * 0.17), bw, int(bh * 0.62)))
    scale = (H * 0.86) / board.size[1]
    board = board.resize((int(board.size[0] * scale), int(board.size[1] * scale)), Image.LANCZOS)
    bx = W - board.size[0] - 30
    canvas.alpha_composite(rounded(board, 24), (bx, (H - board.size[1]) // 2))
    fade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fade)
    for x in range(W):
        a = int(255 * max(0.0, min(1.0, (bx + 120 - x) / 200)))
        fd.line([(x, 0), (x, H)], fill=BG_TOP + (a,))
    canvas = Image.alpha_composite(canvas, fade)
    d = ImageDraw.Draw(canvas)
    f1 = ImageFont.truetype(BOLD, 64)
    d.text((56, 160), "ONE ROOM", font=f1, fill=TEXT)
    d.text((56, 232), "LEFT", font=f1, fill=CYAN)
    d.text((58, 322), "One room. One mistake. Can you escape?", font=ImageFont.truetype(MED, 24), fill=DIM)
    canvas.convert("RGB").save(out)


if __name__ == "__main__":
    if sys.argv[1] == "--feature":
        feature(sys.argv[2], sys.argv[3])
    else:
        raw_dir, out_dir, W, H = Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
        out_dir.mkdir(parents=True, exist_ok=True)
        for name, (t, s) in CAPTIONS.items():
            p = raw_dir / f"{name}.png"
            if p.exists():
                frame(Image.open(p), t, s, W, H).save(out_dir / f"{name}.png")
        print("framed", len(list(out_dir.glob("*.png"))), "images ->", out_dir)
