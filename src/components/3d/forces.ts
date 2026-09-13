import {
  BRAIN_CENTER,
  BRAIN_RADII,
  BRAIN_RADII_2D,
  targetPosition,
  targetPosition2D,
} from '@/lib/brainLobeMap';
import type { GraphNode } from '@/types/graph';

/**
 * d3-force 가 요구하는 힘 함수 형태.
 * 시뮬레이션이 시작될 때 `initialize` 로 노드 배열을 넘겨준다.
 */
interface ForceFn {
  (alpha: number): void;
  initialize?: (nodes: GraphNode[]) => void;
}

/**
 * 카테고리 중심점으로 끌어당기는 힘.
 *
 * 기본 force-directed 레이아웃은 무작위 구형으로 수렴한다. 이 힘이 각 노드를
 * 자기 뇌엽 좌표로 당겨야 비로소 도메인별 클러스터가 뇌 모양으로 배치된다.
 * 당기는 세기를 너무 키우면 모든 노드가 한 점에 겹치므로, 링크 힘과 반발력이
 * 클러스터 내부를 펼칠 여지를 남기는 정도로만 준다.
 */
export function lobeAttractionForce(strength = 0.09): ForceFn {
  let nodes: GraphNode[] = [];

  const force: ForceFn = (alpha: number) => {
    for (const node of nodes) {
      const target = targetPosition(node.category, node.hemisphere);
      const k = strength * alpha;
      node.vx = (node.vx ?? 0) + (target.x - (node.x ?? 0)) * k;
      node.vy = (node.vy ?? 0) + (target.y - (node.y ?? 0)) * k;
      node.vz = (node.vz ?? 0) + (target.z - (node.z ?? 0)) * k;
    }
  };

  force.initialize = (next: GraphNode[]) => {
    nodes = next;
  };
  return force;
}

/**
 * 대뇌 타원체 밖으로 나간 노드를 껍질 안쪽으로 되민다.
 *
 * 뇌엽 중심으로 당기는 힘만으로는 반발력이 센 고차 노드가 바깥으로 튕겨나가
 * 윤곽이 뭉개진다. 정규화 반경이 1 을 넘는 노드에만 작용하므로 내부 배치는
 * 자유롭게 두면서 외곽선만 잡아준다.
 */
export function ellipsoidConstraintForce(strength = 0.35): ForceFn {
  let nodes: GraphNode[] = [];

  const force: ForceFn = (alpha: number) => {
    for (const node of nodes) {
      const dx = (node.x ?? 0) - BRAIN_CENTER.x;
      const dy = (node.y ?? 0) - BRAIN_CENTER.y;
      const dz = (node.z ?? 0) - BRAIN_CENTER.z;

      const normalized = Math.sqrt(
        (dx / BRAIN_RADII.x) ** 2 + (dy / BRAIN_RADII.y) ** 2 + (dz / BRAIN_RADII.z) ** 2,
      );
      if (normalized <= 1 || normalized === 0) continue;

      // 껍질까지 되돌리는 데 필요한 변위에 비례해 안쪽으로 당긴다.
      const pull = ((normalized - 1) / normalized) * strength * alpha;
      node.vx = (node.vx ?? 0) - dx * pull;
      node.vy = (node.vy ?? 0) - dy * pull;
      node.vz = (node.vz ?? 0) - dz * pull;
    }
  };

  force.initialize = (next: GraphNode[]) => {
    nodes = next;
  };
  return force;
}

/**
 * 노드가 좌우 반구 경계(x = 0) 근처에 몰리지 않도록 살짝 밀어낸다.
 * 실제 뇌의 종렬 틈새(longitudinal fissure)에 해당하는 빈 공간을 만든다.
 */
export function midlineGapForce(gap = 18, strength = 0.12): ForceFn {
  let nodes: GraphNode[] = [];

  const force: ForceFn = (alpha: number) => {
    for (const node of nodes) {
      const x = node.x ?? 0;
      if (Math.abs(x) >= gap) continue;
      const direction = node.hemisphere >= 0 ? 1 : -1;
      node.vx = (node.vx ?? 0) + (direction * gap - x) * strength * alpha;
    }
  };

  force.initialize = (next: GraphNode[]) => {
    nodes = next;
  };
  return force;
}

// ---- 2D 폴백용 힘 ----

/** 2D 투영 좌표로 끌어당기는 힘. 3D 버전과 같은 역할이다. */
export function lobeAttractionForce2D(strength = 0.1): ForceFn {
  let nodes: GraphNode[] = [];

  const force: ForceFn = (alpha: number) => {
    for (const node of nodes) {
      const target = targetPosition2D(node.category, node.hemisphere);
      const k = strength * alpha;
      node.vx = (node.vx ?? 0) + (target.x - (node.x ?? 0)) * k;
      node.vy = (node.vy ?? 0) + (target.y - (node.y ?? 0)) * k;
    }
  };

  force.initialize = (next: GraphNode[]) => {
    nodes = next;
  };
  return force;
}

/** 2D 타원 밖으로 나간 노드를 되민다. */
export function ellipseConstraintForce2D(strength = 0.35): ForceFn {
  let nodes: GraphNode[] = [];

  const force: ForceFn = (alpha: number) => {
    for (const node of nodes) {
      const dx = node.x ?? 0;
      const dy = node.y ?? 0;
      const normalized = Math.sqrt(
        (dx / BRAIN_RADII_2D.x) ** 2 + (dy / BRAIN_RADII_2D.y) ** 2,
      );
      if (normalized <= 1 || normalized === 0) continue;

      const pull = ((normalized - 1) / normalized) * strength * alpha;
      node.vx = (node.vx ?? 0) - dx * pull;
      node.vy = (node.vy ?? 0) - dy * pull;
    }
  };

  force.initialize = (next: GraphNode[]) => {
    nodes = next;
  };
  return force;
}
