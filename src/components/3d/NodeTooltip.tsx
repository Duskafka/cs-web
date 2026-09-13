'use client';

import { getLobe } from '@/lib/brainLobeMap';
import type { GraphNode, Note } from '@/types/graph';

export interface NodeTooltipProps {
  node: GraphNode | null;
  note: Note | undefined;
  /** 이 노드를 가리키는 노트 수. */
  backlinkCount: number;
}

/**
 * 호버한 노드의 요약 카드.
 *
 * 캔버스 위에 절대 위치로 고정해 띄운다. 마우스를 따라다니게 하면 3D 회전 중에
 * 커서를 계속 쫓느라 시선이 흔들리므로, 위치는 왼쪽 아래로 고정했다.
 */
export default function NodeTooltip({ node, note, backlinkCount }: NodeTooltipProps) {
  if (!node) return null;

  const lobe = getLobe(node.category);

  return (
    <div
      className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-xs rounded-xl border border-white/10 bg-slate-950/85 p-3 shadow-2xl backdrop-blur-md"
      style={{ borderColor: `${lobe.color}44` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: lobe.color, boxShadow: `0 0 10px ${lobe.color}` }}
        />
        <span className="text-sm font-semibold text-slate-100">{node.title}</span>
      </div>

      <div className="mt-1 text-[11px] tracking-wide text-slate-400">
        {lobe.label}
      </div>

      {node.isGhost ? (
        <p className="mt-2 text-xs leading-relaxed text-amber-300/90">
          아직 작성되지 않은 노트입니다. {backlinkCount}개의 노트가 이 주제를 언급하고 있습니다.
        </p>
      ) : (
        <>
          {note?.summary && (
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-300">
              {note.summary}
            </p>
          )}
          <div className="mt-2 flex gap-3 text-[11px] text-slate-500">
            <span>연결 {node.val}</span>
            <span>역링크 {backlinkCount}</span>
          </div>
        </>
      )}
    </div>
  );
}
