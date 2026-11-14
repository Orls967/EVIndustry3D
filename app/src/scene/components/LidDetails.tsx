import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { HoverBus } from "../controllers/sceneInteractionBus";
import { CAD_COLORS } from "../materials/cadMaterials";
import { SelectablePart } from "./SelectableMesh";

const _noopRaycast = () => {};
const _dummy = new THREE.Object3D();

export interface LidDetailsProps {
  lengthX: number;
  depthZ: number;
  /** Y of the lid's top surface (m), in the lid group's local frame. */
  topY: number;
  /** Inset of the bolt line from the outer edge (m), normally half the wall thickness. */
  boltInset: number;
  visible: boolean;
  dimmed: boolean;
  selectedId: string | null;
  hoverBus?: HoverBus;
  heatmapEnabled: boolean;
  clippingPlanes: THREE.Plane[];
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

/**
 * Visual detail on the upper enclosure: stamped stiffening ribs and a perimeter bolt line.
 * Generic, illustrative geometry only — not taken from any specific vehicle pack.
 */
export function LidDetails({
  lengthX,
  depthZ,
  topY,
  boltInset,
  visible,
  dimmed,
  selectedId,
  hoverBus,
  heatmapEnabled,
  clippingPlanes,
  onSelect,
  onHover,
}: LidDetailsProps): React.ReactElement {
  const ribCount = 5;
  const ribHeight = 0.004;
  const ribWidth = 0.05;
  const ribLength = lengthX * 0.82;
  const ribPitch = (depthZ * 0.7) / (ribCount - 1);
  const ribZ0 = -(depthZ * 0.7) / 2;

  const bolts = useMemo(() => {
    const pts: [number, number][] = [];
    const hx = lengthX / 2 - boltInset;
    const hz = depthZ / 2 - boltInset;
    const nx = Math.max(2, Math.round((2 * hx) / 0.15));
    const nz = Math.max(2, Math.round((2 * hz) / 0.15));
    for (let i = 0; i <= nx; i++) {
      const x = -hx + (2 * hx * i) / nx;
      pts.push([x, -hz], [x, hz]);
    }
    for (let j = 1; j < nz; j++) {
      const z = -hz + (2 * hz * j) / nz;
      pts.push([-hx, z], [hx, z]);
    }
    return pts;
  }, [lengthX, depthZ, boltInset]);

  const boltRef = useRef<THREE.InstancedMesh>(null);
  const boltMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CAD_COLORS.portMetal,
        roughness: 0.35,
        metalness: 0.8,
        transparent: true, // constant: dimming only changes opacity (no shader recompile)
        opacity: 1,
        clippingPlanes,
      }),
    [clippingPlanes]
  );
  useLayoutEffect(() => {
    boltMat.opacity = dimmed ? 0.35 : 1;
  }, [boltMat, dimmed]);

  useLayoutEffect(() => {
    const mesh = boltRef.current;
    if (!mesh) return;
    for (let i = 0; i < bolts.length; i++) {
      const [x, z] = bolts[i]!;
      _dummy.position.set(x, topY + 0.002, z);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [bolts, topY]);

  useLayoutEffect(() => () => boltMat.dispose(), [boltMat]);

  return (
    <group visible={visible}>
      {Array.from({ length: ribCount }, (_, k) => (
        <SelectablePart
          key={k}
          componentId="pack.upper_enclosure"
          position={[0, topY + ribHeight / 2, ribZ0 + k * ribPitch]}
          visible={visible}
          selectedId={selectedId}
          hoverBus={hoverBus}
          heatmapEnabled={heatmapEnabled}
          baseColor={CAD_COLORS.enclosureWall}
          roughness={0.55}
          metalness={0.4}
          clippingPlanes={clippingPlanes}
          onSelect={onSelect}
          onHover={onHover}
        >
          <boxGeometry args={[ribLength, ribHeight, ribWidth]} />
        </SelectablePart>
      ))}
      <instancedMesh ref={boltRef} args={[undefined, undefined, bolts.length]} material={boltMat} raycast={_noopRaycast}>
        <cylinderGeometry args={[0.006, 0.006, 0.004, 12]} />
      </instancedMesh>
    </group>
  );
}
