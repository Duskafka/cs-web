'use client';

import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** 현재 검색어에 걸린 노드 수. 검색어가 비어 있으면 null. */
  matchCount: number | null;
}

export default function SearchBar({ value, onChange, matchCount }: SearchBarProps) {
  return (
    <div>
      {/*
       * 아이콘은 top-1/2 로 입력창 높이의 한가운데에 놓인다. 그래서 이 relative
       * 상자에는 입력창만 들어가야 한다. 아래 일치 개수 줄까지 함께 감싸면
       * 상자가 그만큼 높아져 아이콘이 입력창 밖으로 내려간다.
       */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="제목, 태그, 본문 검색"
          aria-label="노트 검색"
          className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-9 text-sm text-fg-strong placeholder:text-faint focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="검색어 지우기"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint transition hover:bg-hover hover:text-fg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {matchCount !== null && (
        <p className="mt-1.5 text-[11px] text-faint">
          {matchCount === 0 ? '일치하는 노트가 없습니다' : `${matchCount}개 일치`}
        </p>
      )}
    </div>
  );
}
