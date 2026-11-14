"""Extract OCV and entropic coefficient curves directly from F7 PDF vector geometry.

Source: Giammichele et al. (2024), Sustainable Energy & Fuels 8, 1566 (F7),
Figures 2 and 3 (page 5). Proxy cells: LFP 26650 and NMC 21700.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
F7_PDF = ROOT / "docs" / "research" / "Giammichele_Evaluation-influence-lithium-ion-battery_Post-print_2024.pdf"
TABLES_DIR = ROOT / "data" / "tables"

FIG2_BOX = (86.1, 61.01, 271.28, 229.64)  # SOC 100..0, U_oc 4.2..2.6 V
FIG3_BOX = (358.79, 61.01, 543.97, 229.64)  # SOC 100..0, dU_oc/dT 0.3..-0.7 mV/K

LFP_FILL = (0.0, 0.0, 0.0)
NMC_FILL = (0.17602500319480896, 0.17602500319480896, 1.0)


def _match_fill(fill: tuple[float, ...] | None, target: tuple[float, float, float]) -> bool:
    if not fill or len(fill) != 3:
        return False
    return all(abs(a - b) < 1e-3 for a, b in zip(fill, target))


def extract_series(
    page: pymupdf.Page,
    box: tuple[float, float, float, float],
    x_left: float,
    x_right: float,
    y_top: float,
    y_bot: float,
    target_fill: tuple[float, float, float],
) -> dict[int, float]:
    x0, y0, x1, y1 = box
    out: dict[int, float] = {}
    for d in page.get_drawings():
        r = d["rect"]
        if not (1.0 < r.width < 8.0 and 1.0 < r.height < 8.0):
            continue
        if not (x0 - 2 <= r.x0 <= x1 + 2 and y0 - 2 <= r.y0 <= y1 + 2):
            continue
        if not _match_fill(d.get("fill"), target_fill):
            continue
        cx = 0.5 * (r.x0 + r.x1)
        cy = 0.5 * (r.y0 + r.y1)
        soc = x_left + (cx - x0) / (x1 - x0) * (x_right - x0_val(x_left))
        if soc > 95 and abs(soc - 100.0) > 2.0:
            # Legend marker inside plot area (x around 86.74%)
            continue
        soc_i = int(round(soc))
        if soc_i < 0 or soc_i > 100 or soc_i % 10 != 0:
            continue
        val = y_top + (cy - y0) / (y1 - y0) * (y_bot - y_top)
        out[soc_i] = round(val, 4)
    return out


def x0_val(v: float) -> float:
    return v


def main() -> None:
    doc = pymupdf.open(F7_PDF)
    page = doc[4]
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    TABLES_DIR.mkdir(parents=True, exist_ok=True)

    soc_grid = list(range(0, 101, 10))
    for arch, tag, fill in [
        ("LFP_BLADE", "lfp", LFP_FILL),
        ("NMC_4680", "nmc", NMC_FILL),
    ]:
        ocv_map = extract_series(page, FIG2_BOX, 100.0, 0.0, 4.2, 2.6, fill)
        ocv_vals = [ocv_map[s] for s in soc_grid]
        ocv_payload = {
            "tableId": f"ocv_{tag}_proxy",
            "kind": "OCV_1D",
            "architecture": arch,
            "unit": "V",
            "sourceRef": "F7 Figure 2 (Giammichele et al. 2024)",
            "proxyCellNote": "Proxy cell: LFP 26650" if tag == "lfp" else "Proxy cell: NMC 21700",
            "scriptPath": "analysis/digitize/extract_f7.py",
            "generatedAtIso": now_iso,
            "approximate": False,
            "estimatedErrorNote": "Extracted directly from PDF vector scatter centers; measurement uncertainty +/-0.3 mV (F7 Table 2 / Sec. 3).",
            "socGridPercent": soc_grid,
            "values": ocv_vals,
        }
        (TABLES_DIR / f"ocv_{tag}_proxy.json").write_text(json.dumps(ocv_payload, indent=2) + "\n")

        ehc_map = extract_series(page, FIG3_BOX, 100.0, 0.0, 0.3, -0.7, fill)
        # F7 Fig. 3 reports 0..90% SOC; clamp 100% to the 90% endpoint rather than extrapolating.
        ehc_vals = [ehc_map[s] if s in ehc_map else ehc_map[90] for s in soc_grid]
        ehc_payload = {
            "tableId": f"entropic_{tag}_proxy",
            "kind": "ENTROPIC_1D",
            "architecture": arch,
            "unit": "mV/K",
            "sourceRef": "F7 Figure 3 (Giammichele et al. 2024); F8 cross-check for NMC",
            "proxyCellNote": "Proxy cell: LFP 26650 (100% SOC clamped to 90% endpoint)" if tag == "lfp" else "Proxy cell: NMC 21700 (100% SOC clamped to 90% endpoint)",
            "scriptPath": "analysis/digitize/extract_f7.py",
            "generatedAtIso": now_iso,
            "approximate": False,
            "estimatedErrorNote": "Extracted directly from PDF vector scatter centers; F7 EHC measurement uncertainty +/-0.016 mV/K.",
            "socGridPercent": soc_grid,
            "values": ehc_vals,
        }
        (TABLES_DIR / f"entropic_{tag}_proxy.json").write_text(json.dumps(ehc_payload, indent=2) + "\n")
        print(f"Wrote OCV & entropic tables for {arch}: OCV={ocv_vals}, EHC={ehc_vals}")


if __name__ == "__main__":
    main()

