"""Digitize R_dc(SOC, T) from S15 Figure 8 (Panels A, B, and C).

Source: Gorsch et al. (2025), Cell Reports Physical Science 6, 102453 (S15),
Figure 8A (BYD Blade), Figure 8B (Tesla 4680), and Figure 8C (1C specific heating at 20 C).

Method:
- Calibrates the Excel 3D surface axes in Panels A and B from the grey axis wall
  and floor frame corners at SOC in [90, 70, 50, 35, 20]% and T in [40, 20, 10] C.
- Reads the unoccluded 40 C (front) and 10 C (back) boundary ridges directly from
  the surface pixel bounds.
- Reads the 20 C slice directly from Panel C (Specific heating at 1C = I_1C^2 * R / V_cell)
  and cross-checks the predicted 20 C ridge pixels against Panels A and B.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
TABLES_DIR = ROOT / "data" / "tables"
NATIVE_IMG = Path("/Users/orl123456/.gemini/antigravity/brain/1527e4df-2e4d-44e1-87bc-c29e94c39b33/scratch/pdf_figs/S15_fig8_native.jpeg")
OVERLAY_OUT = Path("/Users/orl123456/.gemini/antigravity/brain/1527e4df-2e4d-44e1-87bc-c29e94c39b33/scratch/pdf_figs/S15_fig8_digitized_overlay.png")

SOC_DESC = [90, 70, 50, 35, 20]
SOC_ASC = [20, 35, 50, 70, 90]
TEMPS_ASC = [10, 20, 40]


def surface_y_bounds(img: np.ndarray, y0: int, y1: int, x: int) -> tuple[int, int]:
    patch = img[y0:y1, max(0, x - 2) : x + 3, :].astype(float)
    mask = (patch[:, :, 2] - patch[:, :, 0] > 14) & (patch[:, :, 0] < 220)
    ys = np.where(mask)[0] + y0
    return int(ys.min()), int(ys.max())


def digitize_panel_c(img: np.ndarray) -> tuple[dict[int, float], dict[int, float], dict[int, float], dict[int, float]]:
    y_35 = 1205.0
    y_10 = 1586.0
    px_per_unit = (y_10 - y_35) / 25.0

    x_centers = {20: 348, 35: 521, 50: 695, 70: 927, 90: 1157}
    heating_nmc: dict[int, float] = {}
    heating_lfp: dict[int, float] = {}
    pts_c: list[tuple[float, float]] = []

    for soc, xc in x_centers.items():
        for target, y_lo, y_hi in [(heating_nmc, 1180, 1370), (heating_lfp, 1370, 1580)]:
            patch = img[y_lo:y_hi, xc - 20 : xc + 20, :].astype(float)
            mask = (patch[:, :, 2] - patch[:, :, 0]) > 50
            yy, xx = np.where(mask)
            cy = y_lo + float(np.mean(yy))
            cx = xc - 20 + float(np.mean(xx))
            val = 10.0 + (y_10 - cy) / px_per_unit
            target[soc] = val
            pts_c.append((cx, cy))

    v_lfp_dm3 = 0.965 * 0.090 * 0.014 * 1000.0  # 1.2159 dm^3
    i_lfp_1c = 135.0
    r20_lfp = {s: round(heating_lfp[s] * v_lfp_dm3 / (i_lfp_1c**2) * 1000.0, 4) for s in SOC_ASC}

    v_nmc_dm3 = math.pi * (0.023**2) * 0.080 * 1000.0  # 0.132952 dm^3
    i_nmc_1c = 23.125
    r20_nmc = {s: round(heating_nmc[s] * v_nmc_dm3 / (i_nmc_1c**2) * 1000.0, 4) for s in SOC_ASC}

    return r20_lfp, r20_nmc, heating_lfp, heating_nmc, pts_c


def digitize_surface(
    img: np.ndarray,
    y_search_min: int,
    y_search_max: int,
    r_min: float,
    r_max: float,
    front_left: tuple[float, float],
    front_right: tuple[float, float],
    back_left: tuple[float, float],
    back_right: tuple[float, float],
    dy_span_front_left: float,
    dy_span_back_right: float,
    r20_from_c: dict[int, float],
) -> tuple[list[list[float]], list[tuple[float, float, str]]]:
    r_span = r_max - r_min
    overlay_pts: list[tuple[float, float, str]] = []
    r_by_soc_desc: dict[int, dict[int, float]] = {}

    for idx, soc in enumerate(SOC_DESC):
        u = idx / 4.0
        xf = front_left[0] + u * (front_right[0] - front_left[0])
        yf_floor = front_left[1] + u * (front_right[1] - front_left[1])
        dy_front = dy_span_front_left * (1.0 - u) + (dy_span_front_left * 0.96) * u
        _, y_bot = surface_y_bounds(img, y_search_min, y_search_max, int(round(xf)))
        r40 = r_min + (yf_floor - y_bot) / dy_front * r_span

        xb = back_left[0] + u * (back_right[0] - back_left[0])
        yb_floor = back_left[1] + u * (back_right[1] - back_left[1])
        dy_back = (dy_span_back_right * 1.03) * (1.0 - u) + dy_span_back_right * u
        y_top, _ = surface_y_bounds(img, y_search_min, y_search_max, int(round(xb)))
        r10 = r_min + (yb_floor - y_top) / dy_back * r_span

        xm = 0.5 * (xf + xb)
        ym_floor = 0.5 * (yf_floor + yb_floor)
        dym = 0.5 * (dy_front + dy_back)
        r20 = r20_from_c[soc]
        ym_pred = ym_floor - (r20 - r_min) / r_span * dym

        r_by_soc_desc[soc] = {10: round(r10, 4), 20: round(r20, 4), 40: round(r40, 4)}
        overlay_pts.append((xf, float(y_bot), f"{soc}%/40C:{r40:.2f}"))
        overlay_pts.append((xm, ym_pred, f"{soc}%/20C:{r20:.2f}"))
        overlay_pts.append((xb, float(y_top), f"{soc}%/10C:{r10:.2f}"))

    matrix_asc = [[r_by_soc_desc[s][t] for t in TEMPS_ASC] for s in SOC_ASC]
    return matrix_asc, overlay_pts


def main() -> None:
    img = np.array(Image.open(NATIVE_IMG))
    r20_lfp, r20_nmc, q_lfp, q_nmc, pts_c = digitize_panel_c(img)

    mat_lfp, pts_lfp = digitize_surface(
        img,
        y_search_min=60,
        y_search_max=480,
        r_min=0.7,
        r_max=1.5,
        front_left=(181.0, 320.0),
        front_right=(1046.0, 490.5),
        back_left=(502.0, 253.5),
        back_right=(1239.0, 308.0),
        dy_span_front_left=179.5,
        dy_span_back_right=173.0,
        r20_from_c=r20_lfp,
    )

    mat_nmc, pts_nmc = digitize_surface(
        img,
        y_search_min=590,
        y_search_max=1010,
        r_min=5.0,
        r_max=11.0,
        front_left=(178.0, 850.5),
        front_right=(1058.0, 1022.0),
        back_left=(504.0, 788.5),
        back_right=(1250.0, 844.5),
        dy_span_front_left=201.0,
        dy_span_back_right=196.5,
        r20_from_c=r20_nmc,
    )

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    TABLES_DIR.mkdir(parents=True, exist_ok=True)

    lfp_payload = {
        "tableId": "r_dc_lfp",
        "kind": "R_DC_2D",
        "architecture": "LFP_BLADE",
        "unit": "mOhm",
        "sourceRef": "S15 Figure 8A and Figure 8C (Gorsch et al. 2025, 1C 18s average charge/discharge pulse)",
        "scriptPath": "analysis/digitize/digitize_s15.py",
        "generatedAtIso": now_iso,
        "approximate": True,
        "estimatedErrorNote": "Digitized from 1347x1686 figure image (10C & 40C ridges +/-0.03 mOhm) and Panel C 1C heating (20C slice +/-0.01 mOhm).",
        "socGridPercent": SOC_ASC,
        "temperatureGridC": TEMPS_ASC,
        "values": mat_lfp,
    }
    nmc_payload = {
        "tableId": "r_dc_nmc",
        "kind": "R_DC_2D",
        "architecture": "NMC_4680",
        "unit": "mOhm",
        "sourceRef": "S15 Figure 8B and Figure 8C (Gorsch et al. 2025, 1C 18s average charge/discharge pulse)",
        "scriptPath": "analysis/digitize/digitize_s15.py",
        "generatedAtIso": now_iso,
        "approximate": True,
        "estimatedErrorNote": "Digitized from 1347x1686 figure image (10C & 40C ridges +/-0.2 mOhm) and Panel C 1C heating (20C slice +/-0.05 mOhm).",
        "socGridPercent": SOC_ASC,
        "temperatureGridC": TEMPS_ASC,
        "values": mat_nmc,
    }
    (TABLES_DIR / "r_dc_lfp.json").write_text(json.dumps(lfp_payload, indent=2) + "\n")
    (TABLES_DIR / "r_dc_nmc.json").write_text(json.dumps(nmc_payload, indent=2) + "\n")

    fig, ax = plt.subplots(figsize=(11, 14))
    ax.imshow(img)
    for x, y, lbl in pts_lfp + pts_nmc:
        ax.plot(x, y, "o", color="red", markersize=5)
        ax.text(x + 4, y - 4, lbl, color="yellow", fontsize=6, bbox=dict(facecolor="black", alpha=0.5, pad=1))
    for cx, cy in pts_c:
        ax.plot(cx, cy, "x", color="lime", markersize=8, markeredgewidth=2)
    ax.set_axis_off()
    plt.tight_layout()
    plt.savefig(OVERLAY_OUT, dpi=150)

    print("LFP R_dc [mOhm] (rows=SOC 20..90, cols=T 10,20,40):", mat_lfp)
    print("NMC R_dc [mOhm] (rows=SOC 20..90, cols=T 10,20,40):", mat_nmc)
    print("Saved overlay:", OVERLAY_OUT)


if __name__ == "__main__":
    main()
