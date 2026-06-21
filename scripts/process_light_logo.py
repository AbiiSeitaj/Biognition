"""Remove black background from Biognition logo for beige/light theme."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\abii\.cursor\projects\c-Users-abii-Desktop-junction-dr-scan\assets"
    r"\c__Users_abii_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-31299fae-4c11-4bd5-84cf-c1c4f8a10fee.png"
)
OUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "brand" / "biognition-light.png"

BLACK_THRESHOLD = 28


def is_background(r: int, g: int, b: int) -> bool:
    return r <= BLACK_THRESHOLD and g <= BLACK_THRESHOLD and b <= BLACK_THRESHOLD


def flood_fill_background(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    pixels = rgba.load()
    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or x >= w or y < 0 or y >= h or visited[y][x]:
            continue
        r, g, b, _ = pixels[x, y]
        if not is_background(r, g, b):
            continue
        visited[y][x] = True
        pixels[x, y] = (r, g, b, 0)
        q.append((x + 1, y))
        q.append((x - 1, y))
        q.append((x, y + 1))
        q.append((x, y - 1))

    # Soften dark fringe on teal edges
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if r < 45 and g < 45 and b < 45:
                pixels[x, y] = (r, g, b, 0)
            elif max(r, g, b) < 70 and (r + g + b) < 120:
                alpha = int((max(r, g, b) / 70) * 255)
                pixels[x, y] = (r, g, b, alpha)

    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    return rgba


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Source not found: {SRC}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    result = flood_fill_background(Image.open(SRC))
    result.save(OUT, "PNG", optimize=True)
    alpha = result.getchannel("A")
    hist = alpha.histogram()
    total = result.size[0] * result.size[1]
    transparent = sum(hist[:5])
    opaque = sum(hist[250:])
    print(f"Saved {OUT} size={result.size} transparent={transparent}/{total} opaque={opaque}/{total}")


if __name__ == "__main__":
    main()
