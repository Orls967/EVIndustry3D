import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { PackDefinition } from "../../domain/contracts";
import { buildLfpSceneLayout } from "../builders/packGeometrySpec";
import { computeExplodeOffsets } from "../controllers/explodeController";
import { CAD_COLORS, mapTemperatureToThermalColor } from "../materials/cadMaterials";
import { SelectablePart } from "./SelectableMesh";

export interface AssemblySceneProps {
  pack: PackDefinition;
  explodePercent: number;
  visibility: Record<string, boolean>;
  selectedComponentId: string | null;
  selectedZoneId: string | null;
  selectedCellId: string | null;
  hoveredId: string | null;
  heatmapEnabled: boolean;
  zoneTemperaturesC?: number[];
  tempRangeC?: [number, number];
  qualityTier: "high" | "medium" | "low";
  clippingPlanes: THREE.Plane[];
  onSelectPart: (componentId: string, zoneId?: string | null, cellId?: string | null) => void;
  onHoverPart: (id: string | null) => void;
}

export function LfpBladeAssembly({
  pack,
  explodePercent,
  visibility,
  selectedComponentId,
  selectedZoneId,
  selectedCellId,
  hoveredId,
  heatmapEnabled,
  zoneTemperaturesC,
  tempRangeC,
  clippingPlanes,
  onSelectPart,
  onHoverPart,
}: AssemblySceneProps): React.ReactElement {
  const { invalidate } = useThree();
  const layout = useMemo(() => buildLfpSceneLayout(pack), [pack]);
  const offsets = useMemo(() => computeExplodeOffsets("LFP_BLADE", explodePercent), [explodePercent]);
  const instRef = useRef<THREE.InstancedMesh>(null);

  const cellsVisible = visibility["pack.cells"] !== false;
  const cellsDimmed = selectedComponentId !== null && selectedComponentId !== "pack.cells";

  const cellMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.36,
        metalness: 0.68,
        transparent: cellsDimmed,
        opacity: cellsDimmed ? 0.35 : 1.0,
        clippingPlanes,
        side: THREE.DoubleSide,
      }),
    [cellsDimmed, clippingPlanes]
  );

  useEffect(() => {
    const mesh = instRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();
    const minT = tempRangeC?.[0] ?? 25;
    const maxT = tempRangeC?.[1] ?? 55;

    for (const c of layout.cells) {
      dummy.position.set(c.xM * offsets.lfpCellSpreadFactor, c.yBaseM, c.zM);
      dummy.updateMatrix();
      mesh.setMatrixAt(c.instanceIndex, dummy.matrix);

      const isPickedCell = selectedCellId === c.cellId || (selectedZoneId === c.zoneId && selectedComponentId === "pack.cells");
      if (isPickedCell) {
        tmpColor.set(CAD_COLORS.accentOutline);
      } else if (heatmapEnabled && zoneTemperaturesC && zoneTemperaturesC[c.zoneIndex] !== undefined) {
        mapTemperatureToThermalColor(zoneTemperaturesC[c.zoneIndex]!, minT, maxT, tmpColor);
      } else {
        tmpColor.set(CAD_COLORS.bladeCell);
      }
      mesh.setColorAt(c.instanceIndex, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [layout, offsets.lfpCellSpreadFactor, heatmapEnabled, zoneTemperaturesC, tempRangeC, selectedCellId, selectedZoneId, selectedComponentId, invalidate]);

  const cellTopY = layout.cellHeightY;
  const timY = cellTopY + layout.timThicknessM / 2 + offsets.lfpTimY;
  const plateY = cellTopY + layout.timThicknessM + layout.coldPlateThicknessM / 2 + offsets.lfpColdPlateY;
  const bmsY = cellTopY + layout.timThicknessM + layout.coldPlateThicknessM + 0.015 + offsets.bmsBusbarsY;
  const lidY = cellTopY + 0.045 + offsets.upperEnclosureY;

  const handleCellClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const picked = layout.cells[e.instanceId];
    if (picked) {
      onSelectPart("pack.cells", picked.zoneId, picked.cellId);
    }
  };

  return (
    <group>
      {/* Lower enclosure tray (fixed reference at y <= 0) */}
      <SelectablePart
        componentId="pack.lower_enclosure"
        position={[0, -0.008, 0]}
        visible={visibility["pack.lower_enclosure"] !== false}
        selectedId={selectedComponentId}
        hoveredId={hoveredId}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.enclosureDark}
        roughness={0.62}
        metalness={0.45}
        clippingPlanes={clippingPlanes}
        onSelect={(id) => onSelectPart(id)}
        onHover={onHoverPart}
      >
        <boxGeometry args={[layout.packWidthX, 0.016, layout.packDepthZ]} />
      </SelectablePart>

      {/* Instanced 120 LFP blade cells */}
      {cellsVisible && (
        <instancedMesh
          ref={instRef}
          args={[undefined, undefined, layout.cells.length]}
          material={cellMat}
          onClick={handleCellClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverPart("pack.cells");
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            onHoverPart(null);
          }}
        >
          <boxGeometry args={[layout.cellThicknessX, layout.cellHeightY, layout.cellLengthZ]} />
        </instancedMesh>
      )}

      {/* Thermal interface layer */}
      <SelectablePart
        componentId="pack.thermal_interface"
        position={[0, timY, 0]}
        visible={visibility["pack.thermal_interface"] !== false}
        selectedId={selectedComponentId}
        hoveredId={hoveredId}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.thermalInterface}
        roughness={0.88}
        metalness={0.05}
        clippingPlanes={clippingPlanes}
        onSelect={(id) => onSelectPart(id)}
        onHover={onHoverPart}
      >
        <boxGeometry args={[layout.packWidthX - 0.05, layout.timThicknessM + 0.002, layout.cellLengthZ]} />
      </SelectablePart>

      {/* Top liquid cold plate */}
      <SelectablePart
        componentId="pack.cooling_plate"
        position={[0, plateY, 0]}
        visible={visibility["pack.cooling_plate"] !== false}
        selectedId={selectedComponentId}
        hoveredId={hoveredId}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.coolingPlate}
        roughness={0.38}
        metalness={0.72}
        clippingPlanes={clippingPlanes}
        onSelect={(id) => onSelectPart(id)}
        onHover={onHoverPart}
      >
        <boxGeometry args={[layout.packWidthX - 0.03, layout.coldPlateThicknessM, layout.packDepthZ - 0.03]} />
      </SelectablePart>

      {/* Coolant inlet & outlet ports */}
      <SelectablePart
        componentId="pack.coolant_inlet"
        position={[-layout.packWidthX / 2 - 0.015, plateY, -0.22]}
        rotation={[0, 0, Math.PI / 2]}
        visible={visibility["pack.coolant_inlet"] !== false}
        selectedId={selectedComponentId}
        hoveredId={hoveredId}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.portMetal}
        clippingPlanes={clippingPlanes}
        onSelect={(id) => onSelectPart(id)}
        onHover={onHoverPart}
      >
        <cylinderGeometry args={[0.014, 0.014, 0.04, 16]} />
      </SelectablePart>

      <SelectablePart
        componentId="pack.coolant_outlet"
        position={[layout.packWidthX / 2 + 0.015, plateY, 0.22]}
        rotation={[0, 0, Math.PI / 2]}
        visible={visibility["pack.coolant_outlet"] !== false}
        selectedId={selectedComponentId}
        hoveredId={hoveredId}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.portMetal}
        clippingPlanes={clippingPlanes}
        onSelect={(id) => onSelectPart(id)}
        onHover={onHoverPart}
      >
        <cylinderGeometry args={[0.014, 0.014, 0.04, 16]} />
      </SelectablePart>

      {/* HV busbars along both Z edges */}
      <SelectablePart
        componentId="pack.busbars"
        position={[0, bmsY, layout.cellLengthZ / 2 + 0.014]}
        visible={visibility["pack.busbars"] !== false}
        selectedId={selectedComponentId}
        hoveredId={hoveredId}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.busbarCopper}
        roughness={0.28}
        metalness={0.85}
        clippingPlanes={clippingPlanes}
        onSelect={(id) => onSelectPart(id)}
        onHover={onHoverPart}
      >
        <boxGeometry args={[layout.packWidthX - 0.08, 0.008, 0.018]} />
      </SelectablePart>

      {/* BMS */}
      <SelectablePart
        componentId="pack.bms"
        position={[-layout.packWidthX / 2 + 0.18, bmsY + 0.004, 0]}
        visible={visibility["pack.bms"] !== false}
        selectedId={selectedComponentId}
        hoveredId={hoveredId}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.bmsBoard}
        roughness={0.68}
        metalness={0.22}
        clippingPlanes={clippingPlanes}
        onSelect={(id) => onSelectPart(id)}
        onHover={onHoverPart}
      >
        <boxGeometry args={[0.24, 0.016, 0.34]} />
      </SelectablePart>

      {/* Upper enclosure lid */}
      <SelectablePart
        componentId="pack.upper_enclosure"
        position={[0, lidY, 0]}
        visible={visibility["pack.upper_enclosure"] !== false}
        selectedId={selectedComponentId}
        hoveredId={hoveredId}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.enclosureDark}
        roughness={0.62}
        metalness={0.45}
        clippingPlanes={clippingPlanes}
        onSelect={(id) => onSelectPart(id)}
        onHover={onHoverPart}
      >
        <boxGeometry args={[layout.packWidthX, 0.012, layout.packDepthZ]} />
      </SelectablePart>
    </group>
  );
}

