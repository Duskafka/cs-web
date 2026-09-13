import { create } from 'zustand';
import { buildAdjacency } from '@/lib/graphUtils';
import { CATEGORY_ORDER } from '@/lib/brainLobeMap';
import type { CategoryId, KnowledgePayload, Note } from '@/types/graph';

interface GraphState {
  payload: KnowledgePayload | null;
  /** slug → Note. 리더가 매번 배열을 훑지 않도록 미리 만들어둔다. */
  noteBySlug: Map<string, Note>;
  /** 노드 ID → 이웃 ID 집합. 하이라이트 계산용. */
  adjacency: Map<string, Set<string>>;

  selectedId: string | null;
  hoveredId: string | null;
  searchQuery: string;
  activeCategories: Set<CategoryId>;
  /** 선택 이력. 가장 최근이 뒤쪽이다. */
  history: string[];
  sidebarOpen: boolean;
  /**
   * 카메라 이동 요청 신호.
   * 같은 노드를 다시 선택해도 카메라가 움직이도록 값이 계속 증가하는 토큰을 쓴다.
   */
  focusToken: number;

  init: (payload: KnowledgePayload) => void;
  selectNode: (id: string | null, options?: { focus?: boolean }) => void;
  setHovered: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleCategory: (category: CategoryId) => void;
  resetCategories: () => void;
  goBack: () => void;
  setSidebarOpen: (open: boolean) => void;
  requestFocus: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  payload: null,
  noteBySlug: new Map(),
  adjacency: new Map(),

  selectedId: null,
  hoveredId: null,
  searchQuery: '',
  activeCategories: new Set(CATEGORY_ORDER),
  history: [],
  sidebarOpen: true,
  focusToken: 0,

  init: (payload) => {
    // 서버 페이로드는 빌드 타임에 고정되므로 한 번만 반영한다.
    if (get().payload) return;
    set({
      payload,
      noteBySlug: new Map(payload.notes.map((note) => [note.slug, note])),
      adjacency: buildAdjacency(payload.graph.links),
    });
  },

  selectNode: (id, options) => {
    const { selectedId, history, focusToken } = get();
    set({
      selectedId: id,
      focusToken: options?.focus === false ? focusToken : focusToken + 1,
      history:
        id && id !== selectedId ? [...history.filter((item) => item !== id), id].slice(-30) : history,
    });
  },

  setHovered: (id) => set({ hoveredId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleCategory: (category) =>
    set((state) => {
      const next = new Set(state.activeCategories);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return { activeCategories: next };
    }),

  resetCategories: () => set({ activeCategories: new Set(CATEGORY_ORDER) }),

  goBack: () =>
    set((state) => {
      // 마지막 항목은 현재 선택이므로 하나 버리고 그 앞을 연다.
      if (state.history.length < 2) return state;
      const history = state.history.slice(0, -1);
      return {
        history,
        selectedId: history[history.length - 1],
        focusToken: state.focusToken + 1,
      };
    }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  requestFocus: () => set((state) => ({ focusToken: state.focusToken + 1 })),
}));

/**
 * 현재 검색어와 카테고리 필터를 통과하는 노드 ID 집합.
 *
 * 필터에 걸린 노드를 그래프에서 제거하지 않고 디밍만 하는 이유는, 노드를 빼면
 * 힘 시뮬레이션이 다시 흔들려 사용자가 보던 뇌 형태가 무너지기 때문이다.
 */
export function computeMatchedIds(
  payload: KnowledgePayload | null,
  noteBySlug: Map<string, Note>,
  searchQuery: string,
  activeCategories: Set<CategoryId>,
): Set<string> | null {
  if (!payload) return null;

  const query = searchQuery.trim().toLowerCase();
  const allCategoriesOn = activeCategories.size === CATEGORY_ORDER.length;
  if (!query && allCategoriesOn) return null; // null = 필터 없음 (전부 표시)

  const matched = new Set<string>();
  for (const node of payload.graph.nodes) {
    if (!activeCategories.has(node.category)) continue;
    if (!query) {
      matched.add(node.id);
      continue;
    }

    const note = node.slug ? noteBySlug.get(node.slug) : undefined;
    const haystack = [
      node.title,
      note?.summary ?? '',
      note?.tags.join(' ') ?? '',
      note?.plain ?? '',
      node.slug ?? '',
    ]
      .join(' ')
      .toLowerCase();

    if (haystack.includes(query)) matched.add(node.id);
  }
  return matched;
}
