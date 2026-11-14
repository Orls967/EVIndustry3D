"""Lumped-parameter RK4 thermal reference solver matching 05 §2.3, F1, F2, F7, F13, and S15."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT / "data"


def interp_1d(x: float, xs: list[float], ys: list[float]) -> tuple[float, bool]:
    """Clamped piecewise-linear 1D interpolation returning (value, out_of_range)."""
    out_of_range = x < xs[0] or x > xs[-1]
    xc = min(max(x, xs[0]), xs[-1])
    if xc == xs[-1]:
        return float(ys[-1]), out_of_range
    for i in range(len(xs) - 1):
        if xs[i] <= xc <= xs[i + 1]:
            span = xs[i + 1] - xs[i]
            t = (xc - xs[i]) / span if span > 0 else 0.0
            return float(ys[i] + t * (ys[i + 1] - ys[i])), out_of_range
    return float(ys[0]), out_of_range


def interp_2d(
    soc: float,
    temp_c: float,
    soc_grid: list[float],
    temp_grid: list[float],
    values: list[list[float]],
) -> tuple[float, bool]:
    """Clamped bilinear 2D lookup (SOC, Temp_C) returning (value, out_of_range)."""
    out_of_range = (
        soc < soc_grid[0]
        or soc > soc_grid[-1]
        or temp_c < temp_grid[0]
        or temp_c > temp_grid[-1]
    )
    sc = min(max(soc, soc_grid[0]), soc_grid[-1])
    tc = min(max(temp_c, temp_grid[0]), temp_grid[-1])

    si = len(soc_grid) - 2
    for i in range(len(soc_grid) - 1):
        if sc <= soc_grid[i + 1]:
            si = i
            break
    ti = len(temp_grid) - 2
    for j in range(len(temp_grid) - 1):
        if tc <= temp_grid[j + 1]:
            ti = j
            break

    s0, s1 = soc_grid[si], soc_grid[si + 1]
    t0, t1 = temp_grid[ti], temp_grid[ti + 1]
    ws = (sc - s0) / (s1 - s0) if s1 > s0 else 0.0
    wt = (tc - t0) / (t1 - t0) if t1 > t0 else 0.0

    q00 = values[si][ti]
    q01 = values[si][ti + 1]
    q10 = values[si + 1][ti]
    q11 = values[si + 1][ti + 1]
    val = (
        (1.0 - ws) * (1.0 - wt) * q00
        + (1.0 - ws) * wt * q01
        + ws * (1.0 - wt) * q10
        + ws * wt * q11
    )
    return float(val), out_of_range


@dataclass(frozen=True)
class CoolingMetrics:
    hydraulic_diameter_m: float
    velocity_m_s: float
    reynolds_number: float
    h_cc_w_per_m2k: float
    r_cc_kw: float
    c_f_w_per_k: float
    warnings: tuple[str, ...]


@dataclass(frozen=True)
class ThermalSimConfig:
    pack_id: str  # "LFP_BLADE" | "NMC_4680"
    charging_power_kw: float
    ambient_temp_c: float
    coolant_flow_lpm: float
    coolant_inlet_temp_c: float
    initial_soc_pct: float
    target_soc_pct: float
    max_duration_min: float
    initial_pack_temp_c: float | None = None
    dt_s: float = 1.0
    sample_interval_s: float = 5.0
    constant_cell_current_a: float | None = None
    disable_coolant: bool = False
    single_zone_override: bool = False
    cells_per_zone_override: int | None = None
    r_amb_override_kw: float | None = None
    r_cc_override_kw: float | None = None
    k_through_plane_scale: float = 1.0


@dataclass
class ThermalSimResult:
    pack_id: str
    time_s: list[float]
    zone_temps_c: list[list[float]]
    coolant_temps_c: list[list[float]]
    coolant_outlet_temp_c: list[float]
    soc_pct: list[float]
    c_rate: list[float]
    heat_gen_w: list[float]
    final_zone_temps_c: list[float]
    max_temp_c: float
    min_temp_c: float
    avg_temp_c: float
    temp_spread_c: float
    hottest_zone_id: str
    coolest_zone_id: str
    e_gen_j: float
    e_irr_j: float
    e_rev_j: float
    e_stored_j: float
    e_coolant_j: float
    e_amb_j: float
    energy_balance_error_pct: float
    reynolds_number: float
    r_cc_kw: float
    c_f_w_per_k: float
    warnings: list[str]
    stop_reason: str


def load_pack_and_tables(pack_id: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, dict[str, Any]]]:
    pack_file = "lfp-blade.json" if pack_id == "LFP_BLADE" else "nmc-4680.json"
    pack = json.loads((DATA_DIR / "packs" / pack_file).read_text())
    register = json.loads((DATA_DIR / "parameters" / "register.json").read_text())
    suffix = "lfp" if pack_id == "LFP_BLADE" else "nmc"
    tables = {
        "r_dc": json.loads((DATA_DIR / "tables" / f"r_dc_{suffix}.json").read_text()),
        "ocv": json.loads((DATA_DIR / "tables" / f"ocv_{suffix}_proxy.json").read_text()),
        "ehc": json.loads((DATA_DIR / "tables" / f"entropic_{suffix}_proxy.json").read_text()),
    }
    return pack, register, tables


def compute_cooling_metrics(pack: dict[str, Any], coolant: dict[str, Any], flow_lpm: float) -> CoolingMetrics:
    c_cfg = pack["cooling"]
    a = c_cfg["channelWidthMm"] / 1000.0
    b = c_cfg["channelHeightMm"] / 1000.0
    n_ch = c_cfg["parallelChannels"]
    d_h = (2.0 * a * b) / (a + b)

    v_dot = max(flow_lpm, 0.0) / 60000.0
    vel = v_dot / (n_ch * a * b) if (n_ch * a * b) > 0 else 0.0
    re = coolant["densityKgPerM3"] * vel * d_h / coolant["viscosityPaS"]

    h_cc = c_cfg["nusseltNumber"] * coolant["conductivityWPerMK"] / d_h
    r_conv = 1.0 / (h_cc * c_cfg["contactAreaPerZoneM2"])
    r_cc = r_conv + c_cfg["rZoneToCoolantBaseKW"]
    c_f = coolant["densityKgPerM3"] * v_dot * coolant["specificHeatJPerKgK"]

    warnings: list[str] = []
    if re >= 2300.0:
        warnings.append("TRANSITIONAL_OR_TURBULENT_RE")
    elif re >= 950.0:
        warnings.append("NON_LAMINAR_COOLANT_F3")

    return CoolingMetrics(
        hydraulic_diameter_m=d_h,
        velocity_m_s=vel,
        reynolds_number=re,
        h_cc_w_per_m2k=h_cc,
        r_cc_kw=r_cc,
        c_f_w_per_k=c_f,
        warnings=tuple(warnings),
    )


def run_thermal_simulation(config: ThermalSimConfig) -> ThermalSimResult:
    pack, register, tables = load_pack_and_tables(config.pack_id)
    coolant = register["coolant"]
    cooling = compute_cooling_metrics(pack, coolant, config.coolant_flow_lpm)

    n_zones = 1 if config.single_zone_override else len(pack["zones"])
    zone_ids = [pack["zones"][0]["id"]] if config.single_zone_override else [z["id"] for z in pack["zones"]]
    cell_cfg = pack["cell"]
    c_cell_25 = float(cell_cfg["specificHeatJPerKgK"])
    c_temp_coeff = float(cell_cfg.get("specificHeatTempCoeffPctPerK", 0.2)) / 100.0
    m_cell = float(cell_cfg["massKg"])
    q_cell_ah = float(cell_cfg["nominalCapacityAh"])
    n_series = int(pack["seriesCount"])
    n_parallel = int(pack["parallelCount"])

    cell_counts = [
        int(config.cells_per_zone_override) if config.cells_per_zone_override is not None else int(pack["zones"][i]["cellCount"])
        for i in range(n_zones)
    ]
    c_zone_25 = [cnt * m_cell * c_cell_25 for cnt in cell_counts]

    r_cc = float(config.r_cc_override_kw) if config.r_cc_override_kw is not None else cooling.r_cc_kw
    r_zz = float(pack["cooling"]["rZoneToZoneKW"]) / max(config.k_through_plane_scale, 1e-6)
    r_amb = float(config.r_amb_override_kw) if config.r_amb_override_kw is not None else float(pack["cooling"]["rZoneToAmbientKW"])
    c_f = cooling.c_f_w_per_k

    r_dc_tab = tables["r_dc"]
    ocv_tab = tables["ocv"]
    ehc_tab = tables["ehc"]

    t0 = config.ambient_temp_c if config.initial_pack_temp_c is None else config.initial_pack_temp_c
    temps = [float(t0)] * n_zones
    soc = float(config.initial_soc_pct)
    warnings_set: set[str] = set(cooling.warnings)

    def evaluate_stage(state_temps: list[float], state_soc: float) -> tuple[list[float], float, dict[str, Any]]:
        nonlocal warnings_set
        soc_clamped = min(max(state_soc, 0.0), 100.0)
        v_cell, _ = interp_1d(soc_clamped, ocv_tab["socGridPercent"], ocv_tab["values"])
        ehc_mv_per_k, _ = interp_1d(soc_clamped, ehc_tab["socGridPercent"], ehc_tab["values"])
        d_ocv_dt = ehc_mv_per_k * 1e-3

        if config.constant_cell_current_a is not None:
            i_cell = config.constant_cell_current_a
        else:
            v_pack = max(v_cell * n_series, 1.0)
            i_cell = (config.charging_power_kw * 1000.0 / v_pack) / n_parallel

        dsoc_dt = (i_cell / (q_cell_ah * 3600.0)) * 100.0
        c_rate_now = i_cell / q_cell_ah
        if c_rate_now > 2.0 + 1e-9:
            warnings_set.add("C_RATE_ABOVE_2C")

        d_temps = [0.0] * n_zones
        cool_temps = [config.ambient_temp_c] * n_zones
        t_cool_prev = config.coolant_inlet_temp_c
        p_irr = 0.0
        p_rev = 0.0
        p_cool = 0.0
        p_amb = 0.0

        for idx in range(n_zones):
            tz = state_temps[idx]
            if tz > 45.0:
                warnings_set.add("HIGH_TEMP_ABOVE_45C")
            if tz > 60.0:
                warnings_set.add("CELL_SURFACE_HOT_ABOVE_60C")

            r_dc_mohm, oor = interp_2d(
                soc_clamped, tz,
                r_dc_tab["socGridPercent"], r_dc_tab["temperatureGridC"], r_dc_tab["values"]
            )
            if oor:
                warnings_set.add("RESISTANCE_TABLE_OUT_OF_RANGE")

            r_dc_ohm = r_dc_mohm * 1e-3
            q_irr_cell = i_cell * i_cell * r_dc_ohm
            q_rev_cell = i_cell * (tz + 273.15) * d_ocv_dt
            cnt = cell_counts[idx]
            qz_irr = cnt * q_irr_cell
            qz_rev = cnt * q_rev_cell
            qz = qz_irr + qz_rev

            if config.disable_coolant or c_f <= 0.0:
                q_cool_z = 0.0
                cool_temps[idx] = config.ambient_temp_c
            else:
                q_cool_z = (tz - t_cool_prev) / r_cc
                # Stability safeguard if flow is unrealistically low (< ~0.9 L/min)
                max_q_cool = c_f * (tz - t_cool_prev)
                if r_cc * c_f < 1.0 and abs(q_cool_z) > abs(max_q_cool):
                    q_cool_z = max_q_cool
                t_cool_prev = t_cool_prev + q_cool_z / c_f
                cool_temps[idx] = t_cool_prev

            q_zz_z = 0.0
            if n_zones > 1:
                if idx > 0:
                    q_zz_z += (tz - state_temps[idx - 1]) / r_zz
                if idx < n_zones - 1:
                    q_zz_z += (tz - state_temps[idx + 1]) / r_zz

            q_amb_z = (tz - config.ambient_temp_c) / r_amb
            c_eff = c_zone_25[idx] * (1.0 + c_temp_coeff * (tz - 25.0))
            d_temps[idx] = (qz - q_cool_z - q_zz_z - q_amb_z) / c_eff

            p_irr += qz_irr
            p_rev += qz_rev
            p_cool += q_cool_z
            p_amb += q_amb_z

        meta = {
            "cool_temps": cool_temps,
            "c_rate": c_rate_now,
            "p_irr": p_irr,
            "p_rev": p_rev,
            "p_gen": p_irr + p_rev,
            "p_cool": p_cool,
            "p_amb": p_amb,
        }
        return d_temps, dsoc_dt, meta

    max_duration_s = config.max_duration_min * 60.0
    dt = config.dt_s
    t = 0.0

    # Initial diagnostic read
    _, _, init_meta = evaluate_stage(temps, soc)
    time_hist = [0.0]
    zone_hist = [list(temps)]
    cool_hist = [list(init_meta["cool_temps"])]
    outlet_hist = [init_meta["cool_temps"][-1]]
    soc_hist = [soc]
    crate_hist = [init_meta["c_rate"]]
    qgen_hist = [init_meta["p_gen"]]

    next_sample_s = config.sample_interval_s
    e_gen_j = 0.0
    e_irr_j = 0.0
    e_rev_j = 0.0
    e_cool_j = 0.0
    e_amb_j = 0.0
    stop_reason = "MAX_DURATION_REACHED"

    while t < max_duration_s - 1e-9:
        if soc >= config.target_soc_pct - 1e-9 and config.constant_cell_current_a is None:
            stop_reason = "TARGET_SOC_REACHED"
            break

        h = min(dt, max_duration_s - t)
        k1_t, k1_s, m1 = evaluate_stage(temps, soc)
        if config.constant_cell_current_a is None and k1_s > 0.0 and soc + k1_s * h > config.target_soc_pct:
            h_exact = (config.target_soc_pct - soc) / k1_s
            h = max(min(h, h_exact), 1e-6)

        t2 = [temps[i] + 0.5 * h * k1_t[i] for i in range(n_zones)]
        s2 = soc + 0.5 * h * k1_s
        k2_t, k2_s, m2 = evaluate_stage(t2, s2)

        t3 = [temps[i] + 0.5 * h * k2_t[i] for i in range(n_zones)]
        s3 = soc + 0.5 * h * k2_s
        k3_t, k3_s, m3 = evaluate_stage(t3, s3)

        t4 = [temps[i] + h * k3_t[i] for i in range(n_zones)]
        s4 = soc + h * k3_s
        k4_t, k4_s, m4 = evaluate_stage(t4, s4)

        for i in range(n_zones):
            temps[i] += (h / 6.0) * (k1_t[i] + 2.0 * k2_t[i] + 2.0 * k3_t[i] + k4_t[i])
        soc += (h / 6.0) * (k1_s + 2.0 * k2_s + 2.0 * k3_s + k4_s)
        t += h

        e_gen_j += (h / 6.0) * (m1["p_gen"] + 2.0 * m2["p_gen"] + 2.0 * m3["p_gen"] + m4["p_gen"])
        e_irr_j += (h / 6.0) * (m1["p_irr"] + 2.0 * m2["p_irr"] + 2.0 * m3["p_irr"] + m4["p_irr"])
        e_rev_j += (h / 6.0) * (m1["p_rev"] + 2.0 * m2["p_rev"] + 2.0 * m3["p_rev"] + m4["p_rev"])
        e_cool_j += (h / 6.0) * (m1["p_cool"] + 2.0 * m2["p_cool"] + 2.0 * m3["p_cool"] + m4["p_cool"])
        e_amb_j += (h / 6.0) * (m1["p_amb"] + 2.0 * m2["p_amb"] + 2.0 * m3["p_amb"] + m4["p_amb"])

        reached_target = config.constant_cell_current_a is None and soc >= config.target_soc_pct - 1e-6
        reached_end = t >= max_duration_s - 1e-9 or reached_target
        if t >= next_sample_s - 1e-9 or reached_end:
            _, _, cur_meta = evaluate_stage(temps, soc)
            time_hist.append(round(t, 4))
            zone_hist.append(list(temps))
            cool_hist.append(list(cur_meta["cool_temps"]))
            outlet_hist.append(cur_meta["cool_temps"][-1])
            soc_hist.append(soc)
            crate_hist.append(cur_meta["c_rate"])
            qgen_hist.append(cur_meta["p_gen"])
            while next_sample_s <= t + 1e-9:
                next_sample_s += config.sample_interval_s

        if reached_target:
            stop_reason = "TARGET_SOC_REACHED"
            break

    # Exact integral of C_zone(T) dT from T0 to T_final
    e_stored_j = 0.0
    for idx in range(n_zones):
        tf = temps[idx]
        d_linear = tf - t0
        d_quad = 0.5 * c_temp_coeff * (((tf - 25.0) ** 2) - ((t0 - 25.0) ** 2))
        e_stored_j += c_zone_25[idx] * (d_linear + d_quad)

    denom = max(abs(e_gen_j), 1.0)
    balance_err_pct = abs(e_gen_j - (e_stored_j + e_cool_j + e_amb_j)) / denom * 100.0

    max_temp_c = max(max(row) for row in zone_hist)
    min_temp_c = min(min(row) for row in zone_hist)
    final_avg = sum(temps) / n_zones
    spread = max(temps) - min(temps)
    max_idx = max(range(n_zones), key=lambda idx: temps[idx])
    min_idx = min(range(n_zones), key=lambda idx: temps[idx])

    return ThermalSimResult(
        pack_id=config.pack_id,
        time_s=time_hist,
        zone_temps_c=zone_hist,
        coolant_temps_c=cool_hist,
        coolant_outlet_temp_c=outlet_hist,
        soc_pct=soc_hist,
        c_rate=crate_hist,
        heat_gen_w=qgen_hist,
        final_zone_temps_c=temps,
        max_temp_c=max_temp_c,
        min_temp_c=min_temp_c,
        avg_temp_c=final_avg,
        temp_spread_c=spread,
        hottest_zone_id=zone_ids[max_idx],
        coolest_zone_id=zone_ids[min_idx],
        e_gen_j=e_gen_j,
        e_irr_j=e_irr_j,
        e_rev_j=e_rev_j,
        e_stored_j=e_stored_j,
        e_coolant_j=e_cool_j,
        e_amb_j=e_amb_j,
        energy_balance_error_pct=balance_err_pct,
        reynolds_number=cooling.reynolds_number,
        r_cc_kw=r_cc,
        c_f_w_per_k=c_f,
        warnings=sorted(warnings_set),
        stop_reason=stop_reason,
    )

