#!/usr/bin/env python3
"""
scripts/make_background.py

Generates seamless, tileable marbled swirl background tiles:
- public/bg/swirl-light.webp (canvas #E4E1DB on paper #FFFFFF)
- public/bg/swirl-dark.webp  (canvas #1A1B1A on paper #232625)
Plus a 2x2 preview sheet to visually inspect seamlessness.
"""

import os
import numpy as np
from PIL import Image, ImageFilter

# Target dimensions
FINAL_SIZE = 800
SUPER_SIZE = 1600  # 2x supersampling

# Colors (Hex to RGB)
LIGHT_PAPER = (255, 255, 255)       # #FFFFFF
LIGHT_CANVAS = (228, 225, 219)      # #E4E1DB
DARK_PAPER = (35, 38, 37)           # #232625
DARK_CANVAS = (26, 27, 26)          # #1A1B1A

def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)

def generate_seamless_field(size=FINAL_SIZE, seed=2026):
    rng = np.random.default_rng(seed)
    
    # Grid coordinates normalized to [0, 2*pi)
    x = np.linspace(0, 2 * np.pi, size, endpoint=False)
    y = np.linspace(0, 2 * np.pi, size, endpoint=False)
    X, Y = np.meshgrid(x, y)
    
    # Periodic displacement field (domain warping pass 1 & 2)
    dx = np.zeros((size, size))
    dy = np.zeros((size, size))
    
    warp_freqs = [1, 2]
    for kx in warp_freqs:
        for ky in warp_freqs:
            phase_x = rng.uniform(0, 2 * np.pi)
            phase_y = rng.uniform(0, 2 * np.pi)
            weight = 0.28 / (kx + ky)
            dx += weight * np.sin(kx * X + ky * Y + phase_x)
            dy += weight * np.cos(ky * X - kx * Y + phase_y)
            
    X_w = X + dx
    Y_w = Y + dy
    
    # Base field from integer frequency sine waves
    F = np.zeros((size, size))
    freq_pairs = [(1, 1), (1, 2), (2, 1), (2, 2)]
    for (kx, ky) in freq_pairs:
        phase = rng.uniform(0, 2 * np.pi)
        weight = 1.0 / np.sqrt(kx**2 + ky**2)
        F += weight * np.sin(kx * X_w + ky * Y_w + phase)
        
    # Normalize field to [0, 1]
    F = (F - F.min()) / (F.max() - F.min() + 1e-9)
    
    # Swirl bands using continuous cosine oscillation (smooth liquid marbling)
    n_bands = 1.7
    raw_bands = 0.5 * (1.0 + np.cos(F * n_bands * 2 * np.pi))
    
    # Smooth band transitions with smoothstep centered at median
    mask_raw = smoothstep(0.04, 0.96, raw_bands)
    median_val = np.percentile(mask_raw, 50.0)
    mask = np.clip(mask_raw - median_val + 0.5, 0.0, 1.0)
    return mask

def check_seamlessness(arr):
    # Left edge vs Right edge
    diff_lr = np.mean(np.abs(arr[:, 0] - arr[:, -1]))
    # Top edge vs Bottom edge
    diff_tb = np.mean(np.abs(arr[0, :] - arr[-1, :]))
    # Typical adjacent column difference in interior (overall mean)
    diff_interior = np.mean(np.abs(arr[:, 1:] - arr[:, :-1]))
    return diff_lr, diff_tb, diff_interior

def main():
    os.makedirs("public/bg", exist_ok=True)
    
    # Generate 800x800 mask directly on periodic domain
    mask_arr = generate_seamless_field(size=FINAL_SIZE, seed=2026)
    
    # Verify seamlessness on 0-255 scale
    arr_255 = (mask_arr * 255.0).astype(np.float32)
    diff_lr, diff_tb, diff_interior = check_seamlessness(arr_255)
    coverage = np.mean(mask_arr < 0.5) * 100.0
    
    print(f"Seamless check (0-255 scale):")
    print(f"  Left vs Right edge MAD: {diff_lr:.4f} (target < 2.0)")
    print(f"  Top vs Bottom edge MAD: {diff_tb:.4f} (target < 2.0)")
    print(f"  Interior adjacent MAD:  {diff_interior:.4f}")
    print(f"Band coverage: {coverage:.2f}% (target 45% - 55%)")
    
    assert diff_lr < 2.0, f"Seam detected on LR edges: {diff_lr}"
    assert diff_tb < 2.0, f"Seam detected on TB edges: {diff_tb}"
    
    # Render Light mode tile
    # Color interpolate between LIGHT_PAPER and LIGHT_CANVAS
    light_rgb = np.zeros((FINAL_SIZE, FINAL_SIZE, 3), dtype=np.uint8)
    for c in range(3):
        light_rgb[:, :, c] = np.clip(
            LIGHT_PAPER[c] * (1.0 - mask_arr) + LIGHT_CANVAS[c] * mask_arr, 0, 255
        ).astype(np.uint8)
    light_img = Image.fromarray(light_rgb, mode="RGB")
    light_path = "public/bg/swirl-light.webp"
    light_img.save(light_path, format="WEBP", quality=90)
    print(f"Saved {light_path}: {os.path.getsize(light_path) / 1024:.2f} KB (target <= 180 KB)")
    
    # Render Dark mode tile
    dark_rgb = np.zeros((FINAL_SIZE, FINAL_SIZE, 3), dtype=np.uint8)
    for c in range(3):
        dark_rgb[:, :, c] = np.clip(
            DARK_PAPER[c] * (1.0 - mask_arr) + DARK_CANVAS[c] * mask_arr, 0, 255
        ).astype(np.uint8)
    dark_img = Image.fromarray(dark_rgb, mode="RGB")
    dark_path = "public/bg/swirl-dark.webp"
    dark_img.save(dark_path, format="WEBP", quality=90)
    print(f"Saved {dark_path}: {os.path.getsize(dark_path) / 1024:.2f} KB (target <= 180 KB)")
    
    # Create 2x2 preview sheets to visually verify seamless tiling
    preview_light = Image.new("RGB", (FINAL_SIZE * 2, FINAL_SIZE * 2))
    preview_dark = Image.new("RGB", (FINAL_SIZE * 2, FINAL_SIZE * 2))
    for i in (0, FINAL_SIZE):
        for j in (0, FINAL_SIZE):
            preview_light.paste(light_img, (i, j))
            preview_dark.paste(dark_img, (i, j))
            
    preview_light.save("public/bg/preview-2x2-light.webp", format="WEBP", quality=85)
    preview_dark.save("public/bg/preview-2x2-dark.webp", format="WEBP", quality=85)
    print("Saved public/bg/preview-2x2-light.webp and preview-2x2-dark.webp")

if __name__ == "__main__":
    main()
