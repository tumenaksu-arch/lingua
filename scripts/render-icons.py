#!/usr/bin/env python3
"""Renders Love-Vox's app icons from a programmatic design (PIL only, no external assets).

Design (EduPilot palette): a minimal "voice wave" of 5 vertical rounded bars of
different heights (an audio level meter, middle bar highest) in copper #d18b63,
plus a small light #e8eaf2 dot suggesting speech, centred on navy #0e1220.
No speech bubble, no letter, no green. Outputs (all PNG):
  assets/icon.png                     1024x1024, opaque navy (iOS/App Store)
  assets/adaptive-icon-foreground.png 1024x1024, transparent, mark in Android safe zone
  assets/adaptive-icon-background.png 1024x1024, solid navy
  assets/adaptive-icon-monochrome.png 1024x1024, white mark on transparent (themed icons)
  assets/splash-icon.png              1024x1024, transparent, copper mark
  assets/favicon.png                  48x48, opaque navy
  public/icons/icon-192.png           192x192, opaque navy
  public/icons/icon-512.png           512x512, opaque navy
  public/icons/maskable-512.png       512x512, opaque navy, mark within central 80%
  public/icons/apple-touch-icon.png   180x180, opaque navy
  mobile-shell/assets/icon-only.png        1024x1024, opaque navy
  mobile-shell/assets/icon-foreground.png  transparent foreground (copper mark)
  mobile-shell/assets/icon-background.png  solid navy
  mobile-shell/assets/splash.png           2732x2732, navy, copper mark ~600px
  mobile-shell/assets/splash-dark.png      2732x2732, navy, copper mark ~600px
Run: python3 scripts/render-icons.py
"""
import os

from PIL import Image, ImageDraw

NAVY = (0x0E, 0x12, 0x20, 255)
COPPER = (0xD1, 0x8B, 0x63, 255)
LIGHT = (0xE8, 0xEA, 0xF2, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)
SS = 2  # supersampling for smooth edges

# relative bar heights (middle highest), as fractions of the mark height
HEIGHTS = (0.42, 0.68, 1.0, 0.68, 0.42)


def mark(size, color, scale=1.0, dot_color=None):
    """Voice wave (5 rounded bars) in `color`, centred, on a transparent canvas.

    The wave spans ~0.62*size horizontally and ~0.60*size vertically (times
    `scale`); `scale` < 1 keeps it inside the Android adaptive safe zone.
    A small light dot at the top-right suggests speech.
    """
    w = size * SS
    img = Image.new("RGBA", (w, w), CLEAR)
    d = ImageDraw.Draw(img)
    c = w / 2
    wave_w = w * 0.62 * scale
    wave_h = w * 0.60 * scale
    n = len(HEIGHTS)
    gap = wave_w * 0.16
    bw = (wave_w - gap * (n - 1)) / n
    x = c - wave_w / 2
    for h in HEIGHTS:
        bh = wave_h * h
        d.rounded_rectangle(
            [x, c - bh / 2, x + bw, c + bh / 2], radius=bw / 2, fill=color
        )
        x += bw + gap
    if dot_color is not None:
        r = bw * 0.42
        dx = c + wave_w / 2 + gap * 0.7
        dy = c - wave_h / 2 - gap * 0.4
        d.ellipse([dx - r, dy - r, dx + r, dy + r], fill=dot_color)
    return img.resize((size, size), Image.LANCZOS)


def on_background(fg, size, bg_color=NAVY):
    bg = Image.new("RGBA", (size, size), bg_color)
    bg.alpha_composite(fg)
    return bg


def main():
    # --- root assets/ ---
    on_background(mark(1024, COPPER, 1.0, LIGHT), 1024).convert("RGB").save("assets/icon.png")
    # Android adaptive: keep the whole mark (incl. dot) inside the inner 66% safe zone
    mark(1024, COPPER, 0.80, LIGHT).save("assets/adaptive-icon-foreground.png")
    Image.new("RGBA", (1024, 1024), NAVY).convert("RGB").save("assets/adaptive-icon-background.png")
    mark(1024, WHITE, 0.80).save("assets/adaptive-icon-monochrome.png")
    mark(1024, COPPER, 1.0, LIGHT).save("assets/splash-icon.png")
    on_background(mark(48, COPPER, 1.0, LIGHT), 48).convert("RGB").save("assets/favicon.png")

    # --- web/PWA icons ---
    os.makedirs("public/icons", exist_ok=True)
    on_background(mark(192, COPPER, 1.0, LIGHT), 192).convert("RGB").save("public/icons/icon-192.png")
    on_background(mark(512, COPPER, 1.0, LIGHT), 512).convert("RGB").save("public/icons/icon-512.png")
    # maskable: mark within the central 80%
    on_background(mark(512, COPPER, 1.15, LIGHT), 512).convert("RGB").save("public/icons/maskable-512.png")
    on_background(mark(180, COPPER, 1.0, LIGHT), 180).convert("RGB").save("public/icons/apple-touch-icon.png")

    # --- Android shell sources ---
    os.makedirs("mobile-shell/assets", exist_ok=True)
    on_background(mark(1024, COPPER, 1.0, LIGHT), 1024).convert("RGB").save("mobile-shell/assets/icon-only.png")
    mark(1024, COPPER, 0.80, LIGHT).save("mobile-shell/assets/icon-foreground.png")
    Image.new("RGBA", (1024, 1024), NAVY).convert("RGB").save("mobile-shell/assets/icon-background.png")
    for name in ("splash.png", "splash-dark.png"):
        on_background(mark(2732, COPPER, 600 / (2732 * 0.62), LIGHT), 2732).convert("RGB").save(
            os.path.join("mobile-shell/assets", name)
        )
    print("icons written to assets/, public/icons/ and mobile-shell/assets/")


if __name__ == "__main__":
    main()
