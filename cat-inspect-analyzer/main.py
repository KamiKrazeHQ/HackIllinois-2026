import os
import json
from pathlib import Path
from dotenv import load_dotenv
from analyzer import analyze_image
from report_generator import generate_pdf_report

load_dotenv()

IMAGES_DIR = "images"
REPORTS_DIR = "reports"

SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}

def main():
    # make sure reports folder exists
    Path(REPORTS_DIR).mkdir(exist_ok=True)

    # get all images from the images folder
    images = [
        f for f in Path(IMAGES_DIR).iterdir()
        if f.suffix.lower() in SUPPORTED
    ]

    if not images:
        print("❌ No images found in the images/ folder. Drop some photos in and try again.")
        return

    print(f"🔍 Found {len(images)} image(s) to analyze\n")

    for i, image_path in enumerate(images, 1):
        print(f"[{i}/{len(images)}] Processing: {image_path.name}")

        try:
            # run the analysis
            result = analyze_image(image_path)

            # save JSON report
            json_path = Path(REPORTS_DIR) / f"{image_path.stem}_report.json"
            with open(json_path, "w") as f:
                json.dump(result, f, indent=2)
            print(f"  ✅ JSON saved: {json_path}")

            # save PDF report
            generate_pdf_report(result, output_dir=REPORTS_DIR)

        except Exception as e:
            print(f"  ❌ Failed on {image_path.name}: {e}")

        print()

    print("✅ All done! Check your reports/ folder.")

if __name__ == "__main__":
    main() 