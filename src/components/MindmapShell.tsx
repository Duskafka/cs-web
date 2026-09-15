'use client';

import { useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PanelRightOpen } from 'lucide-react';

import NodeTooltip from '@/components/3d/NodeTooltip';
import CategoryFilter from '@/components/ui/CategoryFilter';
import NoteFullView from '@/components/ui/NoteFullView';
import NoteReader from '@/components/ui/NoteReader';
import SearchBar from '@/components/ui/SearchBar';
import SettingsPanel from '@/components/ui/SettingsPanel';
import Sidebar from '@/components/ui/Sidebar';
import StatsHeader from '@/components/ui/StatsHeader';
import { useMediaQuery, useMounted } from '@/hooks/useMediaQuery';
import { ghostId } from '@/lib/wikilink';
import { computeMatchedIds, useGraphStore } from '@/store/graphStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { KnowledgePayload } from '@/types/graph';

// WebGL 캔버스는 브라우저 전용이라 두 캔버스 모두 SSR 을 끈다.
const BrainGraphCanvas = dynamic(() => import('@/components/3d/BrainGraphCanvas'), {
  ssr: false,
});
const BrainGraph2DCanvas = dynamic(() => import('@/components/3d/BrainGraph2DCanvas'), {
  ssr: false,
});

export interface MindmapShellProps {
  payload: KnowledgePayload;
}

export default function MindmapShell({ payload }: MindmapShellProps) {
  const mounted = useMounted();
  // 좁은 화면은 레이아웃만 바꾼다. 2D/3D 선택은 아래 설정이 따로 정한다.
  const isMobile = useMediaQuery('(max-width: 767px)');

  // 저장된 설정을 읽어온다. 첫 방문이면 좁은 화면에서 2D 로 시작한다.
  const settingsHydrated = useSettingsStore((state) => state.hydrated);
  const renderMode = useSettingsStore((state) => state.renderMode);
  const contentWidth = useSettingsStore((state) => state.contentWidth);
  const theme = useSettingsStore((state) => state.theme);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

  const init = useGraphStore((state) => state.init);
  const noteBySlug = useGraphStore((state) => state.noteBySlug);
  const adjacency = useGraphStore((state) => state.adjacency);
  const selectedId = useGraphStore((state) => state.selectedId);
  const hoveredId = useGraphStore((state) => state.hoveredId);
  const searchQuery = useGraphStore((state) => state.searchQuery);
  const activeCategories = useGraphStore((state) => state.activeCategories);
  const history = useGraphStore((state) => state.history);
  const sidebarOpen = useGraphStore((state) => state.sidebarOpen);
  const focusToken = useGraphStore((state) => state.focusToken);

  const selectNode = useGraphStore((state) => state.selectNode);
  const setHovered = useGraphStore((state) => state.setHovered);
  const setSearchQuery = useGraphStore((state) => state.setSearchQuery);
  const toggleCategory = useGraphStore((state) => state.toggleCategory);
  const resetCategories = useGraphStore((state) => state.resetCategories);
  const goBack = useGraphStore((state) => state.goBack);
  const setSidebarOpen = useGraphStore((state) => state.setSidebarOpen);

  // 서버가 넘긴 빌드 타임 페이로드를 스토어에 한 번만 싣는다.
  // 렌더 중 상태를 바꾸지 않도록 effect 에서 수행한다.
  const storePayload = useGraphStore((state) => state.payload);
  useEffect(() => {
    init(payload);
  }, [init, payload]);

  const graph = storePayload?.graph ?? payload.graph;

  // 설정을 읽기 전에 캔버스를 띄우면 3D 컨텍스트를 만들었다가 곧바로 버리게 된다.
  const canRender = mounted && settingsHydrated;

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph],
  );

  const matchedIds = useMemo(
    () => computeMatchedIds(storePayload ?? payload, noteBySlug, searchQuery, activeCategories),
    [storePayload, payload, noteBySlug, searchQuery, activeCategories],
  );

  const selectedNode = selectedId ? nodeById.get(selectedId) ?? null : null;
  const hoveredNode = hoveredId ? nodeById.get(hoveredId) ?? null : null;

  const backlinkIds = useCallback(
    (id: string | null) => (id ? payload.backlinks[id] ?? [] : []),
    [payload.backlinks],
  );

  const selectedBacklinks = useMemo(
    () =>
      backlinkIds(selectedId)
        .map((id) => nodeById.get(id))
        .filter((node) => node !== undefined)
        .map((node) => ({ id: node.id, title: node.title, category: node.category })),
    [backlinkIds, selectedId, nodeById],
  );

  /** 본문 안의 위키링크 클릭. 고스트 링크는 고스트 노드 ID 로 바꿔 선택한다. */
  const handleNavigate = useCallback(
    (slug: string, key: string) => {
      const id = slug || ghostId(key);
      if (nodeById.has(id)) selectNode(id);
    },
    [nodeById, selectNode],
  );

  const controls = (
    <div className="space-y-4">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        matchCount={searchQuery.trim() ? (matchedIds?.size ?? graph.nodes.length) : null}
      />
      <CategoryFilter
        activeCategories={activeCategories}
        countByCategory={payload.stats.countByCategory}
        onToggle={toggleCategory}
        onReset={resetCategories}
      />
      <SettingsPanel />
    </div>
  );

  const reader = (
    <NoteReader
      node={selectedNode}
      note={selectedNode?.slug ? noteBySlug.get(selectedNode.slug) : undefined}
      backlinks={selectedBacklinks}
      canGoBack={history.length > 1}
      onGoBack={goBack}
      onSelect={(id) => selectNode(id)}
      onNavigate={handleNavigate}
    />
  );

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <StatsHeader stats={payload.stats} reducedMode={canRender && renderMode === '2d'} />

      <div className="relative flex min-h-0 flex-1">
        {/* 좌측/중앙: 그래프 캔버스 */}
        <main className="brain-canvas relative min-w-0 flex-1">
          {canRender &&
            (renderMode === '2d' ? (
              <BrainGraph2DCanvas
                graph={graph}
                selectedId={selectedId}
                matchedIds={matchedIds}
                adjacency={adjacency}
                focusToken={focusToken}
                theme={theme}
                onSelect={(id) => selectNode(id)}
              />
            ) : (
              <BrainGraphCanvas
                graph={graph}
                selectedId={selectedId}
                hoveredId={hoveredId}
                matchedIds={matchedIds}
                adjacency={adjacency}
                focusToken={focusToken}
                theme={theme}
                onSelect={(id) => selectNode(id)}
                onHover={setHovered}
              />
            ))}

          {renderMode === '3d' && (
            <NodeTooltip
              node={hoveredNode}
              note={hoveredNode?.slug ? noteBySlug.get(hoveredNode.slug) : undefined}
              backlinkCount={backlinkIds(hoveredNode?.id ?? null).length}
            />
          )}

          {!isMobile && !sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="사이드바 펼치기"
              className="absolute right-4 top-4 z-20 rounded-lg border border-line bg-surface/80 p-2 text-fg backdrop-blur transition hover:bg-hover"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
          )}
        </main>

        {/* 우측: 데스크톱 사이드바 */}
        {!isMobile && (
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} controls={controls} />
        )}
      </div>

      {/* 모바일: 검색과 필터는 하단에 고정한다. */}
      {mounted && isMobile && (
        /* 좁은 화면에서는 필터 목록이 그래프를 밀어내므로 높이를 제한하고 스크롤시킨다. */
        <div className="max-h-[38vh] shrink-0 overflow-y-auto border-t border-line bg-surface/90 px-3 py-2.5 backdrop-blur">
          {controls}
        </div>
      )}

      {/* 노트는 라우트를 늘리지 않고 같은 페이지 위에 전체 화면으로 편다. */}
      <NoteFullView
        open={Boolean(selectedNode)}
        contentWidth={contentWidth}
        onClose={() => selectNode(null)}
      >
        {reader}
      </NoteFullView>
    </div>
  );
}
