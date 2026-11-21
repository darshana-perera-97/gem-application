#!/usr/bin/env python3
"""Generate GemBook gem-mark PNG + platform launcher icons (brand colors)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "images"
ANDROID = ROOT / "android" / "app" / "src" / "main" / "res"
IOS = ROOT / "ios" / "Runner" / "Assets.xcassets" / "AppIcon.appiconset"

PRIMARY = (0xCC, 0x10, 0xFE, 255)
ACCENT = (0xE2, 0x81, 0xFF, 255)
DEEP = (0xA0, 0x0A, 0xD0, 255)
WHITE = (255, 255, 255, 255)


def lerp(a: tuple[int, ...], b: tuple[int, ...], t: float) -> tuple[int, ...]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))


def draw_gem(size: int, *, padding: float = 0.12) -> Image.Image:
    """Draw a faceted gem on a transparent canvas."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    inset = size * padding
    left, top = inset, inset
    right, bottom = size - inset, size - inset
    cx = size / 2
    w = right - left
    h = bottom - top

    # Points matching gem-mark.svg proportions
    tip = (cx, top)
    right_shoulder = (right, top + h * 0.30)
    right_base = (cx + w * 0.28, bottom)
    left_base = (cx - w * 0.28, bottom)
    left_shoulder = (left, top + h * 0.30)
    table = (cx, top + h * 0.38)

    body = [tip, right_shoulder, right_base, left_base, left_shoulder]
    draw.polygon(body, fill=PRIMARY)

    # Crown (top) — lighter accent
    draw.polygon([tip, right_shoulder, table, left_shoulder], fill=lerp(ACCENT, WHITE, 0.25))

    # Left facet — soft light
    left_fill = lerp(PRIMARY, WHITE, 0.22)
    draw.polygon([left_shoulder, table, left_base], fill=left_fill)

    # Right facet — deeper shade
    right_fill = lerp(PRIMARY, DEEP, 0.45)
    draw.polygon([right_shoulder, table, right_base], fill=right_fill)

    # Center pavilion highlight
    mid_l = (cx - w * 0.10, top + h * 0.70)
    mid_r = (cx + w * 0.10, top + h * 0.70)
    draw.polygon([table, mid_r, (cx, bottom), mid_l], fill=(255, 255, 255, 40))

    # Sparkles
    s = max(2, int(size * 0.025))
    draw.ellipse(
        [cx + w * 0.08 - s, top + h * 0.16 - s, cx + w * 0.08 + s, top + h * 0.16 + s],
        fill=(255, 255, 255, 220),
    )
    s2 = max(1, int(size * 0.012))
    draw.ellipse(
        [cx - w * 0.12 - s2, top + h * 0.24 - s2, cx - w * 0.12 + s2, top + h * 0.24 + s2],
        fill=(255, 255, 255, 150),
    )

    return img


def with_background(gem: Image.Image, bg: tuple[int, int, int, int]) -> Image.Image:
    base = Image.new("RGBA", gem.size, bg)
    return Image.alpha_composite(base, gem)


def save_resized(src: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    src.resize((size, size), Image.Resampling.LANCZOS).save(path, "PNG")


def main() -> None:
    master = draw_gem(1024, padding=0.10)
    ASSETS.mkdir(parents=True, exist_ok=True)

    # Transparent brand asset for in-app use
    master.save(ASSETS / "gem-mark.png", "PNG")
    # Smaller web/favicon-friendly
    save_resized(master, ASSETS / "gem-mark-512.png", 512)

    # Android mipmaps (legacy launcher) — transparent gem OK
    android_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, px in android_sizes.items():
        save_resized(master, ANDROID / folder / "ic_launcher.png", px)
        # Adaptive foreground layer (transparent)
        save_resized(master, ANDROID / folder / "ic_launcher_foreground.png", px)

    # Adaptive icon XML background color
    anydpi = ANDROID / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    (anydpi / "ic_launcher.xml").write_text(
        """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/splash_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
""",
        encoding="utf-8",
    )
    (anydpi / "ic_launcher_round.xml").write_text(
        """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/splash_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
""",
        encoding="utf-8",
    )

    # iOS — App Store rejects alpha; composite onto brand canvas #F5F7FA
    ios_bg = (0xF5, 0xF7, 0xFA, 255)
    ios_master = with_background(master, ios_bg)
    ios_specs = [
        ("Icon-App-20x20@1x.png", 20),
        ("Icon-App-20x20@2x.png", 40),
        ("Icon-App-20x20@3x.png", 60),
        ("Icon-App-29x29@1x.png", 29),
        ("Icon-App-29x29@2x.png", 58),
        ("Icon-App-29x29@3x.png", 87),
        ("Icon-App-40x40@1x.png", 40),
        ("Icon-App-40x40@2x.png", 80),
        ("Icon-App-40x40@3x.png", 120),
        ("Icon-App-60x60@2x.png", 120),
        ("Icon-App-60x60@3x.png", 180),
        ("Icon-App-76x76@1x.png", 76),
        ("Icon-App-76x76@2x.png", 152),
        ("Icon-App-83.5x83.5@2x.png", 167),
        ("Icon-App-1024x1024@1x.png", 1024),
    ]
    for name, px in ios_specs:
        save_resized(ios_master, IOS / name, px)

    # Web icons
    web = ROOT / "web" / "icons"
    if web.exists():
        save_resized(with_background(master, ios_bg), web / "Icon-192.png", 192)
        save_resized(with_background(master, ios_bg), web / "Icon-512.png", 512)
        save_resized(master, web / "Icon-maskable-192.png", 192)
        save_resized(master, web / "Icon-maskable-512.png", 512)

    print("Generated gem-mark.png and platform launcher icons.")


if __name__ == "__main__":
    main()
