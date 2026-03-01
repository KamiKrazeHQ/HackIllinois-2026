from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

FLAG_COLORS = {
    "Critical": (192, 0,   0,   230),
    "High":     (226, 107, 10,  230),
    "Medium":   (230, 168, 23,  230),
    "Low":      (55,  86,  35,  230),
}

def annotate_image(image_path, errors, output_dir="reports"):
    img = Image.open(image_path).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    w, h = img.size
    radius = max(14, min(w, h) // 40)  # scales with image size

    try:
        font = ImageFont.truetype("arial.ttf", size=radius)
    except:
        font = ImageFont.load_default()

    placed = []

    for i, error in enumerate(errors):
        xy = error.get("location_xy")
        if not xy or len(xy) < 2:
            continue

        cx = int(xy[0] * w)
        cy = int(xy[1] * h)

        # nudge if overlapping a previous marker
        for px, py in placed:
            if abs(cx - px) < radius*2.5 and abs(cy - py) < radius*2.5:
                cy += int(radius * 2.5)
        placed.append((cx, cy))

        severity = error.get("severity", "Low")
        fill = FLAG_COLORS.get(severity, (100, 100, 100, 220))
        outline = (255, 255, 255, 255)

        # circle
        draw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=fill, outline=outline, width=2
        )
        # number label
        label = str(i + 1)
        bbox = draw.textbbox((0, 0), label, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((cx - tw//2, cy - th//2), label, fill=(255, 255, 255, 255), font=font)

    combined = Image.alpha_composite(img, overlay).convert("RGB")

    stem = Path(image_path).stem
    out_path = Path(output_dir) / f"{stem}_annotated.jpg"
    combined.save(str(out_path), quality=92)
    return str(out_path)