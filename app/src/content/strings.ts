export const UI_STRINGS = {
  brandName: "EV Pack Twin",
  modelDisclaimer: "Estimate from a simplified model. Not a diagnosis, certification, or OEM procedure.",
  compareNonEquivalence:
    "Comparison depends on the modelled configuration and scenario. The two generic packs differ in cell count, voltage, total energy, and cooling topology.",
  selectionDisclaimer:
    "These are generic reference designs built from open literature cell measurements, not replicas of any vehicle pack.",
  switchConfirmPrompt:
    "Switching architecture clears the current simulation results. Valid input parameters are kept.",
  sohIllustrativeNote:
    "Illustrative degradation trajectory only. Real fleet ageing varies with cell batch, BMS balancing, calendar storage duty, and warranty operating limits.",
  hero: {
    category: "EV BATTERY PACK DIGITAL TWIN",
    headline: "See inside the pack. Test the heat. Weigh the decision.",
    subtitle:
      "Explore two generic battery architectures in 3D, run lumped thermal charging scenarios, and turn the results into illustrative lifecycle and maintenance estimates.",
    primaryCta: "Launch Simulator",
    secondaryCta: "How it works",
  },
  footer: {
    note: "Open literature parameters (S1, S15, F1-F3, F7-F9, F13) combined with documented project assumptions. Self-hosted fonts & local static Wasm execution.",
  },
} as const;

