'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import type {
  ForceGraphMethods,
  ForceGraphProps,
  LinkObject,
  NodeObject,
} from 'react-force-graph-3d';

import { attachSceneLights } from '@/components/3d/sceneLights';
import {
  ellipsoidConstraintForce,
  lobeAttractionForce,
  midlineGapForce,
} from '@/components/3d/forces';
import { getCategoryColor, targetPosition } from '@/lib/brainLobeMap';
import { endpointId } from '@/lib/graphUtils';
import { useElementSize } from '@/hooks/useMediaQuery';
import type { GraphData, GraphLink, GraphNode } from '@/types/graph';

/**
 * 라이브러리가 노드/링크에 x, vx 같은 시뮬레이션 필드를 덧붙이므로,
 * 우리 타입을 그대로 쓰지 않고 라이브러리 래퍼 타입을 통해 다룬다.
 */
type FGNode = NodeObject<GraphNode>;
type FGLink = LinkObject<GraphNode, GraphLink>;
type FGMethods = ForceGraphMethods<FGNode, FGLink>;
type FGProps = ForceGraphProps<FGNode, FGLink> & {
  ref?: React.RefObject<FGMethods | undefined>;
};

// WebGL 캔버스는 window 에 의존하므로 SSR 을 끄지 않으면 하이드레이션이 깨진다.
// next/dynamic 은 제네릭 시그니처를 지우므로 우리 노드/링크 타입으로 다시 좁혀준다.
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => <CanvasFallback />,
}) as unknown as (props: FGProps) => React.ReactElement | null;

function CanvasFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
      3D 뇌 지도를 불러오는 중...
    </div>
  );
}

/** 이 개수를 넘으면 라벨과 파티클 같은 무거운 효과를 끈다. */
const LOD_NODE_THRESHOLD = 100;
/** 마지막 상호작용 이후 이 시간이 지나면 렌더 루프를 멈춘다. */
const IDLE_PAUSE_MS = 3000;
/** 이 거리(px) 안에서 누르고 뗐으면 카메라 회전이 아니라 탭으로 본다. */
const TAP_SLOP_PX = 5;

export interface BrainGraphCanvasProps {
  graph: GraphData;
  selectedId: string | null;
  hoveredId: string | null;
  /** null 이면 필터 없음(전부 표시). */
  matchedIds: Set<string> | null;
  adjacency: Map<string, Set<string>>;
  focusToken: number;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

export default function BrainGraphCanvas({
  graph,
  selectedId,
  hoveredId,
  matchedIds,
  adjacency,
  focusToken,
  onSelect,
  onHover,
}: BrainGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<FGMethods | undefined>(undefined);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const { width, height } = useElementSize(containerRef);

  const lightMode = graph.nodes.length > LOD_NODE_THRESHOLD;

  /**
   * force-graph 는 전달받은 노드 객체를 직접 변형하므로(x/y/z/vx 주입)
   * 렌더마다 새 배열을 만들면 시뮬레이션이 처음부터 다시 돈다.
   * 데이터는 빌드 타임 고정값이라 참조를 한 번만 만든다.
   */
  const data = useMemo(() => ({ nodes: graph.nodes, links: graph.links }), [graph]);

  /** 선택 또는 호버된 노드와 그 이웃. 하이라이트 대상이다. */
  const activeId = hoveredId ?? selectedId;
  const neighborIds = useMemo(() => {
    if (!activeId) return null;
    const set = new Set(adjacency.get(activeId) ?? []);
    set.add(activeId);
    return set;
  }, [activeId, adjacency]);

  /** 노드가 검색/카테고리 필터를 통과했는지. */
  const isMatched = useCallback(
    (node: GraphNode) => matchedIds === null || matchedIds.has(node.id),
    [matchedIds],
  );

  // ---- 렌더 루프 제어 ----
  // 상호작용이 멈추면 WebGL 프레임 생성을 멈춰 유휴 상태의 GPU 사용을 줄인다.
  const wake = useCallback(() => {
    const fg = graphRef.current;
    if (!fg) return;
    if (pausedRef.current) {
      fg.resumeAnimation();
      pausedRef.current = false;
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      graphRef.current?.pauseAnimation();
      pausedRef.current = true;
    }, IDLE_PAUSE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // 하이라이트나 필터가 바뀌면 화면을 다시 그려야 하므로 깨운다.
  useEffect(() => {
    wake();
  }, [activeId, matchedIds, wake]);

  // ---- 클릭(탭) 판정 ----
  /**
   * 3d-force-graph 는 pointerdown 과 pointerup 사이에 pointermove 가 한 번이라도
   * 끼면, 실제 이동 거리가 0 이어도 드래그로 보고 클릭을 버린다(clickAfterDrag=false).
   * 마우스는 이동량 임계값 검사조차 건너뛰기 때문에, 손이 미세하게 떨리거나 장치가
   * 여분의 이벤트를 흘리면 노드를 눌러도 아무 일이 일어나지 않는다.
   *
   * 그래서 실제 변위를 재서 임계값 안이면 탭으로 처리하는 경로를 따로 둔다.
   * 카메라를 회전시킨 뒤 손을 뗐을 때 노드가 열리는 일은 임계값이 막아준다.
   */
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  /** 라이브러리 onNodeClick 과 중복 선택되지 않도록 직전 처리 내역을 기억한다. */
  const lastTapRef = useRef<{ id: string | null; at: number }>({ id: null, at: 0 });

  const commitSelection = useCallback(
    (id: string | null) => {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last.id === id && now - last.at < 400) return; // 같은 클릭이 두 경로로 들어온 경우
      lastTapRef.current = { id, at: now };
      onSelect(id);
    },
    [onSelect],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      pointerDownRef.current = { x: event.clientX, y: event.clientY };
      wake();
    },
    [wake],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = pointerDownRef.current;
      pointerDownRef.current = null;
      if (!start || event.button !== 0) return;

      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved > TAP_SLOP_PX) return; // 카메라를 돌린 것이므로 선택하지 않는다

      // 커서 아래 노드는 force-graph 의 호버 판정 결과를 그대로 쓴다.
      commitSelection(hoveredId);
    },
    [commitSelection, hoveredId],
  );

  // ---- 초기화: 커스텀 힘과 뇌 껍질 ----
  const handleReady = useCallback(() => {
    const fg = graphRef.current;
    if (!fg) return;

    // 기본 중심 수렴 힘을 없애야 뇌엽 힘이 배치를 지배한다.
    fg.d3Force('center', null);
    fg.d3Force('charge')?.strength(-90).distanceMax(420);
    fg.d3Force('link')?.distance(38).strength(0.18);
    fg.d3Force('lobe', lobeAttractionForce(0.09));
    fg.d3Force('shell', ellipsoidConstraintForce(0.35));
    fg.d3Force('midline', midlineGapForce(18, 0.12));

    attachSceneLights(fg.scene());
    // 노드를 작게 그리므로 초기 카메라를 조금 당겨 제목이 읽히는 거리에서 시작한다.
    fg.cameraPosition({ x: 0, y: 80, z: 470 });
    fg.d3ReheatSimulation();
  }, []);

  // ---- 카메라 포커스 ----
  useEffect(() => {
    if (!selectedId || focusToken === 0) return;
    const fg = graphRef.current;
    if (!fg) return;

    const node = graph.nodes.find((item) => item.id === selectedId);
    if (!node) return;

    wake();
    // 시뮬레이션 초기에는 좌표가 아직 없을 수 있어 목표 뇌엽 좌표로 대체한다.
    const fallback = targetPosition(node.category, node.hemisphere);
    const x = node.x ?? fallback.x;
    const y = node.y ?? fallback.y;
    const z = node.z ?? fallback.z;

    // 카메라를 노드 방향 바깥쪽으로 물려 대상과 정확히 이 거리만큼 떨어뜨린다.
    // 뇌 전체 반경이 약 190 이므로, 주변 클러스터까지 함께 보이는 거리를 고른다.
    const distance = 330;
    const ratio = 1 + distance / Math.max(1, Math.hypot(x, y, z));
    fg.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio }, { x, y, z }, 900);
  }, [selectedId, focusToken, graph.nodes, wake]);

  // ---- 노드 렌더링 ----
  const nodeThreeObject = useCallback(
    (node: GraphNode) => {
      const color = getCategoryColor(node.category);
      const matched = isMatched(node);
      const highlighted = neighborIds ? neighborIds.has(node.id) : true;
      const dimmed = !matched || !highlighted;

      // 연결 수에 따라 커지되, 점이 서로 겹쳐 덩어리로 보이지 않을 만큼만 키운다.
      const radius = 1.8 + Math.sqrt(node.val) * 0.95;
      const group = new THREE.Group();

      const material = node.isGhost
        ? new THREE.MeshBasicMaterial({
            // 고스트(스텁) 노드: 아직 파일이 없는 주제. 와이어프레임으로 구분한다.
            color,
            wireframe: true,
            transparent: true,
            opacity: dimmed ? 0.12 : 0.5,
          })
        : new THREE.MeshLambertMaterial({
            color,
            emissive: new THREE.Color(color),
            emissiveIntensity: node.id === activeId ? 0.9 : 0.35,
            transparent: true,
            opacity: dimmed ? 0.15 : 1,
          });

      group.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material));

      // 라벨은 비싸다. 노드가 많으면 강조된 것에만, 적으면 매칭된 것 전부에 붙인다.
      const showLabel = lightMode
        ? node.id === activeId || (neighborIds?.has(node.id) ?? false)
        : matched && !dimmed;

      if (showLabel) {
        const label = new SpriteText(node.title);
        label.color = node.id === activeId ? '#ffffff' : color;
        label.textHeight = node.id === activeId ? 7 : 5;
        label.fontWeight = node.id === activeId ? '700' : '500';
        label.position.set(0, radius + 4.5, 0);
        label.material.depthWrite = false;
        group.add(label);
      }

      return group;
    },
    [activeId, isMatched, lightMode, neighborIds],
  );

  const linkColor = useCallback(
    (link: GraphLink) => {
      const a = endpointId(link.source);
      const b = endpointId(link.target);
      if (neighborIds) {
        return neighborIds.has(a) && neighborIds.has(b)
          ? 'rgba(125, 211, 252, 0.9)'
          : 'rgba(100, 116, 139, 0.07)';
      }
      if (matchedIds && !(matchedIds.has(a) && matchedIds.has(b))) {
        return 'rgba(100, 116, 139, 0.05)';
      }
      return link.bidirectional ? 'rgba(148, 197, 255, 0.34)' : 'rgba(120, 140, 170, 0.2)';
    },
    [matchedIds, neighborIds],
  );

  const linkWidth = useCallback(
    (link: GraphLink) => {
      const a = endpointId(link.source);
      const b = endpointId(link.target);
      if (neighborIds?.has(a) && neighborIds?.has(b)) return 1.4;
      return link.bidirectional ? 0.6 : 0.35;
    },
    [neighborIds],
  );

  /** 강조된 간선에만 흐르는 입자를 붙인다. LOD 모드에서는 전부 끈다. */
  const linkParticles = useCallback(
    (link: GraphLink) => {
      if (lightMode || !neighborIds) return 0;
      const a = endpointId(link.source);
      const b = endpointId(link.target);
      return neighborIds.has(a) && neighborIds.has(b) ? 2 : 0;
    },
    [lightMode, neighborIds],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onPointerMove={wake}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onWheel={wake}
    >
      {width > 0 && height > 0 && (
        <ForceGraph3D
          ref={graphRef}
          width={width}
          height={height}
          graphData={data}
          backgroundColor="rgba(0,0,0,0)"
          showNavInfo={false}
          nodeRelSize={4}
          nodeThreeObject={nodeThreeObject}
          nodeLabel={() => ''}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkOpacity={0.9}
          linkDirectionalParticles={linkParticles}
          linkDirectionalParticleWidth={1.6}
          linkDirectionalParticleSpeed={0.006}
          warmupTicks={60}
          cooldownTicks={220}
          onEngineTick={undefined}
          onEngineStop={wake}
          onNodeClick={(node) => commitSelection((node as GraphNode).id)}
          onNodeHover={(node) => onHover(node ? (node as GraphNode).id : null)}
          onBackgroundClick={() => commitSelection(null)}
        />
      )}
      <ReadyProbe graphRef={graphRef} ready={width > 0 && height > 0} onReady={handleReady} />
    </div>
  );
}

/**
 * ForceGraph3D 의 ref 가 채워지는 시점을 잡아 한 번만 초기화한다.
 *
 * 동적 import 로 로드되므로 부모의 첫 effect 시점에는 ref 가 아직 비어 있다.
 * ref 자체는 변경되어도 리렌더를 일으키지 않아 effect 로 감지할 수 없으므로,
 * 짧은 폴링으로 준비되는 순간을 포착한다.
 */
function ReadyProbe({
  graphRef,
  ready,
  onReady,
}: {
  graphRef: React.RefObject<FGMethods | undefined>;
  ready: boolean;
  onReady: () => void;
}) {
  const doneRef = useRef(false);

  useEffect(() => {
    if (!ready || doneRef.current) return;
    const timer = setInterval(() => {
      const fg = graphRef.current;
      if (!fg) return;

      // ref 가 채워졌다고 해서 힘 시뮬레이션까지 만들어진 것은 아니다.
      // 레이아웃이 생기기 전에 힘을 등록하거나 reheat 하면 첫 애니메이션 프레임이
      // 아직 없는 시뮬레이션을 tick 하려다 터진다. 기본 힘 조회로 준비 여부를 본다.
      let layoutReady = false;
      try {
        layoutReady = Boolean(fg.d3Force('charge'));
      } catch {
        layoutReady = false;
      }
      if (!layoutReady) return;

      doneRef.current = true;
      clearInterval(timer);
      onReady();
    }, 50);
    return () => clearInterval(timer);
  }, [ready, graphRef, onReady]);

  return null;
}
