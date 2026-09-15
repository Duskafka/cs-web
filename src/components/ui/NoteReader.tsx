'use client';

import { useLayoutEffect, useRef } from 'react';
import { ArrowLeft, CornerDownRight, FileQuestion } from 'lucide-react';

import NoteContent from '@/components/markdown/NoteContent';
import { getCategoryColor, getLobe } from '@/lib/brainLobeMap';
import { useSettingsStore } from '@/store/settingsStore';
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
  const theme = useSettingsStore((state) => state.theme);

  // 다른 노트로 옮겨가면 본문을 맨 위부터 보여준다.
  // 스크롤 위치를 그대로 두면 새 노트의 중간이 열려 맥락을 잃는다.
  // 그려지기 전에 맞춰야 중간부터 보였다가 위로 튀는 것이 보이지 않는다.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [node?.id]);

  if (!node) return null;

  const lobe = getLobe(node.category);
  const color = getCategoryColor(node.category, theme);

  return (
    <article className="flex min-h-0 flex-auto flex-col">
      <div className="shrink-0 border-b border-line">
        <div className="note-column px-4 pb-3">
          {canGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="mb-2 flex items-center gap-1 text-[11px] text-faint transition hover:text-fg"
            >
              <ArrowLeft className="h-3 w-3" /> 이전 노트
            </button>
          )}

          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: theme === 'dark' ? `0 0 10px ${color}` : 'none',
              }}
            />
            <span className="text-[11px] tracking-wide text-muted">{lobe.label}</span>
          </div>

          <h2 className="mt-1 text-lg font-semibold leading-snug text-fg-strong">{node.title}</h2>

          {note && (
            <>
              {note.summary && (
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{note.summary}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-line bg-hover px-1.5 py-0.5 text-[10px] text-muted"
                  >
                    #{tag}
                  </span>
                ))}
                {note.createdAt && (
                  <span className="ml-auto text-[10px] tabular-nums text-faint">
                    {note.createdAt}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 스크롤은 창 전체 폭에서 일어난다. 그래야 스크롤바가 화면 오른쪽 끝에 붙는다. */}
      <div ref={scrollRef} className="min-h-0 flex-auto overflow-y-auto">
        <div className="note-column px-4 py-4 pb-10">
          {note ? (
            <NoteContent html={note.html} onNavigate={onNavigate} />
          ) : (
            <div className="rounded-lg border border-amber-600/25 bg-amber-500/10 dark:border-amber-400/20 dark:bg-amber-400/5 p-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <FileQuestion className="h-4 w-4" aria-hidden />
                <span className="text-sm font-medium">아직 작성되지 않은 노트</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                다른 노트가 이 주제를 위키링크로 언급했지만 대응하는 마크다운 파일이 없습니다.
                <code className="mx-1 rounded bg-selected px-1 py-0.5 text-[11px] text-fg">
                  content/
                </code>
                아래에 <strong className="text-fg">{node.title}</strong> 노트를 추가하면 이
                자리가 채워집니다.
              </p>
            </div>
          )}

          {backlinks.length > 0 && (
            <section className="mt-8 border-t border-line pt-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">
                이 노트를 언급한 노트 ({backlinks.length})
              </h3>
              <ul className="space-y-1">
                {backlinks.map((item) => {
                  const itemColor = getCategoryColor(item.category, theme);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-hover"
                      >
                        <CornerDownRight className="h-3 w-3 shrink-0 text-faint" aria-hidden />
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: itemColor }}
                        />
                        <span className="truncate text-[13px] text-fg">{item.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
