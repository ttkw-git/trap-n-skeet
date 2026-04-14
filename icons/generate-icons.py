"""
Generate icon-192.png and icon-512.png for the Trap N Skeet PWA.
Run: python icons/generate-icons.py
Requires: pip install Pillow
"""
import math, struct, zlib, os, sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillow not found. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "--quiet"])
    from PIL import Image, ImageDraw

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def draw_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2

    # Background circle
    d.ellipse([0, 0, size-1, size-1], fill=(*hex_to_rgb('#1e1e1e'), 255))

    # Orange ring
    ring_r     = int(size * 0.86 / 2)
    ring_w     = max(3, int(size * 0.035))
    ring_box   = [cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r]
    d.ellipse(ring_box, outline=(*hex_to_rgb('#e67e22'), 255), width=ring_w)

    # Clay target — outer orange ellipse
    tx, ty = cx, int(cy * 0.7)
    rw, rh = int(size * 0.14), int(size * 0.042)
    d.ellipse([tx-rw, ty-rh, tx+rw, ty+rh], fill=(*hex_to_rgb('#e67e22'), 255))
    # Inner red ring
    rw2, rh2 = int(size * 0.10), int(size * 0.03)
    d.ellipse([tx-rw2, ty-rh2, tx+rw2, ty+rh2], fill=(*hex_to_rgb('#c0392b'), 255))
    # Center orange dot
    rw3, rh3 = int(size * 0.06), int(size * 0.018)
    d.ellipse([tx-rw3, ty-rh3, tx+rw3, ty+rh3], fill=(*hex_to_rgb('#e67e22'), 220))

    # Gun barrel
    bx1 = int(size * 0.18)
    bx2 = int(size * 0.63)
    by  = int(cy + size * 0.10)
    bh  = max(4, int(size * 0.04))
    d.rounded_rectangle([bx1, by - bh//2, bx2, by + bh//2],
                         radius=bh//2, fill=(*hex_to_rgb('#a0a0a0'), 255))

    # Stock triangle
    stock_pts = [
        (bx1, by - bh//2),
        (int(size * 0.10), by + int(size * 0.04)),
        (int(size * 0.14), by + int(size * 0.10)),
        (int(size * 0.26), by + int(size * 0.02)),
    ]
    d.polygon(stock_pts, fill=(*hex_to_rgb('#5a3e2b'), 255))

    # Dashed sight line from barrel tip to clay target
    x1, y1 = bx2, by
    x2, y2 = tx, ty + rh
    # Draw dashes
    steps  = 12
    for i in range(0, steps, 2):
        px1 = int(x1 + (x2 - x1) * i / steps)
        py1 = int(y1 + (y2 - y1) * i / steps)
        px2 = int(x1 + (x2 - x1) * (i+1) / steps)
        py2 = int(y1 + (y2 - y1) * (i+1) / steps)
        d.line([(px1, py1), (px2, py2)],
               fill=(*hex_to_rgb('#e67e22'), 180), width=max(2, size//100))

    return img

for size in [192, 512]:
    img  = draw_icon(size)
    dest = os.path.join(OUT_DIR, f'icon-{size}.png')
    img.save(dest, 'PNG')
    print(f'Written: {dest}')

print('Done!')
