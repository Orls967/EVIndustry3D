import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { AssemblySceneProps } from "./LfpBladeAssembly";
import { buildNmcSceneLayout } from "../builders/packGeometrySpec";
import { computeExplodeOffsets } from "../controllers/explodeController";
import { pickNmcCylinderCells } from "../controllers/instancedPicking";
import { interpolateZoneTemperatures } from "../controllers/playbackController";
import { CAD_COLORS, mapTemperatureToThermalColor } from "../materials/cadMaterials";
import { TrayWalls } from "./TrayWalls";
import { LidDetails } from "./LidDetails";
import { SelectablePart } from "./SelectableMesh";

const _dummy = new THREE.Object3D();
const _invMatrix = new THREE.Matrix4();
const _localRay = new THREE.Ray();
const _worldPt = new THREE.Vector3();
const _baseCanColor = new THREE.Color(CAD_COLORS.cylCan);
const _accentColor = new THREE.Color(CAD_COLORS.accentOutline);

export const Nmc4680Assembly = React.memo(function Nmc4680Assembly({
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
  qualityTier,
  clippingPlanes,
  onSelectPart,
  onHoverPart,
}: AssemblySceneProps): React.ReactElement {
  const { invalidate } = useThree();
  const layout = useMemo(() => buildNmcSceneLayout(pack), [pack]);
  const wallM = (pack.envelopeMm.enclosureWallMm ?? 15) / 1000;
  const instRef = useRef<THREE.InstancedMesh>(null);
  const channelsGroupRef = useRef<THREE.Group>(null);
  const bmsGroupRef = useRef<THREE.Group>(null);
  const lidGroupRef = useRef<THREE.Group>(null);

  const lastExplodeRef = useRef<number>(-1);
  const lastCellsYRef = useRef<number>(0);
  const cellsBoundsRef = useRef<THREE.Box3>(new THREE.Box3());

  const nZones = Math.max(pack.zones.length, thermalResult?.zoneIds.length ?? 0, 1);
  const zoneTempsScratch = useMemo(() => new Float32Array(nZones), [nZones]);
  const zoneColorsScratch = useMemo(
    () => Array.from({ length: nZones }, () => new THREE.Color()),
    [nZones]
  );

  const radialSegments = qualityTier === "high" ? 24 : qualityTier === "medium" ? 14 : 10;
  const cellsVisible = visibility["pack.cells"] !== false;
  const cellsDimmed = selectedComponentId !== null && selectedComponentId !== "pack.cells";
  const side = clippingPlanes.length > 0 ? THREE.DoubleSide : THREE.FrontSide;

  const cellMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.32,
        metalness: 0.74,
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
      const offsets = computeExplodeOffsets("NMC_4680", pct);
      lastExplodeRef.current = pct;
      lastCellsYRef.current = offsets.nmcCellsY;

      if (channelsGroupRef.current) channelsGroupRef.current.position.y = offsets.nmcSideChannelsY;
      if (bmsGroupRef.current) bmsGroupRef.current.position.y = offsets.bmsBusbarsY;
      if (lidGroupRef.current) lidGroupRef.current.position.y = offsets.upperEnclosureY;

      if (!mesh) return;
      const cellsY = offsets.nmcCellsY;
      const cells = layout.cells;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]!;
        _dummy.position.set(c.xM, c.yBaseM + cellsY, c.zM);
        _dummy.updateMatrix();
        mesh.setMatrixAt(c.instanceIndex, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      const halfX = layout.packWidthX * 0.5 + layout.cellRadiusM;
      const halfZ = layout.packDepthZ * 0.5 + layout.cellRadiusM;
      cellsBoundsRef.current.min.set(-halfX, cellsY - 0.01, -halfZ);
      cellsBoundsRef.current.max.set(halfX, cellsY + layout.cellHeightY + 0.01, halfZ);
      if (!mesh.boundingBox) mesh.boundingBox = new THREE.Box3();
      mesh.boundingBox.copy(cellsBoundsRef.current);
      if (!mesh.boundingSphere) mesh.boundingSphere = new THREE.Sphere();
      cellsBoundsRef.current.getBoundingSphere(mesh.boundingSphere);
    },
    [layout]
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
        const isPicked =
          selectedCellId === c.cellId || (isPackCellsSelected && selectedZoneId === c.zoneId);
        if (isPicked) {
          mesh.setColorAt(c.instanceIndex, _accentColor);
        } else if (hasHeatmapColors && c.zoneIndex < zoneColorsScratch.length) {
          mesh.setColorAt(c.instanceIndex, zoneColorsScratch[c.zoneIndex]!);
        } else {
          mesh.setColorAt(c.instanceIndex, _baseCanColor);
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

      const hit = pickNmcCylinderCells(
        _localRay,
        layout.cells,
        layout.cellRadiusM,
        layout.cellHeightY,
        lastCellsYRef.current,
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

  const ribbonBaseY = layout.cellHeightY / 2;
  const collectorBaseY = layout.cellHeightY + 0.008;
  const lidBaseY = layout.cellHeightY + 0.036;

  return (
    <group>
      {/* Lower structural base */}
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
      />

      {/* Instanced 828 NMC 4680 cylindrical cells */}
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
        <cylinderGeometry args={[layout.cellRadiusM, layout.cellRadiusM, layout.cellHeightY, radialSegments]} />
      </instancedMesh>

      {/* 12 parallel side cooling ribbons between rows + inlet/outlet headers */}
      <group ref={channelsGroupRef}>
        {layout.ribbonChannelPositionsZ.map((rz, idx) => (
          <React.Fragment key={idx}>
            <SelectablePart
              componentId="pack.cooling_channels"
              position={[0, ribbonBaseY, rz]}
              visible={visibility["pack.cooling_channels"] !== false}
              selectedId={selectedComponentId}
              hoverBus={hoverBus}
              heatmapEnabled={heatmapEnabled}
              baseColor={CAD_COLORS.coolingPlate}
              roughness={0.38}
              metalness={0.72}
              clippingPlanes={clippingPlanes}
              onSelect={handleSelectSimple}
              onHover={onHoverPart}
            >
              <boxGeometry args={[layout.packWidthX - 0.06, 0.064, 0.004]} />
            </SelectablePart>

            <SelectablePart
              componentId="pack.thermal_interface"
              position={[0, ribbonBaseY, rz + 0.003]}
              visible={visibility["pack.thermal_interface"] !== false}
              selectedId={selectedComponentId}
              hoverBus={hoverBus}
              heatmapEnabled={heatmapEnabled}
              baseColor={CAD_COLORS.thermalInterface}
              roughness={0.86}
              metalness={0.05}
              clippingPlanes={clippingPlanes}
              onSelect={handleSelectSimple}
              onHover={onHoverPart}
            >
              <boxGeometry args={[layout.packWidthX - 0.08, 0.058, 0.002]} />
            </SelectablePart>
          </React.Fragment>
        ))}

        {/* Inlet & outlet manifold headers */}
        <SelectablePart
          componentId="pack.coolant_inlet"
          position={[-(layout.packWidthX / 2 - wallM - 0.0065), ribbonBaseY, 0]}
          visible={visibility["pack.coolant_inlet"] !== false}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.portMetal}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        >
          <boxGeometry args={[0.012, 0.036, layout.packDepthZ - 0.08]} />
        </SelectablePart>

        <SelectablePart
          componentId="pack.coolant_outlet"
          position={[layout.packWidthX / 2 - wallM - 0.0065, ribbonBaseY, 0]}
          visible={visibility["pack.coolant_outlet"] !== false}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.portMetal}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        >
          <boxGeometry args={[0.012, 0.036, layout.packDepthZ - 0.08]} />
        </SelectablePart>
      </group>

      {/* HV current collector plates & BMS */}
      <group ref={bmsGroupRef}>
        <SelectablePart
          componentId="pack.busbars"
          position={[0, collectorBaseY, 0]}
          visible={visibility["pack.busbars"] !== false}
          selectedId={selectedComponentId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.busbarCopper}
          roughness={0.48}
          metalness={0.75}
          clippingPlanes={clippingPlanes}
          onSelect={handleSelectSimple}
          onHover={onHoverPart}
        >
          <boxGeometry args={[layout.packWidthX - 0.08, 0.006, layout.packDepthZ - 0.14]} />
        </SelectablePart>

        <SelectablePart
          componentId="pack.bms"
          position={[-layout.packWidthX / 2 + 0.18, collectorBaseY + 0.012, 0]}
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
