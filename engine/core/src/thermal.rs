use std::collections::BTreeSet;

use crate::data::load_pack_bundle;
use crate::interp::{interp_1d, interp_2d};
use crate::types::{
    CoolantSpec, PackData, ThermalSimConfig, ThermalSimResult, ThermalSummary, ThermalWarning,
};
use crate::ENGINE_VERSION;

pub struct CoolingMetrics {
    pub reynolds_number: f64,
    pub r_cc_kw: f64,
    pub c_f_w_per_k: f64,
    pub warnings: Vec<String>,
}

pub fn compute_cooling_metrics(pack: &PackData, coolant: &CoolantSpec, flow_lpm: f64) -> CoolingMetrics {
    let c = &pack.cooling;
    let a = c.channel_width_mm / 1000.0;
    let b = c.channel_height_mm / 1000.0;
    let n_ch = c.parallel_channels;
    let d_h = (2.0 * a * b) / (a + b);

    let v_dot = flow_lpm.max(0.0) / 60000.0;
    let area = n_ch * a * b;
    let vel = if area > 0.0 { v_dot / area } else { 0.0 };
    let re = coolant.density_kg_per_m3 * vel * d_h / coolant.viscosity_pa_s;

    let h_cc = c.nusselt_number * coolant.conductivity_w_per_mk / d_h;
    let r_conv = 1.0 / (h_cc * c.contact_area_per_zone_m2);
    let r_cc = r_conv + c.r_zone_to_coolant_base_kw;
    let c_f = coolant.density_kg_per_m3 * v_dot * coolant.specific_heat_j_per_kg_k;

    let mut warnings = Vec::new();
    if re >= 2300.0 {
        warnings.push("TRANSITIONAL_OR_TURBULENT_RE".to_string());
    } else if re >= 950.0 {
        warnings.push("NON_LAMINAR_COOLANT_F3".to_string());
    }

    CoolingMetrics {
        reynolds_number: re,
        r_cc_kw: r_cc,
        c_f_w_per_k: c_f,
        warnings,
    }
}

fn warning_message(code: &str) -> String {
    match code {
        "C_RATE_ABOVE_2C" => {
            "Instantaneous C-rate exceeded 2C (beyond S15 experimental R_dc characterization range).".to_string()
        }
        "TRANSITIONAL_OR_TURBULENT_RE" => {
            "Coolant flow Re >= 2300 (transitional/turbulent); laminar Nu_Dh correlation underpredicts heat transfer.".to_string()
        }
        "NON_LAMINAR_COOLANT_F3" => {
            "Coolant flow Re >= 950 (above F3 CFD laminar study range, still < 2300).".to_string()
        }
        "RESISTANCE_TABLE_OUT_OF_RANGE" => {
            "SOC or zone temperature fell outside S15 lookup grid (SOC 20-90%, T 10-40 C); clamped at boundary.".to_string()
        }
        "HIGH_TEMP_ABOVE_45C" => {
            "Peak zone temperature exceeded 45 C thermal threshold.".to_string()
        }
        "CELL_SURFACE_HOT_ABOVE_60C" => {
            "Peak zone temperature exceeded 60 C high-temperature caution limit.".to_string()
        }
        _ => code.to_string(),
    }
}

struct StageMeta {
    cool_temps: Vec<f64>,
    c_rate: f64,
    p_irr: f64,
    p_rev: f64,
    p_gen: f64,
    p_cool: f64,
    p_amb: f64,
    p_elec: f64,
}

pub fn run_thermal_simulation(
    config: &ThermalSimConfig,
    mut progress_cb: Option<&mut dyn FnMut(u8)>,
) -> Result<ThermalSimResult, String> {
    let bundle = load_pack_bundle(config.architecture)?;
    let pack = &bundle.pack;
    let coolant = &bundle.register.coolant;
    let cooling = compute_cooling_metrics(pack, coolant, config.coolant_flow_lpm);

    let n_zones = if config.single_zone_override {
        1
    } else {
        pack.zones.len()
    };
    let zone_ids: Vec<String> = (0..n_zones).map(|i| pack.zones[i].id.clone()).collect();
    let cell_counts: Vec<usize> = (0..n_zones).map(|i| pack.zones[i].cell_count).collect();

    let c_cell_25 = pack.cell.specific_heat_j_per_kg_k;
    let c_temp_coeff = pack.cell.specific_heat_temp_coeff_pct_per_k / 100.0;
    let m_cell = pack.cell.mass_kg;
    let q_cell_ah = pack.cell.nominal_capacity_ah;
    let n_series = pack.series_count as f64;
    let n_parallel = pack.parallel_count as f64;

    let c_zone_25: Vec<f64> = cell_counts
        .iter()
        .map(|&cnt| (cnt as f64) * m_cell * c_cell_25)
        .collect();

    let r_cc = config.r_cc_override_kw.unwrap_or(cooling.r_cc_kw);
    let r_zz = pack.cooling.r_zone_to_zone_kw;
    let r_amb = config.r_amb_override_kw.unwrap_or(pack.cooling.r_zone_to_ambient_kw);
    let c_f = cooling.c_f_w_per_k;

    let t0 = config
        .initial_pack_temperature_c
        .unwrap_or(config.ambient_temperature_c);
    let mut temps = vec![t0; n_zones];
    let mut soc = config.initial_soc_percent;
    let mut warnings_set: BTreeSet<String> = cooling.warnings.iter().cloned().collect();

    let evaluate_stage = |state_temps: &[f64], state_soc: f64, wset: &mut BTreeSet<String>| -> (Vec<f64>, f64, StageMeta) {
        let soc_clamped = state_soc.clamp(0.0, 100.0);
        let (v_cell, _) = interp_1d(soc_clamped, &bundle.ocv.soc_grid_percent, &bundle.ocv.values);
        let (ehc_mv_per_k, _) = interp_1d(soc_clamped, &bundle.ehc.soc_grid_percent, &bundle.ehc.values);
        let d_ocv_dt = ehc_mv_per_k * 1e-3;

        let i_cell = if let Some(i_const) = config.constant_cell_current_a {
            i_const
        } else {
            let v_pack = (v_cell * n_series).max(1.0);
            (config.charging_power_kw * 1000.0 / v_pack) / n_parallel
        };

        let dsoc_dt = (i_cell / (q_cell_ah * 3600.0)) * 100.0;
        let c_rate_now = i_cell / q_cell_ah;
        if c_rate_now > 2.0 + 1e-9 {
            wset.insert("C_RATE_ABOVE_2C".to_string());
        }

        let mut d_temps = vec![0.0; n_zones];
        let mut cool_temps = vec![config.ambient_temperature_c; n_zones];
        let mut t_cool_prev = config.coolant_inlet_temperature_c;
        let mut p_irr = 0.0;
        let mut p_rev = 0.0;
        let mut p_cool = 0.0;
        let mut p_amb = 0.0;

        for idx in 0..n_zones {
            let tz = state_temps[idx];
            if tz > 45.0 {
                wset.insert("HIGH_TEMP_ABOVE_45C".to_string());
            }
            if tz > 60.0 {
                wset.insert("CELL_SURFACE_HOT_ABOVE_60C".to_string());
            }

            let (r_dc_mohm, oor) = interp_2d(
                soc_clamped,
                tz,
                &bundle.r_dc.soc_grid_percent,
                &bundle.r_dc.temperature_grid_c,
                &bundle.r_dc.values,
            );
            if oor {
                wset.insert("RESISTANCE_TABLE_OUT_OF_RANGE".to_string());
            }

            let r_dc_ohm = r_dc_mohm * 1e-3;
            let q_irr_cell = i_cell * i_cell * r_dc_ohm;
            let q_rev_cell = i_cell * (tz + 273.15) * d_ocv_dt;
            let cnt = cell_counts[idx] as f64;
            let qz_irr = cnt * q_irr_cell;
            let qz_rev = cnt * q_rev_cell;
            let qz = qz_irr + qz_rev;

            let q_cool_z = if config.disable_coolant || c_f <= 0.0 {
                cool_temps[idx] = config.ambient_temperature_c;
                0.0
            } else {
                let mut qc = (tz - t_cool_prev) / r_cc;
                let max_q_cool = c_f * (tz - t_cool_prev);
                if r_cc * c_f < 1.0 && qc.abs() > max_q_cool.abs() {
                    qc = max_q_cool;
                }
                t_cool_prev += qc / c_f;
                cool_temps[idx] = t_cool_prev;
                qc
            };

            let mut q_zz_z = 0.0;
            if n_zones > 1 {
                if idx > 0 {
                    q_zz_z += (tz - state_temps[idx - 1]) / r_zz;
                }
                if idx < n_zones - 1 {
                    q_zz_z += (tz - state_temps[idx + 1]) / r_zz;
                }
            }

            let q_amb_z = (tz - config.ambient_temperature_c) / r_amb;
            let c_eff = c_zone_25[idx] * (1.0 + c_temp_coeff * (tz - 25.0));
            d_temps[idx] = (qz - q_cool_z - q_zz_z - q_amb_z) / c_eff;

            p_irr += qz_irr;
            p_rev += qz_rev;
            p_cool += q_cool_z;
            p_amb += q_amb_z;
        }

        let p_elec = if config.constant_cell_current_a.is_some() {
            v_cell * n_series * i_cell * n_parallel
        } else {
            config.charging_power_kw * 1000.0
        };

        (
            d_temps,
            dsoc_dt,
            StageMeta {
                cool_temps,
                c_rate: c_rate_now,
                p_irr,
                p_rev,
                p_gen: p_irr + p_rev,
                p_cool,
                p_amb,
                p_elec,
            },
        )
    };

    let max_duration_s = config.max_duration_minutes * 60.0;
    let dt = if config.dt_s > 0.0 { config.dt_s } else { 1.0 };
    let sample_interval = if config.sample_interval_s > 0.0 {
        config.sample_interval_s
    } else {
        10.0
    };
    let mut t = 0.0;

    let (_, _, init_meta) = evaluate_stage(&temps, soc, &mut warnings_set);
    let mut time_hist = vec![0.0_f64];
    let mut zone_samples: Vec<Vec<f64>> = vec![temps.clone()];
    let mut cool_samples: Vec<Vec<f64>> = vec![init_meta.cool_temps.clone()];
    let mut soc_hist = vec![soc];
    let mut crate_hist = vec![init_meta.c_rate];
    let mut qgen_hist = vec![init_meta.p_gen];

    let mut next_sample_s = sample_interval;
    let mut e_gen_j = 0.0;
    let mut e_cool_j = 0.0;
    let mut e_amb_j = 0.0;
    let mut e_elec_j = 0.0;
    let mut peak_c_rate = init_meta.c_rate;
    let mut ended_because = "MAX_DURATION".to_string();

    let mut next_progress_pct: u8 = 10;

    while t < max_duration_s - 1e-9 {
        if soc >= config.target_soc_percent - 1e-9 && config.constant_cell_current_a.is_none() {
            ended_because = "TARGET_SOC".to_string();
            break;
        }

        let mut h = dt.min(max_duration_s - t);
        let (k1_t, k1_s, m1) = evaluate_stage(&temps, soc, &mut warnings_set);
        if config.constant_cell_current_a.is_none()
            && k1_s > 0.0
            && soc + k1_s * h > config.target_soc_percent
        {
            let h_exact = (config.target_soc_percent - soc) / k1_s;
            h = h.min(h_exact).max(1e-6);
        }

        let t2: Vec<f64> = (0..n_zones).map(|i| temps[i] + 0.5 * h * k1_t[i]).collect();
        let s2 = soc + 0.5 * h * k1_s;
        let (k2_t, k2_s, m2) = evaluate_stage(&t2, s2, &mut warnings_set);

        let t3: Vec<f64> = (0..n_zones).map(|i| temps[i] + 0.5 * h * k2_t[i]).collect();
        let s3 = soc + 0.5 * h * k2_s;
        let (k3_t, k3_s, m3) = evaluate_stage(&t3, s3, &mut warnings_set);

        let t4: Vec<f64> = (0..n_zones).map(|i| temps[i] + h * k3_t[i]).collect();
        let s4 = soc + h * k3_s;
        let (k4_t, k4_s, m4) = evaluate_stage(&t4, s4, &mut warnings_set);

        for i in 0..n_zones {
            temps[i] += (h / 6.0) * (k1_t[i] + 2.0 * k2_t[i] + 2.0 * k3_t[i] + k4_t[i]);
        }
        soc += (h / 6.0) * (k1_s + 2.0 * k2_s + 2.0 * k3_s + k4_s);
        t += h;

        let _ = m1.p_irr + m1.p_rev;
        e_gen_j += (h / 6.0) * (m1.p_gen + 2.0 * m2.p_gen + 2.0 * m3.p_gen + m4.p_gen);
        e_cool_j += (h / 6.0) * (m1.p_cool + 2.0 * m2.p_cool + 2.0 * m3.p_cool + m4.p_cool);
        e_amb_j += (h / 6.0) * (m1.p_amb + 2.0 * m2.p_amb + 2.0 * m3.p_amb + m4.p_amb);
        e_elec_j += (h / 6.0) * (m1.p_elec + 2.0 * m2.p_elec + 2.0 * m3.p_elec + m4.p_elec);

        if m1.c_rate > peak_c_rate {
            peak_c_rate = m1.c_rate;
        }

        let reached_target =
            config.constant_cell_current_a.is_none() && soc >= config.target_soc_percent - 1e-6;
        let reached_end = t >= max_duration_s - 1e-9 || reached_target;
        if t >= next_sample_s - 1e-9 || reached_end {
            let (_, _, cur_meta) = evaluate_stage(&temps, soc, &mut warnings_set);
            if cur_meta.c_rate > peak_c_rate {
                peak_c_rate = cur_meta.c_rate;
            }
            time_hist.push((t * 10000.0).round() / 10000.0);
            zone_samples.push(temps.clone());
            cool_samples.push(cur_meta.cool_temps);
            soc_hist.push(soc);
            crate_hist.push(cur_meta.c_rate);
            qgen_hist.push(cur_meta.p_gen);
            while next_sample_s <= t + 1e-9 {
                next_sample_s += sample_interval;
            }
        }

        if let Some(cb) = progress_cb.as_mut() {
            let soc_frac = ((soc - config.initial_soc_percent)
                / (config.target_soc_percent - config.initial_soc_percent).max(1e-6))
            .clamp(0.0, 1.0);
            let time_frac = (t / max_duration_s.max(1e-6)).clamp(0.0, 1.0);
            let pct = ((soc_frac.max(time_frac) * 100.0) as u8).min(99);
            if pct >= next_progress_pct {
                cb(pct);
                next_progress_pct = pct.saturating_add(10);
            }
        }

        if reached_target {
            ended_because = "TARGET_SOC".to_string();
            break;
        }
    }

    let mut e_stored_j = 0.0;
    for idx in 0..n_zones {
        let tf = temps[idx];
        let d_linear = tf - t0;
        let d_quad = 0.5 * c_temp_coeff * ((tf - 25.0).powi(2) - (t0 - 25.0).powi(2));
        e_stored_j += c_zone_25[idx] * (d_linear + d_quad);
    }

    let denom = e_gen_j.abs().max(1.0);
    let balance_err_pct = (e_gen_j - (e_stored_j + e_cool_j + e_amb_j)).abs() / denom * 100.0;

    let mut max_temp_c = f64::NEG_INFINITY;
    for row in &zone_samples {
        for &val in row {
            if val > max_temp_c {
                max_temp_c = val;
            }
        }
    }
    let final_avg = temps.iter().sum::<f64>() / (n_zones as f64);
    let final_max = temps.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let final_min = temps.iter().copied().fold(f64::INFINITY, f64::min);
    let spread = final_max - final_min;

    let mut max_idx = 0;
    for i in 1..n_zones {
        if temps[i] > temps[max_idx] {
            max_idx = i;
        }
    }

    let n_samples = time_hist.len();
    let mut zone_flat = vec![0.0_f32; n_zones * n_samples];
    let mut cool_flat = vec![0.0_f32; n_zones * n_samples];
    for s in 0..n_samples {
        for z in 0..n_zones {
            zone_flat[z * n_samples + s] = zone_samples[s][z] as f32;
            cool_flat[z * n_samples + s] = cool_samples[s][z] as f32;
        }
    }

    let outlet_end = cool_samples
        .last()
        .and_then(|v| v.last())
        .copied()
        .unwrap_or(config.coolant_inlet_temperature_c);

    let warnings: Vec<ThermalWarning> = warnings_set
        .into_iter()
        .map(|code| ThermalWarning {
            message: warning_message(&code),
            code,
        })
        .collect();

    Ok(ThermalSimResult {
        scenario_id: config.scenario_id.clone(),
        architecture: config.architecture,
        engine_version: ENGINE_VERSION.to_string(),
        parameter_set_version: bundle.register.parameter_set_version.clone(),
        time_step_seconds: dt,
        duration_seconds: t,
        ended_because,
        summary: ThermalSummary {
            max_temperature_c: max_temp_c,
            average_temperature_c: final_avg,
            temperature_spread_c: spread,
            hottest_zone_id: zone_ids[max_idx].clone(),
            peak_c_rate,
            reynolds_number: cooling.reynolds_number,
            energy_charged_kwh: e_elec_j / 3_600_000.0,
            heat_generated_kwh: e_gen_j / 3_600_000.0,
            heat_removed_by_coolant_kwh: e_cool_j / 3_600_000.0,
            cooling_heat_removal_fraction: if e_gen_j > 0.0 { e_cool_j / e_gen_j } else { 0.0 },
            coolant_delta_t_c: outlet_end - config.coolant_inlet_temperature_c,
            energy_balance_error_percent: balance_err_pct,
        },
        n_samples,
        time_seconds: time_hist.into_iter().map(|v| v as f32).collect(),
        zone_temperatures_c: zone_flat,
        coolant_temperatures_c: cool_flat,
        soc_percent: soc_hist.into_iter().map(|v| v as f32).collect(),
        c_rate_series: crate_hist.into_iter().map(|v| v as f32).collect(),
        heat_gen_watts: qgen_hist.into_iter().map(|v| v as f32).collect(),
        final_zone_temperatures_c: temps,
        zone_ids,
        assumptions: vec![
            format!("{} zones lumped thermally along coolant flow path.", n_zones),
            "S15 digitized R_dc(SOC, T) and F7 OCV/entropic proxy curves.".to_string(),
            "F2 50 wt% ethylene glycol / water properties at 25 C baseline with F13 laminar Nu_Dh.".to_string(),
        ],
        warnings,
    })
}

