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
import { getCategoryColor } from '@/lib/brainLobeMap';
import { endpointId } from '@/lib/graphUtils';
import { useElementSize } from '@/hooks/useMediaQuery';
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
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
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
  onSelect: (id: string | null) => void;
}

export default function BrainGraph2DCanvas({
  graph,
  selectedId,
  matchedIds,
  adjacency,
  focusToken,
  onSelect,
}: BrainGraph2DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<FGMethods | undefined>(undefined);
  const initializedRef = useRef(false);
  const { width, height } = useElementSize(containerRef);

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
      const color = getCategoryColor(node.category);
      const radius = 1.2 + Math.sqrt(node.val) * 0.7;

      ctx.save();
      ctx.globalAlpha = dimmed ? 0.18 : 1;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      if (node.isGhost) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.fill();
      }

      // 작은 화면에서 글자가 엉키지 않도록, 확대했거나 선택했거나
      // 연결이 많아 지도의 이정표 역할을 하는 노드에만 라벨을 붙인다.
      if (!dimmed && (globalScale > 1.2 || node.id === selectedId || node.val >= 6)) {
        ctx.fillStyle = node.id === selectedId ? '#f8fafc' : color;
        ctx.font = `${node.id === selectedId ? 700 : 500} ${11 / globalScale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(node.title, node.x, node.y - radius - 3 / globalScale);
      }
      ctx.restore();
    },
    [matchedIds, neighborIds, selectedId],
  );

  const linkColor = useCallback(
    (link: FGLink) => {
      const a = endpointId(link.source as string | GraphNode);
      const b = endpointId(link.target as string | GraphNode);
      if (neighborIds) {
        return neighborIds.has(a) && neighborIds.has(b)
          ? 'rgba(125, 211, 252, 0.85)'
          : 'rgba(100, 116, 139, 0.07)';
      }
      if (matchedIds && !(matchedIds.has(a) && matchedIds.has(b))) {
        return 'rgba(100, 116, 139, 0.05)';
      }
      return 'rgba(130, 160, 200, 0.22)';
    },
    [matchedIds, neighborIds],
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
