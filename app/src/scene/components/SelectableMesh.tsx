import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { HoverBus } from "../controllers/sceneInteractionBus";
import { CAD_COLORS, HEATMAP_NON_THERMAL_HEX } from "../materials/cadMaterials";

export interface SelectablePartProps {
  componentId: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  visible: boolean;
  selectedId: string | null;
  hoverBus?: HoverBus;
  heatmapEnabled: boolean;
  baseColor: string;
  roughness?: number;
  metalness?: number;
  clippingPlanes: THREE.Plane[];
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  children: React.ReactNode;
}

const _noopRaycast = () => {};

export const SHARED_OUTLINE_MATERIAL = new THREE.LineBasicMaterial({
  color: CAD_COLORS.accentOutline,
  toneMapped: false,
});

/** Zero-length segment drawn with SHARED_OUTLINE_MATERIAL during the first frames only, so the outline
 *  program is compiled inside the real scene for the real screen target (gl.compile on a separate scene
 *  produced a different program variant, and the first hover still stalled). */
const _prewarmOutlineGeometry = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  return g;
})();

export function OutlineShaderPrewarm(): React.ReactElement {
  const ref = useRef<THREE.LineSegments>(null);
  const framesRef = useRef(0);
  useFrame(() => {
    if (ref.current && ref.current.visible && ++framesRef.current > 2) ref.current.visible = false;
  });
  return (
    <lineSegments
      ref={ref}
      geometry={_prewarmOutlineGeometry}
      material={SHARED_OUTLINE_MATERIAL}
      frustumCulled={false}
      raycast={_noopRaycast}
    />
  );
}

export const SelectablePart = React.memo(function SelectablePart({
  componentId,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  visible,
  selectedId,
  hoverBus,
  heatmapEnabled,
  baseColor,
  roughness = 0.42,
  metalness = 0.32,
  clippingPlanes,
  onSelect,
  onHover,
  children,
}: SelectablePartProps): React.ReactElement {
  const { invalidate } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.LineSegments>(null);
  const edgeLineRef = useRef<THREE.LineSegments>(null);
  const builtForGeoRef = useRef<THREE.BufferGeometry | null>(null);

  const isSelected = selectedId === componentId;
  const isSelectedRef = useRef(isSelected);
  isSelectedRef.current = isSelected;

  const dimmed = selectedId !== null && !isSelected;
  const color = heatmapEnabled ? HEATMAP_NON_THERMAL_HEX : baseColor;
  const side = clippingPlanes.length > 0 ? THREE.DoubleSide : THREE.FrontSide;

  const materialProps = useMemo(
    () => ({
      color,
      roughness,
      metalness,
      transparent: true, // constant: dimming only changes opacity (no shader recompile)
      opacity: dimmed ? 0.35 : 1.0,
      forceSinglePass: true,
      clippingPlanes,
      side,
    }),
    [color, roughness, metalness, dimmed, clippingPlanes, side]
  );

  // Subtle always-on CAD edge lines (same clipping as the part, hidden while dimmed)
  const edgeMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#9aa7b4",
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        clippingPlanes,
      }),
    [clippingPlanes]
  );
  useEffect(() => () => edgeMaterial.dispose(), [edgeMaterial]);
  // Dimming mutates opacity on the same material (no new material => no shader recompile)
  useLayoutEffect(() => {
    edgeMaterial.opacity = dimmed ? 0 : 0.22;
  }, [edgeMaterial, dimmed]);

  // Build EdgesGeometry once per BufferGeometry instance and toggle .visible instead of mount/unmount
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const outline = outlineRef.current;
    if (!mesh || !outline || !mesh.geometry) return;
    if (builtForGeoRef.current === mesh.geometry) return;
    builtForGeoRef.current = mesh.geometry;

    const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
    outline.geometry.dispose();
    outline.geometry = edges;
    if (edgeLineRef.current) edgeLineRef.current.geometry = edges;
  });

  useEffect(() => {
    return () => {
      outlineRef.current?.geometry.dispose();
    };
  }, []);

  // Keep outline visibility synced with selection and ref-based hover without React re-renders
  useLayoutEffect(() => {
    const outline = outlineRef.current;
    if (!outline) return;
    const hovered = hoverBus ? hoverBus.getCurrent() === componentId : false;
    outline.visible = isSelected || hovered;
  }, [isSelected, hoverBus, componentId]);

  useEffect(() => {
    if (!hoverBus) return;
    return hoverBus.subscribe((nextHoveredId) => {
      const outline = outlineRef.current;
      if (!outline) return;
      const shouldShow = isSelectedRef.current || nextHoveredId === componentId;
      if (outline.visible !== shouldShow) {
        outline.visible = shouldShow;
        invalidate();
      }
    });
  }, [hoverBus, componentId, invalidate]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(componentId);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(componentId);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(null);
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      visible={visible}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {children}
      <meshStandardMaterial {...materialProps} />
      <lineSegments ref={edgeLineRef} material={edgeMaterial} raycast={_noopRaycast} />
      <lineSegments
        ref={outlineRef}
        visible={false}
        scale={1.003}
        material={SHARED_OUTLINE_MATERIAL}
        raycast={_noopRaycast}
      />
    </mesh>
  );
});
