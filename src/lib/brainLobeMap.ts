import type { CategoryId, LobeDefinition, Vec3 } from '@/types/graph';
import type { Theme } from '@/store/settingsStore';

/**
 * CS 도메인 → 3D 뇌엽 공간 매핑.
 *
 * 일반적인 force-directed 그래프는 무작위 구형으로 뭉치므로, 카테고리마다 목표
 * 중심점(centroid)을 정해두고 커스텀 힘으로 끌어당겨 뇌 윤곽을 만든다.
 * 좌표계는 +Y 가 위, +Z 가 앞(이마 방향), +X 가 오른쪽이다.
 */

/** 대뇌 타원체의 반축. 실제 뇌처럼 앞뒤(z)가 좌우(x)보다 길다. */
export const BRAIN_RADII: Vec3 = { x: 150, y: 110, z: 190 };

/** 대뇌 타원체의 중심. 뇌간이 아래로 뻗으므로 살짝 위로 올려둔다. */
export const BRAIN_CENTER: Vec3 = { x: 0, y: 20, z: 0 };

export const LOBES: Record<CategoryId, LobeDefinition> = {
  'ds-algo': {
    id: 'ds-algo',
    label: '자료구조·알고리즘',
    centroid: { x: 0, y: 55, z: 120 },
    color: '#22d3ee', // cyan
    colorLight: '#0e7490',
  },
  architecture: {
    id: 'architecture',
    label: '아키텍처',
    centroid: { x: 0, y: 85, z: -10 },
    color: '#3b82f6', // blue
    colorLight: '#1d4ed8',
  },
  database: {
    id: 'database',
    label: '데이터베이스',
    centroid: { x: -105, y: -25, z: 10 },
    color: '#e879f9', // magenta
    colorLight: '#a21caf',
  },
  network: {
    id: 'network',
    label: '네트워크',
    centroid: { x: 105, y: -25, z: 10 },
    color: '#4ade80', // green
    colorLight: '#047857',
  },
  backend: {
    id: 'backend',
    label: '백엔드',
    centroid: { x: 0, y: 40, z: -140 },
    color: '#a78bfa', // violet
    colorLight: '#6d28d9',
  },
  os: {
    id: 'os',
    label: '운영체제',
    centroid: { x: 0, y: -80, z: -70 },
    color: '#fbbf24', // amber
    colorLight: '#b45309',
  },
};

/** 사이드바 필터에서 사용할 고정 표시 순서. */
export const CATEGORY_ORDER: CategoryId[] = [
  'ds-algo',
  'os',
  'network',
  'database',
  'backend',
  'architecture',
];

/** 알 수 없는 카테고리를 만났을 때의 폴백. */
export const FALLBACK_CATEGORY: CategoryId = 'architecture';

/** 임의의 문자열을 알려진 CategoryId 로 좁힌다. */
export function toCategoryId(raw: string | undefined): CategoryId {
  const key = (raw ?? '').trim().toLowerCase();
  return key in LOBES ? (key as CategoryId) : FALLBACK_CATEGORY;
}

export function getLobe(category: CategoryId): LobeDefinition {
  return LOBES[category] ?? LOBES[FALLBACK_CATEGORY];
}

export function getCategoryColor(category: CategoryId, theme: Theme): string {
  const lobe = getLobe(category);
  return theme === 'light' ? lobe.colorLight : lobe.color;
}

/**
 * 캔버스가 쓰는 연결선·라벨 색.
 *
 * 노드 색과 달리 이 색들은 Tailwind 클래스를 쓸 수 없다. three.js 와 2D 캔버스에
 * 문자열로 넘겨야 하므로 여기에 모아 둔다.
 */
export interface GraphPalette {
  /** 평범한 간선. */
  linkIdle: string;
  /** 서로를 참조하는 간선. */
  linkBidirectional: string;
  /** 선택·호버된 노드에 붙은 간선. */
  linkHighlight: string;
  /** 필터에서 밀려난 간선. */
  linkDim: string;
  /** 선택·호버된 노드의 라벨. */
  labelActive: string;
}

export const GRAPH_PALETTE: Record<Theme, GraphPalette> = {
  dark: {
    linkIdle: 'rgba(120, 140, 170, 0.2)',
    linkBidirectional: 'rgba(148, 197, 255, 0.34)',
    linkHighlight: 'rgba(125, 211, 252, 0.9)',
    linkDim: 'rgba(100, 116, 139, 0.06)',
    labelActive: '#ffffff',
  },
  light: {
    linkIdle: 'rgba(70, 90, 80, 0.22)',
    linkBidirectional: 'rgba(60, 90, 70, 0.32)',
    linkHighlight: 'rgba(21, 128, 61, 0.55)',
    linkDim: 'rgba(70, 90, 80, 0.07)',
    labelActive: '#0d1712',
  },
};

/**
 * 노드 ID 로부터 좌/우 반구를 결정한다.
 *
 * 같은 뇌엽 안의 노드를 모두 한 점으로 당기면 공처럼 뭉쳐 보이므로,
 * ID 해시로 노드를 좌우 반구에 나눠 배치해 대칭적인 뇌 형태를 만든다.
 * 해시이므로 새로고침해도 같은 노드는 항상 같은 쪽에 놓인다.
 */
export function hemisphereOf(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return (hash & 1) === 0 ? -1 : 1;
}

/** 좌우 반구 오프셋까지 반영한 최종 목표 좌표. */
export function targetPosition(category: CategoryId, hemisphere: number): Vec3 {
  const lobe = getLobe(category);
  // 이미 좌/우로 치우친 측두엽은 추가 오프셋을 주면 뇌 밖으로 밀려나므로 줄인다.
  const spread = Math.abs(lobe.centroid.x) > 60 ? 14 : 46;
  return {
    x: lobe.centroid.x + hemisphere * spread,
    y: lobe.centroid.y,
    z: lobe.centroid.z,
  };
}

/**
 * 모바일 2D 폴백용 평면 좌표.
 *
 * 뇌를 옆에서 본 시상면(sagittal) 투영이다. 앞뒤(z)를 화면의 좌우로, 위아래(y)를
 * 그대로 세로로 매핑해 3D 에서 보던 전두엽-후두엽 배치가 평면에서도 유지되게 한다.
 * 캔버스 좌표는 아래가 +y 이므로 y 를 뒤집는다.
 */
export function targetPosition2D(
  category: CategoryId,
  hemisphere: number,
): { x: number; y: number } {
  const lobe = getLobe(category);
  return {
    x: lobe.centroid.z * 0.8 + lobe.centroid.x * 0.3 + hemisphere * 10,
    y: -lobe.centroid.y,
  };
}

/** 2D 투영에서의 뇌 윤곽 타원 반축. */
export const BRAIN_RADII_2D = { x: 175, y: 120 };
