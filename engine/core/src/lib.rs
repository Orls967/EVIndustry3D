//! Pure Rust core library for EV Battery Pack Digital Twin thermal & SoH calculations.

pub mod data;
pub mod interp;
pub mod soh;
pub mod thermal;
pub mod types;

pub const ENGINE_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Returns the engine semantic version string.
pub fn engine_version() -> &'static str {
    ENGINE_VERSION
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::soh::run_soh_forecast;
    use crate::thermal::run_thermal_simulation;
    use crate::types::{ArchitectureId, NmcUserFadeInputs, SohSimConfig, ThermalSimConfig};
    use serde::Deserialize;

    #[test]
    fn version_is_non_empty() {
        assert!(!engine_version().is_empty());
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ThermalVectorFile {
        thermal_vectors: Vec<ThermalVec>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ThermalVec {
        id: String,
        config: ThermalVecConfig,
        expected: ThermalVecExpected,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ThermalVecConfig {
        pack_id: ArchitectureId,
        charging_power_kw: f64,
        ambient_temperature_c: f64,
        coolant_flow_lpm: f64,
        coolant_inlet_temperature_c: f64,
        initial_soc_percent: f64,
        target_soc_percent: f64,
        max_duration_minutes: f64,
        dt_s: f64,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ThermalVecExpected {
        max_temperature_c: f64,
        average_temperature_c: f64,
        temperature_spread_c: f64,
        hottest_zone_id: String,
        final_zone_temperatures_c: Vec<f64>,
        reynolds_number: f64,
        duration_seconds: f64,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct SohVectorFile {
        soh_vectors: Vec<SohVec>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct SohVec {
        id: String,
        config: SohVecConfig,
        expected_points: Vec<SohVecPoint>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct SohVecConfig {
        chemistry: String,
        initial_soh_pct: f64,
        eol_threshold_pct: f64,
        horizon_years: usize,
        cycles_per_year: f64,
        #[serde(default = "default_one")]
        avg_c_rate_ch: f64,
        #[serde(default = "default_dod")]
        dod_pct: f64,
        #[serde(default = "default_rest_soc")]
        avg_rest_soc_pct: f64,
        representative_temp_c: f64,
        #[serde(default = "default_max_ch")]
        max_charge_soc_pct: f64,
        nmc_user_inputs: Option<NmcUserFadeInputs>,
    }

    fn default_one() -> f64 { 1.0 }
    fn default_dod() -> f64 { 70.0 }
    fn default_rest_soc() -> f64 { 50.0 }
    fn default_max_ch() -> f64 { 80.0 }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct SohVecPoint {
        year: f64,
        soh_pct: f64,
        soh_low_temp_pct: f64,
        soh_high_temp_pct: f64,
    }

    #[test]
    fn v6_matches_python_thermal_vectors_within_0_005_c() {
        let raw = include_str!("../../../data/test-vectors/thermal_vectors.json");
        let parsed: ThermalVectorFile = serde_json::from_str(raw).unwrap();
        assert!(!parsed.thermal_vectors.is_empty());

        for vec in parsed.thermal_vectors {
            let cfg = ThermalSimConfig {
                scenario_id: vec.id.clone(),
                architecture: vec.config.pack_id,
                charging_power_kw: vec.config.charging_power_kw,
                ambient_temperature_c: vec.config.ambient_temperature_c,
                coolant_flow_lpm: vec.config.coolant_flow_lpm,
                coolant_inlet_temperature_c: vec.config.coolant_inlet_temperature_c,
                initial_soc_percent: vec.config.initial_soc_percent,
                target_soc_percent: vec.config.target_soc_percent,
                max_duration_minutes: vec.config.max_duration_minutes,
                initial_pack_temperature_c: None,
                dt_s: vec.config.dt_s,
                sample_interval_s: 10.0,
                constant_cell_current_a: None,
                disable_coolant: false,
                single_zone_override: false,
                r_cc_override_kw: None,
                r_amb_override_kw: None,
            };
            let res = run_thermal_simulation(&cfg, None).unwrap();
            assert!(
                res.summary.energy_balance_error_percent <= 1.0,
                "{}: V1 energy balance err {} > 1%",
                vec.id,
                res.summary.energy_balance_error_percent
            );
            assert!(
                (res.summary.max_temperature_c - vec.expected.max_temperature_c).abs() <= 0.005,
                "{}: maxT {} vs {}",
                vec.id,
                res.summary.max_temperature_c,
                vec.expected.max_temperature_c
            );
            assert!(
                (res.summary.average_temperature_c - vec.expected.average_temperature_c).abs() <= 0.005,
                "{}: avgT {} vs {}",
                vec.id,
                res.summary.average_temperature_c,
                vec.expected.average_temperature_c
            );
            assert!(
                (res.summary.temperature_spread_c - vec.expected.temperature_spread_c).abs() <= 0.005,
                "{}: spread {} vs {}",
                vec.id,
                res.summary.temperature_spread_c,
                vec.expected.temperature_spread_c
            );
            assert_eq!(res.summary.hottest_zone_id, vec.expected.hottest_zone_id);
            assert!((res.summary.reynolds_number - vec.expected.reynolds_number).abs() <= 0.02);
            assert!((res.duration_seconds - vec.expected.duration_seconds).abs() <= 0.02);
            for (got, exp) in res
                .final_zone_temperatures_c
                .iter()
                .zip(vec.expected.final_zone_temperatures_c.iter())
            {
                assert!((got - exp).abs() <= 0.005, "{}: zone {} vs {}", vec.id, got, exp);
            }
        }
    }

    #[test]
    fn v2_v3_v4_verification_checks() {
        let v2 = ThermalSimConfig {
            scenario_id: "v2".to_string(),
            architecture: ArchitectureId::LfpBlade,
            charging_power_kw: 50.0,
            ambient_temperature_c: 25.0,
            coolant_flow_lpm: 8.0,
            coolant_inlet_temperature_c: 25.0,
            initial_soc_percent: 50.0,
            target_soc_percent: 100.0,
            max_duration_minutes: 240.0,
            initial_pack_temperature_c: None,
            dt_s: 1.0,
            sample_interval_s: 60.0,
            constant_cell_current_a: Some(100.0),
            disable_coolant: false,
            single_zone_override: true,
            r_cc_override_kw: None,
            r_amb_override_kw: None,
        };
        let r2 = run_thermal_simulation(&v2, None).unwrap();
        assert!(r2.summary.energy_balance_error_percent <= 1.0);

        let mut base = ThermalSimConfig {
            scenario_id: "v3".to_string(),
            architecture: ArchitectureId::Nmc4680,
            charging_power_kw: 100.0,
            ambient_temperature_c: 25.0,
            coolant_flow_lpm: 12.0,
            coolant_inlet_temperature_c: 25.0,
            initial_soc_percent: 10.0,
            target_soc_percent: 80.0,
            max_duration_minutes: 45.0,
            initial_pack_temperature_c: None,
            dt_s: 1.0,
            sample_interval_s: 10.0,
            constant_cell_current_a: None,
            disable_coolant: false,
            single_zone_override: false,
            r_cc_override_kw: None,
            r_amb_override_kw: None,
        };
        let r_1s = run_thermal_simulation(&base, None).unwrap();
        base.dt_s = 0.5;
        let r_half = run_thermal_simulation(&base, None).unwrap();
        assert!((r_1s.summary.max_temperature_c - r_half.summary.max_temperature_c).abs() <= 0.05);

        let mut adia = base.clone();
        adia.dt_s = 1.0;
        adia.disable_coolant = true;
        adia.r_amb_override_kw = Some(1e9);
        let r_adia = run_thermal_simulation(&adia, None).unwrap();
        assert!(r_adia.summary.max_temperature_c > r_1s.summary.max_temperature_c);
    }

    #[test]
    fn soh_matches_python_vectors_within_0_01_pct() {
        let raw = include_str!("../../../data/test-vectors/soh_vectors.json");
        let parsed: SohVectorFile = serde_json::from_str(raw).unwrap();
        for vec in parsed.soh_vectors {
            let arch = if vec.config.chemistry == "LFP" {
                ArchitectureId::LfpBlade
            } else {
                ArchitectureId::Nmc4680
            };
            let cfg = SohSimConfig {
                architecture: arch,
                baseline_soh_percent: vec.config.initial_soh_pct,
                horizon_years: vec.config.horizon_years,
                threshold_percent: vec.config.eol_threshold_pct,
                equivalent_full_cycles_per_year: vec.config.cycles_per_year,
                average_c_rate: vec.config.avg_c_rate_ch,
                depth_of_discharge_percent: vec.config.dod_pct,
                representative_temperature_c: vec.config.representative_temp_c,
                average_resting_soc_percent: vec.config.avg_rest_soc_pct,
                max_charge_soc_percent: vec.config.max_charge_soc_pct,
                nmc_user_inputs: vec.config.nmc_user_inputs,
            };
            let res = run_soh_forecast(&cfg).unwrap();
            assert_eq!(res.points.len(), vec.expected_points.len());
            for (got, exp) in res.points.iter().zip(vec.expected_points.iter()) {
                assert_eq!(got.year, exp.year);
                assert!((got.soh_percent - exp.soh_pct).abs() <= 0.01, "{}: {} vs {}", vec.id, got.soh_percent, exp.soh_pct);
                assert!((got.lower_sensitivity_c_minus5_percent - exp.soh_low_temp_pct).abs() <= 0.01);
                assert!((got.upper_sensitivity_c_plus5_percent - exp.soh_high_temp_pct).abs() <= 0.01);
            }
        }
    }
}
