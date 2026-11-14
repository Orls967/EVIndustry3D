"""Deterministically build pack definitions and parameter register JSON files.

All geometry, cooling channel, thermal resistance, coolant, and degradation
constants are derived or traced from documented sources and stated assumptions
under docs/design/05-simulation-and-data-design.md, 06-3d-asset-specification.md,
and docs/plan/04-simulation-data-3d-plan.md.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
REVIEW_DATE = "2026-11-14"

# Coolant: 50 wt% ethylene glycol / water at 25 C (F2 Figs 7, 8, 9, 17)
COOLANT = {
    "name": "50 wt% ethylene glycol / water at 25 C baseline",
    "specificHeatJPerKgK": 3488.0,
    "conductivityWPerMK": 0.417,
    "densityKgPerM3": 1061.0,
    "viscosityPaS": 0.00327,
    "inletTempDefaultC": 25.0,
    "flowRangeLpm": [1.0, 20.0],
    "sourceRef": "F2 (Yaws / Engineering ToolBox 50 wt% EG correlations at 25 C; water check 4186 J/(kg.K), 0.603 W/(m.K))",
}

NU_A8B_UNIFORM_WALL_TEMP = 5.597  # F13 Table 7.4, a = 8b, uniform wall temperature
H_AMB_W_PER_M2K = 5.0  # F3 assumption
K_THROUGH_PLANE_W_PER_MK = 0.61  # F1 median (-/+81% uncertainty)
K_ALUMINUM_6061_W_PER_MK = 167.0  # standard 6061-T6 aluminum cold-plate wall


def compute_channel_metrics(
    width_mm: float,
    height_mm: float,
    n_channels: int,
    nu: float,
    contact_area_zone_m2: float,
    tim_thickness_mm: float,
    tim_k_w_per_mk: float,
    wall_thickness_mm: float,
    sample_flow_lpm: float = 8.0,
) -> dict[str, float]:
    a = width_mm / 1000.0
    b = height_mm / 1000.0
    d_h = (2.0 * a * b) / (a + b)
    h_cc = nu * COOLANT["conductivityWPerMK"] / d_h
    r_conv = 1.0 / (h_cc * contact_area_zone_m2)
    r_tim = (tim_thickness_mm / 1000.0) / (tim_k_w_per_mk * contact_area_zone_m2)
    r_wall = (wall_thickness_mm / 1000.0) / (K_ALUMINUM_6061_W_PER_MK * contact_area_zone_m2)
    r_base = r_tim + r_wall
    v_dot = sample_flow_lpm / 60000.0
    vel = v_dot / (n_channels * a * b)
    re = COOLANT["densityKgPerM3"] * vel * d_h / COOLANT["viscosityPaS"]
    return {
        "d_h_m": round(d_h, 8),
        "h_cc_w_per_m2k": round(h_cc, 4),
        "r_base_kw": round(r_base, 6),
        "r_cc_total_at_sample_kw": round(r_conv + r_base, 6),
        "re_at_sample": round(re, 2),
        "v_at_sample_m_s": round(vel, 4),
    }


def build_lfp_blade_pack() -> dict:
    # S15 Table 1 blade cell: 965 x 90 x 14 mm, 2.7 kg, 135 Ah, 3.2 V
    n_zones = 10
    cells_per_zone = 12
    series_count = 120
    parallel_count = 1
    cell_mass_kg = 2.7
    c_cell_25 = 1041.0  # F1 prismatic median
    zone_thermal_mass = round(cells_per_zone * cell_mass_kg * c_cell_25, 2)

    inter_cell_gap_mm = 0.8
    tim_thickness_mm = 1.5
    tim_k = 3.0  # Assumed silicone thermal pad
    wall_thickness_mm = 2.0
    enclosure_wall_mm = 12.0

    # Stack length along X = 120*14 + 119*0.8 = 1775.2 mm -> pack lengthX = 1820 mm
    length_x_mm = 1820.0
    width_z_mm = 1020.0
    height_y_mm = 140.0

    # Top cold plate channels: 14 parallel channels, a = 24 mm, b = 3 mm (a = 8b)
    ch_w_mm = 24.0
    ch_h_mm = 3.0
    n_ch = 14
    # Contact area per zone = top face of 12 cells (0.014 * 0.965 * 12)
    contact_area_zone_m2 = round(cells_per_zone * 0.014 * 0.965, 6)
    cooling_metrics = compute_channel_metrics(
        ch_w_mm,
        ch_h_mm,
        n_ch,
        NU_A8B_UNIFORM_WALL_TEMP,
        contact_area_zone_m2,
        tim_thickness_mm,
        tim_k,
        wall_thickness_mm,
    )

    # Zone-to-zone thermal resistance along X across 12 blade cells (F1 k_perp = 0.61 W/(m.K))
    # L_cell = 12 * 0.014 = 0.168 m over cross-section A_yz = 0.965 * 0.090 = 0.08685 m^2
    # Plus 12 * 0.0008 m polyurethane/air spacer (k_eff ~ 0.25 W/(m.K) assumed)
    a_yz = 0.965 * 0.090
    r_zz_kw = round((0.168 / (K_THROUGH_PLANE_W_PER_MK * a_yz)) + (0.0096 / (0.25 * a_yz)), 4)

    # Ambient resistance per zone: exterior enclosure area ~ 0.44 m^2, h_amb = 5 W/(m^2.K) (F3)
    ext_area_per_zone_m2 = 0.44
    r_amb_kw = round(1.0 / (H_AMB_W_PER_M2K * ext_area_per_zone_m2), 4)

    zones = [
        {
            "id": f"pack.zone_{i:02d}",
            "cellCount": cells_per_zone,
            "order": i,
            "thermalMassJPerK": zone_thermal_mass,
        }
        for i in range(1, n_zones + 1)
    ]

    components = [
        {
            "id": "pack.upper_enclosure",
            "name": "Upper enclosure (lid)",
            "category": "Structure",
            "func": "Seals the battery pack against dust and moisture and protects top BMS and cooling hardware.",
            "material": "Stamped aluminum alloy shell (generic)",
            "location": "Top perimeter over BMS, busbars, and cold plate",
            "parameters": [
                {"label": "Envelope (L x W x H)", "value": f"{length_x_mm:.0f} x {width_z_mm:.0f} x {height_y_mm:.0f}", "unit": "mm", "sourceRef": "ASSUMED"},
                {"label": "Shell thickness", "value": "3.0", "unit": "mm", "sourceRef": "ASSUMED"},
            ],
            "failureModes": [
                {"mode": "Perimeter gasket compression loss", "effect": "Ingress risk for moisture and dust into pack cavity."},
                {"mode": "Impact denting", "effect": "Reduced internal clearance above cold plate and HV busbars."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 1, "offsetM": [0.0, 0.42, 0.0]},
        },
        {
            "id": "pack.bms",
            "name": "Battery management unit (BMS)",
            "category": "Electronics",
            "func": "Monitors cell group voltages, temperatures, and contactor state; coordinates charging current requests.",
            "material": "Aluminum housing with conformal-coated PCB",
            "location": "Front upper shelf above cold plate manifold",
            "parameters": [
                {"label": "Monitored series groups", "value": "120", "unit": "count", "sourceRef": "ASSUMED"},
                {"label": "Thermal zone sensors", "value": "10", "unit": "zones", "sourceRef": "ASSUMED"},
            ],
            "failureModes": [
                {"mode": "Sense harness / NTC drift", "effect": "Inaccurate SOC balancing or false over-temperature derating."},
                {"mode": "Contactor weld", "effect": "Inability to isolate HV pack on fault."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 2, "offsetM": [0.0, 0.28, 0.0]},
        },
        {
            "id": "pack.busbars",
            "name": "HV interconnect busbars",
            "category": "Electrical",
            "func": "Connects the 120 blade cells in series and routes pack charge current to the main terminals.",
            "material": "Nickel-plated copper / aluminum bar (generic)",
            "location": "Along both Z-sides at blade cell terminal headers",
            "parameters": [
                {"label": "Series configuration", "value": "120s1p", "unit": "topology", "sourceRef": "05 §1"},
                {"label": "Pack nominal voltage", "value": "384.0", "unit": "V", "sourceRef": "S15 Table 1 x 120s"},
            ],
            "failureModes": [
                {"mode": "Laser weld / bolt joint resistance rise", "effect": "Localized I^2 R heating near terminal zones."},
                {"mode": "Insulation abrasion", "effect": "HV isolation fault against enclosure."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 2, "offsetM": [0.0, 0.28, 0.0]},
        },
        {
            "id": "pack.cooling_plate",
            "name": "Top liquid cold plate",
            "category": "Thermal",
            "func": "Extracts heat from the top edges of all 120 blade cells through internal rectangular EG/water channels.",
            "material": "Brazed 6061/3003 aluminum cold plate",
            "location": "Directly above TIM slab spanning zones 01 to 10",
            "parameters": [
                {"label": "Channel cross-section (a x b)", "value": "24.0 x 3.0", "unit": "mm", "sourceRef": "ASSUMED (F13 a=8b)"},
                {"label": "Parallel channels", "value": "14", "unit": "count", "sourceRef": "ASSUMED"},
                {"label": "Laminar Nu_Dh (T-const)", "value": "5.597", "unit": "-", "sourceRef": "F13 Table 7.4"},
                {"label": "Derived h_cc", "value": f"{cooling_metrics['h_cc_w_per_m2k']:.1f}", "unit": "W/(m^2.K)", "sourceRef": "DERIVED (F2, F13)"},
            ],
            "failureModes": [
                {"mode": "Internal channel fouling / air lock", "effect": "Reduced effective flow and elevated downstream zone temperatures."},
                {"mode": "Coolant leak at braze seam", "effect": "Loss of coolant pressure and HV dielectric risk."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 3, "offsetM": [0.0, 0.17, 0.0]},
        },
        {
            "id": "pack.coolant_inlet",
            "name": "Coolant inlet port",
            "category": "Thermal",
            "func": "Feeds chilled 50 wt% ethylene glycol/water coolant into zone 01 of the top cold plate.",
            "material": "Aluminum quick-connect manifold spigot",
            "location": "Zone 01 (-X) end of top cold plate",
            "parameters": [
                {"label": "Coolant", "value": "50 wt% EG/water", "unit": "-", "sourceRef": "F2"},
                {"label": "Default inlet T", "value": "25.0", "unit": "C", "sourceRef": "ASSUMED (F3 match)"},
            ],
            "failureModes": [
                {"mode": "Quick-connector O-ring weep", "effect": "Gradual coolant volume loss and air entrainment."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 3, "offsetM": [0.0, 0.17, 0.0]},
        },
        {
            "id": "pack.coolant_outlet",
            "name": "Coolant outlet port",
            "category": "Thermal",
            "func": "Returns warmed coolant from zone 10 back to the vehicle thermal management loop.",
            "material": "Aluminum quick-connect manifold spigot",
            "location": "Zone 10 (+X) end of top cold plate",
            "parameters": [
                {"label": "Exit zone", "value": "pack.zone_10", "unit": "-", "sourceRef": "ASSUMED"},
            ],
            "failureModes": [
                {"mode": "Flow restriction / valve sticking", "effect": "Elevated outlet and cell temperatures across trailing zones."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 3, "offsetM": [0.0, 0.17, 0.0]},
        },
        {
            "id": "pack.thermal_interface",
            "name": "Thermal interface layer (TIM)",
            "category": "Thermal",
            "func": "Eliminates air gaps between blade cell top faces and the cold plate while providing electrical isolation.",
            "material": "Dielectric silicone gap pad (k = 3.0 W/(m.K) assumed)",
            "location": "Sandwiched between blade cell top edges and cold plate underside",
            "parameters": [
                {"label": "Thickness", "value": f"{tim_thickness_mm:.1f}", "unit": "mm", "sourceRef": "ASSUMED"},
                {"label": "Conductivity", "value": f"{tim_k:.1f}", "unit": "W/(m.K)", "sourceRef": "ASSUMED"},
            ],
            "failureModes": [
                {"mode": "Pad pump-out or dry-out", "effect": "Increases R_cc and raises peak cell temperature."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 4, "offsetM": [0.0, 0.08, 0.0]},
        },
        {
            "id": "pack.cells",
            "name": "LFP blade cell array (120 cells)",
            "category": "Electrochemical",
            "func": "Stores 51.84 kWh nominally in 120 series LFP/graphite prismatic blade cells across 10 thermal zones.",
            "material": "LiFePO4 / graphite prismatic blade cells",
            "location": "Cell-to-pack bay inside lower tray",
            "parameters": [
                {"label": "Dimensions (L x H x T)", "value": "965 x 90 x 14", "unit": "mm", "sourceRef": "S15 Table 1"},
                {"label": "Capacity / Voltage", "value": "135 Ah / 3.2 V", "unit": "per cell", "sourceRef": "S15 Table 1"},
                {"label": "Mass / c_p", "value": "2.7 kg / 1041 J/(kg.K)", "unit": "per cell", "sourceRef": "S15 Table 1; F1"},
            ],
            "failureModes": [
                {"mode": "SEI growth & lithium plating at low T / high SOC", "effect": "Irreversible capacity fade and impedance growth (F9)."},
                {"mode": "Stack pressure relaxation", "effect": "Uneven interfacial contact and resistance spread."},
            ],
            "provenance": "SOURCED",
            "explode": {"stage": 5, "offsetM": [0.0, 0.0, 0.0]},
        },
        {
            "id": "pack.lower_enclosure",
            "name": "Lower structural tray",
            "category": "Structure",
            "func": "Supports cell stack weight, absorbs underbody road loads, and anchors mounting cross-members.",
            "material": "Extruded aluminum tray with cross-members (generic)",
            "location": "Base reference frame (y <= 0)",
            "parameters": [
                {"label": "Base thickness", "value": "10.0", "unit": "mm", "sourceRef": "ASSUMED"},
            ],
            "failureModes": [
                {"mode": "Underbody impact distortion", "effect": "Can compress cells or compromise bottom clearance."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 0, "offsetM": [0.0, 0.0, 0.0]},
        },
    ]

    return {
        "id": "LFP_BLADE",
        "displayName": "Generic LFP Blade Pack (120s1p)",
        "description": "Generic cell-to-pack prismatic LFP blade architecture with top liquid cold plate, inspired by commercial blade CTP layouts using S15 cell parameters.",
        "provenanceNote": "Cell dimensions, mass, capacity, nominal voltage, and R_dc are SOURCED from S15. Specific heat (F1), coolant (F2), Nusselt (F13), OCV/EHC (F7 proxy), and SoH (F9) are SOURCED/DIGITIZED. Pack series count (120s1p), zone count (10), gaps, and channel dimensions are ASSUMED design values.",
        "cell": {
            "formFactor": "PRISMATIC_BLADE",
            "dimensionsMm": [965.0, 90.0, 14.0],
            "massKg": cell_mass_kg,
            "nominalCapacityAh": 135.0,
            "nominalVoltageV": 3.2,
            "specificHeatJPerKgK": c_cell_25,
            "specificHeatTempCoeffPctPerK": 0.2,
            "kThroughPlaneWPerMK": K_THROUGH_PLANE_W_PER_MK,
            "kInPlaneWPerMK": 30.5,
            "sourceRefs": ["S15 Table 1", "F1 (c_cell=1041, +0.2%/K, k_perp=0.61, k_par=21-40.1)"],
        },
        "seriesCount": series_count,
        "parallelCount": parallel_count,
        "envelopeMm": {
            "lengthX": length_x_mm,
            "heightY": height_y_mm,
            "widthZ": width_z_mm,
            "interCellGapMm": inter_cell_gap_mm,
            "enclosureWallMm": enclosure_wall_mm,
            "timThicknessMm": tim_thickness_mm,
            "timConductivityWPerMK": tim_k,
            "provenance": "ASSUMED",
        },
        "cooling": {
            "topology": "TOP_COLD_PLATE",
            "channelWidthMm": ch_w_mm,
            "channelHeightMm": ch_h_mm,
            "parallelChannels": n_ch,
            "nusseltNumber": NU_A8B_UNIFORM_WALL_TEMP,
            "nusseltBoundaryCondition": "UNIFORM_WALL_TEMP",
            "contactAreaPerZoneM2": contact_area_zone_m2,
            "rZoneToCoolantBaseKW": cooling_metrics["r_base_kw"],
            "rZoneToZoneKW": r_zz_kw,
            "rZoneToAmbientKW": r_amb_kw,
            "provenance": "ASSUMED",
        },
        "zones": zones,
        "coolantPath": [z["id"] for z in zones],
        "components": components,
    }


def build_nmc_4680_pack() -> dict:
    # S15 Table 1 + S1 4680 cell: dia 46 mm x H 80 mm, 0.355 kg, 23.125 Ah, 3.7 V
    # Pack: 92s9p = 828 cells (36 cols X x 23 rows Z), 12 zones x (3 cols x 23 rows = 69 cells)
    n_zones = 12
    cells_per_zone = 69
    series_count = 92
    parallel_count = 9
    cell_mass_kg = 0.355
    c_cell_25 = 912.0  # F1 cylindrical median
    zone_thermal_mass = round(cells_per_zone * cell_mass_kg * c_cell_25, 2)

    inter_cell_gap_mm = 2.5
    tim_thickness_mm = 1.0
    tim_k = 2.5  # Assumed silicone TIM sleeve around 4680 sidewall
    wall_thickness_mm = 0.8
    enclosure_wall_mm = 15.0

    # 36 cols * 48.5 mm X pitch = 1746 mm -> lengthX = 1800 mm
    # 23 rows * ~49 mm average Z pitch (accommodating 12 side ribbons) -> widthZ = 1160 mm
    length_x_mm = 1800.0
    width_z_mm = 1160.0
    height_y_mm = 125.0

    # Side cooling ribbons: 12 parallel channels, a = 24 mm, b = 3 mm (a = 8b)
    ch_w_mm = 24.0
    ch_h_mm = 3.0
    n_ch = 12
    # 60 deg arc contact (pi/3 * 23 mm = 24.086 mm) * 64 mm ribbon contact height per cell * 69 cells
    arc_m = (math.pi / 3.0) * 0.023
    ribbon_h_m = 0.064
    contact_area_zone_m2 = round(cells_per_zone * arc_m * ribbon_h_m, 6)
    cooling_metrics = compute_channel_metrics(
        ch_w_mm,
        ch_h_mm,
        n_ch,
        NU_A8B_UNIFORM_WALL_TEMP,
        contact_area_zone_m2,
        tim_thickness_mm,
        tim_k,
        wall_thickness_mm,
    )

    # Zone-to-zone along X across 3 columns (zone pitch = 3 * 48.5 = 145.5 mm, A_yz ~ 1.127 * 0.080 = 0.09016 m^2)
    a_yz = 1.127 * 0.080
    r_zz_kw = round(0.1455 / (K_THROUGH_PLANE_W_PER_MK * a_yz), 4)

    # Ambient resistance per zone: ~0.40 m^2 exterior enclosure per zone, h_amb = 5 W/(m^2.K)
    ext_area_per_zone_m2 = 0.40
    r_amb_kw = round(1.0 / (H_AMB_W_PER_M2K * ext_area_per_zone_m2), 4)

    zones = [
        {
            "id": f"pack.zone_{i:02d}",
            "cellCount": cells_per_zone,
            "order": i,
            "thermalMassJPerK": zone_thermal_mass,
        }
        for i in range(1, n_zones + 1)
    ]

    components = [
        {
            "id": "pack.upper_enclosure",
            "name": "Upper enclosure (lid)",
            "category": "Structure",
            "func": "Structural lid sealing the 828-cell 4680 array and protecting HV current collectors.",
            "material": "Stamped aluminum alloy shell (generic)",
            "location": "Top perimeter over current collectors and BMS",
            "parameters": [
                {"label": "Envelope (L x W x H)", "value": f"{length_x_mm:.0f} x {width_z_mm:.0f} x {height_y_mm:.0f}", "unit": "mm", "sourceRef": "ASSUMED"},
            ],
            "failureModes": [
                {"mode": "Seal degradation", "effect": "Moisture condensation inside cell bay."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 1, "offsetM": [0.0, 0.42, 0.0]},
        },
        {
            "id": "pack.bms",
            "name": "Battery management unit (BMS)",
            "category": "Electronics",
            "func": "Supervises 92s9p module string voltages, zone temperatures, and fast-charge contactor limits.",
            "material": "Aluminum housing with conformal-coated PCB",
            "location": "Front upper shelf near HV junction",
            "parameters": [
                {"label": "Electrical config", "value": "92s9p", "unit": "topology", "sourceRef": "05 §1"},
                {"label": "Thermal zone sensors", "value": "12", "unit": "zones", "sourceRef": "ASSUMED"},
            ],
            "failureModes": [
                {"mode": "Balance resistor thermal trip", "effect": "Slowed top-balancing near high SOC."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 2, "offsetM": [0.0, 0.28, 0.0]},
        },
        {
            "id": "pack.busbars",
            "name": "HV current collector array",
            "category": "Electrical",
            "func": "Parallels 9 cells per group and chains 92 groups in series across the top headers.",
            "material": "Copper/aluminum stamped collector plate (generic)",
            "location": "Above cell caps across zones 01 to 12",
            "parameters": [
                {"label": "Pack nominal voltage", "value": "340.4", "unit": "V", "sourceRef": "S15 Table 1 x 92s"},
                {"label": "Pack nominal capacity", "value": "208.125", "unit": "Ah", "sourceRef": "S15 Table 1 x 9p"},
            ],
            "failureModes": [
                {"mode": "Parallel tab weld fatigue", "effect": "Current redistribution into neighboring cells."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 2, "offsetM": [0.0, 0.28, 0.0]},
        },
        {
            "id": "pack.cooling_channels",
            "name": "Side serpentine cooling ribbons",
            "category": "Thermal",
            "func": "Extracts radial heat along the vertical cylindrical walls between cell rows using 12 parallel channels.",
            "material": "Extruded aluminum flat-tube ribbons",
            "location": "Snaking along X between pairs of cell rows",
            "parameters": [
                {"label": "Channel cross-section (a x b)", "value": "24.0 x 3.0", "unit": "mm", "sourceRef": "ASSUMED (F13 a=8b)"},
                {"label": "Parallel ribbons", "value": "12", "unit": "count", "sourceRef": "ASSUMED"},
                {"label": "Laminar Nu_Dh (T-const)", "value": "5.597", "unit": "-", "sourceRef": "F13 Table 7.4"},
                {"label": "Derived h_cc", "value": f"{cooling_metrics['h_cc_w_per_m2k']:.1f}", "unit": "W/(m^2.K)", "sourceRef": "DERIVED (F2, F13)"},
            ],
            "failureModes": [
                {"mode": "Ribbon pinch or partial blockage", "effect": "Hot streak along affected cell row."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 4, "offsetM": [0.0, 0.08, 0.0]},
        },
        {
            "id": "pack.coolant_inlet",
            "name": "Coolant inlet manifold port",
            "category": "Thermal",
            "func": "Distributes chilled 50 wt% EG/water coolant across the 12 parallel side cooling ribbons at zone 01.",
            "material": "Cast aluminum manifold header",
            "location": "Zone 01 (-X) side manifold",
            "parameters": [
                {"label": "Coolant", "value": "50 wt% EG/water", "unit": "-", "sourceRef": "F2"},
            ],
            "failureModes": [
                {"mode": "Manifold maldistribution", "effect": "Lower flow in outer ribbons."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 4, "offsetM": [0.0, 0.08, 0.0]},
        },
        {
            "id": "pack.coolant_outlet",
            "name": "Coolant outlet manifold port",
            "category": "Thermal",
            "func": "Collects warmed coolant exiting zone 12 from all 12 side ribbons.",
            "material": "Cast aluminum manifold header",
            "location": "Zone 12 (+X) side manifold",
            "parameters": [
                {"label": "Exit zone", "value": "pack.zone_12", "unit": "-", "sourceRef": "ASSUMED"},
            ],
            "failureModes": [
                {"mode": "Return strainer blockage", "effect": "Drops total pack flow rate."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 4, "offsetM": [0.0, 0.08, 0.0]},
        },
        {
            "id": "pack.thermal_interface",
            "name": "Conformal TIM sleeves",
            "category": "Thermal",
            "func": "Bridges the cylindrical cell walls to flat cooling ribbons with electrical insulation.",
            "material": "Silicone TIM gap filler (k = 2.5 W/(m.K) assumed)",
            "location": "Between cell sidewalls and aluminum cooling ribbons",
            "parameters": [
                {"label": "Effective thickness", "value": f"{tim_thickness_mm:.1f}", "unit": "mm", "sourceRef": "ASSUMED"},
                {"label": "Conductivity", "value": f"{tim_k:.1f}", "unit": "W/(m.K)", "sourceRef": "ASSUMED"},
            ],
            "failureModes": [
                {"mode": "Adhesion voiding", "effect": "Local hot spot on unbonded cell arc."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 4, "offsetM": [0.0, 0.08, 0.0]},
        },
        {
            "id": "pack.cells",
            "name": "NMC 4680 cell array (828 cells)",
            "category": "Electrochemical",
            "func": "Stores 70.85 kWh nominally in 36 x 23 tabless cylindrical 4680 cells arranged across 12 zones.",
            "material": "NMC / graphite 4680 cylindrical cells",
            "location": "Structural tray core bay (36 cols x 23 rows)",
            "parameters": [
                {"label": "Dimensions (Dia x H)", "value": "46 x 80", "unit": "mm", "sourceRef": "S15 Table 1; S1"},
                {"label": "Capacity / Voltage", "value": "23.125 Ah / 3.7 V", "unit": "per cell", "sourceRef": "S15 Table 1"},
                {"label": "Mass / c_p", "value": "0.355 kg / 912 J/(kg.K)", "unit": "per cell", "sourceRef": "S15; S1; F1"},
            ],
            "failureModes": [
                {"mode": "Core-to-surface temperature lag", "effect": "Higher ohmic heat per unit volume during fast charge (S15, S1)."},
            ],
            "provenance": "SOURCED",
            "explode": {"stage": 3, "offsetM": [0.0, 0.16, 0.0]},
        },
        {
            "id": "pack.lower_enclosure",
            "name": "Lower structural base",
            "category": "Structure",
            "func": "Forms the structural floor of the 4680 cell-to-pack assembly.",
            "material": "Aluminum / composite structural sandwich (generic)",
            "location": "Base reference frame (y <= 0)",
            "parameters": [
                {"label": "Base thickness", "value": "10.0", "unit": "mm", "sourceRef": "ASSUMED"},
            ],
            "failureModes": [
                {"mode": "Structural adhesive delamination", "effect": "Reduced pack torsional stiffness."},
            ],
            "provenance": "GENERIC_EDUCATIONAL",
            "explode": {"stage": 0, "offsetM": [0.0, 0.0, 0.0]},
        },
    ]

    return {
        "id": "NMC_4680",
        "displayName": "Generic NMC 4680 Pack (92s9p)",
        "description": "Generic cylindrical 4680 cell-to-pack architecture with side serpentine liquid cooling ribbons, using S15/S1 cell parameters.",
        "provenanceNote": "Cell dimensions, mass, capacity, nominal voltage, and R_dc are SOURCED from S15/S1. Specific heat (F1), coolant (F2), Nusselt (F13), and OCV/EHC (F7 proxy) are SOURCED/DIGITIZED. Topology (92s9p = 36x23), zone count (12), pitch, and ribbon channels are ASSUMED. NMC SoH fade coefficients use user-editable Option B inputs.",
        "cell": {
            "formFactor": "CYLINDRICAL",
            "dimensionsMm": [46.0, 80.0],
            "massKg": cell_mass_kg,
            "nominalCapacityAh": 23.125,
            "nominalVoltageV": 3.7,
            "specificHeatJPerKgK": c_cell_25,
            "specificHeatTempCoeffPctPerK": 0.2,
            "kThroughPlaneWPerMK": K_THROUGH_PLANE_W_PER_MK,
            "kInPlaneWPerMK": 30.5,
            "sourceRefs": ["S15 Table 1", "S1", "F1 (c_cell=912, +0.2%/K, k_perp=0.61)"],
        },
        "seriesCount": series_count,
        "parallelCount": parallel_count,
        "envelopeMm": {
            "lengthX": length_x_mm,
            "heightY": height_y_mm,
            "widthZ": width_z_mm,
            "interCellGapMm": inter_cell_gap_mm,
            "enclosureWallMm": enclosure_wall_mm,
            "timThicknessMm": tim_thickness_mm,
            "timConductivityWPerMK": tim_k,
            "provenance": "ASSUMED",
        },
        "cooling": {
            "topology": "SIDE_CHANNELS",
            "channelWidthMm": ch_w_mm,
            "channelHeightMm": ch_h_mm,
            "parallelChannels": n_ch,
            "nusseltNumber": NU_A8B_UNIFORM_WALL_TEMP,
            "nusseltBoundaryCondition": "UNIFORM_WALL_TEMP",
            "contactAreaPerZoneM2": contact_area_zone_m2,
            "rZoneToCoolantBaseKW": cooling_metrics["r_base_kw"],
            "rZoneToZoneKW": r_zz_kw,
            "rZoneToAmbientKW": r_amb_kw,
            "provenance": "ASSUMED",
        },
        "zones": zones,
        "coolantPath": [z["id"] for z in zones],
        "components": components,
    }


def build_register(lfp_pack: dict, nmc_pack: dict) -> dict:
    presets = [
        {
            "id": "normal",
            "label": "Normal",
            "chargingPowerKw": 50.0,
            "ambientTemperatureC": 25.0,
            "coolantFlowLpm": 8.0,
            "coolantInletTemperatureC": 25.0,
            "initialSocPercent": 10.0,
            "targetSocPercent": 80.0,
            "maxDurationMinutes": 60.0,
        },
        {
            "id": "hot_ambient",
            "label": "Hot ambient",
            "chargingPowerKw": 50.0,
            "ambientTemperatureC": 40.0,
            "coolantFlowLpm": 8.0,
            "coolantInletTemperatureC": 35.0,
            "initialSocPercent": 10.0,
            "targetSocPercent": 80.0,
            "maxDurationMinutes": 60.0,
        },
        {
            "id": "fast_charging",
            "label": "Fast charging",
            "chargingPowerKw": 100.0,
            "ambientTemperatureC": 25.0,
            "coolantFlowLpm": 12.0,
            "coolantInletTemperatureC": 25.0,
            "initialSocPercent": 10.0,
            "targetSocPercent": 80.0,
            "maxDurationMinutes": 45.0,
        },
        {
            "id": "reduced_cooling",
            "label": "Reduced cooling",
            "chargingPowerKw": 50.0,
            "ambientTemperatureC": 30.0,
            "coolantFlowLpm": 1.5,
            "coolantInletTemperatureC": 25.0,
            "initialSocPercent": 10.0,
            "targetSocPercent": 80.0,
            "maxDurationMinutes": 60.0,
        },
    ]

    parameters = [
        {
            "id": "cell.lfp.capacity",
            "name": "LFP blade cell nominal capacity",
            "symbol": "Q_cell,LFP",
            "value": 135.0,
            "unit": "Ah",
            "status": "SOURCED",
            "sourceRef": "S15 Table 1 (Link et al. 2023)",
            "conditionOrAssumption": "Room-temperature rated capacity from Table 1.",
            "applicability": "LFP blade pack",
            "confidenceNote": "Manufacturer/literature measured value.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "cell.nmc.capacity",
            "name": "NMC 4680 cell nominal capacity",
            "symbol": "Q_cell,NMC",
            "value": 23.125,
            "unit": "Ah",
            "status": "SOURCED",
            "sourceRef": "S15 Table 1 (Tesla 4680 measured)",
            "conditionOrAssumption": "Measured capacity from Table 1 (S1 notes 22.078 Ah variant on separate sample).",
            "applicability": "NMC 4680 pack",
            "confidenceNote": "Measured in S15; consistent with r_dc_nmc 1C reference current.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "cell.lfp.specific_heat",
            "name": "LFP prismatic cell specific heat capacity",
            "symbol": "c_p,LFP",
            "value": 1041.0,
            "unit": "J/(kg.K)",
            "status": "SOURCED",
            "sourceRef": "F1 (Steinhardt et al. 2022) format median; +0.2%/K temp slope",
            "conditionOrAssumption": "Median of 52 full-cell calorimetric measurements by format at ~25 C.",
            "applicability": "LFP blade pack",
            "confidenceNote": "Prismatic LFP entries span 1048-1174 J/(kg.K); format median 1041 used cleanly with F1 +0.2%/K temperature coefficient.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "cell.nmc.specific_heat",
            "name": "NMC cylindrical cell specific heat capacity",
            "symbol": "c_p,NMC",
            "value": 912.0,
            "unit": "J/(kg.K)",
            "status": "SOURCED",
            "sourceRef": "F1 (Steinhardt et al. 2022) cylindrical format median; +0.2%/K temp slope",
            "conditionOrAssumption": "Median across cylindrical full cells; applied to 4680 cell mass 0.355 kg (S15/S1).",
            "applicability": "NMC 4680 pack",
            "confidenceNote": "Format median carries cell-to-cell spread; check P3 against S1 uncooled heating.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "cell.conductivity_through_plane",
            "name": "Cell through-plane thermal conductivity",
            "symbol": "k_perp",
            "value": 0.61,
            "unit": "W/(m.K)",
            "status": "SOURCED",
            "sourceRef": "F1 (Steinhardt et al. 2022)",
            "conditionOrAssumption": "Full-cell median across jelly-roll/stack layers; published spread 0.15-1.4 W/(m.K).",
            "applicability": "Both packs (inter-zone R_zz)",
            "confidenceNote": "+/-81% uncertainty reported in F1; sensitivity checked in M1.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "coolant.eg50.properties",
            "name": "50 wt% ethylene glycol/water coolant properties at 25 C",
            "symbol": "c_p, k, rho, mu",
            "value": {"c_p": 3488.0, "k": 0.417, "rho": 1061.0, "mu": 0.00327},
            "unit": "SI (J/(kg.K), W/(m.K), kg/m^3, Pa.s)",
            "status": "SOURCED",
            "sourceRef": "F2 (Yaws / Engineering ToolBox 50 wt% EG correlations at 25 C)",
            "conditionOrAssumption": "Constant fluid properties evaluated at 25 C nominal inlet.",
            "applicability": "Both packs",
            "confidenceNote": "Pure water check reproduces 4186 J/(kg.K) and 0.603 W/(m.K).",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "cooling.nusselt_a8b",
            "name": "Laminar fully developed Nusselt number (a=8b rectangular duct, constant T_w)",
            "symbol": "Nu_Dh",
            "value": 5.597,
            "unit": "-",
            "status": "SOURCED",
            "sourceRef": "F13 Table 7.4 & Eq. 7.61 (Lienhard & Lienhard v6.00)",
            "conditionOrAssumption": "Fully developed laminar flow (Re < 950 per F3, < 2300 general), uniform wall temperature conservative bound.",
            "applicability": "Both packs",
            "confidenceNote": "Runtime flags NON_LAMINAR_COOLANT_F3 at Re >= 950 and TRANSITIONAL_OR_TURBULENT_RE at Re >= 2300.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "cooling.h_amb",
            "name": "Ambient natural convection coefficient",
            "symbol": "h_amb",
            "value": 5.0,
            "unit": "W/(m^2.K)",
            "status": "SOURCED",
            "sourceRef": "F3 (cold-plate EV pack thermal study assumption)",
            "conditionOrAssumption": "Constant ambient heat transfer coefficient over pack exterior surface.",
            "applicability": "Both packs",
            "confidenceNote": "Study-specific assumption; pack heat removal is dominated by liquid cooling.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "cooling.lfp.r_zz_and_r_amb",
            "name": "LFP zone-to-zone and ambient resistances",
            "symbol": "R_zz, R_amb",
            "value": {
                "rZoneToZoneKW": lfp_pack["cooling"]["rZoneToZoneKW"],
                "rZoneToAmbientKW": lfp_pack["cooling"]["rZoneToAmbientKW"],
                "rZoneToCoolantBaseKW": lfp_pack["cooling"]["rZoneToCoolantBaseKW"],
            },
            "unit": "K/W",
            "status": "DERIVED",
            "sourceRef": "Derived from F1 k_perp, F3 h_amb, and assumed pack/TIM geometry",
            "conditionOrAssumption": "10 zones x 12 blade cells; 1.5 mm TIM (3.0 W/(m.K)); 14 channels (24 x 3 mm).",
            "applicability": "LFP blade pack",
            "confidenceNote": "Assumed channel & TIM thicknesses dominate R_cc; documented as Assumed.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "cooling.nmc.r_zz_and_r_amb",
            "name": "NMC 4680 zone-to-zone and ambient resistances",
            "symbol": "R_zz, R_amb",
            "value": {
                "rZoneToZoneKW": nmc_pack["cooling"]["rZoneToZoneKW"],
                "rZoneToAmbientKW": nmc_pack["cooling"]["rZoneToAmbientKW"],
                "rZoneToCoolantBaseKW": nmc_pack["cooling"]["rZoneToCoolantBaseKW"],
            },
            "unit": "K/W",
            "status": "DERIVED",
            "sourceRef": "Derived from F1 k_perp, F3 h_amb, and assumed ribbon/TIM geometry",
            "conditionOrAssumption": "12 zones x 69 cells; 1.0 mm TIM sleeve (2.5 W/(m.K)); 12 channels (24 x 3 mm); 60 deg arc contact.",
            "applicability": "NMC 4680 pack",
            "confidenceNote": "Assumed contact arc and TIM thickness.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "pack.lfp.geometry_assumed",
            "name": "LFP blade pack topology & cooling channel dimensions",
            "symbol": "N_s, N_zones, a, b, N_ch",
            "value": {"seriesCount": 120, "zones": 10, "channelWidthMm": 24.0, "channelHeightMm": 3.0, "parallelChannels": 14, "interCellGapMm": 0.8},
            "unit": "mixed (count, mm)",
            "status": "ASSUMED",
            "sourceRef": "Project engineering assumption (05 §1, 06 §3.2, 04 §3)",
            "conditionOrAssumption": "400V-class 120s1p CTP layout sized so 1-16 L/min sits inside Re < 950 laminar regime.",
            "applicability": "LFP blade pack",
            "confidenceNote": "Generic non-OEM geometry.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "pack.nmc.geometry_assumed",
            "name": "NMC 4680 pack topology & cooling channel dimensions",
            "symbol": "N_s x N_p, N_zones, a, b, N_ch",
            "value": {"seriesCount": 92, "parallelCount": 9, "zones": 12, "channelWidthMm": 24.0, "channelHeightMm": 3.0, "parallelChannels": 12, "interCellGapMm": 2.5},
            "unit": "mixed (count, mm)",
            "status": "ASSUMED",
            "sourceRef": "Project engineering assumption (05 §1, 06 §3.2, 04 §3)",
            "conditionOrAssumption": "36 x 23 upright cylindrical array with side cooling ribbons.",
            "applicability": "NMC 4680 pack",
            "confidenceNote": "Generic non-OEM geometry.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "table.r_dc_both",
            "name": "DC internal resistance tables vs SOC & temperature",
            "symbol": "R_dc(SOC, T)",
            "value": {"lfpTable": "data/tables/r_dc_lfp.json", "nmcTable": "data/tables/r_dc_nmc.json"},
            "unit": "mOhm",
            "status": "DIGITIZED",
            "sourceRef": "S15 Figure 8 (18 s pulse resistance at 10, 20, 40 C)",
            "conditionOrAssumption": "Bilinear lookup across SOC 20-90% and T 10-40 C, clamped at grid boundaries with out-of-range warnings.",
            "applicability": "Both packs",
            "confidenceNote": "Overlay verified pixel-accurate; Panel C 1C 20 C cross-check within +/-0.05 mOhm.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "table.ocv_and_entropic_proxy",
            "name": "Open-circuit voltage & entropic coefficient proxy tables",
            "symbol": "V_ocv(SOC), dV_ocv/dT(SOC)",
            "value": {"lfpOcv": "data/tables/ocv_lfp_proxy.json", "lfpEhc": "data/tables/entropic_lfp_proxy.json", "nmcOcv": "data/tables/ocv_nmc_proxy.json", "nmcEhc": "data/tables/entropic_nmc_proxy.json"},
            "unit": "V, mV/K",
            "status": "DIGITIZED",
            "sourceRef": "F7 Figs. 2 & 3 (26650 LFP & 21700 NMC proxy cells); F8 qualitative NMC check",
            "conditionOrAssumption": "Proxy chemistry curves applied to blade LFP and 4680 NMC.",
            "applicability": "Both packs",
            "confidenceNote": "Exact PDF vector coordinates; explicitly labelled PROXY CELL.",
            "lastReviewedDate": REVIEW_DATE,
        },
        {
            "id": "soh.lfp.schimpe_2018",
            "name": "LFP semi-empirical calendar & cycle capacity-loss parameters",
            "symbol": "Schimpe2018_TableIV",
            "value": {
                "kCalRef": 3.694e-4,
                "kCycHighTRef": 1.456e-4,
                "kCycLowTRef": 4.009e-4,
                "kCycLowTHighSocRef": 2.031e-6,
                "eaCal": 20592.0,
                "eaCycHighT": 32699.0,
                "eaCycLowT": 55546.0,
                "eaCycLowTHighSoc": 2.33e5,
                "alpha": 0.384,
                "betaLowT": 2.64,
                "betaLowTHighSoc": 7.84,
                "tRefK": 298.15,
                "c0RefAh": 3.0,
                "iChRefA": 3.0,
                "uaRefV": 0.123,
                "k0": 0.142,
                "socRef": 0.82,
                "rg": 8.314,
                "faraday": 96485.0,
                "xa0": 0.0085,
                "xa100": 0.78,
            },
            "unit": "Schimpe 2018 Table IV SI / h^-0.5 / Ah^-0.5 / Ah^-1",
            "status": "SOURCED",
            "sourceRef": "F9 (Schimpe et al. 2018, JES 165 A181-A193, Table IV, Eqs. 9-23 & A1-A2)",
            "conditionOrAssumption": "Fitted on Sony US26650FTC1 3 Ah LFP cell; scaled to arbitrary pack via FEC and C-rate ratio.",
            "applicability": "LFP blade pack (Illustrative)",
            "confidenceNote": "Illustrative proxy (26650 LFP cell, not 135 Ah blade cell). NMC uses Option B user-editable inputs with no defaults.",
            "lastReviewedDate": REVIEW_DATE,
        },
    ]

    return {
        "parameterSetVersion": "1.0.0",
        "lastReviewedDate": REVIEW_DATE,
        "coolant": COOLANT,
        "presets": presets,
        "parameters": parameters,
    }


def main() -> None:
    lfp = build_lfp_blade_pack()
    nmc = build_nmc_4680_pack()
    register = build_register(lfp, nmc)

    (DATA_DIR / "packs").mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "parameters").mkdir(parents=True, exist_ok=True)

    (DATA_DIR / "packs" / "lfp-blade.json").write_text(json.dumps(lfp, indent=2) + "\n")
    (DATA_DIR / "packs" / "nmc-4680.json").write_text(json.dumps(nmc, indent=2) + "\n")
    (DATA_DIR / "parameters" / "register.json").write_text(json.dumps(register, indent=2) + "\n")

    print("LFP pack cooling:", compute_channel_metrics(
        lfp["cooling"]["channelWidthMm"], lfp["cooling"]["channelHeightMm"],
        lfp["cooling"]["parallelChannels"], lfp["cooling"]["nusseltNumber"],
        lfp["cooling"]["contactAreaPerZoneM2"], 1.5, 3.0, 2.0, 8.0
    ))
    print("NMC pack cooling:", compute_channel_metrics(
        nmc["cooling"]["channelWidthMm"], nmc["cooling"]["channelHeightMm"],
        nmc["cooling"]["parallelChannels"], nmc["cooling"]["nusseltNumber"],
        nmc["cooling"]["contactAreaPerZoneM2"], 1.0, 2.5, 0.8, 8.0
    ))


if __name__ == "__main__":
    main()

