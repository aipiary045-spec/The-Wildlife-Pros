#!/usr/bin/env python3
"""Write branded CritterOps PNG icons without extra dependencies."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ORANGE = (232, 93, 4, 255)
AMBER = (244, 140, 6, 255)
GOLD = (249, 199, 79, 255)
INK = (17, 17, 17, 255)
PAPER = (246, 239, 228, 255)


def png(width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixels[y * width + x])
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
            chunk(b"IEND", b""),
        ]
    )


def lerp(a: tuple[int, int, int, int], b: tuple[int, int, int, int], t: float) -> tuple[int, int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))  # type: ignore[return-value]


def inside_hex(x: float, y: float, cx: float, cy: float, r: float) -> bool:
    dx = abs(x - cx) / r
    dy = abs(y - cy) / r
    return dy <= 0.866 and dx <= 1 - dy * 0.577


def render(size: int, maskable: bool = False) -> bytes:
    pad = int(size * 0.18) if maskable else int(size * 0.08)
    cx = cy = size / 2
    r = (size / 2) - pad
    pixels: list[tuple[int, int, int, int]] = []
    for y in range(size):
        for x in range(size):
            if not inside_hex(x + 0.5, y + 0.5, cx, cy, r):
                pixels.append(PAPER if maskable else INK)
                continue
            t = (y - (cy - r)) / (2 * r)
            if t < 0.5:
                pixels.append(lerp(ORANGE, AMBER, t * 2))
            else:
                pixels.append(lerp(AMBER, GOLD, (t - 0.5) * 2))
    return png(size, size, pixels)


def main() -> None:
    out = Path("public/icons")
    out.mkdir(parents=True, exist_ok=True)
    (out / "icon-192.png").write_bytes(render(192))
    (out / "icon-512.png").write_bytes(render(512))
    (out / "icon-512-maskable.png").write_bytes(render(512, maskable=True))
    (out / "apple-touch-icon.png").write_bytes(render(180))


if __name__ == "__main__":
    main()
