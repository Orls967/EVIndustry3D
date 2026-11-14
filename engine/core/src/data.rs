use crate::types::{ArchitectureId, PackData, RegisterData, SchimpeParams, Table1D, Table2D};

const LFP_PACK_JSON: &str = include_str!("../../../data/packs/lfp-blade.json");
const NMC_PACK_JSON: &str = include_str!("../../../data/packs/nmc-4680.json");
const REGISTER_JSON: &str = include_str!("../../../data/parameters/register.json");

const R_DC_LFP_JSON: &str = include_str!("../../../data/tables/r_dc_lfp.json");
const R_DC_NMC_JSON: &str = include_str!("../../../data/tables/r_dc_nmc.json");
const OCV_LFP_JSON: &str = include_str!("../../../data/tables/ocv_lfp_proxy.json");
const OCV_NMC_JSON: &str = include_str!("../../../data/tables/ocv_nmc_proxy.json");
const EHC_LFP_JSON: &str = include_str!("../../../data/tables/entropic_lfp_proxy.json");
const EHC_NMC_JSON: &str = include_str!("../../../data/tables/entropic_nmc_proxy.json");

pub struct PackBundle {
    pub pack: PackData,
    pub register: RegisterData,
    pub r_dc: Table2D,
    pub ocv: Table1D,
    pub ehc: Table1D,
}

pub fn load_register() -> Result<RegisterData, String> {
    serde_json::from_str(REGISTER_JSON).map_err(|e| format!("Failed parsing register.json: {e}"))
}

pub fn load_pack_bundle(arch: ArchitectureId) -> Result<PackBundle, String> {
    let register = load_register()?;
    let (pack_str, r_str, ocv_str, ehc_str) = match arch {
        ArchitectureId::LfpBlade => (LFP_PACK_JSON, R_DC_LFP_JSON, OCV_LFP_JSON, EHC_LFP_JSON),
        ArchitectureId::Nmc4680 => (NMC_PACK_JSON, R_DC_NMC_JSON, OCV_NMC_JSON, EHC_NMC_JSON),
    };
    let pack = serde_json::from_str(pack_str).map_err(|e| format!("Failed parsing pack json: {e}"))?;
    let r_dc = serde_json::from_str(r_str).map_err(|e| format!("Failed parsing r_dc json: {e}"))?;
    let ocv = serde_json::from_str(ocv_str).map_err(|e| format!("Failed parsing ocv json: {e}"))?;
    let ehc = serde_json::from_str(ehc_str).map_err(|e| format!("Failed parsing ehc json: {e}"))?;
    Ok(PackBundle {
        pack,
        register,
        r_dc,
        ocv,
        ehc,
    })
}

pub fn load_schimpe_params() -> Result<(SchimpeParams, String), String> {
    let reg = load_register()?;
    let entry = reg
        .parameters
        .iter()
        .find(|p| p.id == "soh.lfp.schimpe_2018")
        .ok_or_else(|| "Missing soh.lfp.schimpe_2018 in register.json".to_string())?;
    let params: SchimpeParams = serde_json::from_value(entry.value.clone())
        .map_err(|e| format!("Failed parsing Schimpe params: {e}"))?;
    Ok((params, reg.parameter_set_version))
}

