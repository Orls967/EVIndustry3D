use crate::data::load_schimpe_params;
use crate::types::{ArchitectureId, NmcUserFadeInputs, SchimpeParams, SohPoint, SohSimConfig, SohSimResult};
use crate::ENGINE_VERSION;

const HOURS_PER_YEAR: f64 = 8760.0;
const R_GAS: f64 = 8.314;

pub fn anode_potential_v(soc_pct: f64, p: &SchimpeParams) -> f64 {
    let soc_frac = (soc_pct / 100.0).clamp(0.0, 1.0);
    let xa = p.xa0 + soc_frac * (p.xa100 - p.xa0);
    0.6379
        + 0.5416 * (-305.5309 * xa).exp()
        + 0.044 * (-(xa - 0.1958) / 0.1088).tanh()
        - 0.1978 * ((xa - 1.0571) / 0.0854).tanh()
        - 0.6875 * ((xa + 0.0117) / 0.0529).tanh()
        - 0.0175 * ((xa - 0.5692) / 0.0875).tanh()
}

fn eval_lfp_loss_pct(
    t_c: f64,
    years: f64,
    cycles_per_year: f64,
    avg_c_rate_ch: f64,
    dod_pct: f64,
    avg_rest_soc_pct: f64,
    max_charge_soc_pct: f64,
    p: &SchimpeParams,
) -> (f64, f64) {
    if years <= 0.0 {
        return (0.0, 0.0);
    }
    let t_k = t_c + 273.15;
    let inv_t_diff = (1.0 / t_k) - (1.0 / p.t_ref_k);

    let ua_v = anode_potential_v(avg_rest_soc_pct, p);
    let k_cal = p.k_cal_ref
        * ((-p.ea_cal / p.rg) * inv_t_diff).exp()
        * (((p.alpha * p.faraday / p.rg) * (p.ua_ref_v - ua_v) / p.t_ref_k).exp() + p.k0);
    let q_cal_frac = k_cal * (years * HOURS_PER_YEAR).sqrt();

    let n_fec = cycles_per_year * years;
    let q_tot_ref_ah = n_fec * (2.0 * p.c0_ref_ah);
    let q_ch_ref_ah = n_fec * p.c0_ref_ah;
    let c_rate_delta = avg_c_rate_ch - 1.0;

    let k_cyc_high = p.k_cyc_high_t_ref * ((-p.ea_cyc_high_t / p.rg) * inv_t_diff).exp();
    let k_cyc_low = p.k_cyc_low_t_ref
        * ((p.ea_cyc_low_t / p.rg) * inv_t_diff).exp()
        * (p.beta_low_t * c_rate_delta).exp();

    let soc_thresh_pct = p.soc_ref * 100.0;
    let high_soc_share = if max_charge_soc_pct > soc_thresh_pct && dod_pct > 0.0 {
        let min_soc_pct = (max_charge_soc_pct - dod_pct).max(0.0);
        let high_soc_span = max_charge_soc_pct - min_soc_pct.max(soc_thresh_pct);
        (high_soc_span / dod_pct).clamp(0.0, 1.0)
    } else {
        0.0
    };

    let k_cyc_low_high_soc = p.k_cyc_low_t_high_soc_ref
        * ((p.ea_cyc_low_t_high_soc / p.rg) * inv_t_diff).exp()
        * (p.beta_low_t_high_soc * c_rate_delta).exp();

    let q_cyc_frac = k_cyc_high * q_tot_ref_ah.sqrt()
        + k_cyc_low * q_ch_ref_ah.sqrt()
        + k_cyc_low_high_soc * (q_ch_ref_ah * high_soc_share);

    (q_cal_frac * 100.0, q_cyc_frac * 100.0)
}

fn eval_nmc_user_loss_pct(
    t_c: f64,
    years: f64,
    cycles_per_year: f64,
    user: &NmcUserFadeInputs,
) -> (f64, f64) {
    if years <= 0.0 {
        return (0.0, 0.0);
    }
    let t_k = t_c + 273.15;
    let t_ref_k = user.reference_temp_c + 273.15;
    let arrh = ((-user.activation_energy_j_per_mol / R_GAS) * ((1.0 / t_k) - (1.0 / t_ref_k))).exp();
    let cal_pct = user.calendar_loss_pct_per_sqrt_year * arrh * years.sqrt();
    let n_fec = (cycles_per_year * years).max(0.0);
    let cyc_pct = user.cycle_loss_pct_per_fec * arrh * n_fec.powf(user.cycle_exponent);
    (cal_pct, cyc_pct)
}

pub fn run_soh_forecast(config: &SohSimConfig) -> Result<SohSimResult, String> {
    let (lfp_params, param_version) = load_schimpe_params()?;
    if config.architecture == ArchitectureId::Nmc4680 && config.nmc_user_inputs.is_none() {
        return Err("NMC Option B requires explicit user-editable fade inputs (no defaults permitted).".to_string());
    }

    let loss_at = |t_c: f64, yr: f64| -> (f64, f64) {
        match config.architecture {
            ArchitectureId::LfpBlade => eval_lfp_loss_pct(
                t_c,
                yr,
                config.equivalent_full_cycles_per_year,
                config.average_c_rate,
                config.depth_of_discharge_percent,
                config.average_resting_soc_percent,
                config.max_charge_soc_percent,
                &lfp_params,
            ),
            ArchitectureId::Nmc4680 => eval_nmc_user_loss_pct(
                t_c,
                yr,
                config.equivalent_full_cycles_per_year,
                config.nmc_user_inputs.as_ref().expect("checked above"),
            ),
        }
    };

    let mut points = Vec::with_capacity(config.horizon_years + 1);
    let mut eol_year: Option<f64> = None;

    for y in 0..=config.horizon_years {
        let yf = y as f64;
        let (cal_nom, cyc_nom) = loss_at(config.representative_temperature_c, yf);
        let (cal_lo, cyc_lo) = loss_at(config.representative_temperature_c - 5.0, yf);
        let (cal_hi, cyc_hi) = loss_at(config.representative_temperature_c + 5.0, yf);

        let soh_nom = (config.baseline_soh_percent - cal_nom - cyc_nom).max(0.0);
        let soh_lo = (config.baseline_soh_percent - cal_lo - cyc_lo).max(0.0);
        let soh_hi = (config.baseline_soh_percent - cal_hi - cyc_hi).max(0.0);

        points.push(SohPoint {
            year: yf,
            soh_percent: soh_nom,
            lower_sensitivity_c_minus5_percent: soh_lo,
            upper_sensitivity_c_plus5_percent: soh_hi,
            calendar_loss_percent: cal_nom,
            cycle_loss_percent: cyc_nom,
        });

        if eol_year.is_none() && y > 0 && soh_nom <= config.threshold_percent {
            let prev = &points[points.len() - 2];
            let denom = prev.soh_percent - soh_nom;
            let frac = if denom > 1e-9 {
                (prev.soh_percent - config.threshold_percent) / denom
            } else {
                1.0
            };
            eol_year = Some(((y - 1) as f64) + frac.clamp(0.0, 1.0));
        }
    }

    let model_name = match config.architecture {
        ArchitectureId::LfpBlade => "Schimpe 2018 LFP/Graphite Semi-Empirical (26650 3 Ah proxy)".to_string(),
        ArchitectureId::Nmc4680 => "NMC User-Parameter Arrhenius + Throughput (Option B, no defaults)".to_string(),
    };

    let assumptions = match config.architecture {
        ArchitectureId::LfpBlade => vec![
            "Illustrative F9 Schimpe 2018 proxy (Sony US26650FTC1 3 Ah LFP cell parameters scaled via FEC & C-rate).".to_string(),
            "Temperature sensitivity band evaluated at representative T +/- 5 C; not a statistical confidence interval.".to_string(),
        ],
        ArchitectureId::Nmc4680 => vec![
            "Illustrative Option B Arrhenius + throughput scaling driven solely by user-provided coefficients (no literature defaults).".to_string(),
            "Temperature sensitivity band evaluated at representative T +/- 5 C; not a statistical confidence interval.".to_string(),
        ],
    };

    Ok(SohSimResult {
        architecture: config.architecture,
        model_name,
        engine_version: ENGINE_VERSION.to_string(),
        parameter_set_version: param_version,
        points,
        threshold_crossing_year: eol_year,
        assumptions,
    })
}

