import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { PackDefinition, ThermalResult } from "../../domain/contracts";
import { buildLfpSceneLayout } from "../builders/packGeometrySpec";
import { computeExplodeOffsets } from "../controllers/explodeController";
import { pickLfpBladeCells } from "../controllers/instancedPicking";
import { interpolateZoneTemperatures } from "../controllers/playbackController";
import type { HoverBus } from "../controllers/sceneInteractionBus";
import { CAD_COLORS, mapTemperatureToThermalColor } from "../materials/cadMaterials";
import { SelectablePart } from "./SelectableMesh";
import { TrayWalls } from "./TrayWalls";
import { LidDetails } from "./LidDetails";

export interface AssemblySceneProps {
  pack: PackDefinition;
  explodePercent: number;
  explodePercentRef?: React.MutableRefObject<number>;
  visibility: Record<string, boolean>;
  selectedComponentId: string | null;
  selectedZoneId: string | null;
  selectedCellId: string | null;
  hoverBus?: HoverBus;
  heatmapEnabled: boolean;
  thermalResult?: ThermalResult | null;
  sampleIndexRef?: React.MutableRefObject<number>;
  playbackPlaying?: boolean;
  colorDirtyRef?: React.MutableRefObject<boolean>;
  zoneTemperaturesC?: number[];
  tempRangeC?: [number, number];
  qualityTier: "high" | "medium" | "low";
  clippingPlanes: THREE.Plane[];
  onSelectPart: (componentId: string, zoneId?: string | null, cellId?: string | null) => void;
  onHoverPart: (id: string | null) => void;
}

const _dummy = new THREE.Object3D();
const _invMatrix = new THREE.Matrix4();
const _localRay = new THREE.Ray();
const _worldPt = new THREE.Vector3();
const _baseBladeColor = new THREE.Color(CAD_COLORS.bladeCell);
const _accentColor = new THREE.Color(CAD_COLORS.accentOutline);

export const LfpBladeAssembly = React.memo(function LfpBladeAssembly({
  pack,
  explodePercent,
  explodePercentRef,
  visibility,
  selectedComponentId,
  selectedZoneId,
  selectedCellId,
  hoverBus,
  heatmapEnabled,
  thermalResult,
  sampleIndexRef,
  playbackPlaying = false,
  colorDirtyRef,
  zoneTemperaturesC,
  tempRangeC,
  clippingPlanes,
  onSelectPart,
  onHoverPart,
}: AssemblySceneProps): React.ReactElement {
  const { invalidate } = useThree();
  const layout = useMemo(() => buildLfpSceneLayout(pack), [pack]);
  const wallM = (pack.envelopeMm.enclosureWallMm ?? 12) / 1000;
  const instRef = useRef<THREE.InstancedMesh>(null);
  const timGroupRef = useRef<THREE.Group>(null);
  const plateGroupRef = useRef<THREE.Group>(null);
  const bmsGroupRef = useRef<THREE.Group>(null);
  const lidGroupRef = useRef<THREE.Group>(null);
  const endWallLeftRef = useRef<THREE.Group>(null);
  const endWallRightRef = useRef<THREE.Group>(null);
  const sideWallsRef = useRef<THREE.Group>(null);

  const lastExplodeRef = useRef<number>(-1);
  const lastSpreadRef = useRef<number>(1.0);
  const cellsBoundsRef = useRef<THREE.Box3>(new THREE.Box3());

  const nZones = Math.max(pack.zones.length, thermalResult?.zoneIds.length ?? 0, 1);
  const zoneTempsScratch = useMemo(() => new Float32Array(nZones), [nZones]);
  const zoneColorsScratch = useMemo(
    () => Array.from({ length: nZones }, () => new THREE.Color()),
    [nZones]
  );

  const cellsVisible = visibility["pack.cells"] !== false;
  const cellsDimmed = selectedComponentId !== null && selectedComponentId !== "pack.cells";
  const side = clippingPlanes.length > 0 ? THREE.DoubleSide : THREE.FrontSide;

  const cellMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.36,
        metalness: 0.68,
        transparent: true, // constant: dimming only changes opacity, so selecting never compiles a new shader variant
        opacity: 1.0,
        forceSinglePass: true,
        clippingPlanes,
        side,
      }),
    [clippingPlanes, side]
  );

  // Dimming mutates opacity on the same material (no new material => no shader recompile)
  useLayoutEffect(() => {
    cellMat.opacity = cellsDimmed ? 0.35 : 1.0;
    invalidate();
  }, [cellMat, cellsDimmed, invalidate]);

  useEffect(() => {
    return () => {
      cellMat.dispose();
    };
  }, [cellMat]);

  const applyMatrices = useCallback(
    (pct: number) => {
      const mesh = instRef.current;
      const offsets = computeExplodeOffsets("LFP_BLADE", pct);
      lastExplodeRef.current = pct;
      lastSpreadRef.current = offsets.lfpCellSpreadFactor;

      if (timGroupRef.current) timGroupRef.current.position.y = offsets.lfpTimY;
      if (plateGroupRef.current) plateGroupRef.current.position.y = offsets.lfpColdPlateY;
      if (bmsGroupRef.current) bmsGroupRef.current.position.y = offsets.bmsBusbarsY;
      if (lidGroupRef.current) lidGroupRef.current.position.y = offsets.upperEnclosureY;
      // End walls slide outward with the blade spread so cells never pass through them
      const endWallX = (layout.packWidthX / 2 - wallM / 2) * offsets.lfpCellSpreadFactor;
      if (endWallLeftRef.current) endWallLeftRef.current.position.x = -endWallX;
      if (endWallRightRef.current) endWallRightRef.current.position.x = endWallX;
      if (sideWallsRef.current) sideWallsRef.current.scale.x = offsets.lfpCellSpreadFactor;

      if (!mesh) return;
      const spread = offsets.lfpCellSpreadFactor;
      const cells = layout.cells;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]!;
        _dummy.position.set(c.xM * spread, c.yBaseM, c.zM);
        _dummy.updateMatrix();
        mesh.setMatrixAt(c.instanceIndex, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      const halfX = (layout.packWidthX * spread) * 0.5 + layout.cellThicknessX;
      const halfZ = layout.cellLengthZ * 0.5 + 0.01;
      cellsBoundsRef.current.min.set(-halfX, -0.01, -halfZ);
      cellsBoundsRef.current.max.set(halfX, layout.cellHeightY + 0.01, halfZ);
      if (!mesh.boundingBox) mesh.boundingBox = new THREE.Box3();
      mesh.boundingBox.copy(cellsBoundsRef.current);
      if (!mesh.boundingSphere) mesh.boundingSphere = new THREE.Sphere();
      cellsBoundsRef.current.getBoundingSphere(mesh.boundingSphere);
    },
    [layout, wallM]
  );

  const applyColors = useCallback(
    (sampleCursor: number) => {
      const mesh = instRef.current;
      if (!mesh) return;
      const minT = tempRangeC?.[0] ?? 25;
      const maxT = tempRangeC?.[1] ?? 55;

      let hasHeatmapColors = false;
      if (heatmapEnabled && thermalResult) {
        interpolateZoneTemperatures(thermalResult, sampleCursor, zoneTempsScratch);
        const count = thermalResult.zoneIds.length;
        for (let z = 0; z < count; z++) {
          mapTemperatureToThermalColor(zoneTempsScratch[z] ?? minT, minT, maxT, zoneColorsScratch[z]!);
        }
        hasHeatmapColors = true;
      } else if (heatmapEnabled && zoneTemperaturesC) {
        for (let z = 0; z < zoneTemperaturesC.length; z++) {
          const temp = zoneTemperaturesC[z];
          if (temp !== undefined) {
            mapTemperatureToThermalColor(temp, minT, maxT, zoneColorsScratch[z]!);
          }
        }
        hasHeatmapColors = true;
      }

      const cells = layout.cells;
      const isPackCellsSelected = selectedComponentId === "pack.cells";
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]!;
        const isPickedCell =
          selectedCellId === c.cellId || (isPackCellsSelected && selectedZoneId === c.zoneId);
        if (isPickedCell) {
          mesh.setColorAt(c.instanceIndex, _accentColor);
        } else if (hasHeatmapColors && c.zoneIndex < zoneColorsScratch.length) {
          mesh.setColorAt(c.instanceIndex, zoneColorsScratch[c.zoneIndex]!);
        } else {
          mesh.setColorAt(c.instanceIndex, _baseBladeColor);
        }
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    [
      layout,
      heatmapEnabled,
      thermalResult,
      zoneTemperaturesC,
      tempRangeC,
      selectedCellId,
      selectedZoneId,
      selectedComponentId,
      zoneTempsScratch,
      zoneColorsScratch,
    ]
  );

  // Matrix updates only when layout or committed explodePercent changes
  useLayoutEffect(() => {
    const pct = explodePercentRef ? explodePercentRef.current : explodePercent;
    applyMatrices(pct);
    invalidate();
  }, [applyMatrices, explodePercent, explodePercentRef, invalidate]);

  // Color updates only when thermal/selection state changes
  useLayoutEffect(() => {
    const cursor = sampleIndexRef ? sampleIndexRef.current : 0;
    applyColors(cursor);
    if (colorDirtyRef) colorDirtyRef.current = false;
    invalidate();
  }, [applyColors, sampleIndexRef, colorDirtyRef, invalidate]);

  useFrame(() => {
    if (explodePercentRef && Math.abs(explodePercentRef.current - lastExplodeRef.current) > 1e-4) {
      applyMatrices(explodePercentRef.current);
    }
    if ((playbackPlaying && heatmapEnabled && thermalResult) || colorDirtyRef?.current) {
      applyColors(sampleIndexRef ? sampleIndexRef.current : 0);
      if (colorDirtyRef) colorDirtyRef.current = false;
    }
  });

  const customRaycast = useCallback(
    (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => {
      const mesh = instRef.current;
      if (!mesh || !mesh.visible) return;
      _invMatrix.copy(mesh.matrixWorld).invert();
      _localRay.copy(raycaster.ray).applyMatrix4(_invMatrix);

      const hit = pickLfpBladeCells(
        _localRay,
        layout.cells,
        layout.cellThicknessX,
        layout.cellHeightY,
        layout.cellLengthZ,
        lastSpreadRef.current,
        cellsBoundsRef.current
      );
      if (!hit) return;

      _worldPt.copy(hit.localPoint).applyMatrix4(mesh.matrixWorld);
      const distance = raycaster.ray.origin.distanceTo(_worldPt);
      if (distance < raycaster.near || distance > raycaster.far) return;

      intersects.push({
        distance,
        point: _worldPt.clone(),
        object: mesh,
        instanceId: hit.instanceId,
      });
    },
    [layout]
  );

  const cellTopY = layout.cellHeightY;
  const timBaseY = cellTopY + layout.timThicknessM / 2;
  const plateBaseY = cellTopY + layout.timThicknessM + layout.coldPlateThicknessM / 2;
  const bmsBaseY = cellTopY + layout.timThicknessM + layout.coldPlateThicknessM + 0.015;
  const lidBaseY = cellTopY + 0.045;

  const handleCellClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.instanceId === undefined) return;
      const picked = layout.cells[e.instanceId];
      if (picked) {
        onSelectPart("pack.cells", picked.zoneId, picked.cellId);
      }
    },
    [layout, onSelectPart]
  );

  const handleSelectSimple = useCallback((id: string) => onSelectPart(id), [onSelectPart]);

  return (
    <group>
      {/* Lower enclosure tray (fixed reference at y <= 0) */}
      <SelectablePart
        componentId="pack.lower_enclosure"
        position={[0, -0.008, 0]}
        visible={visibility["pack.lower_enclosure"] !== false}
        selectedId={selectedComponentId}
        hoverBus={hoverBus}
        heatmapEnabled={heatmapEnabled}
        baseColor={CAD_COLORS.enclosureDark}
        roughness={0.62}
        metalness={0.45}
        clippingPlanes={clippingPlanes}
        onSelect={handleSelectSimple}
        onHover={onHoverPart}
      >
        <boxGeometry args={[layout.packWidthX, 0.016, layout.packDepthZ]} />
      </SelectablePart>

      {/* Perimeter tray walls (visual, from envelope) */}
      <TrayWalls
        lengthX={layout.packWidthX}
        depthZ={layout.packDepthZ}
        wallThickness={wallM}
        height={lidBaseY - 0.006}
        visible={visibility["pack.lower_enclosure"] !== false}
        selectedId={selectedComponentId}
        hoverBus={hoverBus}
        heatmapEnabled={heatmapEnabled}
        clippingPlanes={clippingPlanes}
        onSelect={handleSelectSimple}
        onHover={onHoverPart}
        endWallRefs={[endWallLeftRef, endWallRightRef]}
        sideWallsRef={sideWallsRef}
      />

      {/* Instanced 120 LFP blade cells */}
      <instancedMesh
        ref={instRef}
        visible={cellsVisible}
        args={[undefined, undefined, layout.cells.length]}
        material={cellMat}
        raycast={customRaycast}
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

      {/* Thermal interface layer */}
      <group ref={timGroupRef}>
        <SelectablePart
          componentId="pack.thermal_interface"
          position={[0, timBaseY, 0]}
          visible={visibility["pack.thermal_interface"] !== false}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.thermalInterface}
          roughness={0.88}
          metalness={0.05}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        >
          <boxGeometry args={[layout.packWidthX - 0.05, layout.timThicknessM + 0.002, layout.cellLengthZ]} />
        </SelectablePart>
      </group>

      {/* Top liquid cold plate & ports */}
      <group ref={plateGroupRef}>
        <SelectablePart
          componentId="pack.cooling_plate"
          position={[0, plateBaseY, 0]}
          visible={visibility["pack.cooling_plate"] !== false}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.coolingPlate}
          roughness={0.5}
          metalness={0.72}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        >
          <boxGeometry args={[layout.packWidthX - 0.03, layout.coldPlateThicknessM, layout.packDepthZ - 0.03]} />
        </SelectablePart>

        <SelectablePart
          componentId="pack.coolant_inlet"
          position={[-layout.packWidthX / 2 - 0.015, plateBaseY, -0.22]}
          rotation={[0, 0, Math.PI / 2]}
          visible={visibility["pack.coolant_inlet"] !== false}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.portMetal}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        >
          <cylinderGeometry args={[0.014, 0.014, 0.04, 16]} />
        </SelectablePart>

        <SelectablePart
          componentId="pack.coolant_outlet"
          position={[layout.packWidthX / 2 + 0.015, plateBaseY, 0.22]}
          rotation={[0, 0, Math.PI / 2]}
          visible={visibility["pack.coolant_outlet"] !== false}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.portMetal}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        >
          <cylinderGeometry args={[0.014, 0.014, 0.04, 16]} />
        </SelectablePart>
      </group>

      {/* HV busbars & BMS */}
      <group ref={bmsGroupRef}>
        <SelectablePart
          componentId="pack.busbars"
          position={[0, bmsBaseY, layout.cellLengthZ / 2 + 0.014]}
          visible={visibility["pack.busbars"] !== false}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.busbarCopper}
          roughness={0.28}
          metalness={0.85}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        >
          <boxGeometry args={[layout.packWidthX - 0.08, 0.008, 0.018]} />
        </SelectablePart>

        <SelectablePart
          componentId="pack.bms"
          position={[-layout.packWidthX / 2 + 0.18, bmsBaseY + 0.004, 0]}
          visible={visibility["pack.bms"] !== false}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.bmsBoard}
          roughness={0.68}
          metalness={0.22}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        >
          <boxGeometry args={[0.24, 0.016, 0.34]} />
        </SelectablePart>
      </group>

      {/* Upper enclosure lid */}
      <group ref={lidGroupRef}>
        <SelectablePart
          componentId="pack.upper_enclosure"
          position={[0, lidBaseY, 0]}
          visible={visibility["pack.upper_enclosure"] !== false}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.enclosureDark}
          roughness={0.62}
          metalness={0.45}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        >
          <boxGeometry args={[layout.packWidthX, 0.012, layout.packDepthZ]} />
        </SelectablePart>
        <LidDetails
          lengthX={layout.packWidthX}
          depthZ={layout.packDepthZ}
          topY={lidBaseY + 0.006}
          boltInset={wallM / 2}
          visible={visibility["pack.upper_enclosure"] !== false}
          dimmed={selectedComponentId !== null && selectedComponentId !== "pack.upper_enclosure"}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        />
      </group>
    </group>
  );
});
