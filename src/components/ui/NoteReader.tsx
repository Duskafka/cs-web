'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft, CornerDownRight, FileQuestion, MousePointerClick } from 'lucide-react';

import NoteContent from '@/components/markdown/NoteContent';
import { getLobe } from '@/lib/brainLobeMap';
import type { GraphNode, Note } from '@/types/graph';

export interface NoteReaderProps {
  node: GraphNode | null;
  note: Note | undefined;
  /** 이 노드를 가리키는 노트들. */
  backlinks: { id: string; title: string; category: GraphNode['category'] }[];
  canGoBack: boolean;
  onGoBack: () => void;
  onSelect: (id: string) => void;
  /** 위키링크 클릭 시. slug 가 비어 있으면 고스트 링크다. */
  onNavigate: (slug: string, ghostKey: string) => void;
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <MousePointerClick className="h-8 w-8 text-slate-700" aria-hidden />
      <p className="text-sm text-slate-400">노드를 클릭하면 노트가 열립니다</p>
      <p className="max-w-[15rem] text-xs leading-relaxed text-slate-600">
        각 노드는 마크다운 노트 하나이고, 연결선은 본문에 쓰인 위키링크입니다.
      </p>
    </div>
  );
}

export default function NoteReader({
  node,
  note,
  backlinks,
  canGoBack,
  onGoBack,
  onSelect,
  onNavigate,
}: NoteReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 다른 노트로 옮겨가면 본문을 맨 위부터 보여준다.
  // 스크롤 위치를 그대로 두면 새 노트의 중간이 열려 맥락을 잃는다.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [node?.id]);

  if (!node) return <EmptyState />;

  const lobe = getLobe(node.category);

  return (
    <article className="flex h-full flex-col">
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        {canGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="mb-2 flex items-center gap-1 text-[11px] text-slate-500 transition hover:text-slate-300"
          >
            <ArrowLeft className="h-3 w-3" /> 이전 노트
          </button>
        )}

        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: lobe.color, boxShadow: `0 0 10px ${lobe.color}` }}
          />
          <span className="text-[11px] tracking-wide text-slate-400">
            {lobe.label}
          </span>
        </div>

        <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-50">{node.title}</h2>

        {note && (
          <>
            {note.summary && (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{note.summary}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400"
                >
                  #{tag}
                </span>
              ))}
              {note.createdAt && (
                <span className="ml-auto text-[10px] tabular-nums text-slate-600">
                  {note.createdAt}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {note ? (
          <NoteContent html={note.html} onNavigate={onNavigate} />
        ) : (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
            <div className="flex items-center gap-2 text-amber-300">
              <FileQuestion className="h-4 w-4" aria-hidden />
              <span className="text-sm font-medium">아직 작성되지 않은 노트</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              다른 노트가 이 주제를 위키링크로 언급했지만 대응하는 마크다운 파일이 없습니다.
              <code className="mx-1 rounded bg-white/10 px-1 py-0.5 text-[11px] text-slate-300">
                content/
              </code>
              아래에 <strong className="text-slate-200">{node.title}</strong> 노트를 추가하면 이
              자리가 채워집니다.
            </p>
          </div>
        )}

        {backlinks.length > 0 && (
          <section className="mt-8 border-t border-white/10 pt-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              이 노트를 언급한 노트 ({backlinks.length})
            </h3>
            <ul className="space-y-1">
              {backlinks.map((item) => {
                const itemLobe = getLobe(item.category);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
                    >
                      <CornerDownRight className="h-3 w-3 shrink-0 text-slate-600" aria-hidden />
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: itemLobe.color }}
                      />
                      <span className="truncate text-[13px] text-slate-300">{item.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
