"""Makes assets/paper.jpg: the tea-stained parchment behind every screen.

Everything is generated from random noise (fixed seed), so the picture is ours and can be
remade any time:   python3 scripts/make_paper.py
"""
import numpy as np
from PIL import Image

W, H = 900, 1600
rng = np.random.default_rng(7)


def noise(cells_x, cells_y):
    """Smooth blotchy noise in [-1, 1]: a small random grid stretched up to the full picture."""
    small = rng.normal(size=(cells_y, cells_x)).astype(np.float32)
    img = Image.fromarray(small).resize((W, H), Image.BICUBIC)
    a = np.asarray(img)
    return a / (np.abs(a).max() or 1)


# Big soft stains + medium blotches + small mottling.
stain = 0.6 * noise(5, 9) + 0.35 * noise(14, 25) + 0.2 * noise(45, 80)
stain = stain / np.abs(stain).max()

paper = np.array([233, 218, 186], dtype=np.float32)        # tea-stained paper
tea = np.array([176, 128, 70], dtype=np.float32)           # stain color
img = np.tile(paper, (H, W, 1))

# Tea stains: brown where the noise is high, a little lighter where it is low.
dark = np.clip(stain, 0, 1)[..., None] ** 1.3 * 0.7
light = np.clip(-stain, 0, 1)[..., None] * 0.25
img = img * (1 - dark) + tea * dark
img = img + (255 - img) * light * 0.35

# Edges: darker, ragged, like paper that has been handled.
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
edge = np.minimum.reduce([xx / W, (W - xx) / W, yy / H, (H - yy) / H])       # 0 at the border
edge = np.clip(1 - edge / 0.16, 0, 1) ** 1.6
edge = np.clip(edge * (0.7 + 0.5 * noise(30, 50)), 0, 1)[..., None]
img = img * (1 - 0.45 * edge) + np.array([120, 82, 40], dtype=np.float32) * 0.45 * edge

# Fine paper grain.
img = img + rng.normal(0, 3.2, size=(H, W, 1)).astype(np.float32)

Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save('assets/paper.jpg', quality=82, optimize=True)
print('wrote assets/paper.jpg')
