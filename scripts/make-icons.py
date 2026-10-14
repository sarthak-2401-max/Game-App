"""Generates original app icon, adaptive icon layers, splash mark and favicon into assets/.
Run: python3 scripts/make-icons.py  (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets"
BG = (7, 9, 15, 255)
FLOOR = (18, 24, 38, 255)
WALL = (38, 47, 69, 255)
EDGE = (58, 71, 102, 255)
CYAN = (59, 232, 255, 255)
AMBER = (255, 181, 71, 255)


def mark(size: int, bg=None, mono=False) -> Image.Image:
    """The room mark: a walled room, an open exit with cyan glow and the player."""
    S = size * 4  # supersample
    img = Image.new("RGBA", (S, S), bg or (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = S * 0.18
    wall = S * 0.075
    x0, y0, x1, y1 = pad, pad, S - pad, S - pad
    fg = (255, 255, 255, 255) if mono else None
    # walls
    d.rounded_rectangle([x0, y0, x1, y1], radius=S * 0.06, fill=fg or WALL, outline=None if mono else EDGE, width=int(S * 0.012))
    # floor
    if not mono:
        d.rounded_rectangle([x0 + wall, y0 + wall, x1 - wall, y1 - wall], radius=S * 0.03, fill=FLOOR)
        n = 4
        cw = (x1 - x0 - 2 * wall) / n
        for i in range(1, n):
            x = x0 + wall + i * cw
            d.line([x, y0 + wall, x, y1 - wall], fill=(26, 34, 52, 255), width=int(S * 0.006))
            y = y0 + wall + i * cw
            d.line([x0 + wall, y, x1 - wall, y], fill=(26, 34, 52, 255), width=int(S * 0.006))
    else:
        d.rounded_rectangle([x0 + wall, y0 + wall, x1 - wall, y1 - wall], radius=S * 0.03, fill=(0, 0, 0, 0))
    # exit gap on the right wall with glow
    gy0, gy1 = S * 0.40, S * 0.60
    if not mono:
        glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.rectangle([x1 - wall * 2.5, gy0 - S * 0.03, x1 + wall * 1.6, gy1 + S * 0.03], fill=(59, 232, 255, 170))
        glow = glow.filter(ImageFilter.GaussianBlur(S * 0.04))
        img = Image.alpha_composite(img, glow)
        d = ImageDraw.Draw(img)
        d.rectangle([x1 - wall, gy0, x1 + 1, gy1], fill=CYAN)
    else:
        d.rectangle([x1 - wall, gy0, x1 + 1, gy1], fill=(0, 0, 0, 0))
    # player
    r = S * 0.075
    cx, cy = S * 0.38, S * 0.5
    if not mono:
        halo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        hd = ImageDraw.Draw(halo)
        hd.ellipse([cx - r * 1.8, cy - r * 1.8, cx + r * 1.8, cy + r * 1.8], fill=(59, 232, 255, 120))
        halo = halo.filter(ImageFilter.GaussianBlur(S * 0.03))
        img = Image.alpha_composite(img, halo)
        d = ImageDraw.Draw(img)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fg or CYAN)
    # path dots to the exit (amber = interactable)
    for i in range(3):
        px = cx + r * 2.1 + i * S * 0.075
        pr = S * 0.014
        d.ellipse([px - pr, cy - pr, px + pr, cy + pr], fill=fg or AMBER)
    return img.resize((size, size), Image.LANCZOS)


def scaled(inner: Image.Image, size: int, scale: float, bg=None) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    s = int(size * scale)
    m = inner.resize((s, s), Image.LANCZOS)
    canvas.alpha_composite(m, ((size - s) // 2, (size - s) // 2))
    return canvas


def main():
    OUT.mkdir(exist_ok=True)
    icon = mark(1024, bg=BG)
    icon.convert("RGB").save(OUT / "icon.png")
    # Adaptive icon: foreground kept inside the 66% safe zone.
    scaled(mark(1024), 1024, 0.78).save(OUT / "android-icon-foreground.png")
    Image.new("RGBA", (1024, 1024), BG).save(OUT / "android-icon-background.png")
    scaled(mark(1024, mono=True), 1024, 0.78).save(OUT / "android-icon-monochrome.png")
    mark(1024).save(OUT / "splash-icon.png")
    mark(64, bg=BG).resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
