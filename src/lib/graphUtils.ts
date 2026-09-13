import { ghostId, normalizeKey } from '@/lib/wikilink';
import { CATEGORY_ORDER, FALLBACK_CATEGORY, hemisphereOf } from '@/lib/brainLobeMap';
import type {
  CategoryId,
  GraphData,
  GraphLink,
  GraphNode,
  GraphStats,
  KnowledgePayload,
  Note,
} from '@/types/graph';

/** 간선의 양 끝을 순서 무관하게 식별하는 키. A→B 와 B→A 를 같은 간선으로 본다. */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

/** 링크 끝점이 문자열 ID 인지 노드 객체인지에 관계없이 ID 를 얻는다. */
export function endpointId(end: string | GraphNode): string {
  return typeof end === 'string' ? end : end.id;
}

/**
 * 노트 목록에서 그래프와 백링크, 통계를 한 번에 만들어낸다.
 *
 * 위키링크가 실제 노트를 가리키지 않으면 고스트(스텁) 노드를 만든다.
 * 고스트 노드는 "아직 쓰지 않았지만 이미 언급된 주제"를 드러내는 장치라
 * 그래프에서 지우지 않고 낮은 불투명도로 남겨둔다.
 */
export function buildKnowledgePayload(notes: Note[]): KnowledgePayload {
  const slugToNote = new Map(notes.map((note) => [note.slug, note]));

  // 위키링크 대상 해석 인덱스. markdown.ts 와 같은 규칙을 쓴다.
  const resolveIndex = new Map<string, string>();
  for (const note of notes) {
    resolveIndex.set(normalizeKey(note.slug), note.slug);
    const base = note.slug.split('/').pop();
    if (base && !resolveIndex.has(normalizeKey(base))) {
      resolveIndex.set(normalizeKey(base), note.slug);
    }
  }
  for (const note of notes) resolveIndex.set(normalizeKey(note.title), note.slug);

  const nodes = new Map<string, GraphNode>();
  const addNode = (
    id: string,
    title: string,
    category: CategoryId,
    slug: string | null,
    isGhost: boolean,
  ) => {
    if (nodes.has(id)) return;
    nodes.set(id, {
      id,
      title,
      category,
      slug,
      val: 0,
      isGhost,
      hemisphere: hemisphereOf(id),
    });
  };

  for (const note of notes) {
    addNode(note.slug, note.title, note.category, note.slug, false);
  }

  // 간선 수집. 같은 노드 쌍은 한 번만 기록하고, 양쪽이 서로를 참조하면 표시해둔다.
  const linkByPair = new Map<string, GraphLink>();
  const backlinks = new Map<string, Set<string>>();
  const directed = new Set<string>();

  for (const note of notes) {
    for (const ref of note.outgoing) {
      const resolved = resolveIndex.get(ref.key) ?? null;
      const targetId = resolved ?? ghostId(ref.key);

      if (!resolved) {
        // 고스트 노드는 자신을 가리킨 노트의 카테고리를 물려받아
        // 해당 뇌엽 근처에 떠 있도록 한다.
        addNode(targetId, ref.target, note.category, null, true);
      }
      if (targetId === note.slug) continue; // 자기 참조는 간선으로 만들지 않는다

      directed.add(`${note.slug}\u0000${targetId}`);

      const key = pairKey(note.slug, targetId);
      if (!linkByPair.has(key)) {
        linkByPair.set(key, {
          source: note.slug,
          target: targetId,
          relationship: 'wikilink',
          bidirectional: false,
        });
      }

      if (!backlinks.has(targetId)) backlinks.set(targetId, new Set());
      backlinks.get(targetId)!.add(note.slug);
    }
  }

  const links = [...linkByPair.values()];
  for (const link of links) {
    const a = endpointId(link.source);
    const b = endpointId(link.target);
    link.bidirectional =
      directed.has(`${a}\u0000${b}`) && directed.has(`${b}\u0000${a}`);
  }

  // degree 를 노드 크기로 쓴다. 최소 1 을 보장해 고립 노드도 보이게 한다.
  for (const link of links) {
    const source = nodes.get(endpointId(link.source));
    const target = nodes.get(endpointId(link.target));
    if (source) source.val += 1;
    if (target) target.val += 1;
  }
  const degrees = new Map<string, number>();
  for (const node of nodes.values()) {
    degrees.set(node.id, node.val);
    node.val = Math.max(1, node.val);
  }

  const countByCategory = Object.fromEntries(
    CATEGORY_ORDER.map((id) => [id, 0]),
  ) as Record<CategoryId, number>;
  countByCategory[FALLBACK_CATEGORY] ??= 0;
  for (const note of notes) countByCategory[note.category] += 1;

  const nodeList = [...nodes.values()];
  const stats: GraphStats = {
    noteCount: notes.length,
    linkCount: links.length,
    ghostCount: nodeList.filter((node) => node.isGhost).length,
    orphanCount: nodeList.filter((node) => !node.isGhost && (degrees.get(node.id) ?? 0) === 0)
      .length,
    countByCategory,
  };

  const graph: GraphData = { nodes: nodeList, links };

  return {
    graph,
    notes: [...slugToNote.values()],
    backlinks: Object.fromEntries(
      [...backlinks.entries()].map(([id, sources]) => [id, [...sources].sort()]),
    ),
    stats,
  };
}

/** 노드 ID → 직접 연결된 이웃 노드 ID 집합. 하이라이트 계산에 쓴다. */
export function buildAdjacency(links: GraphLink[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  const connect = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };
  for (const link of links) {
    const a = endpointId(link.source);
    const b = endpointId(link.target);
    connect(a, b);
    connect(b, a);
  }
  return adjacency;
}
