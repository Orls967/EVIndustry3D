"""Pytest suite verifying V1-V5, P1-P3, warning flags, F9 Schimpe LFP & NMC Option B."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "analysis"))

from reference_model import (  # noqa: E402
    NmcUserFadeInputs,
    SohConfig,
    ThermalSimConfig,
    anode_potential_v,
    run_soh_forecast,
    run_thermal_simulation,
)
from validation.run_checks import (  # noqa: E402
    check_f9_schimpe_and_soh_vectors,
    check_published_p1_p3,
    check_v2_steady_state,
    check_v3_timestep_halving,
    check_v4_determinism,
    check_v5_monotonicity,
    run_presets_and_v1,
)


def test_v1_energy_balance_presets() -> None:
    _, v1 = run_presets_and_v1()
    assert v1["passed"] is True
    assert v1["maxEnergyBalanceErrPct"] <= 1.0


def test_v2_steady_state_analytic() -> None:
    v2 = check_v2_steady_state()
    assert v2["passed"] is True
    assert v2["absDeltaC"] <= 0.1


def test_v3_timestep_halving() -> None:
    v3 = check_v3_timestep_halving()
    assert v3["passed"] is True


def test_v4_determinism() -> None:
    v4 = check_v4_determinism()
    assert v4["passed"] is True


def test_v5_monotonicity() -> None:
    v5 = check_v5_monotonicity()
    assert v5["passed"] is True


def test_published_weak_checks_p1_p3() -> None:
    pub = check_published_p1_p3()
    assert pub["P1"]["passed"] is True
    assert pub["P2"]["passed"] is True
    assert pub["P3"]["passed"] is True


def test_f9_schimpe_sanity() -> None:
    assert abs(anode_potential_v(50.0) - 0.123) < 0.01
    checks, _ = check_f9_schimpe_and_soh_vectors()
    assert checks["schimpeSanityPassed"] is True


def test_nmc_option_b_requires_explicit_user_inputs() -> None:
    with pytest.raises(ValueError, match="Option B"):
        run_soh_forecast(
            SohConfig(
                chemistry="NMC",
                initial_soh_pct=100.0,
                eol_threshold_pct=80.0,
                horizon_years=8,
                cycles_per_year=300.0,
                avg_c_rate_ch=1.0,
                dod_pct=70.0,
                avg_rest_soc_pct=50.0,
                representative_temp_c=30.0,
                nmc_user_inputs=None,
            )
        )


def test_nmc_option_b_and_sensitivity_band() -> None:
    res = run_soh_forecast(
        SohConfig(
            chemistry="NMC",
            initial_soh_pct=100.0,
            eol_threshold_pct=80.0,
            horizon_years=5,
            cycles_per_year=250.0,
            avg_c_rate_ch=1.0,
            dod_pct=70.0,
            avg_rest_soc_pct=50.0,
            representative_temp_c=30.0,
            nmc_user_inputs=NmcUserFadeInputs(1.2, 0.005, 1.0, 22000.0, 25.0),
        )
    )
    assert len(res.points) == 6
    last = res.points[-1]
    assert last.soh_high_temp_pct < last.soh_pct < last.soh_low_temp_pct


def test_runtime_reynolds_and_c_rate_warnings() -> None:
    res = run_thermal_simulation(
        ThermalSimConfig(
            pack_id="LFP_BLADE",
            charging_power_kw=140.0,  # > 2C on 51.84 kWh LFP pack
            ambient_temp_c=5.0,       # < 10 C resistance table min -> OOR warning
            coolant_flow_lpm=35.0,    # Re > 950 -> non-laminar F3 warning
            coolant_inlet_temp_c=25.0,
            initial_soc_pct=10.0,
            target_soc_pct=80.0,
            max_duration_min=30.0,
        )
    )
    assert "C_RATE_ABOVE_2C" in res.warnings
    assert "NON_LAMINAR_COOLANT_F3" in res.warnings
    assert "RESISTANCE_TABLE_OUT_OF_RANGE" in res.warnings

