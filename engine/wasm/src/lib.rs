use ev_pack_core::soh::run_soh_forecast;
use ev_pack_core::thermal::run_thermal_simulation;
use ev_pack_core::types::{SohSimConfig, ThermalSimConfig};
use js_sys::{Float32Array, Function, Object, Reflect};
use wasm_bindgen::prelude::*;

/// Returns the core engine version string for worker Init/Ready handshake.
#[wasm_bindgen]
pub fn engine_version() -> String {
    ev_pack_core::engine_version().to_string()
}

/// Executes the lumped RK4 thermal solver from JSON config and invokes progress_cb(percent).
#[wasm_bindgen]
pub fn run_thermal(config_json: &str, progress_cb: &Function) -> Result<JsValue, JsValue> {
    let config: ThermalSimConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid thermal config JSON: {e}")))?;

    let mut cb = |pct: u8| {
        let _ = progress_cb.call1(&JsValue::NULL, &JsValue::from(pct as f64));
    };

    let res = run_thermal_simulation(&config, Some(&mut cb))
        .map_err(|e| JsValue::from_str(&e))?;

    let time_arr = Float32Array::from(res.time_seconds.as_slice());
    let zone_arr = Float32Array::from(res.zone_temperatures_c.as_slice());
    let cool_arr = Float32Array::from(res.coolant_temperatures_c.as_slice());
    let soc_arr = Float32Array::from(res.soc_percent.as_slice());
    let crate_arr = Float32Array::from(res.c_rate_series.as_slice());
    let heat_arr = Float32Array::from(res.heat_gen_watts.as_slice());

    let meta = serde_json::json!({
        "scenarioId": res.scenario_id,
        "architecture": res.architecture,
        "dataStatus": "MODELLED",
        "validationStatus": "VERIFIED_NUMERICALLY",
        "engineVersion": res.engine_version,
        "parameterSetVersion": res.parameter_set_version,
        "timeStepSeconds": res.time_step_seconds,
        "durationSeconds": res.duration_seconds,
        "endedBecause": res.ended_because,
        "summary": res.summary,
        "nSamples": res.n_samples,
        "zoneIds": res.zone_ids,
        "assumptions": res.assumptions,
        "warnings": res.warnings,
    });
    let meta_json = serde_json::to_string(&meta)
        .map_err(|e| JsValue::from_str(&format!("Serialize error: {e}")))?;

    let out = Object::new();
    Reflect::set(&out, &JsValue::from_str("metaJson"), &JsValue::from_str(&meta_json))?;
    Reflect::set(&out, &JsValue::from_str("timeSeconds"), &time_arr)?;
    Reflect::set(&out, &JsValue::from_str("zoneTemperaturesC"), &zone_arr)?;
    Reflect::set(&out, &JsValue::from_str("coolantTemperaturesC"), &cool_arr)?;
    Reflect::set(&out, &JsValue::from_str("socPercent"), &soc_arr)?;
    Reflect::set(&out, &JsValue::from_str("cRateSeries"), &crate_arr)?;
    Reflect::set(&out, &JsValue::from_str("heatGenWatts"), &heat_arr)?;

    Ok(out.into())
}

/// Executes SoH forecast (Schimpe 2018 LFP or user-input NMC) from JSON config.
#[wasm_bindgen]
pub fn run_soh(config_json: &str) -> Result<String, JsValue> {
    let config: SohSimConfig = serde_json::from_str(config_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid SoH config JSON: {e}")))?;
    let res = run_soh_forecast(&config).map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&res).map_err(|e| JsValue::from_str(&format!("Serialize error: {e}")))
}
