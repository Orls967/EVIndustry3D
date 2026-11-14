import React, { useMemo } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { CAD_COLORS, HEATMAP_NON_THERMAL_HEX } from "../materials/cadMaterials";

export interface SelectablePartProps {
  componentId: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  visible: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  heatmapEnabled: boolean;
  baseColor: string;
  roughness?: number;
  metalness?: number;
  clippingPlanes: THREE.Plane[];
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  children: React.ReactNode;
}

export function SelectablePart({
  componentId,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  visible,
  selectedId,
  hoveredId,
  heatmapEnabled,
  baseColor,
  roughness = 0.42,
  metalness = 0.32,
  clippingPlanes,
  onSelect,
  onHover,
  children,
}: SelectablePartProps): React.ReactElement | null {
  const isSelected = selectedId === componentId;
  const isHovered = hoveredId === componentId;
  const dimmed = selectedId !== null && !isSelected;
  const color = heatmapEnabled ? HEATMAP_NON_THERMAL_HEX : baseColor;

  const materialProps = useMemo(
    () => ({
      color,
      roughness,
      metalness,
      transparent: dimmed,
      opacity: dimmed ? 0.35 : 1.0,
      clippingPlanes,
      side: THREE.DoubleSide,
    }),
    [color, roughness, metalness, dimmed, clippingPlanes]
  );

  if (!visible) return null;

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
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {children}
      <meshStandardMaterial {...materialProps} />
      {(isSelected || isHovered) && (
        <Edges
          threshold={15}
          color={CAD_COLORS.accentOutline}
          scale={1.003}
        />
      )}
    </mesh>
  );
}

