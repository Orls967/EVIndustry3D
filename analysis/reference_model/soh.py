"""State-of-Health projection reference models: LFP Schimpe 2018 (F9) & NMC Option B."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent.parent
REGISTER_PATH = ROOT / "data" / "parameters" / "register.json"
HOURS_PER_YEAR = 8760.0
R_GAS = 8.314


def _load_lfp_schimpe_params() -> dict[str, float]:
    reg = json.loads(REGISTER_PATH.read_text())
    for p in reg["parameters"]:
        if p["id"] == "soh.lfp.schimpe_2018":
            return {k: float(v) for k, v in p["value"].items()}
    raise KeyError("Missing soh.lfp.schimpe_2018 in register.json")


def anode_potential_v(soc_pct: float, params: dict[str, float] | None = None) -> float:
    """Schimpe 2018 Appendix Eqs. [A1]-[A2] & Table AI anode open-circuit potential Ua(SOC)."""
    p = params or _load_lfp_schimpe_params()
    soc_frac = min(max(soc_pct / 100.0, 0.0), 1.0)
    xa = p["xa0"] + soc_frac * (p["xa100"] - p["xa0"])
    return (
        0.6379
        + 0.5416 * math.exp(-305.5309 * xa)
        + 0.044 * math.tanh(-(xa - 0.1958) / 0.1088)
        - 0.1978 * math.tanh((xa - 1.0571) / 0.0854)
        - 0.6875 * math.tanh((xa + 0.0117) / 0.0529)
        - 0.0175 * math.tanh((xa - 0.5692) / 0.0875)
    )


@dataclass(frozen=True)
class NmcUserFadeInputs:
    """User-editable Option B fade inputs for NMC (no defaults per G2-3 Option B)."""

    calendar_loss_pct_per_sqrt_year: float
    cycle_loss_pct_per_fec: float
    cycle_exponent: float
    activation_energy_j_per_mol: float
    reference_temp_c: float


@dataclass(frozen=True)
class SohConfig:
    chemistry: str  # "LFP" | "NMC"
    initial_soh_pct: float
    eol_threshold_pct: float
    horizon_years: int
    cycles_per_year: float
    avg_c_rate_ch: float
    dod_pct: float
    avg_rest_soc_pct: float
    representative_temp_c: float
    max_charge_soc_pct: float = 80.0
    nmc_user_inputs: NmcUserFadeInputs | None = None


@dataclass(frozen=True)
class SohPoint:
    year: float
    soh_pct: float
    soh_low_temp_pct: float  # evaluated at T_rep - 5 C (temperature sensitivity)
    soh_high_temp_pct: float  # evaluated at T_rep + 5 C (temperature sensitivity)
    calendar_loss_pct: float
    cycle_loss_pct: float


@dataclass
class SohResult:
    chemistry: str
    model_name: str
    classification: str
    points: list[SohPoint]
    eol_year: float | None
    sensitivity_note: str


def _eval_lfp_loss_pct(
    t_c: float,
    years: float,
    cycles_per_year: float,
    avg_c_rate_ch: float,
    dod_pct: float,
    avg_rest_soc_pct: float,
    max_charge_soc_pct: float,
    params: dict[str, float],
) -> tuple[float, float]:
    """Schimpe 2018 Eqs. [9], [12]-[18], [20]-[23] -> (cal_loss_pct, cyc_loss_pct)."""
    if years <= 0.0:
        return 0.0, 0.0

    t_k = t_c + 273.15
    t_ref_k = params["tRefK"]
    inv_t_diff = (1.0 / t_k) - (1.0 / t_ref_k)
    rg = params["rg"]
    faraday = params["faraday"]

    # Eq. [9]: calendar stress factor k_Cal [h^-0.5]
    ua_v = anode_potential_v(avg_rest_soc_pct, params)
    k_cal = (
        params["kCalRef"]
        * math.exp((-params["eaCal"] / rg) * inv_t_diff)
        * (math.exp((params["alpha"] * faraday / rg) * (params["uaRefV"] - ua_v) / t_ref_k) + params["k0"])
    )
    t_hours = years * HOURS_PER_YEAR
    q_cal_frac = k_cal * math.sqrt(t_hours)

    # Normalized charge throughput in Schimpe 3 Ah reference cell equivalents:
    # 1 FEC = 2 * C_0 = 6 Ah total throughput (3 Ah charge throughput)
    n_fec = cycles_per_year * years
    q_tot_ref_ah = n_fec * (2.0 * params["c0RefAh"])
    q_ch_ref_ah = n_fec * params["c0RefAh"]

    # (I_Ch - I_Ch,Ref) / C_0 = C_rate_ch - 1.0 (since I_Ch,Ref = 1C = 3 A on C_0 = 3 Ah)
    c_rate_delta = avg_c_rate_ch - 1.0

    # Eq. [15]: high-temperature cycling SEI stress factor (exp(-Ea/Rg * (1/T - 1/Tref)))
    k_cyc_high = params["kCycHighTRef"] * math.exp((-params["eaCycHighT"] / rg) * inv_t_diff)

    # Eq. [18]: low-temperature cycling stress factor (+Ea/Rg * (1/T - 1/Tref))
    k_cyc_low = (
        params["kCycLowTRef"]
        * math.exp((params["eaCycLowT"] / rg) * inv_t_diff)
        * math.exp(params["betaLowT"] * c_rate_delta)
    )

    # Eq. [21]: low-temperature, high-SOC (> 82%) linear throughput term (+Ea/Rg * (1/T - 1/Tref))
    soc_thresh_pct = params["socRef"] * 100.0
    if max_charge_soc_pct > soc_thresh_pct and dod_pct > 0.0:
        min_soc_pct = max(max_charge_soc_pct - dod_pct, 0.0)
        high_soc_span = max_charge_soc_pct - max(min_soc_pct, soc_thresh_pct)
        high_soc_share = min(max(high_soc_span / dod_pct, 0.0), 1.0)
    else:
        high_soc_share = 0.0

    k_cyc_low_high_soc = (
        params["kCycLowTHighSocRef"]
        * math.exp((params["eaCycLowTHighSoc"] / rg) * inv_t_diff)
        * math.exp(params["betaLowTHighSoc"] * c_rate_delta)
    )

    q_cyc_frac = (
        k_cyc_high * math.sqrt(q_tot_ref_ah)
        + k_cyc_low * math.sqrt(q_ch_ref_ah)
        + k_cyc_low_high_soc * (q_ch_ref_ah * high_soc_share)
    )
    return q_cal_frac * 100.0, q_cyc_frac * 100.0


def _eval_nmc_user_loss_pct(
    t_c: float,
    years: float,
    cycles_per_year: float,
    user: NmcUserFadeInputs,
) -> tuple[float, float]:
    if years <= 0.0:
        return 0.0, 0.0
    t_k = t_c + 273.15
    t_ref_k = user.reference_temp_c + 273.15
    arrh = math.exp((-user.activation_energy_j_per_mol / R_GAS) * ((1.0 / t_k) - (1.0 / t_ref_k)))
    cal_pct = user.calendar_loss_pct_per_sqrt_year * arrh * math.sqrt(years)
    n_fec = max(cycles_per_year * years, 0.0)
    cyc_pct = user.cycle_loss_pct_per_fec * arrh * (n_fec ** user.cycle_exponent)
    return cal_pct, cyc_pct


def run_soh_forecast(config: SohConfig) -> SohResult:
    lfp_params = _load_lfp_schimpe_params() if config.chemistry == "LFP" else None
    if config.chemistry == "NMC" and config.nmc_user_inputs is None:
        raise ValueError("NMC Option B requires explicit user-editable fade inputs (no defaults permitted).")

    def loss_at(t_c: float, yr: float) -> tuple[float, float]:
        if config.chemistry == "LFP":
            assert lfp_params is not None
            return _eval_lfp_loss_pct(
                t_c,
                yr,
                config.cycles_per_year,
                config.avg_c_rate_ch,
                config.dod_pct,
                config.avg_rest_soc_pct,
                config.max_charge_soc_pct,
                lfp_params,
            )
        assert config.nmc_user_inputs is not None
        return _eval_nmc_user_loss_pct(t_c, yr, config.cycles_per_year, config.nmc_user_inputs)

    points: list[SohPoint] = []
    eol_year: float | None = None

    for y in range(0, config.horizon_years + 1):
        cal_nom, cyc_nom = loss_at(config.representative_temp_c, float(y))
        cal_lo, cyc_lo = loss_at(config.representative_temp_c - 5.0, float(y))
        cal_hi, cyc_hi = loss_at(config.representative_temp_c + 5.0, float(y))

        soh_nom = max(config.initial_soh_pct - cal_nom - cyc_nom, 0.0)
        soh_lo = max(config.initial_soh_pct - cal_lo - cyc_lo, 0.0)
        soh_hi = max(config.initial_soh_pct - cal_hi - cyc_hi, 0.0)

        points.append(
            SohPoint(
                year=float(y),
                soh_pct=soh_nom,
                soh_low_temp_pct=soh_lo,
                soh_high_temp_pct=soh_hi,
                calendar_loss_pct=cal_nom,
                cycle_loss_pct=cyc_nom,
            )
        )

        if eol_year is None and y > 0 and soh_nom <= config.eol_threshold_pct:
            prev = points[-2]
            denom = prev.soh_pct - soh_nom
            frac = (prev.soh_pct - config.eol_threshold_pct) / denom if denom > 1e-9 else 1.0
            eol_year = (y - 1) + min(max(frac, 0.0), 1.0)

    if config.chemistry == "LFP":
        model_name = "Schimpe 2018 LFP/Graphite Semi-Empirical (26650 3 Ah proxy)"
    else:
        model_name = "NMC User-Parameter Arrhenius + Throughput (Option B, no defaults)"

    return SohResult(
        chemistry=config.chemistry,
        model_name=model_name,
        classification="Illustrative",
        points=points,
        eol_year=eol_year,
        sensitivity_note="Temperature sensitivity band computed at T_rep +/- 5 C; not a statistical confidence interval.",
    )

