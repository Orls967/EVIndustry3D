"""Run V1-V5 numerical verification, P1-P3 weak validation, F9 sanity checks, and generate shared test vectors."""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "analysis"))

from reference_model import (  # noqa: E402
    NmcUserFadeInputs,
    SohConfig,
    ThermalSimConfig,
    anode_potential_v,
    interp_2d,
    load_pack_and_tables,
    run_soh_forecast,
    run_thermal_simulation,
)

S15_LFP_VOLUME_DM3 = 0.965 * 0.090 * 0.014 * 1000.0  # 1.2159 dm^3
S15_NMC_VOLUME_DM3 = math.pi * (0.023 ** 2) * 0.080 * 1000.0  # 0.132952 dm^3
NMC_4680_SURFACE_AREA_M2 = (math.pi * 0.046 * 0.080) + 2.0 * math.pi * (0.023 ** 2)


def run_presets_and_v1() -> tuple[list[dict], dict]:
    register = json.loads((ROOT / "data" / "parameters" / "register.json").read_text())
    rows = []
    worst_v1 = 0.0
    for pack_id in ["LFP_BLADE", "NMC_4680"]:
        for preset in register["presets"]:
            cfg = ThermalSimConfig(
                pack_id=pack_id,
                charging_power_kw=preset["chargingPowerKw"],
                ambient_temp_c=preset["ambientTemperatureC"],
                coolant_flow_lpm=preset["coolantFlowLpm"],
                coolant_inlet_temp_c=preset["coolantInletTemperatureC"],
                initial_soc_pct=preset["initialSocPercent"],
                target_soc_pct=preset["targetSocPercent"],
                max_duration_min=preset["maxDurationMinutes"],
            )
            res = run_thermal_simulation(cfg)
            worst_v1 = max(worst_v1, res.energy_balance_error_pct)
            rows.append({
                "packId": pack_id,
                "presetId": preset["id"],
                "durationMin": round(res.time_s[-1] / 60.0, 2),
                "finalSocPct": round(res.soc_pct[-1], 2),
                "cRateStart": round(res.c_rate[0], 3),
                "reynoldsNumber": round(res.reynolds_number, 2),
                "maxTempC": round(res.max_temp_c, 3),
                "avgTempC": round(res.avg_temp_c, 3),
                "spreadC": round(res.temp_spread_c, 3),
                "hottestZone": res.hottest_zone_id,
                "outletTempC": round(res.coolant_outlet_temp_c[-1], 3),
                "energyBalanceErrPct": round(res.energy_balance_error_pct, 5),
                "warnings": res.warnings,
                "stopReason": res.stop_reason,
            })
    return rows, {"passed": worst_v1 <= 1.0, "maxEnergyBalanceErrPct": round(worst_v1, 6)}


def check_v2_steady_state() -> dict:
    # Single zone driven at constant 100 A for 240 min until steady state, check vs closed form T_ss
    cfg = ThermalSimConfig(
        pack_id="LFP_BLADE",
        charging_power_kw=50.0,
        ambient_temp_c=25.0,
        coolant_flow_lpm=8.0,
        coolant_inlet_temp_c=25.0,
        initial_soc_pct=50.0,
        target_soc_pct=100.0,
        max_duration_min=240.0,
        dt_s=1.0,
        sample_interval_s=60.0,
        constant_cell_current_a=100.0,
        single_zone_override=True,
    )
    res = run_thermal_simulation(cfg)
    t_sim = res.final_zone_temps_c[0]
    q_final = res.heat_gen_w[-1]
    r_cc = res.r_cc_kw
    r_amb = 0.4545
    t_ss_analytic = (q_final + (cfg.coolant_inlet_temp_c / r_cc) + (cfg.ambient_temp_c / r_amb)) / (
        (1.0 / r_cc) + (1.0 / r_amb)
    )
    delta_c = abs(t_sim - t_ss_analytic)
    return {
        "passed": delta_c <= 0.1,
        "simTempC": round(t_sim, 5),
        "analyticSteadyTempC": round(t_ss_analytic, 5),
        "absDeltaC": round(delta_c, 6),
    }


def check_v3_timestep_halving() -> dict:
    deltas = {}
    for pack_id in ["LFP_BLADE", "NMC_4680"]:
        base_kw = dict(
            pack_id=pack_id,
            charging_power_kw=100.0,
            ambient_temp_c=25.0,
            coolant_flow_lpm=12.0,
            coolant_inlet_temp_c=25.0,
            initial_soc_pct=10.0,
            target_soc_pct=80.0,
            max_duration_min=45.0,
        )
        r_1 = run_thermal_simulation(ThermalSimConfig(**base_kw, dt_s=1.0))
        r_half = run_thermal_simulation(ThermalSimConfig(**base_kw, dt_s=0.5))
        deltas[pack_id] = abs(r_1.max_temp_c - r_half.max_temp_c)
    max_delta = max(deltas.values())
    return {
        "passed": max_delta <= 0.1,
        "deltasC": {k: round(v, 7) for k, v in deltas.items()},
    }


def check_v4_determinism() -> dict:
    cfg = ThermalSimConfig("NMC_4680", 100.0, 25.0, 12.0, 25.0, 10.0, 80.0, 45.0)
    r1 = run_thermal_simulation(cfg)
    r2 = run_thermal_simulation(cfg)
    identical = r1.final_zone_temps_c == r2.final_zone_temps_c and r1.e_gen_j == r2.e_gen_j
    return {"passed": identical}


def check_v5_monotonicity() -> dict:
    flows = [1.5, 4.0, 8.0, 12.0, 16.0]
    ambients = [-10.0, 10.0, 25.0, 40.0]
    ok = True
    flow_sweep = {}
    amb_sweep = {}
    for pack_id in ["LFP_BLADE", "NMC_4680"]:
        ft = [
            round(run_thermal_simulation(ThermalSimConfig(pack_id, 50.0, 25.0, f, 25.0, 10.0, 80.0, 60.0)).max_temp_c, 5)
            for f in flows
        ]
        at = [
            round(run_thermal_simulation(ThermalSimConfig(pack_id, 50.0, a, 8.0, 25.0, 10.0, 80.0, 60.0)).max_temp_c, 5)
            for a in ambients
        ]
        if not all(ft[i] >= ft[i + 1] for i in range(len(ft) - 1)):
            ok = False
        if not all(at[i] <= at[i + 1] for i in range(len(at) - 1)):
            ok = False
        flow_sweep[pack_id] = ft
        amb_sweep[pack_id] = at
    return {"passed": ok, "flowSweepMaxTempC": flow_sweep, "ambientSweepMaxTempC": amb_sweep}


def check_published_p1_p3() -> dict:
    _, _, lfp_tabs = load_pack_and_tables("LFP_BLADE")
    _, _, nmc_tabs = load_pack_and_tables("NMC_4680")
    socs = [20, 35, 50, 70, 90]

    lfp_spec_w_dm3 = []
    nmc_spec_w_dm3 = []
    ratios = []
    for s in socs:
        r_lfp, _ = interp_2d(s, 20.0, lfp_tabs["r_dc"]["socGridPercent"], lfp_tabs["r_dc"]["temperatureGridC"], lfp_tabs["r_dc"]["values"])
        r_nmc, _ = interp_2d(s, 20.0, nmc_tabs["r_dc"]["socGridPercent"], nmc_tabs["r_dc"]["temperatureGridC"], nmc_tabs["r_dc"]["values"])
        q_lfp = (135.0 ** 2) * (r_lfp * 1e-3) / S15_LFP_VOLUME_DM3
        q_nmc = (23.125 ** 2) * (r_nmc * 1e-3) / S15_NMC_VOLUME_DM3
        lfp_spec_w_dm3.append(round(q_lfp, 2))
        nmc_spec_w_dm3.append(round(q_nmc, 2))
        ratios.append(round(q_nmc / q_lfp, 3))

    # P1 S15 Fig 8C bounds at 1C, 20 C: LFP ~13-19 W/dm^3, NMC ~29-36 W/dm^3
    p1_ok = min(lfp_spec_w_dm3) >= 12.0 and max(lfp_spec_w_dm3) <= 21.0 and min(nmc_spec_w_dm3) >= 27.0 and max(nmc_spec_w_dm3) <= 38.0
    avg_ratio = sum(ratios) / len(ratios)
    p2_ok = 1.6 <= avg_ratio <= 2.4

    # P3: Uncooled single 4680 cell at 2C from 25 C over 30 min, still air (h = 12 W/(m^2.K)).
    # h is derived, not tuned: F13 (Lienhard, A Heat Transfer Textbook v6.00) eqn. 8.13a (Churchill-Chu,
    # vertical surface, L = 80 mm) gives h_conv = 4.7-6.6 W/(m^2.K) and eqn. 2.31 (h_rad = 4*sigma*eps*Tm^3,
    # eps = 0.9 assumed) gives 5.7-6.7 W/(m^2.K) for dT = 10-45 K, i.e. 10.3-13.3 W/(m^2.K) combined.
    r_amb_single = 1.0 / (12.0 * NMC_4680_SURFACE_AREA_M2)
    p3_cfg = ThermalSimConfig(
        pack_id="NMC_4680",
        charging_power_kw=1.0,
        ambient_temp_c=25.0,
        coolant_flow_lpm=0.0,
        coolant_inlet_temp_c=25.0,
        initial_soc_pct=0.0,
        target_soc_pct=100.0,
        max_duration_min=30.0,
        dt_s=0.5,
        sample_interval_s=30.0,
        constant_cell_current_a=2.0 * 22.078,  # S1 4680 2C rate (44.156 A)
        disable_coolant=True,
        single_zone_override=True,
        cells_per_zone_override=1,
        r_amb_override_kw=r_amb_single,
    )
    p3_res = run_thermal_simulation(p3_cfg)
    p3_mean_w = sum(p3_res.heat_gen_w) / len(p3_res.heat_gen_w)
    p3_max_w = max(p3_res.heat_gen_w)
    p3_ok = 10.0 <= p3_max_w <= 20.0 and 58.0 <= p3_res.max_temp_c <= 82.0

    return {
        "P1": {
            "passed": p1_ok,
            "socGrid": socs,
            "lfpSpecificHeatingWPerDm3": lfp_spec_w_dm3,
            "nmcSpecificHeatingWPerDm3": nmc_spec_w_dm3,
        },
        "P2": {
            "passed": p2_ok,
            "ratioBySoc": ratios,
            "meanRatio": round(avg_ratio, 3),
        },
        "P3": {
            "passed": p3_ok,
            "meanHeatW": round(p3_mean_w, 2),
            "peakHeatW": round(p3_max_w, 2),
            "finalTempC": round(p3_res.max_temp_c, 2),
            "seriesTimeS": p3_res.time_s,
            "seriesTempC": [round(r[0], 3) for r in p3_res.zone_temps_c],
        },
    }


def check_k_perp_sensitivity() -> dict:
    # F1 reports k_perp = 0.61 W/(m.K), spread 0.15..1.4 W/(m.K) (-75% / +130%, +/-81%)
    scales = {"low_0.15": 0.15 / 0.61, "nominal_0.61": 1.0, "high_1.40": 1.40 / 0.61}
    out = {}
    for pack_id in ["LFP_BLADE", "NMC_4680"]:
        out[pack_id] = {}
        for label, s in scales.items():
            res = run_thermal_simulation(
                ThermalSimConfig(pack_id, 100.0, 25.0, 12.0, 25.0, 10.0, 80.0, 45.0, k_through_plane_scale=s)
            )
            out[pack_id][label] = {"maxTempC": round(res.max_temp_c, 3), "spreadC": round(res.temp_spread_c, 3)}
    return out


def check_f9_schimpe_and_soh_vectors() -> tuple[dict, list[dict]]:
    ua_50 = anode_potential_v(50.0)
    # Schimpe p.4: 2800 full cycles at 1C, 25 C -> < 9% capacity loss
    # At 2800 FEC/yr over 1 year (= 8760 h cycling, though test duration in paper was shorter; check exact 2800 FEC + ~4000 h):
    soh_2800 = run_soh_forecast(
        SohConfig(
            chemistry="LFP",
            initial_soh_pct=100.0,
            eol_threshold_pct=80.0,
            horizon_years=1,
            cycles_per_year=2800.0,
            avg_c_rate_ch=1.0,
            dod_pct=80.0,
            avg_rest_soc_pct=50.0,
            representative_temp_c=25.0,
            max_charge_soc_pct=80.0,
        )
    )
    loss_1yr_2800 = 100.0 - soh_2800.points[-1].soh_pct

    # Standard 8-year LFP vector + NMC Option B vector
    lfp_cfg = SohConfig("LFP", 100.0, 80.0, 8, 300.0, 1.0, 70.0, 50.0, 30.0, max_charge_soc_pct=80.0)
    lfp_res = run_soh_forecast(lfp_cfg)

    nmc_user = NmcUserFadeInputs(
        calendar_loss_pct_per_sqrt_year=1.5,
        cycle_loss_pct_per_fec=0.004,
        cycle_exponent=1.0,
        activation_energy_j_per_mol=25000.0,
        reference_temp_c=25.0,
    )
    nmc_cfg = SohConfig("NMC", 100.0, 80.0, 8, 300.0, 1.0, 70.0, 50.0, 32.0, nmc_user_inputs=nmc_user)
    nmc_res = run_soh_forecast(nmc_cfg)

    vectors = [
        {
            "id": "soh_lfp_8yr_30c_300fec",
            "config": {
                "chemistry": "LFP",
                "initialSohPct": 100.0,
                "eolThresholdPct": 80.0,
                "horizonYears": 8,
                "cyclesPerYear": 300.0,
                "avgCRateCh": 1.0,
                "dodPct": 70.0,
                "avgRestSocPct": 50.0,
                "representativeTempC": 30.0,
                "maxChargeSocPct": 80.0,
            },
            "expectedPoints": [
                {
                    "year": p.year,
                    "sohPct": round(p.soh_pct, 4),
                    "sohLowTempPct": round(p.soh_low_temp_pct, 4),
                    "sohHighTempPct": round(p.soh_high_temp_pct, 4),
                }
                for p in lfp_res.points
            ],
        },
        {
            "id": "soh_nmc_option_b_8yr",
            "config": {
                "chemistry": "NMC",
                "initialSohPct": 100.0,
                "eolThresholdPct": 80.0,
                "horizonYears": 8,
                "cyclesPerYear": 300.0,
                "representativeTempC": 32.0,
                "nmcUserInputs": {
                    "calendarLossPctPerSqrtYear": 1.5,
                    "cycleLossPctPerFec": 0.004,
                    "cycleExponent": 1.0,
                    "activationEnergyJPerMol": 25000.0,
                    "referenceTempC": 25.0,
                },
            },
            "expectedPoints": [
                {
                    "year": p.year,
                    "sohPct": round(p.soh_pct, 4),
                    "sohLowTempPct": round(p.soh_low_temp_pct, 4),
                    "sohHighTempPct": round(p.soh_high_temp_pct, 4),
                }
                for p in nmc_res.points
            ],
        },
    ]

    checks = {
        "uaAt50PctV": round(ua_50, 5),
        "uaRefDeltaV": round(abs(ua_50 - 0.123), 5),
        "lossAt2800Fec1Yr25CPct": round(loss_1yr_2800, 3),
        "schimpeSanityPassed": abs(ua_50 - 0.123) < 0.01 and loss_1yr_2800 < 10.0,
    }
    return checks, vectors


def build_thermal_vectors() -> list[dict]:
    cases = [
        ("lfp_normal", ThermalSimConfig("LFP_BLADE", 50.0, 25.0, 8.0, 25.0, 10.0, 80.0, 60.0)),
        ("lfp_fast_charging", ThermalSimConfig("LFP_BLADE", 100.0, 25.0, 12.0, 25.0, 10.0, 80.0, 45.0)),
        ("lfp_reduced_cooling", ThermalSimConfig("LFP_BLADE", 50.0, 30.0, 1.5, 25.0, 10.0, 80.0, 60.0)),
        ("nmc_normal", ThermalSimConfig("NMC_4680", 50.0, 25.0, 8.0, 25.0, 10.0, 80.0, 60.0)),
        ("nmc_fast_charging", ThermalSimConfig("NMC_4680", 100.0, 25.0, 12.0, 25.0, 10.0, 80.0, 45.0)),
        ("nmc_reduced_cooling", ThermalSimConfig("NMC_4680", 50.0, 30.0, 1.5, 25.0, 10.0, 80.0, 60.0)),
    ]
    out = []
    for vid, cfg in cases:
        res = run_thermal_simulation(cfg)
        out.append({
            "id": vid,
            "config": {
                "packId": cfg.pack_id,
                "chargingPowerKw": cfg.charging_power_kw,
                "ambientTemperatureC": cfg.ambient_temp_c,
                "coolantFlowLpm": cfg.coolant_flow_lpm,
                "coolantInletTemperatureC": cfg.coolant_inlet_temp_c,
                "initialSocPercent": cfg.initial_soc_pct,
                "targetSocPercent": cfg.target_soc_pct,
                "maxDurationMinutes": cfg.max_duration_min,
                "dtS": cfg.dt_s,
            },
            "expected": {
                "maxTemperatureC": round(res.max_temp_c, 4),
                "averageTemperatureC": round(res.avg_temp_c, 4),
                "temperatureSpreadC": round(res.temp_spread_c, 4),
                "hottestZoneId": res.hottest_zone_id,
                "energyBalanceErrorPercent": round(res.energy_balance_error_pct, 5),
                "finalZoneTemperaturesC": [round(x, 4) for x in res.final_zone_temps_c],
                "reynoldsNumber": round(res.reynolds_number, 3),
                "finalSocPercent": round(res.soc_pct[-1], 4),
                "durationSeconds": res.time_s[-1],
                "warnings": res.warnings,
            },
        })
    return out


def save_validation_plot(pub: dict, presets: list[dict]) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5), dpi=160)

    # Left: P1 specific heating vs S15 ranges
    socs = pub["P1"]["socGrid"]
    ax1 = axes[0]
    ax1.plot(socs, pub["P1"]["lfpSpecificHeatingWPerDm3"], "o-", label="LFP Blade (model R_dc)")
    ax1.plot(socs, pub["P1"]["nmcSpecificHeatingWPerDm3"], "s-", label="NMC 4680 (model R_dc)")
    ax1.axhspan(13.0, 20.0, alpha=0.12, color="tab:blue", label="S15 Fig 8C LFP band")
    ax1.axhspan(29.0, 37.0, alpha=0.12, color="tab:orange", label="S15 Fig 8C NMC band")
    ax1.set_title("P1 & P2: 1C Specific Heating at 20 °C")
    ax1.set_xlabel("SOC [%]")
    ax1.set_ylabel("Specific Heating [W / dm³]")
    ax1.grid(True, alpha=0.3)
    ax1.legend(fontsize=8)

    # Right: P3 uncooled 4680 @ 2C
    ax2 = axes[1]
    t_min = [s / 60.0 for s in pub["P3"]["seriesTimeS"]]
    ax2.plot(t_min, pub["P3"]["seriesTempC"], "-", color="tab:red", linewidth=2, label="Uncooled 4680 @ 2C (h_amb=12)")
    ax2.axhline(70.0, linestyle="--", color="tab:gray", label="S1 p.11 ~70 °C reference")
    ax2.set_title("P3: Uncooled Single 4680 Cell @ 2C (T_amb = 25 °C)")
    ax2.set_xlabel("Time [min]")
    ax2.set_ylabel("Cell Temperature [°C]")
    ax2.grid(True, alpha=0.3)
    ax2.legend(fontsize=8)

    plt.tight_layout()
    out_png = ROOT / "analysis" / "validation" / "p1_p3_validation.png"
    fig.savefig(out_png)
    plt.close(fig)


def main() -> None:
    preset_rows, v1 = run_presets_and_v1()
    v2 = check_v2_steady_state()
    v3 = check_v3_timestep_halving()
    v4 = check_v4_determinism()
    v5 = check_v5_monotonicity()
    pub = check_published_p1_p3()
    k_sens = check_k_perp_sensitivity()
    f9_checks, soh_vectors = check_f9_schimpe_and_soh_vectors()
    thermal_vectors = build_thermal_vectors()

    now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    (ROOT / "data" / "test-vectors").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "test-vectors" / "thermal_vectors.json").write_text(
        json.dumps({
            "vectorSetVersion": "1.0.0",
            "generatedBy": "analysis/validation/run_checks.py",
            "generatedAtIso": now_iso,
            "thermalVectors": thermal_vectors,
            "sohVectors": [],
        }, indent=2) + "\n"
    )
    (ROOT / "data" / "test-vectors" / "soh_vectors.json").write_text(
        json.dumps({
            "vectorSetVersion": "1.0.0",
            "generatedBy": "analysis/validation/run_checks.py",
            "generatedAtIso": now_iso,
            "thermalVectors": [{"id": thermal_vectors[0]["id"], "config": thermal_vectors[0]["config"], "expected": thermal_vectors[0]["expected"]}],
            "sohVectors": soh_vectors,
        }, indent=2) + "\n"
    )

    save_validation_plot(pub, preset_rows)

    report = {
        "generatedAtIso": now_iso,
        "verification": {"V1": v1, "V2": v2, "V3": v3, "V4": v4, "V5": v5},
        "publishedWeakChecks": pub,
        "kThroughPlaneSensitivity": k_sens,
        "schimpeF9Sanity": f9_checks,
        "presetsSummary": preset_rows,
    }
    (ROOT / "analysis" / "validation" / "validation_report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

