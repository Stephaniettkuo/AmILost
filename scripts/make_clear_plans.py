"""Makes assets/gdc-N-clear.png from the floor plans in assets/gdc-N.png.

- The white page becomes transparent and the black lines become sepia ink, so the plan sits
  on the parchment instead of looking like a pasted screenshot.
- Everything outside the building (page border, title block, UT logo) is erased.
- The picture size is NOT changed, so every x/y in src/data/gdc.ts still lines up.
The originals stay in assets/ (the map editor still uses them).

How the "building" box is found:
- Floors that already have map points (1-3): the box around those points, plus MARGIN.
- Floors with no map points yet (4-7): the box around the ink inside the page border and
  above the title block (the title block starts at the first long horizontal line).

Run:  python3 scripts/make_clear_plans.py          (all floors)
      python3 scripts/make_clear_plans.py 4 5 6 7  (just these floors)
"""
import re
import sys
import numpy as np
from PIL import Image

INK = (59, 42, 30)    # same as the theme's ink color
MARGIN = 230          # keep this many pixels around the outermost map points (walls stick out past the doors)
TITLE_BLOCK_Y = 1335  # floors 1-3: the bottom edge we keep: the title block starts just below it
BORDER = 80           # floors 4-7: ignore this many pixels inside the page edge (the rounded page border)
PAD = 25              # floors 4-7: extra pixels kept around the building's ink


def title_block_top(gray):
    """First long horizontal line below the top border (more than 60% of the row is dark)."""
    h = gray.shape[0]
    rows = np.where((gray < 128).mean(axis=1) > 0.6)[0]
    return int(next(y for y in rows if y > h // 2))


def box_from_ink(gray):
    """Box around the building's lines, inside the page border and above the title block."""
    h, w = gray.shape
    bottom = title_block_top(gray) - BORDER // 2
    ink = gray[BORDER:bottom, BORDER:w - BORDER] < 128
    ys, xs = np.where(ink)
    x0, x1 = xs.min() + BORDER - PAD, xs.max() + BORDER + PAD
    y0, y1 = ys.min() + BORDER - PAD, ys.max() + BORDER + PAD
    return max(0, x0), min(w, x1), max(0, y0), min(h, y1)


src = open('src/data/gdc.ts').read()
floors = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4, 5, 6, 7]
for n in floors:
    plan = Image.open(f'assets/gdc-{n}.png').convert('L')
    gray = np.asarray(plan, dtype=np.float32)
    # darkness -> opacity (pure white page = 0, black ink = 1; the gray hatching stays soft)
    alpha = np.clip((255 - gray) / 190, 0, 1) ** 0.9

    h, w = alpha.shape
    pts = [(int(x), int(y)) for x, y in re.findall(rf"id: 'GDC-{n}[^']*'.*?x: (\d+), y: (\d+)", src)]
    if pts:
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        x0, x1 = max(0, min(xs) - MARGIN), min(w, max(xs) + MARGIN)
        y0, y1 = max(0, min(ys) - MARGIN), min(h, TITLE_BLOCK_Y)
    else:
        x0, x1, y0, y1 = box_from_ink(gray)
    mask = np.zeros_like(alpha)
    mask[y0:y1, x0:x1] = 1
    alpha = alpha * mask

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = INK
    out[..., 3] = (alpha * 255).astype(np.uint8)
    Image.fromarray(out).save(f'assets/gdc-{n}-clear.png', optimize=True)
    how = 'map points' if pts else 'ink'
    print(f'floor {n}: kept x {x0}-{x1}, y {y0}-{y1} (from {how}); size {plan.size}')
