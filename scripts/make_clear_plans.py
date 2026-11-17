"""Makes assets/gdc-N-clear.png from the floor plans in assets/gdc-N.png.

- The white page becomes transparent and the black lines become sepia ink, so the plan sits
  on the parchment instead of looking like a pasted screenshot.
- Everything outside the building (page border, title block, UT logo) is erased.
- The picture size is NOT changed, so every x/y in src/data/gdc.ts still lines up.
The originals stay in assets/ (the map editor still uses them).

Run:  python3 scripts/make_clear_plans.py
"""
import re
import numpy as np
from PIL import Image

INK = (59, 42, 30)  # same as the theme's ink color
MARGIN = 230        # keep this many pixels around the outermost map points (walls stick out past the doors)
TITLE_BLOCK_Y = 1335  # the bottom edge we keep: the title block starts just below it

src = open('src/data/gdc.ts').read()
for n in (1, 2, 3):
    plan = Image.open(f'assets/gdc-{n}.png').convert('L')
    gray = np.asarray(plan, dtype=np.float32)
    # darkness -> opacity (pure white page = 0, black ink = 1; the gray hatching stays soft)
    alpha = np.clip((255 - gray) / 190, 0, 1) ** 0.9

    pts = [(int(x), int(y)) for x, y in re.findall(rf"id: 'GDC-{n}[^']*'.*?x: (\d+), y: (\d+)", src)]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    h, w = alpha.shape
    x0, x1 = max(0, min(xs) - MARGIN), min(w, max(xs) + MARGIN)
    y0, y1 = max(0, min(ys) - MARGIN), min(h, TITLE_BLOCK_Y)
    mask = np.zeros_like(alpha)
    mask[y0:y1, x0:x1] = 1
    alpha = alpha * mask

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = INK
    out[..., 3] = (alpha * 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(f'assets/gdc-{n}-clear.png', optimize=True)
    print(f'floor {n}: kept x {x0}-{x1}, y {y0}-{y1}; size {plan.size}')
