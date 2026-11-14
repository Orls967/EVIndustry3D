"""Inspect S15, F7, F8, and S1 PDFs to locate figures and render them for digitization."""
from pathlib import Path
import fitz  # PyMuPDF

RESEARCH_DIR = Path(__file__).resolve().parents[2] / "docs" / "research"
OUT_DIR = Path("/Users/orl123456/.gemini/antigravity/brain/1527e4df-2e4d-44e1-87bc-c29e94c39b33/scratch/pdf_figs")
OUT_DIR.mkdir(parents=True, exist_ok=True)

TARGETS = {
    "S15": ("PIIS2666386425000529.pdf", ["Figure 8", "Fig. 8", "resistance", "heating"]),
    "F7": ("Giammichele_Evaluation-influence-lithium-ion-battery_Post-print_2024.pdf", ["Fig. 2", "Fig. 3", "Figure 2", "Figure 3", "entropic"]),
    "F8": ("batteries-10-00248-v2.pdf", ["entropic", "OCV", "Table"]),
    "S1": ("Ank_2023_J._Electrochem._Soc._170_120536.pdf", ["70", "2C", "temperature"]),
}

for tag, (fname, keywords) in TARGETS.items():
    pdf_path = RESEARCH_DIR / fname
    doc = fitz.open(pdf_path)
    print(f"=== {tag} ({fname}): {len(doc)} pages ===")
    for i, page in enumerate(doc):
        text = page.get_text("text")
        hits = [kw for kw in keywords if kw.lower() in text.lower()]
        if hits:
            drawings = len(page.get_drawings())
            images = len(page.get_images())
            print(f"  p.{i+1}: hits={hits}, drawings={drawings}, images={images}")
            if tag in ("S15", "F7") and (any("fig" in h.lower() for h in hits)):
                pix = page.get_pixmap(dpi=200)
                out_png = OUT_DIR / f"{tag}_p{i+1}.png"
                pix.save(out_png)
                print(f"    saved {out_png}")

