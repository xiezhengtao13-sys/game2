import sys
import argparse
from pathlib import Path
from PIL import Image
import numpy as np

# Manifest sizes and anchors for quick reference
SPECS = {
    "npc_captain": {"w": 32, "h": 48, "anchor": "bottom-center"},
    "crew_right_idle": {"w": 32, "h": 48, "anchor": "bottom-center"},
    "crew_right_walkA": {"w": 32, "h": 48, "anchor": "bottom-center"},
    "crew_right_walkB": {"w": 32, "h": 48, "anchor": "bottom-center"},
    "crew_down_walkA": {"w": 32, "h": 48, "anchor": "bottom-center"},
    "crew_down_walkB": {"w": 32, "h": 48, "anchor": "bottom-center"},
    "crew_up_idle": {"w": 32, "h": 48, "anchor": "bottom-center"},
    "crew_up_walkA": {"w": 32, "h": 48, "anchor": "bottom-center"},
    "crew_up_walkB": {"w": 32, "h": 48, "anchor": "bottom-center"},
    "fx_meeting_table": {"w": 144, "h": 144, "anchor": "center"},
    "fx_starchart": {"w": 144, "h": 48, "anchor": "center"},
    "fx_obswall": {"w": 288, "h": 48, "anchor": "center"},
    "fx_holo_table": {"w": 144, "h": 96, "anchor": "center"},
    "fx_console": {"w": 96, "h": 48, "anchor": "center"},
    "fx_console_side": {"w": 48, "h": 96, "anchor": "center"},
    "fx_command_chair": {"w": 96, "h": 144, "anchor": "center"},
    "fx_switch_panel": {"w": 96, "h": 48, "anchor": "center"},
    "fx_bed": {"w": 96, "h": 144, "anchor": "center"},
    "fx_bookshelf": {"w": 144, "h": 48, "anchor": "center"},
    "fx_reading_chair": {"w": 48, "h": 48, "anchor": "center"},
    "fx_reading_lamp": {"w": 48, "h": 48, "anchor": "center"},
    "fx_terminal": {"w": 48, "h": 48, "anchor": "center"},
    "fx_screen_lit": {"w": 48, "h": 48, "anchor": "center"},
    "fx_photo": {"w": 96, "h": 48, "anchor": "center"},
    "fx_chair": {"w": 48, "h": 48, "anchor": "center"},
    "fx_desk_chair": {"w": 48, "h": 48, "anchor": "center"},
    "fx_paper_log": {"w": 48, "h": 48, "anchor": "center"},
    "ui_prompt_e": {"w": 32, "h": 32, "anchor": "bottom-center"}
}

def process_image(input_path: str, asset_id: str, out_dir: str = "assets/sprites"):
    if asset_id not in SPECS:
        raise ValueError(f"Unknown asset_id: {asset_id}")
    spec = SPECS[asset_id]
    target_w, target_h = spec["w"], spec["h"]
    anchor = spec["anchor"]

    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)

    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    # Remove near-white background
    is_white = (r > 240) & (g > 240) & (b > 240)
    arr[:, :, 3][is_white] = 0

    non_empty = np.where(~is_white)
    if len(non_empty[0]) == 0:
        cropped = Image.fromarray(arr)
    else:
        min_y, max_y = np.min(non_empty[0]), np.max(non_empty[0])
        min_x, max_x = np.min(non_empty[1]), np.max(non_empty[1])
        cropped = Image.fromarray(arr).crop((min_x, min_y, max_x + 1, max_y + 1))

    # Scale to fit target dimensions while preserving aspect ratio
    scale = min(target_w / cropped.width, target_h / cropped.height)
    new_w = max(1, int(round(cropped.width * scale)))
    new_h = max(1, int(round(cropped.height * scale)))
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    final_img = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    offset_x = (target_w - new_w) // 2
    if anchor == "bottom-center":
        offset_y = target_h - new_h
    else:
        offset_y = (target_h - new_h) // 2

    final_img.paste(resized, (offset_x, offset_y), resized)

    out_file = Path(out_dir) / f"{asset_id}.png"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    final_img.save(out_file)
    print(f"Processed {asset_id} -> {out_file} ({target_w}x{target_h})")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 process_art.py <input_image> <asset_id>")
        sys.exit(1)
    process_image(sys.argv[1], sys.argv[2])
