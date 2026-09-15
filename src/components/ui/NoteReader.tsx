'use client';

import { useLayoutEffect, useRef } from 'react';
import { ArrowLeft, CornerDownRight, CornerLeftUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import NoteContent from '@/components/markdown/NoteContent';
import { getCategoryColor, getLobe } from '@/lib/brainLobeMap';
import { useSettingsStore } from '@/store/settingsStore';
import type { GraphNode, Note } from '@/types/graph';

/** 연결 목록에 표시할 노트 한 건. */
export interface LinkedNote {
  id: string;
  title: string;
  category: GraphNode['category'];
}

export interface NoteReaderProps {
  node: GraphNode | null;
  note: Note | undefined;
  /** 이 노트가 이름을 언급한 노트들. */
  outlinks: LinkedNote[];
  /** 이 노트의 이름을 언급한 노트들. */
  backlinks: LinkedNote[];
  canGoBack: boolean;
  onGoBack: () => void;
  onSelect: (id: string) => void;
}

export default function NoteReader({
  node,
  note,
  outlinks,
  backlinks,
  canGoBack,
  onGoBack,
  onSelect,
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
          {note && <NoteContent html={note.html} />}

          <LinkSection
            label="이 노트가 언급한 노트"
            icon={CornerDownRight}
            items={outlinks}
            theme={theme}
            onSelect={onSelect}
          />
          <LinkSection
            label="이 노트를 언급한 노트"
            icon={CornerLeftUp}
            items={backlinks}
            theme={theme}
            onSelect={onSelect}
          />
        </div>
      </div>
    </article>
  );
}

/**
 * 노트 하단의 연결 목록.
 *
 * 본문 안에는 링크를 만들지 않으므로, 들어오는 연결과 나가는 연결 모두 여기서만
 * 이동할 수 있다. 두 방향이 같은 생김새를 갖도록 한 컴포넌트를 공유한다.
 */
function LinkSection({
  label,
  icon: Icon,
  items,
  theme,
  onSelect,
}: {
  label: string;
  icon: LucideIcon;
  items: LinkedNote[];
  theme: 'light' | 'dark';
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8 border-t border-line pt-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-faint">
        {label} ({items.length})
      </h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-hover"
            >
              <Icon className="h-3 w-3 shrink-0 text-faint" aria-hidden />
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: getCategoryColor(item.category, theme) }}
              />
              <span className="truncate text-[13px] text-fg">{item.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
