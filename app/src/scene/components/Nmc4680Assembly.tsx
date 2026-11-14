import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { AssemblySceneProps } from "./LfpBladeAssembly";
import { buildNmcSceneLayout } from "../builders/packGeometrySpec";
import { computeExplodeOffsets } from "../controllers/explodeController";
import { CAD_COLORS, mapTemperatureToThermalColor } from "../materials/cadMaterials";
import { SelectablePart } from "./SelectableMesh";

export function Nmc4680Assembly({
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
  qualityTier,
  clippingPlanes,
  onSelectPart,
  onHoverPart,
}: AssemblySceneProps): React.ReactElement {
  const { invalidate } = useThree();
  const layout = useMemo(() => buildNmcSceneLayout(pack), [pack]);
  const offsets = useMemo(() => computeExplodeOffsets("NMC_4680", explodePercent), [explodePercent]);
  const instRef = useRef<THREE.InstancedMesh>(null);

  const radialSegments = qualityTier === "high" ? 24 : qualityTier === "medium" ? 14 : 10;
  const cellsVisible = visibility["pack.cells"] !== false;
  const cellsDimmed = selectedComponentId !== null && selectedComponentId !== "pack.cells";

  const cellMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.32,
        metalness: 0.74,
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
      dummy.position.set(c.xM, c.yBaseM + offsets.nmcCellsY, c.zM);
      dummy.updateMatrix();
      mesh.setMatrixAt(c.instanceIndex, dummy.matrix);

      const isPicked = selectedCellId === c.cellId || (selectedZoneId === c.zoneId && selectedComponentId === "pack.cells");
      if (isPicked) {
        tmpColor.set(CAD_COLORS.accentOutline);
      } else if (heatmapEnabled && zoneTemperaturesC && zoneTemperaturesC[c.zoneIndex] !== undefined) {
        mapTemperatureToThermalColor(zoneTemperaturesC[c.zoneIndex]!, minT, maxT, tmpColor);
      } else {
        tmpColor.set(CAD_COLORS.cylCan);
      }
      mesh.setColorAt(c.instanceIndex, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [layout, offsets.nmcCellsY, heatmapEnabled, zoneTemperaturesC, tempRangeC, selectedCellId, selectedZoneId, selectedComponentId, radialSegments, invalidate]);

  const handleCellClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const picked = layout.cells[e.instanceId];
    if (picked) {
      onSelectPart("pack.cells", picked.zoneId, picked.cellId);
    }
  };

  const ribbonY = layout.cellHeightY / 2 + offsets.nmcSideChannelsY;
  const collectorY = layout.cellHeightY + 0.008 + offsets.bmsBusbarsY;
  const lidY = layout.cellHeightY + 0.036 + offsets.upperEnclosureY;

  return (
    <group>
      {/* Lower structural base */}
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

      {/* Instanced 828 NMC 4680 cylindrical cells */}
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
          <cylinderGeometry args={[layout.cellRadiusM, layout.cellRadiusM, layout.cellHeightY, radialSegments]} />
        </instancedMesh>
      )}

      {/* 12 parallel side cooling ribbons between rows */}
      {layout.ribbonChannelPositionsZ.map((rz, idx) => (
        <React.Fragment key={idx}>
          <SelectablePart
            componentId="pack.cooling_channels"
            position={[0, ribbonY, rz]}
            visible={visibility["pack.cooling_channels"] !== false}
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
            <boxGeometry args={[layout.packWidthX - 0.06, 0.064, 0.004]} />
          </SelectablePart>

          <SelectablePart
            componentId="pack.thermal_interface"
            position={[0, ribbonY, rz + 0.003]}
            visible={visibility["pack.thermal_interface"] !== false}
            selectedId={selectedComponentId}
            hoveredId={hoveredId}
            heatmapEnabled={heatmapEnabled}
            baseColor={CAD_COLORS.thermalInterface}
            roughness={0.86}
            metalness={0.05}
            clippingPlanes={clippingPlanes}
            onSelect={(id) => onSelectPart(id)}
            onHover={onHoverPart}
          >
            <boxGeometry args={[layout.packWidthX - 0.08, 0.058, 0.002]} />
          </SelectablePart>
        </React.Fragment>
      ))}

      {/* Inlet & outlet manifold headers */}
      <SelectablePart
        componentId="pack.coolant_inlet"
        position={[-layout.packWidthX / 2 + 0.015, ribbonY, 0]}
        visible={visibility["pack.coolant_inlet"] !== false}
        selectedId={selectedComponentId}
        hoveredId={hoveredId}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.portMetal}
        clippingPlanes={clippingPlanes}
        onSelect={(id) => onSelectPart(id)}
        onHover={onHoverPart}
      >
        <boxGeometry args={[0.024, 0.036, layout.packDepthZ - 0.08]} />
      </SelectablePart>

      <SelectablePart
        componentId="pack.coolant_outlet"
        position={[layout.packWidthX / 2 - 0.015, ribbonY, 0]}
        visible={visibility["pack.coolant_outlet"] !== false}
        selectedId={selectedComponentId}
        hoveredId={hoveredId}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.portMetal}
        clippingPlanes={clippingPlanes}
        onSelect={(id) => onSelectPart(id)}
        onHover={onHoverPart}
      >
        <boxGeometry args={[0.024, 0.036, layout.packDepthZ - 0.08]} />
      </SelectablePart>

      {/* HV current collector plates */}
      <SelectablePart
        componentId="pack.busbars"
        position={[0, collectorY, 0]}
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
        <boxGeometry args={[layout.packWidthX - 0.08, 0.006, layout.packDepthZ - 0.14]} />
      </SelectablePart>

      {/* BMS */}
      <SelectablePart
        componentId="pack.bms"
        position={[-layout.packWidthX / 2 + 0.18, collectorY + 0.012, 0]}
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

