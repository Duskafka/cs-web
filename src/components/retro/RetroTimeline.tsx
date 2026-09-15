'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import NoteFullView from '@/components/ui/NoteFullView';
import { useSettingsStore } from '@/store/settingsStore';
import type { RetroEntry } from '@/lib/retro';

export interface RetroTimelineProps {
  entries: RetroEntry[];
}

/**
 * 회고록 세로 타임라인.
 *
 * 그래프가 아니라 한 줄짜리 선이다. 글이 한 편 늘어나면 선 위에 점이 하나 붙고
 * 그 옆에 제목이 적힌다. 점을 누르면 마인드맵에서 노트를 읽던 것과 같은
 * 전체 화면 뷰(NoteFullView)로 본문이 열린다.
 */
export default function RetroTimeline({ entries }: RetroTimelineProps) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 본문 폭 설정은 마인드맵 노트와 공유한다.
  const contentWidth = useSettingsStore((state) => state.contentWidth);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

  const open = entries.find((entry) => entry.slug === openSlug) ?? null;

  // 다른 글로 옮겨가면 본문을 맨 위부터 보여준다. 그려지기 전에 맞춰야 튀지 않는다.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [openSlug]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="note-column px-4 py-8">
        {entries.length === 0 ? (
          <p className="text-sm text-faint">
            <code className="rounded bg-selected px-1 py-0.5 text-[11px] text-fg">
              retro/
            </code>{' '}
            아래에 마크다운 파일을 추가하면 이 자리에 점이 하나 생깁니다.
          </p>
        ) : (
          <ol className="ml-1 border-l border-line">
            {entries.map((entry) => {
              const active = entry.slug === openSlug;
              return (
                <li key={entry.slug} className="relative">
                  <span
                    aria-hidden
                    className={`absolute left-[-3.5px] top-[13px] h-1.5 w-1.5 rounded-full transition ${
                      active ? 'bg-accent' : 'bg-faint'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setOpenSlug(entry.slug)}
                    className="group block w-full py-2 pl-6 pr-2 text-left"
                  >
                    <span
                      className={`block text-sm leading-snug transition group-hover:text-fg-strong ${
                        active ? 'text-fg-strong' : 'text-fg'
                      }`}
                    >
                      {entry.title}
                    </span>
                    {entry.date && (
                      <span className="mt-0.5 block text-[11px] tabular-nums text-faint">
                        {entry.date}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* 마인드맵과 같은 전체 화면 읽기. 라우트를 늘리지 않고 이 페이지 위에 덮는다. */}
      <NoteFullView
        open={Boolean(open)}
        contentWidth={contentWidth}
        onClose={() => setOpenSlug(null)}
      >
        {open && (
          <article className="flex min-h-0 flex-auto flex-col">
            <div className="shrink-0 border-b border-line">
              <div className="note-column px-4 pb-3">
                <h2 className="text-lg font-semibold leading-snug text-fg-strong">{open.title}</h2>
                {open.summary && (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{open.summary}</p>
                )}
                {open.date && (
                  <p className="mt-2 text-[10px] tabular-nums text-faint">{open.date}</p>
                )}
              </div>
            </div>

            {/* 스크롤은 창 전체 폭에서 일어난다. 그래야 스크롤바가 화면 오른쪽 끝에 붙는다. */}
            <div ref={scrollRef} className="min-h-0 flex-auto overflow-y-auto">
              <div className="note-column px-4 py-4 pb-10">
                <div className="note-content" dangerouslySetInnerHTML={{ __html: open.html }} />
              </div>
            </div>
          </article>
        )}
      </NoteFullView>
    </div>
  );
}
