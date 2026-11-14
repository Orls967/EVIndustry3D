import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
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

/** Pre-compiles SHARED_OUTLINE_MATERIAL on Canvas mount so the first hover has zero shader/PSO-compile stutter. */
export function OutlineShaderPrewarm(): null {
  const { gl, camera } = useThree();
  useEffect(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    const dummyScene = new THREE.Scene();
    const lines = new THREE.LineSegments(geo, SHARED_OUTLINE_MATERIAL);
    lines.frustumCulled = false;
    dummyScene.add(lines);
    const rt = new THREE.WebGLRenderTarget(1, 1);
    const prevTarget = gl.getRenderTarget();
    gl.setRenderTarget(rt);
    gl.render(dummyScene, camera);
    gl.setRenderTarget(prevTarget);
    rt.dispose();
    geo.dispose();
  }, [gl, camera]);
  return null;
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
      transparent: dimmed,
      opacity: dimmed ? 0.35 : 1.0,
      forceSinglePass: true,
      clippingPlanes,
      side,
    }),
    [color, roughness, metalness, dimmed, clippingPlanes, side]
  );

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
