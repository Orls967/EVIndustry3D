import React from "react";
import type * as THREE from "three";
import type { HoverBus } from "../controllers/sceneInteractionBus";
import { CAD_COLORS } from "../materials/cadMaterials";
import { SelectablePart } from "./SelectableMesh";

export interface TrayWallsProps {
  /** Outer pack length along X (m). */
  lengthX: number;
  /** Outer pack depth along Z (m). */
  depthZ: number;
  /** Wall thickness (m), from pack.envelopeMm.enclosureWallMm. */
  wallThickness: number;
  /** Wall height above the tray floor (m). */
  height: number;
  visible: boolean;
  selectedId: string | null;
  hoverBus?: HoverBus;
  heatmapEnabled: boolean;
  clippingPlanes: THREE.Plane[];
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** Groups holding the two X end walls, so an assembly can move them outward during explode. */
  endWallRefs?: [React.RefObject<THREE.Group | null>, React.RefObject<THREE.Group | null>];
  /** Group holding the two long side walls, so an assembly can stretch them along X during explode. */
  sideWallsRef?: React.RefObject<THREE.Group | null>;
  /** Draw a generic HV connector housing on the outer +Z wall. */
  showHvConnector?: boolean;
}

/**
 * Perimeter side walls of the lower structural tray (part of `pack.lower_enclosure`).
 * Purely visual: dimensions come from the pack envelope; no physics input is read here.
 */
export function TrayWalls({
  lengthX,
  depthZ,
  wallThickness,
  height,
  visible,
  selectedId,
  hoverBus,
  heatmapEnabled,
  clippingPlanes,
  onSelect,
  onHover,
  endWallRefs,
  sideWallsRef,
  showHvConnector = true,
}: TrayWallsProps): React.ReactElement {
  const y = height / 2;
  const common = {
    componentId: "pack.lower_enclosure",
    visible,
    selectedId,
    hoverBus,
    heatmapEnabled,
    baseColor: CAD_COLORS.enclosureWall,
    roughness: 0.5,
    metalness: 0.35,
    clippingPlanes,
    onSelect,
    onHover,
  };
  const endX = lengthX / 2 - wallThickness / 2;
  const sideZ = depthZ / 2 - wallThickness / 2;

  return (
    <group>
      {/* Long side walls (±Z) */}
      <group ref={sideWallsRef}>
        <SelectablePart {...common} position={[0, y, sideZ]}>
          <boxGeometry args={[lengthX, height, wallThickness]} />
        </SelectablePart>
        <SelectablePart {...common} position={[0, y, -sideZ]}>
          <boxGeometry args={[lengthX, height, wallThickness]} />
        </SelectablePart>
      </group>
      {showHvConnector && (
        <SelectablePart
          {...common}
          baseColor={CAD_COLORS.hvConnector}
          roughness={0.45}
          metalness={0.1}
          position={[lengthX * 0.3, height * 0.5, depthZ / 2 + 0.018]}
        >
          <boxGeometry args={[0.11, Math.min(0.05, height * 0.7), 0.036]} />
        </SelectablePart>
      )}
      {/* End walls (±X), optionally movable */}
      <group ref={endWallRefs?.[0]} position={[-endX, 0, 0]}>
        <SelectablePart {...common} position={[0, y, 0]}>
          <boxGeometry args={[wallThickness, height, depthZ - 2 * wallThickness]} />
        </SelectablePart>
      </group>
      <group ref={endWallRefs?.[1]} position={[endX, 0, 0]}>
        <SelectablePart {...common} position={[0, y, 0]}>
          <boxGeometry args={[wallThickness, height, depthZ - 2 * wallThickness]} />
        </SelectablePart>
      </group>
    </group>
  );
}
