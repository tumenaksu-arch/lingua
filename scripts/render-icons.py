#!/usr/bin/env python3
"""Renders Lingua's app icons from a programmatic design (PIL only, no external assets).

Design: rounded speech bubble in white on brand green (#58CC02) with a bold stylised "L"
cut out in green, plus a small tail at the bottom-left. Outputs (all PNG):
  assets/icon.png                     1024x1024, opaque green background (iOS/App Store)
  assets/adaptive-icon-foreground.png 1024x1024, transparent, mark inside Android safe zone
  assets/adaptive-icon-background.png 1024x1024, solid green
  assets/adaptive-icon-monochrome.png 1024x1024, white mark on transparent (themed icons)
  assets/splash-icon.png              1024x1024, transparent, white mark (used on green splash)
  assets/favicon.png                  48x48
Run: python3 scripts/render-icons.py
"""
from PIL import Image, ImageDraw

GREEN = (0x58, 0xCC, 0x02, 255)
GREEN_DARK = (0x46, 0xA3, 0x02, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)
S = 1024
SS = 4  # supersampling for smooth edges


def mark(size, color, scale=1.0):
    """White (or `color`) speech bubble with an L cut out, centred, on a transparent canvas."""
    w = size * SS
    img = Image.new("RGBA", (w, w), CLEAR)
    d = ImageDraw.Draw(img)
    c = w / 2
    bw = w * 0.62 * scale  # bubble width
    bh = w * 0.50 * scale
    r = bh * 0.28
    x0, y0 = c - bw / 2, c - bh / 2 - w * 0.03 * scale
    x1, y1 = c + bw / 2, c + bh / 2 - w * 0.03 * scale
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=color)
    # tail (bottom-left)
    tail = [
        (x0 + bw * 0.18, y1 - r * 0.2),
        (x0 + bw * 0.12, y1 + bh * 0.22),
        (x0 + bw * 0.40, y1 - r * 0.05),
    ]
    d.polygon(tail, fill=color)
    # stylised L cut out of the bubble
    sw = bw * 0.11  # stroke width
    lx = c - bw * 0.14
    ly0 = y0 + bh * 0.22
    ly1 = y1 - bh * 0.24
    d.rounded_rectangle([lx, ly0, lx + sw, ly1], radius=sw * 0.3, fill=CLEAR)
    d.rounded_rectangle([lx, ly1 - sw, lx + bw * 0.34, ly1], radius=sw * 0.3, fill=CLEAR)
    return img.resize((size, size), Image.LANCZOS)


def on_background(fg, bg_color, size):
    bg = Image.new("RGBA", (size, size), bg_color)
    # subtle darker ring at the bottom for a Duolingo-like "3D" feel
    d = ImageDraw.Draw(bg)
    d.rectangle([0, int(size * 0.92), size, size], fill=GREEN_DARK)
    bg.alpha_composite(fg)
    return bg


def main():
    fg_full = mark(S, WHITE, 1.0)
    on_background(fg_full, GREEN, S).convert("RGB").save("assets/icon.png")
    # Android adaptive: keep the mark inside the inner 66% safe zone
    mark(S, WHITE, 0.78).save("assets/adaptive-icon-foreground.png")
    Image.new("RGBA", (S, S), GREEN).convert("RGB").save("assets/adaptive-icon-background.png")
    mark(S, WHITE, 0.78).save("assets/adaptive-icon-monochrome.png")
    mark(S, WHITE, 1.0).save("assets/splash-icon.png")
    on_background(mark(S, WHITE, 1.0), GREEN, S).resize((48, 48), Image.LANCZOS).convert("RGB").save("assets/favicon.png")
    print("icons written to assets/")


if __name__ == "__main__":
    main()
