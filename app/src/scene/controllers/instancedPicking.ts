import * as THREE from "three";
import type { CellInstanceDescriptor } from "../builders/packGeometrySpec";

export interface InstancePickResult {
  instanceId: number;
  distance: number;
  localPoint: THREE.Vector3;
}

/**
 * Analytical ray-vs-finite-vertical-cylinder picking for the 828 NMC 4680 cells.
 * Avoids 828 Matrix4 inversions and triangle tests per pointer move by testing
 * a single pack-level AABB first and solving ray-cylinder analytically in local space.
 */
export function pickNmcCylinderCells(
  localRay: THREE.Ray,
  cells: readonly CellInstanceDescriptor[],
  cellRadiusM: number,
  cellHeightY: number,
  cellsOffsetY: number,
  packBounds: THREE.Box3
): InstancePickResult | null {
  if (cells.length === 0) return null;
  if (!localRay.intersectsBox(packBounds)) return null;

  const rSq = cellRadiusM * cellRadiusM;
  const halfH = cellHeightY * 0.5;
  const ox0 = localRay.origin.x;
  const oy0 = localRay.origin.y;
  const oz0 = localRay.origin.z;
  const dx = localRay.direction.x;
  const dy = localRay.direction.y;
  const dz = localRay.direction.z;
  const a = dx * dx + dz * dz;
  const hasHorizontal = a > 1e-12;
  const hasVertical = Math.abs(dy) > 1e-12;

  let bestT = Infinity;
  let bestId = -1;

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]!;
    const ox = ox0 - c.xM;
    const oy = oy0 - (c.yBaseM + cellsOffsetY);
    const oz = oz0 - c.zM;

    let cellT = Infinity;

    if (hasHorizontal) {
      const b = 2 * (ox * dx + oz * dz);
      const q = ox * ox + oz * oz - rSq;
      const disc = b * b - 4 * a * q;
      if (disc < 0) continue; // Ray misses infinite vertical cylinder for this cell

      const sqrtD = Math.sqrt(disc);
      const inv2a = 0.5 / a;
      const t0 = (-b - sqrtD) * inv2a;
      if (t0 >= 0 && t0 < bestT) {
        const yHit = oy + t0 * dy;
        if (Math.abs(yHit) <= halfH) {
          cellT = t0;
        }
      }
      if (cellT === Infinity) {
        const t1 = (-b + sqrtD) * inv2a;
        if (t1 >= 0 && t1 < bestT) {
          const yHit = oy + t1 * dy;
          if (Math.abs(yHit) <= halfH) {
            cellT = t1;
          }
        }
      }
    } else if (ox * ox + oz * oz > rSq) {
      continue;
    }

    if (hasVertical) {
      const invDy = 1 / dy;
      const tTop = (halfH - oy) * invDy;
      if (tTop >= 0 && tTop < cellT && tTop < bestT) {
        const hx = ox + tTop * dx;
        const hz = oz + tTop * dz;
        if (hx * hx + hz * hz <= rSq) {
          cellT = tTop;
        }
      }
      const tBot = (-halfH - oy) * invDy;
      if (tBot >= 0 && tBot < cellT && tBot < bestT) {
        const hx = ox + tBot * dx;
        const hz = oz + tBot * dz;
        if (hx * hx + hz * hz <= rSq) {
          cellT = tBot;
        }
      }
    }

    if (cellT < bestT) {
      bestT = cellT;
      bestId = c.instanceIndex;
    }
  }

  if (bestId < 0) return null;
  const localPoint = new THREE.Vector3();
  localRay.at(bestT, localPoint);
  return { instanceId: bestId, distance: bestT, localPoint };
}

const _tmpBox = new THREE.Box3();
const _tmpHit = new THREE.Vector3();

/**
 * Fast AABB ray picking for the 120 LFP blade cells in local space.
 */
export function pickLfpBladeCells(
  localRay: THREE.Ray,
  cells: readonly CellInstanceDescriptor[],
  cellThicknessX: number,
  cellHeightY: number,
  cellLengthZ: number,
  spreadFactor: number,
  packBounds: THREE.Box3
): InstancePickResult | null {
  if (cells.length === 0) return null;
  if (!localRay.intersectsBox(packBounds)) return null;

  const hx = cellThicknessX * 0.5;
  const hy = cellHeightY * 0.5;
  const hz = cellLengthZ * 0.5;

  let bestDistSq = Infinity;
  let bestId = -1;
  const bestPoint = new THREE.Vector3();

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]!;
    const cx = c.xM * spreadFactor;
    const cy = c.yBaseM;
    const cz = c.zM;
    _tmpBox.min.set(cx - hx, cy - hy, cz - hz);
    _tmpBox.max.set(cx + hx, cy + hy, cz + hz);

    const hit = localRay.intersectBox(_tmpBox, _tmpHit);
    if (hit) {
      const distSq = localRay.origin.distanceToSquared(hit);
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestId = c.instanceIndex;
        bestPoint.copy(hit);
      }
    }
  }

  if (bestId < 0) return null;
  return {
    instanceId: bestId,
    distance: Math.sqrt(bestDistSq),
    localPoint: bestPoint,
  };
}
