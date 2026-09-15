/**
 * 지식 그래프 전역 타입 정의.
 * CLAUDE.md 규약: 모든 노드/링크/frontmatter 는 이 파일의 인터페이스를 따른다.
 */

/** 마크다운 파일의 frontmatter 원본 형태 (모든 필드는 선택적일 수 있다). */
export interface NoteFrontmatter {
  title?: string;
  category?: string;
  tags?: unknown;
  summary?: string;
  /** YAML 파서가 Date 로 해석할 수 있어 unknown 으로 받는다. */
  created_at?: unknown;
  /** 위키링크가 이 노트를 가리킬 때 인정할 추가 이름들. */
  aliases?: unknown;
}

/** CS 도메인 카테고리 식별자. brainLobeMap 의 키와 1:1 대응된다. */
export type CategoryId =
  | 'ds-algo'
  | 'os'
  | 'network'
  | 'database'
  | 'backend'
  | 'architecture';

/** 3D 공간의 좌표. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 카테고리 → 3D 배치 정의. */
export interface LobeDefinition {
  id: CategoryId;
  /** 사이드바에 표시할 카테고리 한글 이름. */
  label: string;
  /** 노드들이 끌려가는 목표 중심점. */
  centroid: Vec3;
  /** 다크모드용 네온 색상 (hex). */
  color: string;
  /** 데이모드용 색상 (hex). 네온색은 흰 배경에서 떠 보여 따로 둔다. */
  colorLight: string;
}

/** 본문에서 추출한 위키링크 한 건. */
export interface WikiLinkRef {
  /** `[[대상]]` 의 대상 문자열 원본. */
  target: string;
  /** `[[대상|별칭]]` 의 별칭. 없으면 target 과 동일. */
  alias: string;
  /** 매칭 인덱스 조회에 쓰는 정규화 키. */
  key: string;
}

/** 파싱이 끝난 노트 한 건. */
export interface Note {
  /** content 디렉터리 기준 확장자 없는 상대 경로. 예: `os/process`. */
  slug: string;
  title: string;
  category: CategoryId;
  tags: string[];
  summary: string;
  createdAt: string;
  /** 미리 렌더된 본문 HTML (위키링크는 `<a data-slug>` 로 치환됨). */
  html: string;
  /** 검색 인덱싱용 평문 본문. */
  plain: string;
  /** 이 노트가 내보내는 위키링크. */
  outgoing: WikiLinkRef[];
}

/** 그래프 노드. react-force-graph 가 x/y/z/vx/vy/vz 를 런타임에 덧붙인다. */
export interface GraphNode {
  id: string;
  title: string;
  category: CategoryId;
  /** 고스트 노드는 대응하는 파일이 없으므로 slug 가 null 이다. */
  slug: string | null;
  /** 연결 수 (degree). 노드 크기 산출에 쓰인다. */
  val: number;
  /** 매칭되는 마크다운 파일이 없는 스텁 노드 여부. */
  isGhost: boolean;
  /** 힘 계산이 참조하는 좌우 반구 오프셋 (-1 또는 1). */
  hemisphere: number;

  // react-force-graph 가 시뮬레이션 중에 채우는 필드
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

/**
 * 그래프 간선.
 * react-force-graph 는 시뮬레이션 시작 시 source/target 을 노드 객체로 바꿔치기하므로
 * 런타임 읽기에서는 string 과 GraphNode 를 모두 고려해야 한다.
 */
export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relationship: 'wikilink';
  /** 양방향으로 서로를 참조하는 링크인지 여부. */
  bidirectional: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** 헤더에 표시하는 집계값. */
export interface GraphStats {
  noteCount: number;
  linkCount: number;
  ghostCount: number;
  orphanCount: number;
  countByCategory: Record<CategoryId, number>;
}

/** page.tsx 가 빌드 타임에 만들어 클라이언트로 넘기는 전체 페이로드. */
export interface KnowledgePayload {
  graph: GraphData;
  notes: Note[];
  /** slug → 이 노트를 가리키는 노트들의 slug 목록. */
  backlinks: Record<string, string[]>;
  stats: GraphStats;
}
