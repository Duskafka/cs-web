'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type {
  ForceGraphMethods,
  ForceGraphProps,
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';

import { ellipseConstraintForce2D, lobeAttractionForce2D } from '@/components/3d/forces';
import { GRAPH_PALETTE, getCategoryColor } from '@/lib/brainLobeMap';
import { endpointId } from '@/lib/graphUtils';
import { useElementSize } from '@/hooks/useMediaQuery';
import type { Theme } from '@/store/settingsStore';
import type { GraphData, GraphLink, GraphNode } from '@/types/graph';

type FGNode = NodeObject<GraphNode>;
type FGLink = LinkObject<GraphNode, GraphLink>;
type FGMethods = ForceGraphMethods<FGNode, FGLink>;
type FGProps = ForceGraphProps<FGNode, FGLink> & {
  ref?: React.RefObject<FGMethods | undefined>;
};

/**
 * 모바일 폴백.
 *
 * WebGL 컨텍스트와 three.js 씬은 모바일 GPU 와 배터리에 부담이 크므로, 좁은
 * 화면에서는 2D 캔버스로 같은 그래프를 그린다. 뇌엽 배치는 시상면 투영으로
 * 유지해서 3D 에서 익힌 공간 감각이 그대로 통하게 한다.
 */
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-faint">
      지식 지도를 불러오는 중...
    </div>
  ),
}) as unknown as (props: FGProps) => React.ReactElement | null;

export interface BrainGraph2DCanvasProps {
  graph: GraphData;
  selectedId: string | null;
  matchedIds: Set<string> | null;
  adjacency: Map<string, Set<string>>;
  focusToken: number;
  /** 노드·연결선 색을 고르는 화면 테마. */
  theme: Theme;
  onSelect: (id: string | null) => void;
}

export default function BrainGraph2DCanvas({
  graph,
  selectedId,
  matchedIds,
  adjacency,
  focusToken,
  theme,
  onSelect,
}: BrainGraph2DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<FGMethods | undefined>(undefined);
  const initializedRef = useRef(false);
  const { width, height } = useElementSize(containerRef);
  const palette = GRAPH_PALETTE[theme];

  const data = useMemo(() => ({ nodes: graph.nodes, links: graph.links }), [graph]);

  const neighborIds = useMemo(() => {
    if (!selectedId) return null;
    const set = new Set(adjacency.get(selectedId) ?? []);
    set.add(selectedId);
    return set;
  }, [selectedId, adjacency]);

  // ref 가 채워지는 시점을 폴링으로 잡아 커스텀 힘을 한 번만 설치한다.
  useEffect(() => {
    if (width === 0 || height === 0 || initializedRef.current) return;
    const timer = setInterval(() => {
      const fg = graphRef.current;
      if (!fg) return;
      initializedRef.current = true;
      clearInterval(timer);

      fg.d3Force('center', null);
      fg.d3Force('charge')?.strength(-70).distanceMax(320);
      fg.d3Force('link')?.distance(30).strength(0.2);
      fg.d3Force('lobe', lobeAttractionForce2D(0.1));
      fg.d3Force('shell', ellipseConstraintForce2D(0.35));
      fg.d3ReheatSimulation();
    }, 50);
    return () => clearInterval(timer);
  }, [width, height]);

  useEffect(() => {
    if (!selectedId || focusToken === 0) return;
    const fg = graphRef.current;
    const node = graph.nodes.find((item) => item.id === selectedId);
    if (!fg || !node || node.x === undefined || node.y === undefined) return;
    fg.centerAt(node.x, node.y, 600);
    fg.zoom(2.2, 600);
  }, [selectedId, focusToken, graph.nodes]);

  const nodeCanvasObject = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x === undefined || node.y === undefined) return;

      const matched = matchedIds === null || matchedIds.has(node.id);
      const highlighted = neighborIds ? neighborIds.has(node.id) : true;
      const dimmed = !matched || !highlighted;
      const color = getCategoryColor(node.category, theme);
      const radius = 1.2 + Math.sqrt(node.val) * 0.7;

      ctx.save();
      ctx.globalAlpha = dimmed ? 0.18 : 1;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // 작은 화면에서 글자가 엉키지 않도록, 확대했거나 선택했거나
      // 연결이 많아 지도의 이정표 역할을 하는 노드에만 라벨을 붙인다.
      if (!dimmed && (globalScale > 1.2 || node.id === selectedId || node.val >= 6)) {
        ctx.fillStyle = node.id === selectedId ? palette.labelActive : color;
        ctx.font = `${node.id === selectedId ? 700 : 500} ${11 / globalScale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(node.title, node.x, node.y - radius - 3 / globalScale);
      }
      ctx.restore();
    },
    [matchedIds, neighborIds, selectedId, palette, theme],
  );

  /**
   * 클릭·호버 판정에 쓰이는 영역.
   *
   * 점을 작게 그리므로 그린 모양 그대로를 판정에 쓰면 맞히기 어렵다.
   * 보이지 않는 넉넉한 원을 따로 깔아, 손이 조금 빗나가도 집히게 한다.
   * 확대율로 나눠 화면상 크기가 배율과 무관하게 일정하도록 맞춘다.
   */
  const nodePointerAreaPaint = useCallback(
    (node: FGNode, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x === undefined || node.y === undefined) return;
      const drawn = 1.2 + Math.sqrt(node.val) * 0.7;
      const radius = Math.max(drawn, 9 / globalScale);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
    },
    [],
  );

  const linkColor = useCallback(
    (link: FGLink) => {
      const a = endpointId(link.source as string | GraphNode);
      const b = endpointId(link.target as string | GraphNode);
      if (neighborIds) {
        return neighborIds.has(a) && neighborIds.has(b)
          ? palette.linkHighlight
          : palette.linkDim;
      }
      if (matchedIds && !(matchedIds.has(a) && matchedIds.has(b))) {
        return palette.linkDim;
      }
      return palette.linkIdle;
    },
    [matchedIds, neighborIds, palette],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {width > 0 && height > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={width}
          height={height}
          graphData={data}
          backgroundColor="rgba(0,0,0,0)"
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={nodePointerAreaPaint}
          nodeLabel={() => ''}
          linkColor={linkColor}
          linkWidth={0.6}
          warmupTicks={40}
          cooldownTicks={140}
          onNodeClick={(node) => onSelect((node as FGNode).id)}
          onBackgroundClick={() => onSelect(null)}
        />
      )}
    </div>
  );
}
