use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ArchitectureId {
    #[serde(rename = "LFP_BLADE")]
    LfpBlade,
    #[serde(rename = "NMC_4680")]
    Nmc4680,
}

impl ArchitectureId {
    pub fn as_str(&self) -> &'static str {
        match self {
            ArchitectureId::LfpBlade => "LFP_BLADE",
            ArchitectureId::Nmc4680 => "NMC_4680",
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CellSpec {
    pub mass_kg: f64,
    pub nominal_capacity_ah: f64,
    pub nominal_voltage_v: f64,
    pub specific_heat_j_per_kg_k: f64,
    #[serde(default = "default_temp_coeff")]
    pub specific_heat_temp_coeff_pct_per_k: f64,
}

fn default_temp_coeff() -> f64 {
    0.2
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoolingSpec {
    pub channel_width_mm: f64,
    pub channel_height_mm: f64,
    pub parallel_channels: f64,
    pub nusselt_number: f64,
    pub contact_area_per_zone_m2: f64,
    #[serde(rename = "rZoneToCoolantBaseKW")]
    pub r_zone_to_coolant_base_kw: f64,
    #[serde(rename = "rZoneToZoneKW")]
    pub r_zone_to_zone_kw: f64,
    #[serde(rename = "rZoneToAmbientKW")]
    pub r_zone_to_ambient_kw: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZoneSpec {
    pub id: String,
    pub cell_count: usize,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackData {
    pub id: ArchitectureId,
    pub series_count: usize,
    pub parallel_count: usize,
    pub cell: CellSpec,
    pub cooling: CoolingSpec,
    pub zones: Vec<ZoneSpec>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoolantSpec {
    pub specific_heat_j_per_kg_k: f64,
    #[serde(rename = "conductivityWPerMK")]
    pub conductivity_w_per_mk: f64,
    pub density_kg_per_m3: f64,
    pub viscosity_pa_s: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterParameterRaw {
    pub id: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterData {
    pub parameter_set_version: String,
    pub coolant: CoolantSpec,
    pub parameters: Vec<RegisterParameterRaw>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Table1D {
    pub soc_grid_percent: Vec<f64>,
    pub values: Vec<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Table2D {
    pub soc_grid_percent: Vec<f64>,
    pub temperature_grid_c: Vec<f64>,
    pub values: Vec<Vec<f64>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchimpeParams {
    pub k_cal_ref: f64,
    #[serde(rename = "kCycHighTRef")]
    pub k_cyc_high_t_ref: f64,
    #[serde(rename = "kCycLowTRef")]
    pub k_cyc_low_t_ref: f64,
    #[serde(rename = "kCycLowTHighSocRef")]
    pub k_cyc_low_t_high_soc_ref: f64,
    pub ea_cal: f64,
    #[serde(rename = "eaCycHighT")]
    pub ea_cyc_high_t: f64,
    #[serde(rename = "eaCycLowT")]
    pub ea_cyc_low_t: f64,
    #[serde(rename = "eaCycLowTHighSoc")]
    pub ea_cyc_low_t_high_soc: f64,
    pub alpha: f64,
    #[serde(rename = "betaLowT")]
    pub beta_low_t: f64,
    #[serde(rename = "betaLowTHighSoc")]
    pub beta_low_t_high_soc: f64,
    pub t_ref_k: f64,
    pub c0_ref_ah: f64,
    pub ua_ref_v: f64,
    pub k0: f64,
    pub soc_ref: f64,
    pub rg: f64,
    pub faraday: f64,
    pub xa0: f64,
    pub xa100: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThermalSimConfig {
    pub scenario_id: String,
    pub architecture: ArchitectureId,
    pub charging_power_kw: f64,
    pub ambient_temperature_c: f64,
    pub coolant_flow_lpm: f64,
    pub coolant_inlet_temperature_c: f64,
    pub initial_soc_percent: f64,
    pub target_soc_percent: f64,
    pub max_duration_minutes: f64,
    pub initial_pack_temperature_c: Option<f64>,
    #[serde(default = "default_dt_s")]
    pub dt_s: f64,
    #[serde(default = "default_sample_interval_s")]
    pub sample_interval_s: f64,
    #[serde(default)]
    pub constant_cell_current_a: Option<f64>,
    #[serde(default)]
    pub disable_coolant: bool,
    #[serde(default)]
    pub single_zone_override: bool,
    #[serde(default)]
    pub r_cc_override_kw: Option<f64>,
    #[serde(default)]
    pub r_amb_override_kw: Option<f64>,
}

fn default_dt_s() -> f64 {
    1.0
}

fn default_sample_interval_s() -> f64 {
    10.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThermalWarning {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThermalSummary {
    pub max_temperature_c: f64,
    pub average_temperature_c: f64,
    pub temperature_spread_c: f64,
    pub hottest_zone_id: String,
    pub peak_c_rate: f64,
    pub reynolds_number: f64,
    pub energy_charged_kwh: f64,
    pub heat_generated_kwh: f64,
    pub heat_removed_by_coolant_kwh: f64,
    pub cooling_heat_removal_fraction: f64,
    #[serde(rename = "coolantDeltaTC")]
    pub coolant_delta_t_c: f64,
    pub energy_balance_error_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThermalSimResult {
    pub scenario_id: String,
    pub architecture: ArchitectureId,
    pub engine_version: String,
    pub parameter_set_version: String,
    pub time_step_seconds: f64,
    pub duration_seconds: f64,
    pub ended_because: String,
    pub summary: ThermalSummary,
    pub n_samples: usize,
    pub time_seconds: Vec<f32>,
    pub zone_temperatures_c: Vec<f32>,
    pub coolant_temperatures_c: Vec<f32>,
    pub soc_percent: Vec<f32>,
    pub c_rate_series: Vec<f32>,
    pub heat_gen_watts: Vec<f32>,
    pub final_zone_temperatures_c: Vec<f64>,
    pub zone_ids: Vec<String>,
    pub assumptions: Vec<String>,
    pub warnings: Vec<ThermalWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NmcUserFadeInputs {
    pub calendar_loss_pct_per_sqrt_year: f64,
    pub cycle_loss_pct_per_fec: f64,
    pub cycle_exponent: f64,
    pub activation_energy_j_per_mol: f64,
    pub reference_temp_c: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SohSimConfig {
    pub architecture: ArchitectureId,
    pub baseline_soh_percent: f64,
    pub horizon_years: usize,
    pub threshold_percent: f64,
    pub equivalent_full_cycles_per_year: f64,
    pub average_c_rate: f64,
    pub depth_of_discharge_percent: f64,
    pub representative_temperature_c: f64,
    pub average_resting_soc_percent: f64,
    pub max_charge_soc_percent: f64,
    pub nmc_user_inputs: Option<NmcUserFadeInputs>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SohPoint {
    pub year: f64,
    pub soh_percent: f64,
    pub lower_sensitivity_c_minus5_percent: f64,
    pub upper_sensitivity_c_plus5_percent: f64,
    pub calendar_loss_percent: f64,
    pub cycle_loss_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SohSimResult {
    pub architecture: ArchitectureId,
    pub model_name: String,
    pub engine_version: String,
    pub parameter_set_version: String,
    pub points: Vec<SohPoint>,
    pub threshold_crossing_year: Option<f64>,
    pub assumptions: Vec<String>,
}

