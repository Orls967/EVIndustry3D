import * as THREE from "three";

export const THERMAL_STOPS = [
  { pos: 0.0, color: new THREE.Color("#3b6fe0") },
  { pos: 0.33, color: new THREE.Color("#3fbf7f") },
  { pos: 0.6, color: new THREE.Color("#f2d13d") },
  { pos: 0.8, color: new THREE.Color("#f28c28") },
  { pos: 1.0, color: new THREE.Color("#e5484d") },
] as const;

export const HEATMAP_NON_THERMAL_HEX = "#47505a";

export function mapTemperatureToThermalColor(
  tempC: number,
  minC: number,
  maxC: number,
  target = new THREE.Color()
): THREE.Color {
  const span = Math.max(maxC - minC, 1e-4);
  const t = Math.min(Math.max((tempC - minC) / span, 0), 1);
  for (let i = 0; i < THERMAL_STOPS.length - 1; i++) {
    const a = THERMAL_STOPS[i]!;
    const b = THERMAL_STOPS[i + 1]!;
    if (t >= a.pos && t <= b.pos) {
      const localT = (t - a.pos) / (b.pos - a.pos);
      target.copy(a.color).lerp(b.color, localT);
      return target;
    }
  }
  return target.copy(THERMAL_STOPS[THERMAL_STOPS.length - 1]!.color);
}

export const CAD_COLORS = {
  enclosureDark: "#46525f",
  enclosureWall: "#56636f",
  enclosureInner: "#232b35",
  bladeCell: "#bcc7d4",
  bladeHeader: "#4b5764",
  cylCan: "#bfc9d4",
  cylCap: "#414c59",
  busbarCopper: "#cc8659",
  coolingPlate: "#6f8296",
  coolingGroove: "#305c70",
  thermalInterface: "#7d8c99",
  bmsBoard: "#1f3040",
  bmsChip: "#81909e",
  portMetal: "#8d9ead",
  hvConnector: "#d9792b",
  accentOutline: "#38c7e0",
} as const;

export function createCadMaterial(
  colorHex: string,
  opts: {
    roughness?: number;
    metalness?: number;
    dimmed?: boolean;
    clippingPlanes?: THREE.Plane[];
    side?: THREE.Side;
  } = {}
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: opts.roughness ?? 0.45,
    metalness: opts.metalness ?? 0.6,
    transparent: true, // constant: dimming only changes opacity (no shader recompile)
    opacity: opts.dimmed ? 0.35 : 1.0,
    clippingPlanes: opts.clippingPlanes ?? [],
    clipShadows: false,
    side: opts.side ?? THREE.DoubleSide,
  });
  return mat;
}

