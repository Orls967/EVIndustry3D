"""Offline Python reference thermal and SoH models for verification and vector generation."""

from .soh import (
    NmcUserFadeInputs,
    SohConfig,
    SohPoint,
    SohResult,
    anode_potential_v,
    run_soh_forecast,
)
from .thermal import (
    CoolingMetrics,
    ThermalSimConfig,
    ThermalSimResult,
    compute_cooling_metrics,
    interp_1d,
    interp_2d,
    load_pack_and_tables,
    run_thermal_simulation,
)

__all__ = [
    "CoolingMetrics",
    "NmcUserFadeInputs",
    "SohConfig",
    "SohPoint",
    "SohResult",
    "ThermalSimConfig",
    "ThermalSimResult",
    "anode_potential_v",
    "compute_cooling_metrics",
    "interp_1d",
    "interp_2d",
    "load_pack_and_tables",
    "run_soh_forecast",
    "run_thermal_simulation",
]
